import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../../auth/errors";
import { ExecuteCompanyAddressSyncService } from "./execute-company-address-sync.service";

test("returns without error when sync succeeds", async () => {
  const service = new ExecuteCompanyAddressSyncService(
    {
      async compensateFailedSyncIntent() {
        return false;
      },
      async listSyncEligibleCustomerIds() {
        return [];
      },
      async enqueueRecoverySyncIntent() {
        throw new Error("should not be called");
      },
    },
    {
      async execute() {
        return;
      },
    },
  );

  await service.execute({
    syncIntentId: "intent-ok",
    companyId: "cmp-1",
    shop: "example.myshopify.com",
    failureMessage: "failed",
    recoveryReason: "reason",
    failureLogEvent: "fail_event",
    recoveryLogEvent: "recovery_event",
  });
});

test("compensates and recovers for delivery sync failure", async () => {
  const executedSyncIntentIds: string[] = [];
  const service = new ExecuteCompanyAddressSyncService(
    {
      async compensateFailedSyncIntent() {
        return true;
      },
      async listSyncEligibleCustomerIds() {
        return ["101"];
      },
      async enqueueRecoverySyncIntent() {
        return { syncIntentId: "intent-recovery" };
      },
    },
    {
      async execute(input: { syncIntentId: string }) {
        executedSyncIntentIds.push(input.syncIntentId);
        if (input.syncIntentId === "intent-original") {
          throw new AppError("SHOPIFY_TEMPORARY_FAILURE", "boom", 503, true);
        }
      },
    },
  );

  await assert.rejects(
    () =>
      service.execute({
        syncIntentId: "intent-original",
        companyId: "cmp-1",
        shop: "example.myshopify.com",
        failureMessage: "failed",
        recoveryReason: "reason",
        compensateSyncIntent: true,
        failureLogEvent: "fail_event",
        recoveryLogEvent: "recovery_event",
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "SYNC_WRITE_ABORTED");
      assert.equal(error.details?.recoveryApplied, true);
      return true;
    },
  );

  assert.deepEqual(executedSyncIntentIds, ["intent-original", "intent-recovery"]);
});

test("rolls back canonical state and recovers for post sync failure", async () => {
  let rollbackCalled = false;
  const service = new ExecuteCompanyAddressSyncService(
    {
      async compensateFailedSyncIntent() {
        return false;
      },
      async listSyncEligibleCustomerIds() {
        return ["101"];
      },
      async enqueueRecoverySyncIntent() {
        return { syncIntentId: "intent-recovery-post" };
      },
    },
    {
      async execute(input: { syncIntentId: string }) {
        if (input.syncIntentId === "intent-post") {
          throw new AppError("SHOPIFY_TEMPORARY_FAILURE", "boom", 503, true);
        }
      },
    },
  );

  await assert.rejects(
    () =>
      service.execute({
        syncIntentId: "intent-post",
        companyId: "cmp-1",
        shop: "example.myshopify.com",
        failureMessage: "failed",
        recoveryReason: "reason",
        failureLogEvent: "fail_event",
        recoveryLogEvent: "recovery_event",
        rollbackCanonical: async () => {
          rollbackCalled = true;
          return true;
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "SYNC_WRITE_ABORTED");
      assert.equal(error.details?.rollbackApplied, true);
      assert.equal(error.details?.recoveryApplied, true);
      return true;
    },
  );

  assert.equal(rollbackCalled, true);
});
