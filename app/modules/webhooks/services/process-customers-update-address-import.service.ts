import { AppError } from "../../auth/errors";
import type { CompanyProfileRepository } from "../../company/repositories/company-profile.repository.server";
import type { CompanySharedAddressesRepository } from "../../company/repositories/company-shared-addresses.repository.server";
import {
  CustomersUpdateWebhookPayloadSchema,
  dedupeNormalizedAddresses,
  normalizeExternalAddress,
} from "../schemas/customers-update-address-import.schema";

type SharedAddressImportRepository = Pick<
  CompanySharedAddressesRepository,
  | "findMembershipByCustomerId"
  | "listSyncEligibleCustomerIds"
  | "importCheckoutAddressWithSyncIntent"
  | "enqueueWebhookReconcileSyncIntent"
  | "hasRecentWebhookReconcileIntent"
  | "listByCompanyId"
>;
type CompanyProfileReadRepository = Pick<CompanyProfileRepository, "findByCompanyId">;

type ProcessCustomersUpdateAddressImportInput = {
  webhookId: string;
  topic: string;
  shop: string;
  payload: unknown;
};

export type ProcessCustomersUpdateAddressImportResult =
  | {
      outcome:
        | "ignored_no_membership"
        | "ignored_pending_membership"
        | "ignored_unrecognized_membership_status"
        | "ignored_no_valid_addresses"
        | "ignored_all_deduped";
      importedCount: 0;
      syncIntentIds: [];
    }
  | {
      outcome: "processed_reconcile_only";
      importedCount: 0;
      syncIntentIds: [string];
    }
  | {
      outcome: "processed_imported_addresses";
      importedCount: number;
      syncIntentIds: string[];
    };

export class ProcessCustomersUpdateAddressImportService {
  constructor(
    private readonly sharedAddressRepository: SharedAddressImportRepository,
    private readonly companyProfileRepository: CompanyProfileReadRepository,
  ) {}

  private makeAddressKey(address: {
    line1: string;
    line2: string | null;
    postalCode: string;
    city: string;
    country: string;
  }): string {
    return [
      address.line1.trim().toLowerCase(),
      address.line2?.trim().toLowerCase() ?? "",
      address.postalCode.trim().toLowerCase(),
      address.city.trim().toLowerCase(),
      address.country.trim().toLowerCase(),
    ].join("|");
  }

  private hasDrift(input: {
    webhookAddresses: Array<{
      line1: string;
      line2: string | null;
      postalCode: string;
      city: string;
      country: string;
    }>;
    canonicalAddresses: Array<{
      line1: string;
      line2: string | null;
      postalCode: string;
      city: string;
      country: string;
    }>;
  }): boolean {
    const webhookSet = new Set(input.webhookAddresses.map((address) => this.makeAddressKey(address)));
    const canonicalSet = new Set(input.canonicalAddresses.map((address) => this.makeAddressKey(address)));

    for (const canonicalKey of canonicalSet) {
      if (!webhookSet.has(canonicalKey)) {
        return true;
      }
    }
    return false;
  }

  async execute(
    input: ProcessCustomersUpdateAddressImportInput,
  ): Promise<ProcessCustomersUpdateAddressImportResult> {
    const parsedPayload = CustomersUpdateWebhookPayloadSchema.safeParse(input.payload);
    if (!parsedPayload.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid customers/update webhook payload.", 400, false);
    }

    const membership = await this.sharedAddressRepository.findMembershipByCustomerId(parsedPayload.data.id);
    if (!membership) {
      return {
        outcome: "ignored_no_membership",
        importedCount: 0,
        syncIntentIds: [],
      };
    }

    if (
      membership.status === "pending_user_acceptance" ||
      membership.status === "pending_admin_approval"
    ) {
      return {
        outcome: "ignored_pending_membership",
        importedCount: 0,
        syncIntentIds: [],
      };
    }

    if (membership.status !== "active" && membership.status !== "inactive") {
      return {
        outcome: "ignored_unrecognized_membership_status",
        importedCount: 0,
        syncIntentIds: [],
      };
    }

    const candidateAddresses = [
      ...(parsedPayload.data.default_address ? [parsedPayload.data.default_address] : []),
      ...(parsedPayload.data.addresses ?? []),
    ];
    const normalized = dedupeNormalizedAddresses(
      candidateAddresses
        .map((address) => normalizeExternalAddress(address))
        .filter((address): address is NonNullable<typeof address> => Boolean(address)),
    );

    if (normalized.length === 0) {
      return {
        outcome: "ignored_no_valid_addresses",
        importedCount: 0,
        syncIntentIds: [],
      };
    }

    const syncEligibleCustomerIds = await this.sharedAddressRepository.listSyncEligibleCustomerIds(
      membership.companyId,
    );
    const companyProfile = await this.companyProfileRepository.findByCompanyId(membership.companyId);
    if (!companyProfile) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company profile was not found.", 404, false);
    }
    const companyPostKey = this.makeAddressKey({
      line1: companyProfile.companyAddress.line1,
      line2: companyProfile.companyAddress.line2 ?? null,
      postalCode: companyProfile.companyAddress.postalCode,
      city: companyProfile.companyAddress.city,
      country: companyProfile.companyAddress.country,
    });
    const normalizedForImport = normalized.filter(
      (address) => this.makeAddressKey(address) !== companyPostKey,
    );

    let importedCount = 0;
    const syncIntentIds: string[] = [];
    for (const address of normalizedForImport) {
      const imported = await this.sharedAddressRepository.importCheckoutAddressWithSyncIntent({
        companyId: membership.companyId,
        actorMembershipId: membership.id,
        triggeredByCustomerId: membership.customerId,
        address,
        syncEligibleCustomerIds,
      });

      if (!imported.imported) {
        continue;
      }

      importedCount += 1;
      if (imported.syncIntentId) {
        syncIntentIds.push(imported.syncIntentId);
      }
    }

    if (importedCount === 0) {
      const canonicalSharedAddresses = await this.sharedAddressRepository.listByCompanyId(membership.companyId);
      const canonicalAddressSet = [
        {
          line1: companyProfile.companyAddress.line1,
          line2: companyProfile.companyAddress.line2 ?? null,
          postalCode: companyProfile.companyAddress.postalCode,
          city: companyProfile.companyAddress.city,
          country: companyProfile.companyAddress.country,
        },
        ...canonicalSharedAddresses.map((address) => ({
          line1: address.line1,
          line2: address.line2,
          postalCode: address.postalCode,
          city: address.city,
          country: address.country,
        })),
      ];

      if (!this.hasDrift({ webhookAddresses: normalized, canonicalAddresses: canonicalAddressSet })) {
        return {
          outcome: "ignored_all_deduped",
          importedCount: 0,
          syncIntentIds: [],
        };
      }

      const recentlyEnqueued = await this.sharedAddressRepository.hasRecentWebhookReconcileIntent({
        companyId: membership.companyId,
        triggeredByCustomerId: membership.customerId,
        withinSeconds: 30,
      });
      if (recentlyEnqueued) {
        return {
          outcome: "ignored_all_deduped",
          importedCount: 0,
          syncIntentIds: [],
        };
      }

      const reconcileIntent = await this.sharedAddressRepository.enqueueWebhookReconcileSyncIntent({
        companyId: membership.companyId,
        triggeredByCustomerId: membership.customerId,
        syncEligibleCustomerIds,
      });
      return {
        outcome: "processed_reconcile_only",
        importedCount: 0,
        syncIntentIds: [reconcileIntent.syncIntentId],
      };
    }

    return {
      outcome: "processed_imported_addresses",
      importedCount,
      syncIntentIds,
    };
  }
}
