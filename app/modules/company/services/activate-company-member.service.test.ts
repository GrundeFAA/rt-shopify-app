import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../../auth/errors";
import { ActivateCompanyMemberService } from "./activate-company-member.service";

type Status = "active" | "inactive" | "pending_user_acceptance" | "pending_admin_approval";

function createHarness(input?: {
  actor?: { id: string; customerId: string; companyId: string; role: "administrator" | "user"; status: Status };
  target?: { id: string; customerId: string; companyId: string; role: "administrator" | "user"; status: Status };
  syncShouldFail?: boolean;
}) {
  const memberships = new Map<string, { id: string; customerId: string; companyId: string; role: "administrator" | "user"; status: Status }>();
  const actor =
    input?.actor ??
    { id: "m-actor", customerId: "100", companyId: "cmp-1", role: "administrator", status: "active" as const };
  const target =
    input?.target ??
    { id: "m-target", customerId: "200", companyId: "cmp-1", role: "user", status: "pending_admin_approval" as const };
  memberships.set(actor.id, { ...actor });
  memberships.set(target.id, { ...target });

  const intents: string[] = [];
  const executed: string[] = [];

  const membershipRepository = {
    async findByCustomerId(customerId: string) {
      for (const membership of memberships.values()) {
        if (membership.customerId === customerId) {
          return { ...membership };
        }
      }
      return null;
    },
    async findById(id: string) {
      const membership = memberships.get(id);
      return membership ? { ...membership } : null;
    },
    async updateStatus(payload: { membershipId: string; companyId: string; status: Status }) {
      const membership = memberships.get(payload.membershipId);
      if (!membership || membership.companyId !== payload.companyId) {
        return false;
      }
      membership.status = payload.status;
      return true;
    },
  };

  const sharedAddressRepository = {
    async enqueueActivationCleanSlateSyncIntent(payload: {
      companyId: string;
      activatedCustomerId: string;
    }) {
      const intentId = `intent-${intents.length + 1}`;
      intents.push(`${intentId}:${payload.companyId}:${payload.activatedCustomerId}`);
      return { syncIntentId: intentId };
    },
  };

  const addressSyncExecutor = {
    async execute(payload: { syncIntentId: string }) {
      executed.push(payload.syncIntentId);
      if (input?.syncShouldFail) {
        throw new AppError("INFRA_UNAVAILABLE", "sync failed", 503, true);
      }
    },
  };

  return {
    service: new ActivateCompanyMemberService(
      membershipRepository,
      sharedAddressRepository,
      addressSyncExecutor,
    ),
    memberships,
    intents,
    executed,
    targetId: target.id,
  };
}

test("activates pending member and runs clean-slate sync", async () => {
  const harness = createHarness();
  const result = await harness.service.execute({
    actorCustomerId: "100",
    memberId: harness.targetId,
    companyId: "cmp-1",
    shop: "shop.myshopify.com",
  });

  assert.equal(result.status, "active");
  assert.equal(result.previousStatus, "pending_admin_approval");
  assert.equal(result.cleanSlateSyncIntentId, "intent-1");
  assert.equal(harness.memberships.get(harness.targetId)?.status, "active");
  assert.deepEqual(harness.intents, ["intent-1:cmp-1:200"]);
  assert.deepEqual(harness.executed, ["intent-1"]);
});

test("activates inactive member without clean-slate sync", async () => {
  const harness = createHarness({
    target: {
      id: "m-target",
      customerId: "200",
      companyId: "cmp-1",
      role: "user",
      status: "inactive",
    },
  });

  const result = await harness.service.execute({
    actorCustomerId: "100",
    memberId: harness.targetId,
    companyId: "cmp-1",
    shop: "shop.myshopify.com",
  });

  assert.equal(result.status, "active");
  assert.equal(result.previousStatus, "inactive");
  assert.equal(result.cleanSlateSyncIntentId, null);
  assert.deepEqual(harness.intents, []);
  assert.deepEqual(harness.executed, []);
});

test("rolls membership status back when clean-slate sync fails", async () => {
  const harness = createHarness({ syncShouldFail: true });

  await assert.rejects(
    () =>
      harness.service.execute({
        actorCustomerId: "100",
        memberId: harness.targetId,
        companyId: "cmp-1",
        shop: "shop.myshopify.com",
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "INFRA_UNAVAILABLE");
      return true;
    },
  );

  assert.equal(harness.memberships.get(harness.targetId)?.status, "pending_admin_approval");
});
