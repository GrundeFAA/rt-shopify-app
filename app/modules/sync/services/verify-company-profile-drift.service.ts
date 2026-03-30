import { CompanyProfileDriftReport, CompanyProfileDriftReportSchema } from "../../../contracts/sync.schema";
import { CompanyProfileMirrorGateway } from "../../../infrastructure/shopify-gateways/company-profile-mirror.gateway.server";
import { AppError } from "../../auth/errors";
import { CompanyProfileRepository } from "../../company/repositories/company-profile.repository.server";
import { ShopifyOfflineSessionRepository } from "../repositories/shopify-offline-session.repository.server";

export class VerifyCompanyProfileDriftService {
  constructor(
    private readonly companyProfileRepository: CompanyProfileRepository,
    private readonly sessionRepository: ShopifyOfflineSessionRepository,
    private readonly mirrorGateway: CompanyProfileMirrorGateway,
  ) {}

  async execute(companyId: string): Promise<CompanyProfileDriftReport> {
    try {
      const profile = await this.companyProfileRepository.findByCompanyId(companyId);
      if (!profile) {
        throw new AppError("RESOURCE_NOT_FOUND", "Company profile was not found.", 404, false, {
          stage: "drift_profile_lookup",
          companyId,
        });
      }

      const session = await this.sessionRepository.getLatestOfflineSession();
      if (!session) {
        throw new AppError(
          "INFRA_UNAVAILABLE",
          "No Shopify offline session is available for drift verification.",
          503,
          true,
          {
            stage: "drift_offline_session_lookup",
            companyId,
          },
        );
      }

      const source = CompanyProfileRepository.toProfileDto(profile);
      const metaobject = await this.mirrorGateway.readCompanyProfileMetaobject(
        session,
        companyId,
        source.org_number,
      );

      const mismatches: CompanyProfileDriftReport["mismatches"] = [];
      if (source.company_name !== metaobject.name) {
        mismatches.push({
          key: "company_name",
          sourceValue: source.company_name,
          mirroredValue: metaobject.name,
        });
      }
      if (source.org_number !== metaobject.org_number) {
        mismatches.push({
          key: "org_number",
          sourceValue: source.org_number,
          mirroredValue: metaobject.org_number,
        });
      }
      if (JSON.stringify(source.company_address) !== JSON.stringify(metaobject.address)) {
        mismatches.push({
          key: "company_address",
          sourceValue: source.company_address,
          mirroredValue: metaobject.address,
        });
      }

      const metaobjectMismatches: Array<{
        key: "name" | "org_number" | "address";
        sourceValue: unknown;
        mirroredValue: unknown;
      }> = [];
      if (source.company_name !== metaobject.name) {
        metaobjectMismatches.push({
          key: "name",
          sourceValue: source.company_name,
          mirroredValue: metaobject.name,
        });
      }
      if (source.org_number !== metaobject.org_number) {
        metaobjectMismatches.push({
          key: "org_number",
          sourceValue: source.org_number,
          mirroredValue: metaobject.org_number,
        });
      }
      if (JSON.stringify(source.company_address) !== JSON.stringify(metaobject.address)) {
        metaobjectMismatches.push({
          key: "address",
          sourceValue: source.company_address,
          mirroredValue: metaobject.address,
        });
      }

      return CompanyProfileDriftReportSchema.parse({
        companyId,
        inSync: mismatches.length === 0,
        mismatches,
        metaobject: {
          type: "company",
          handle: metaobject.handle,
          inSync: mismatches.length === 0,
          mismatches: metaobjectMismatches,
          membersPreserved: Boolean(metaobject.membersRaw),
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        console.error(
          JSON.stringify({
            event: "drift_verification_failure",
            companyId,
            code: error.code,
            stage: (error.details as Record<string, unknown> | undefined)?.stage ?? "drift_execute",
            retryable: error.retryable,
            message: error.message,
          }),
        );
      }
      throw error;
    }
  }
}
