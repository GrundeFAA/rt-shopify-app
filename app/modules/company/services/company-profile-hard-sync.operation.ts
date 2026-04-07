import { AppError } from "../../auth/errors";
import { runHardSyncOperation, type HardSyncOperation } from "../../sync/core/hard-sync-orchestrator";
import { MirrorCompanyProfileService } from "../../sync/services/mirror-company-profile.service";
import { CompanyProfileRepository } from "../repositories/company-profile.repository.server";
import { CompanyProfileOutput, CompanyProfileOutputSchema } from "../schemas";

export type CompanyProfileMutation =
  | {
      kind: "update_address";
      companyAddress: CompanyProfileOutput["company_address"];
    };

type CompanyProfileHardSyncInput = {
  companyId: string;
  mutation: CompanyProfileMutation;
};

type CompanyProfileSyncSnapshot = {
  previousProfile: CompanyProfileOutput;
  nextProfile: CompanyProfileOutput;
};

type CompanyProfileSyncResult = {
  updatedProfile: CompanyProfileOutput;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown failure.";
}

function buildNextProfile(
  existing: {
    companyName: string;
    orgNumber: string;
  },
  mutation: CompanyProfileMutation,
): CompanyProfileOutput {
  if (mutation.kind === "update_address") {
    return CompanyProfileOutputSchema.parse({
      company_name: existing.companyName,
      org_number: existing.orgNumber,
      company_address: mutation.companyAddress,
    });
  }

  throw new AppError("INTERNAL_ERROR", "Unsupported company profile mutation.", 500, false);
}

export async function runCompanyProfileHardSyncOperation(args: {
  input: CompanyProfileHardSyncInput;
  repository: CompanyProfileRepository;
  mirrorService?: MirrorCompanyProfileService;
}): Promise<CompanyProfileSyncResult> {
  const { input, repository, mirrorService } = args;

  const operation: HardSyncOperation<
    CompanyProfileHardSyncInput,
    CompanyProfileSyncSnapshot,
    { shop?: string },
    CompanyProfileSyncResult
  > = {
    operationName: "company_profile_strong_sync",
    getLogContext: (operationInput) => ({
      companyId: operationInput.companyId,
      mutationKind: operationInput.mutation.kind,
    }),
    readSnapshot: async (operationInput) => {
      const existing = await repository.findByCompanyId(operationInput.companyId);
      if (!existing) {
        throw new AppError("RESOURCE_NOT_FOUND", "Company profile was not found.", 404, false);
      }

      const previousProfile = CompanyProfileOutputSchema.parse(
        CompanyProfileRepository.toProfileDto(existing),
      );
      const nextProfile = buildNextProfile(
        {
          companyName: existing.companyName,
          orgNumber: existing.orgNumber,
        },
        operationInput.mutation,
      );

      return { previousProfile, nextProfile };
    },
    writeExternal: async (operationInput, snapshot) => {
      if (!mirrorService) {
        return {};
      }

      const result = await mirrorService.executeStrict({
        companyId: operationInput.companyId,
        companyProfile: snapshot.nextProfile,
      });
      return { shop: result.shop };
    },
    writeLocal: async (operationInput) => {
      const mutation = operationInput.mutation;
      if (mutation.kind !== "update_address") {
        throw new AppError("INTERNAL_ERROR", "Unsupported company profile mutation.", 500, false);
      }

      const updated = await repository.updateCompanyAddress(
        operationInput.companyId,
        mutation.companyAddress,
      );

      if (!updated) {
        throw new AppError("SYNC_WRITE_ABORTED", "Company profile disappeared during update.", 409, false);
      }

      return {
        updatedProfile: CompanyProfileOutputSchema.parse(CompanyProfileRepository.toProfileDto(updated)),
      };
    },
    compensateExternal: async (operationInput, snapshot) => {
      if (!mirrorService) {
        throw new AppError(
          "INTERNAL_ERROR",
          "Database write failed after Shopify write succeeded.",
          500,
          false,
          {
            stage: "SYNC_STAGE_DB_WRITE_FAILED",
            companyId: operationInput.companyId,
          },
        );
      }

      await mirrorService.executeStrict({
        companyId: operationInput.companyId,
        companyProfile: snapshot.previousProfile,
      });
    },
    mapExternalFailure: ({ input: operationInput, error }) => {
      if (error instanceof AppError) {
        return new AppError(
          error.code,
          "Shopify mirror write failed. Company profile update was not persisted.",
          error.status,
          error.retryable,
          {
            ...(error.details ?? {}),
            stage: "SYNC_STAGE_SHOPIFY_WRITE_FAILED",
            companyId: operationInput.companyId,
            mutationKind: operationInput.mutation.kind,
            upstreamCode: error.code,
            causeMessage: error.message,
          },
        );
      }

      return error;
    },
    mapCompensationFailure: ({ input: operationInput, localError, compensationError }) =>
      new AppError(
        "SYNC_RECONCILIATION_MISMATCH",
        "Database write failed and Shopify compensation failed.",
        503,
        true,
        {
          stage: "SYNC_STAGE_COMPENSATION_FAILED",
          companyId: operationInput.companyId,
          mutationKind: operationInput.mutation.kind,
          dbCauseMessage: getErrorMessage(localError),
          compensationCauseMessage: getErrorMessage(compensationError),
          upstreamCode: compensationError instanceof AppError ? compensationError.code : "INTERNAL_ERROR",
          upstreamDetails:
            compensationError instanceof AppError ? (compensationError.details ?? undefined) : undefined,
        },
      ),
    mapCompensationApplied: ({ input: operationInput, localError }) =>
      new AppError(
        "SYNC_WRITE_ABORTED",
        "Database write failed after Shopify write succeeded; compensation applied.",
        503,
        true,
        {
          stage: "SYNC_STAGE_DB_WRITE_FAILED",
          companyId: operationInput.companyId,
          mutationKind: operationInput.mutation.kind,
          causeMessage: getErrorMessage(localError),
          compensationApplied: true,
        },
      ),
  };

  return runHardSyncOperation(operation, input);
}
