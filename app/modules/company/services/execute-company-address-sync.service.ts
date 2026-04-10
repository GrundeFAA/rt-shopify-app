import { AppError } from "../../auth/errors";
import type { CompanySharedAddressesRepository } from "../repositories/company-shared-addresses.repository.server";
import type { ProcessCompanyAddressSyncIntentService } from "./process-company-address-sync-intent.service";

type SyncExecutionRepository = Pick<
  CompanySharedAddressesRepository,
  "compensateFailedSyncIntent" | "listSyncEligibleCustomerIds" | "enqueueRecoverySyncIntent"
>;

type SyncProcessor = Pick<ProcessCompanyAddressSyncIntentService, "execute">;

type ExecuteCompanyAddressSyncInput = {
  syncIntentId: string;
  companyId: string;
  shop: string;
  failureMessage: string;
  recoveryReason: string;
  compensateSyncIntent?: boolean;
  rollbackCanonical?: () => Promise<boolean | void>;
  failureLogEvent: string;
  recoveryLogEvent: string;
};

export class ExecuteCompanyAddressSyncService {
  constructor(
    private readonly sharedAddressesRepository: SyncExecutionRepository,
    private readonly syncProcessor: SyncProcessor,
  ) {}

  async execute(input: ExecuteCompanyAddressSyncInput): Promise<void> {
    try {
      await this.syncProcessor.execute({
        syncIntentId: input.syncIntentId,
        shop: input.shop,
      });
    } catch (error) {
      const appError = error instanceof AppError ? error : null;

      const compensated =
        input.compensateSyncIntent === true
          ? await this.sharedAddressesRepository
              .compensateFailedSyncIntent(input.syncIntentId)
              .catch(() => false)
          : false;

      let rollbackApplied = false;
      if (input.rollbackCanonical) {
        try {
          const rollbackResult = await input.rollbackCanonical();
          rollbackApplied = rollbackResult !== false;
        } catch {
          rollbackApplied = false;
        }
      }

      let recoverySyncIntentId: string | null = null;
      let recoveryApplied = false;
      if (compensated || rollbackApplied) {
        try {
          const recipientCustomerIds = await this.sharedAddressesRepository.listSyncEligibleCustomerIds(
            input.companyId,
          );
          const recoveryIntent = await this.sharedAddressesRepository.enqueueRecoverySyncIntent({
            companyId: input.companyId,
            syncEligibleCustomerIds: recipientCustomerIds,
            reason: input.recoveryReason,
          });
          recoverySyncIntentId = recoveryIntent.syncIntentId;
          await this.syncProcessor.execute({
            syncIntentId: recoveryIntent.syncIntentId,
            shop: input.shop,
          });
          recoveryApplied = true;
        } catch (recoveryError) {
          console.error(
            JSON.stringify({
              event: input.recoveryLogEvent,
              companyId: input.companyId,
              shop: input.shop,
              originalSyncIntentId: input.syncIntentId,
              recoverySyncIntentId,
              message:
                recoveryError instanceof Error ? recoveryError.message : "Unknown recovery sync error",
            }),
          );
        }
      }

      console.error(
        JSON.stringify({
          event: input.failureLogEvent,
          syncIntentId: input.syncIntentId,
          companyId: input.companyId,
          shop: input.shop,
          code: appError?.code,
          message: error instanceof Error ? error.message : "Unknown error",
          details: appError?.details,
          compensated,
          rollbackApplied,
          recoverySyncIntentId,
          recoveryApplied,
        }),
      );

      throw new AppError("SYNC_WRITE_ABORTED", input.failureMessage, 503, true, {
        syncIntentId: input.syncIntentId,
        syncErrorCode: appError?.code ?? "INTERNAL_ERROR",
        compensated,
        rollbackApplied,
        recoverySyncIntentId,
        recoveryApplied,
      });
    }
  }
}
