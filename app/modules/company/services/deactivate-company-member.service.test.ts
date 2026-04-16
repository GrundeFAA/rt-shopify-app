import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../../auth/errors";
import { DeactivateCompanyMemberService } from "./deactivate-company-member.service";

type Status = "active" | "inactive" | "pending_user_acceptance" | "pending_admin_approval";

function createHarness(input?: {
  actor?: { id: string; customerId: string; companyId: string; role: "administrator" | "user"; status: Status };
  target?: { id: string; customerId: string; companyId: string; role: "administrator" | "user"; status: Status };
}) {
  const memberships = new Map<string, { id: string; customerId: string; companyId: string; role: "administrator" | "user"; status: Status }>();
  const actor =
    input?.actor ??
    { id: "m-actor", customerId: "100", companyId: "cmp-1", role: "administrator", status: "active" as const };
  const target =
    input?.target ??
    { id: "m-target", customerId: "200", companyId: "cmp-1", role: "user", status: "active" as const };
  memberships.set(actor.id, { ...actor });
  memberships.set(target.id, { ...target });

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

  return {
    service: new DeactivateCompanyMemberService(membershipRepository),
    memberships,
    targetId: target.id,
  };
}

test("deactivates active member", async () => {
  const harness = createHarness();
  const result = await harness.service.execute({
    actorCustomerId: "100",
    memberId: harness.targetId,
    companyId: "cmp-1",
  });

  assert.equal(result.status, "inactive");
  assert.equal(result.previousStatus, "active");
  assert.equal(harness.memberships.get(harness.targetId)?.status, "inactive");
});

test("blocks deactivation from non-active state", async () => {
  const harness = createHarness({
    target: {
      id: "m-target",
      customerId: "200",
      companyId: "cmp-1",
      role: "user",
      status: "pending_admin_approval",
    },
  });

  await assert.rejects(
    () =>
      harness.service.execute({
        actorCustomerId: "100",
        memberId: harness.targetId,
        companyId: "cmp-1",
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "VALIDATION_FAILED");
      return true;
    },
  );
});
