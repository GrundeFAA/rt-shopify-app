import { AppError } from "../../auth/errors";
import type { CompanyAddressesShopifyGateway } from "../../../infrastructure/shopify-gateways/company-addresses.shopify-gateway.server";
import type { CompanyProfileRepository } from "../repositories/company-profile.repository.server";
import type { ShopifyOfflineSessionRepository } from "../../sync/repositories/shopify-offline-session.repository.server";
import type {
  CompanyAddressSyncIntentRecord,
  CompanySharedAddressesRepository,
} from "../repositories/company-shared-addresses.repository.server";

type SharedAddressesSyncRepository = Pick<
  CompanySharedAddressesRepository,
  | "findSyncIntentById"
  | "markSyncIntentProcessing"
  | "markSyncIntentSucceeded"
  | "markSyncIntentFailed"
  | "listByCompanyId"
>;

type OfflineSessionsRepository = Pick<ShopifyOfflineSessionRepository, "getOfflineSessionByShop">;
type CompanyProfileReadRepository = Pick<CompanyProfileRepository, "findByCompanyId">;

type SyncGateway = Pick<CompanyAddressesShopifyGateway, "replaceCustomerAddresses">;

type ProcessCompanyAddressSyncIntentInput = {
  syncIntentId: string;
  shop: string;
};

export class ProcessCompanyAddressSyncIntentService {
  constructor(
    private readonly sharedAddressesRepository: SharedAddressesSyncRepository,
    private readonly offlineSessionsRepository: OfflineSessionsRepository,
    private readonly companyProfileRepository: CompanyProfileReadRepository,
    private readonly shopifyGateway: SyncGateway,
  ) {}

  private async requireIntent(syncIntentId: string): Promise<CompanyAddressSyncIntentRecord> {
    const intent = await this.sharedAddressesRepository.findSyncIntentById(syncIntentId);
    if (!intent) {
      throw new AppError("RESOURCE_NOT_FOUND", "Address sync intent was not found.", 404, false);
    }
    return intent;
  }

  private buildCanonicalAddressSet(input: {
    sharedAddresses: Array<{
      line1: string;
      line2: string | null;
      postalCode: string;
      city: string;
      country: string;
    }>;
    companyPostalAddress: {
      line1: string;
      line2?: string;
      postalCode: string;
      city: string;
      country: string;
    };
    companyName: string;
  }): Array<{
    line1: string;
    line2: string | null;
    postalCode: string;
    city: string;
    country: string;
    company: string;
  }> {
    const normalize = (address: {
      line1: string;
      line2?: string | null;
      postalCode: string;
      city: string;
      country: string;
    }) => ({
      line1: address.line1.trim(),
      line2: address.line2?.trim() || null,
      postalCode: address.postalCode.trim(),
      city: address.city.trim(),
      country: address.country.trim().toUpperCase(),
    });

    const companyName = input.companyName.trim();
    const companyAddress = {
      ...normalize(input.companyPostalAddress),
      company: companyName,
    };
    const normalizedShared = input.sharedAddresses.map((address) => ({
      ...normalize(address),
      company: companyName,
    }));
    const makeKey = (address: {
      line1: string;
      line2: string | null;
      postalCode: string;
      city: string;
      country: string;
    }) =>
      [
        address.line1.toLowerCase(),
        address.line2?.toLowerCase() ?? "",
        address.postalCode.toLowerCase(),
        address.city.toLowerCase(),
        address.country.toLowerCase(),
      ].join("|");

    const companyKey = makeKey(companyAddress);
    const dedupedShared = normalizedShared.filter((address) => makeKey(address) !== companyKey);

    // Company postal address is intentionally inserted first for deterministic Shopify ordering.
    return [companyAddress, ...dedupedShared];
  }

  async execute(input: ProcessCompanyAddressSyncIntentInput): Promise<void> {
    const syncIntentId = input.syncIntentId.trim();
    if (!syncIntentId) {
      throw new AppError("VALIDATION_FAILED", "Sync intent id is required.", 400, false);
    }

    const intent = await this.requireIntent(syncIntentId);
    if (intent.status === "succeeded") {
      return;
    }

    const locked = await this.sharedAddressesRepository.markSyncIntentProcessing(syncIntentId);
    if (!locked) {
      return;
    }

    const session = await this.offlineSessionsRepository.getOfflineSessionByShop(input.shop);
    if (!session) {
      await this.sharedAddressesRepository.markSyncIntentFailed(syncIntentId, {
        code: "INFRA_UNAVAILABLE",
        message: "Offline Shopify session missing for address sync intent.",
      });
      throw new AppError(
        "INFRA_UNAVAILABLE",
        "Offline session is missing while syncing company addresses.",
        503,
        true,
      );
    }

    const canonicalAddresses = await this.sharedAddressesRepository.listByCompanyId(intent.companyId);
    const companyProfile = await this.companyProfileRepository.findByCompanyId(intent.companyId);
    if (!companyProfile) {
      await this.sharedAddressesRepository.markSyncIntentFailed(syncIntentId, {
        code: "RESOURCE_NOT_FOUND",
        message: "Company profile missing for shared-address sync intent.",
      });
      throw new AppError("RESOURCE_NOT_FOUND", "Company profile was not found.", 404, false);
    }

    const syncAddressSet = this.buildCanonicalAddressSet({
      sharedAddresses: canonicalAddresses.map((address) => ({
        line1: address.line1,
        line2: address.line2,
        postalCode: address.postalCode,
        city: address.city,
        country: address.country,
      })),
      companyPostalAddress: companyProfile.companyAddress,
      companyName: companyProfile.companyName,
    });

    try {
      for (const customerId of intent.recipientCustomerIds) {
        await this.shopifyGateway.replaceCustomerAddresses({
          shop: session.shop,
          accessToken: session.accessToken,
          customerId,
          canonicalAddresses: syncAddressSet,
        });
      }

      await this.sharedAddressesRepository.markSyncIntentSucceeded(syncIntentId);
    } catch (error) {
      const appError = error instanceof AppError ? error : null;
      await this.sharedAddressesRepository.markSyncIntentFailed(syncIntentId, {
        code: appError?.code ?? "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown address sync failure.",
        retryable: appError?.retryable ?? true,
        details: appError?.details,
      });

      throw appError ??
        new AppError(
          "SYNC_WRITE_ABORTED",
          "Address projection sync failed.",
          503,
          true,
        );
    }
  }
}

