import { AppError } from "../../auth/errors";

type Stage =
  | "SYNC_STAGE_SHOPIFY_WRITE_FAILED"
  | "SYNC_STAGE_DB_WRITE_FAILED"
  | "SYNC_STAGE_COMPENSATION_FAILED";

type HardSyncLogContext = Record<string, unknown>;

type HardSyncEventKind =
  | "external_write_failed"
  | "local_write_failed"
  | "compensation_failed"
  | "compensation_applied";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown failure.";
}

function toAppError(error: unknown): AppError | null {
  return error instanceof AppError ? error : null;
}

function logEvent(
  operationName: string,
  event: HardSyncEventKind,
  stage: Stage,
  context: HardSyncLogContext,
  details: Record<string, unknown> = {},
): void {
  console.error(
    JSON.stringify({
      event: `${operationName}_${event}`,
      stage,
      ...context,
      ...details,
    }),
  );
}

type ExternalFailureContext<TInput, TSnapshot> = {
  input: TInput;
  snapshot: TSnapshot;
  error: unknown;
};

type CompensationFailureContext<TInput, TSnapshot, TExternal> = {
  input: TInput;
  snapshot: TSnapshot;
  externalResult: TExternal;
  localError: unknown;
  compensationError: unknown;
};

type CompensationAppliedContext<TInput, TSnapshot, TExternal> = {
  input: TInput;
  snapshot: TSnapshot;
  externalResult: TExternal;
  localError: unknown;
};

export type HardSyncOperation<TInput, TSnapshot, TExternal, TResult> = {
  operationName: string;
  getLogContext: (input: TInput) => HardSyncLogContext;
  readSnapshot: (input: TInput) => Promise<TSnapshot>;
  writeExternal: (input: TInput, snapshot: TSnapshot) => Promise<TExternal>;
  writeLocal: (input: TInput, snapshot: TSnapshot, externalResult: TExternal) => Promise<TResult>;
  compensateExternal: (
    input: TInput,
    snapshot: TSnapshot,
    externalResult: TExternal,
    localError: unknown,
  ) => Promise<void>;
  mapExternalFailure: (ctx: ExternalFailureContext<TInput, TSnapshot>) => AppError | unknown;
  mapCompensationFailure: (
    ctx: CompensationFailureContext<TInput, TSnapshot, TExternal>,
  ) => AppError | unknown;
  mapCompensationApplied: (
    ctx: CompensationAppliedContext<TInput, TSnapshot, TExternal>,
  ) => AppError | unknown;
};

export async function runHardSyncOperation<TInput, TSnapshot, TExternal, TResult>(
  operation: HardSyncOperation<TInput, TSnapshot, TExternal, TResult>,
  input: TInput,
): Promise<TResult> {
  const logContext = operation.getLogContext(input);
  const snapshot = await operation.readSnapshot(input);

  let externalResult: TExternal;
  try {
    externalResult = await operation.writeExternal(input, snapshot);
  } catch (error) {
    const appError = toAppError(error);
    logEvent(
      operation.operationName,
      "external_write_failed",
      "SYNC_STAGE_SHOPIFY_WRITE_FAILED",
      logContext,
      {
        code: appError?.code,
        retryable: appError?.retryable,
        causeMessage: getErrorMessage(error),
      },
    );
    throw operation.mapExternalFailure({
      input,
      snapshot,
      error,
    });
  }

  try {
    return await operation.writeLocal(input, snapshot, externalResult);
  } catch (localError) {
    logEvent(
      operation.operationName,
      "local_write_failed",
      "SYNC_STAGE_DB_WRITE_FAILED",
      logContext,
      {
        causeMessage: getErrorMessage(localError),
      },
    );

    try {
      await operation.compensateExternal(input, snapshot, externalResult, localError);
    } catch (compensationError) {
      logEvent(
        operation.operationName,
        "compensation_failed",
        "SYNC_STAGE_COMPENSATION_FAILED",
        logContext,
        {
          dbCauseMessage: getErrorMessage(localError),
          compensationCauseMessage: getErrorMessage(compensationError),
        },
      );
      throw operation.mapCompensationFailure({
        input,
        snapshot,
        externalResult,
        localError,
        compensationError,
      });
    }

    logEvent(
      operation.operationName,
      "compensation_applied",
      "SYNC_STAGE_DB_WRITE_FAILED",
      logContext,
      {
        causeMessage: getErrorMessage(localError),
      },
    );

    throw operation.mapCompensationApplied({
      input,
      snapshot,
      externalResult,
      localError,
    });
  }
}
