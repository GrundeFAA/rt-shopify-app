import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../../auth/errors";
import { CompanySharedAddressesService } from "./company-shared-addresses.service";

type MembershipStatus =
  | "active"
  | "inactive"
  | "pending_user_acceptance"
  | "pending_admin_approval"
  | "unknown";

type MembershipRecord = {
  id: string;
  customerId: string;
  companyId: string;
  status: MembershipStatus;
};

type AddressRecord = {
  id: string;
  companyId: string;
  addressType: "post" | "delivery";
  label: string | null;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  source: "dashboard" | "checkout_import";
  createdByMemberId: string;
  createdAt: string;
  updatedAt: string;
};

function createHarness(input?: { memberships?: MembershipRecord[]; addresses?: AddressRecord[] }) {
  const memberships = new Map<string, MembershipRecord>();
  for (const membership of input?.memberships ?? []) {
    memberships.set(membership.customerId, { ...membership });
  }

  const addresses = new Map<string, AddressRecord>();
  for (const address of input?.addresses ?? []) {
    addresses.set(address.id, { ...address });
  }

  const syncIntents: string[] = [];
  let addressCounter = 1000;
  let syncIntentCounter = 5000;

  const repository = {
    async findMembershipByCustomerId(customerId: string) {
      const membership = memberships.get(customerId);
      return membership ? { ...membership } : null;
    },
    async listByCompanyId(companyId: string) {
      return [...addresses.values()]
        .filter((address) => address.companyId === companyId)
        .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    },
    async findByIdAndCompanyId(companyId: string, addressId: string) {
      const address = addresses.get(addressId);
      if (!address || address.companyId !== companyId) {
        return null;
      }
      return { ...address };
    },
    async listSyncEligibleCustomerIds(companyId: string) {
      return [...memberships.values()]
        .filter((member) => member.companyId === companyId)
        .filter((member) => member.status === "active" || member.status === "inactive")
        .map((member) => member.customerId)
        .sort();
    },
    async createWithSyncIntent(payload: {
      companyId: string;
      actorMembershipId: string;
      address: {
        label?: string;
        line1: string;
        line2?: string;
        postalCode: string;
        city: string;
        country: string;
      };
      syncEligibleCustomerIds: string[];
    }) {
      addressCounter += 1;
      syncIntentCounter += 1;
      const now = new Date("2026-04-09T12:00:00.000Z").toISOString();
      const id = `addr-${addressCounter}`;
      const created: AddressRecord = {
        id,
        companyId: payload.companyId,
        addressType: "delivery",
        label: payload.address.label ?? null,
        line1: payload.address.line1,
        line2: payload.address.line2 ?? null,
        postalCode: payload.address.postalCode,
        city: payload.address.city,
        country: payload.address.country,
        source: "dashboard",
        createdByMemberId: payload.actorMembershipId,
        createdAt: now,
        updatedAt: now,
      };
      addresses.set(created.id, created);
      syncIntents.push(`intent-${syncIntentCounter}:${payload.syncEligibleCustomerIds.join(",")}`);

      return {
        address: { ...created },
        syncIntentId: `intent-${syncIntentCounter}`,
      };
    },
    async updateWithSyncIntent(payload: {
      companyId: string;
      addressId: string;
      address: {
        label?: string;
        line1: string;
        line2?: string;
        postalCode: string;
        city: string;
        country: string;
      };
      syncEligibleCustomerIds: string[];
    }) {
      const existing = addresses.get(payload.addressId);
      if (!existing || existing.companyId !== payload.companyId) {
        return null;
      }

      syncIntentCounter += 1;
      const updated: AddressRecord = {
        ...existing,
        label: payload.address.label ?? null,
        line1: payload.address.line1,
        line2: payload.address.line2 ?? null,
        postalCode: payload.address.postalCode,
        city: payload.address.city,
        country: payload.address.country,
        updatedAt: new Date("2026-04-09T13:00:00.000Z").toISOString(),
      };
      addresses.set(existing.id, updated);
      syncIntents.push(`intent-${syncIntentCounter}:${payload.syncEligibleCustomerIds.join(",")}`);

      return {
        address: { ...updated },
        syncIntentId: `intent-${syncIntentCounter}`,
      };
    },
    async deleteWithSyncIntent(payload: {
      companyId: string;
      addressId: string;
      syncEligibleCustomerIds: string[];
    }) {
      const existing = addresses.get(payload.addressId);
      if (!existing || existing.companyId !== payload.companyId) {
        return null;
      }

      syncIntentCounter += 1;
      addresses.delete(existing.id);
      syncIntents.push(`intent-${syncIntentCounter}:${payload.syncEligibleCustomerIds.join(",")}`);

      return {
        deletedAddressId: existing.id,
        syncIntentId: `intent-${syncIntentCounter}`,
      };
    },
  };

  return {
    service: new CompanySharedAddressesService(repository),
    memberships,
    addresses,
    syncIntents,
  };
}

test("enforces company scope and active-only mutations", async () => {
  const harness = createHarness({
    memberships: [
      {
        id: "m-1",
        customerId: "100",
        companyId: "cmp-1",
        status: "inactive",
      },
    ],
  });

  await assert.rejects(
    () =>
      harness.service.create({
        companyId: "cmp-1",
        customerId: "100",
        address: {
          line1: "Street 1",
          postalCode: "0001",
          city: "Oslo",
          country: "NO",
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "AUTH_INACTIVE_MEMBERSHIP");
      return true;
    },
  );

  await assert.rejects(
    () =>
      harness.service.list({
        companyId: "cmp-other",
        customerId: "100",
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "AUTH_NO_MEMBERSHIP");
      return true;
    },
  );
});

test("supports create update delete canonical flow", async () => {
  const harness = createHarness({
    memberships: [
      {
        id: "m-10",
        customerId: "200",
        companyId: "cmp-1",
        status: "active",
      },
      {
        id: "m-11",
        customerId: "201",
        companyId: "cmp-1",
        status: "inactive",
      },
      {
        id: "m-12",
        customerId: "202",
        companyId: "cmp-1",
        status: "pending_admin_approval",
      },
    ],
  });

  const created = await harness.service.create({
    companyId: "cmp-1",
    customerId: "200",
    address: {
      label: "HQ",
      line1: "Street 10",
      postalCode: "0150",
      city: "Oslo",
      country: "no",
    },
  });

  assert.equal(created.address.line1, "Street 10");
  assert.equal(created.address.country, "NO");
  assert.equal(harness.syncIntents.length, 1);
  assert.equal(harness.syncIntents[0], "intent-5001:200,201");

  const updated = await harness.service.update({
    companyId: "cmp-1",
    customerId: "200",
    addressId: created.address.id,
    address: {
      label: "HQ Updated",
      line1: "Street 11",
      postalCode: "0151",
      city: "Oslo",
      country: "NO",
    },
  });

  assert.equal(updated.address.line1, "Street 11");
  assert.equal(harness.syncIntents.length, 2);

  const deleted = await harness.service.delete({
    companyId: "cmp-1",
    customerId: "200",
    addressId: created.address.id,
  });
  assert.equal(deleted.deletedAddressId, created.address.id);
  assert.equal(harness.syncIntents.length, 3);
  assert.equal(harness.addresses.size, 0);
});
