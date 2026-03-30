import { AppError } from "../../auth/errors";
import { MirrorCompanyProfileService } from "../../sync/services/mirror-company-profile.service";
import { CompanyProfileRepository } from "../repositories/company-profile.repository.server";
import {
  CompanyProfileOutput,
  CompanyProfileOutputSchema,
  UpdateCompanyAddressInput,
  UpdateCompanyAddressInputSchema,
} from "../schemas";

export class UpdateCompanyAddressService {
  constructor(
    private readonly repository: CompanyProfileRepository,
    private readonly mirrorService?: MirrorCompanyProfileService,
  ) {}

  async execute(input: UpdateCompanyAddressInput): Promise<CompanyProfileOutput> {
    const parsedInput = UpdateCompanyAddressInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid company address update request.", 400, false);
    }

    if (parsedInput.data.role !== "administrator") {
      throw new AppError(
        "AUTH_FORBIDDEN_ROLE",
        "Only administrators can update the company address.",
        403,
        false,
      );
    }

    const existing = await this.repository.findByCompanyId(parsedInput.data.companyId);
    if (!existing) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company profile was not found.", 404, false);
    }

    const previousProfile = CompanyProfileRepository.toProfileDto(existing);
    const nextProfile = CompanyProfileOutputSchema.parse({
      company_name: existing.companyName,
      org_number: existing.orgNumber,
      company_address: parsedInput.data.companyAddress,
    });

    if (this.mirrorService) {
      try {
        await this.mirrorService.executeStrict({
          companyId: parsedInput.data.companyId,
          companyProfile: nextProfile,
        });
      } catch (error) {
        if (error instanceof AppError) {
          console.error(
            JSON.stringify({
              event: "company_address_strong_sync_shopify_write_failed",
              companyId: parsedInput.data.companyId,
              code: error.code,
              retryable: error.retryable,
              stage: "SYNC_STAGE_SHOPIFY_WRITE_FAILED",
              causeMessage: error.message,
            }),
          );
          throw new AppError(
            error.code,
            "Shopify mirror write failed. Company address update was not persisted.",
            error.status,
            error.retryable,
            {
              ...(error.details ?? {}),
              stage: "SYNC_STAGE_SHOPIFY_WRITE_FAILED",
              companyId: parsedInput.data.companyId,
              upstreamCode: error.code,
              causeMessage: error.message,
            },
          );
        }
        throw error;
      }
    }

    const updated = await (async () => {
      try {
        return await this.repository.updateCompanyAddress(
          parsedInput.data.companyId,
          parsedInput.data.companyAddress,
        );
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "company_address_strong_sync_db_write_failed",
            companyId: parsedInput.data.companyId,
            stage: "SYNC_STAGE_DB_WRITE_FAILED",
            causeMessage: error instanceof Error ? error.message : "Unknown DB failure.",
          }),
        );
        await this.compensateShopifyAfterDbFailure(
          parsedInput.data.companyId,
          previousProfile,
          error,
        );
      }
    })();

    if (!updated) {
      console.error(
        JSON.stringify({
          event: "company_address_strong_sync_db_write_failed",
          companyId: parsedInput.data.companyId,
          stage: "SYNC_STAGE_DB_WRITE_FAILED",
          causeMessage: "Company profile disappeared during update.",
        }),
      );
      await this.compensateShopifyAfterDbFailure(
        parsedInput.data.companyId,
        previousProfile,
        new AppError(
          "SYNC_WRITE_ABORTED",
          "Company profile disappeared during update.",
          409,
          false,
        ),
      );
    }

    if (!updated) {
      throw new AppError("INTERNAL_ERROR", "Strong-sync update aborted unexpectedly.", 500, false);
    }

    const profileDto = CompanyProfileRepository.toProfileDto(updated);
    return CompanyProfileOutputSchema.parse(profileDto);
  }

  private async compensateShopifyAfterDbFailure(
    companyId: string,
    previousProfile: CompanyProfileOutput,
    dbError: unknown,
  ): Promise<never> {
    if (!this.mirrorService) {
      throw new AppError(
        "INTERNAL_ERROR",
        "Database write failed after Shopify write succeeded.",
        500,
        false,
        {
          stage: "SYNC_STAGE_DB_WRITE_FAILED",
          companyId,
          causeMessage: dbError instanceof Error ? dbError.message : "Unknown DB failure.",
        },
      );
    }

    try {
      await this.mirrorService.executeStrict({
        companyId,
        companyProfile: previousProfile,
      });
    } catch (compensationError) {
      console.error(
        JSON.stringify({
          event: "company_address_strong_sync_compensation_failed",
          companyId,
          stage: "SYNC_STAGE_COMPENSATION_FAILED",
          dbCauseMessage: dbError instanceof Error ? dbError.message : "Unknown DB failure.",
          compensationCauseMessage:
            compensationError instanceof Error
              ? compensationError.message
              : "Unknown compensation failure.",
        }),
      );
      throw new AppError(
        "SYNC_RECONCILIATION_MISMATCH",
        "Database write failed and Shopify compensation failed.",
        503,
        true,
        {
          stage: "SYNC_STAGE_COMPENSATION_FAILED",
          companyId,
          dbCauseMessage: dbError instanceof Error ? dbError.message : "Unknown DB failure.",
          compensationCauseMessage:
            compensationError instanceof Error
              ? compensationError.message
              : "Unknown compensation failure.",
          upstreamCode:
            compensationError instanceof AppError ? compensationError.code : "INTERNAL_ERROR",
          upstreamDetails:
            compensationError instanceof AppError
              ? (compensationError.details ?? undefined)
              : undefined,
        },
      );
    }

    console.error(
      JSON.stringify({
        event: "company_address_strong_sync_compensation_applied",
        companyId,
        stage: "SYNC_STAGE_DB_WRITE_FAILED",
        causeMessage: dbError instanceof Error ? dbError.message : "Unknown DB failure.",
      }),
    );

    throw new AppError(
      "SYNC_WRITE_ABORTED",
      "Database write failed after Shopify write succeeded; compensation applied.",
      503,
      true,
      {
        stage: "SYNC_STAGE_DB_WRITE_FAILED",
        companyId,
        causeMessage: dbError instanceof Error ? dbError.message : "Unknown DB failure.",
        compensationApplied: true,
      },
    );
  }
}
