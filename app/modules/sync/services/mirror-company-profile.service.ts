import { CompanyProfile } from "../../../contracts/company.schema";
import { CompanyProfileMirrorPayloadSchema } from "../../../contracts/sync.schema";
import { CompanyProfileMirrorGateway } from "../../../infrastructure/shopify-gateways/company-profile-mirror.gateway.server";
import { createSyncInProgressError } from "../../auth/api-error.server";
import { AppError } from "../../auth/errors";
import { ShopifyOfflineSessionRepository } from "../repositories/shopify-offline-session.repository.server";

function getDetailString(details: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = details?.[key];
  return typeof value === "string" ? value : undefined;
}

export class MirrorCompanyProfileService {
  constructor(
    private readonly sessionRepository: ShopifyOfflineSessionRepository,
    private readonly mirrorGateway: CompanyProfileMirrorGateway,
  ) {}

  async executeStrict(input: {
    companyId: string;
    shop?: string;
    companyProfile: CompanyProfile;
  }): Promise<{ shop: string }> {
    const companyId = input.companyId;
    const companyProfile = input.companyProfile;
    const payload = CompanyProfileMirrorPayloadSchema.parse(companyProfile);
    const session = input.shop
      ? await this.sessionRepository.getOfflineSessionByShop(input.shop)
      : await this.sessionRepository.getLatestOfflineSession();

    if (!session) {
      throw new AppError(
        "INFRA_UNAVAILABLE",
        "No Shopify offline session is available for mirror sync.",
        503,
        true,
        {
          stage: "mirror_offline_session_lookup",
          companyId,
          shop: input.shop,
        },
      );
    }

    await this.mirrorGateway.upsertCompanyProfileMetaobject(
      session,
      payload,
      companyId,
    );

    return { shop: session.shop };
  }

  async execute(input: {
    companyId: string;
    shop?: string;
    companyProfile: CompanyProfile;
  }): Promise<void> {
    try {
      await this.executeStrict(input);
    } catch (error) {
      if (
        error instanceof AppError &&
        ["SHOPIFY_RATE_LIMITED", "SHOPIFY_TEMPORARY_FAILURE", "INFRA_TIMEOUT", "INFRA_UNAVAILABLE"].includes(
          error.code,
        )
      ) {
        const details = error.details as Record<string, unknown> | undefined;

        console.error(
          JSON.stringify({
            event: "mirror_sync_failure",
            companyId: input.companyId,
            upstreamCode: error.code,
            stage: getDetailString(details, "stage") ?? "mirror_company_profile_service",
            retryable: error.retryable,
            causeMessage: error.message,
          }),
        );

        throw createSyncInProgressError("Company profile mirror sync is still in progress.", {
          upstreamCode: error.code,
          stage: getDetailString(details, "stage") ?? "mirror_company_profile_service",
          retryable: error.retryable,
          shop: getDetailString(details, "shop"),
          companyId: input.companyId,
          causeMessage: error.message,
          upstreamDetails: process.env.NODE_ENV !== "production" ? details : undefined,
        });
      }

      throw error;
    }
  }
}
