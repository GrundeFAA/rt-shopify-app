import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../../auth/errors";
import { ProcessCompanyAddressSyncIntentService } from "./process-company-address-sync-intent.service";

function buildHarness(input?: {
  intentStatus?: "pending" | "processing" | "succeeded" | "failed";
  recipientCustomerIds?: string[];
}) {
  const state = {
    intentStatus: input?.intentStatus ?? "pending",
    failures: [] as Array<Record<string, unknown>>,
    succeeded: false,
    gatewayCalls: [] as Array<{
      customerId: string;
      canonicalAddresses: Array<{
        line1: string;
        line2: string | null;
        postalCode: string;
        city: string;
        country: string;
        company?: string;
      }>;
    }>,
  };

  const repository = {
    async findSyncIntentById(syncIntentId: string) {
      return {
        id: syncIntentId,
        companyId: "cmp-1",
        companyAddressId: null,
        operation: "ADDRESS_UPDATE" as const,
        status: state.intentStatus,
        recipientCustomerIds: input?.recipientCustomerIds ?? ["101", "102"],
        payload: null,
        createdAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
      };
    },
    async markSyncIntentProcessing() {
      if (state.intentStatus === "processing" || state.intentStatus === "succeeded") {
        return false;
      }
      state.intentStatus = "processing";
      return true;
    },
    async markSyncIntentSucceeded() {
      state.intentStatus = "succeeded";
      state.succeeded = true;
    },
    async markSyncIntentFailed(_intentId: string, details: Record<string, unknown>) {
      state.intentStatus = "failed";
      state.failures.push(details);
    },
    async listByCompanyId() {
      return [
        {
          id: "addr-1",
          companyId: "cmp-1",
          addressType: "delivery" as const,
          label: "HQ",
          line1: "Line 1",
          line2: null,
          postalCode: "0001",
          city: "Oslo",
          country: "NO",
          source: "dashboard" as const,
          createdByMemberId: "m-1",
          createdAt: new Date("2026-04-09T11:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-04-09T11:00:00.000Z").toISOString(),
        },
      ];
    },
  };

  const sessions = {
    async getOfflineSessionByShop(shop: string) {
      return {
        shop,
        accessToken: "token",
      };
    },
  };

  const companyProfiles = {
    async findByCompanyId() {
      return {
        companyId: "cmp-1",
        companyName: "Testfirma",
        orgNumber: "999999999",
        companyAddress: {
          line1: "Postadresse 99",
          line2: "",
          postalCode: "0101",
          city: "Oslo",
          country: "NO",
        },
      };
    },
  };

  const gateway = {
    async replaceCustomerAddresses(payload: {
      customerId: string;
      canonicalAddresses: Array<{
        line1: string;
        line2: string | null;
        postalCode: string;
        city: string;
        country: string;
        company?: string;
      }>;
    }) {
      state.gatewayCalls.push(payload);
    },
  };

  return {
    service: new ProcessCompanyAddressSyncIntentService(repository, sessions, companyProfiles, gateway),
    state,
  };
}

test("processes pending sync intent and marks succeeded", async () => {
  const harness = buildHarness();
  await harness.service.execute({
    syncIntentId: "intent-1",
    shop: "example.myshopify.com",
  });

  assert.equal(harness.state.succeeded, true);
  assert.deepEqual(
    harness.state.gatewayCalls.map((call) => call.customerId),
    ["101", "102"],
  );
  assert.equal(harness.state.gatewayCalls[0]?.canonicalAddresses[0]?.line1, "Postadresse 99");
  assert.equal(harness.state.gatewayCalls[0]?.canonicalAddresses[0]?.company, "Testfirma");
  assert.equal(harness.state.gatewayCalls[0]?.canonicalAddresses[1]?.company, "Testfirma");
  assert.equal(harness.state.intentStatus, "succeeded");
});

test("skips already succeeded sync intent", async () => {
  const harness = buildHarness({ intentStatus: "succeeded" });
  await harness.service.execute({
    syncIntentId: "intent-2",
    shop: "example.myshopify.com",
  });

  assert.equal(harness.state.gatewayCalls.length, 0);
  assert.equal(harness.state.intentStatus, "succeeded");
});

test("skips when sync intent lock is not acquired", async () => {
  const harness = buildHarness({ intentStatus: "processing" });
  await harness.service.execute({
    syncIntentId: "intent-2b",
    shop: "example.myshopify.com",
  });

  assert.equal(harness.state.gatewayCalls.length, 0);
  assert.equal(harness.state.intentStatus, "processing");
  assert.equal(harness.state.succeeded, false);
});

test("marks failed when projection write fails", async () => {
  const harness = buildHarness();
  const service = new ProcessCompanyAddressSyncIntentService(
    {
      ...{
        async findSyncIntentById(syncIntentId: string) {
          return {
            id: syncIntentId,
            companyId: "cmp-1",
            companyAddressId: null,
            operation: "ADDRESS_UPDATE" as const,
            status: "pending" as const,
            recipientCustomerIds: ["101"],
            payload: null,
            createdAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
            updatedAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
          };
        },
        async markSyncIntentProcessing() {
          return true;
        },
        async markSyncIntentSucceeded() {
          throw new Error("should not be called");
        },
        async markSyncIntentFailed(intentId: string, details: Record<string, unknown>) {
          await harness.state.failures.push({ intentId, ...details });
        },
        async listByCompanyId() {
          return [
            {
              id: "addr-1",
              companyId: "cmp-1",
              addressType: "delivery" as const,
              label: "HQ",
              line1: "Line 1",
              line2: null,
              postalCode: "0001",
              city: "Oslo",
              country: "NO",
              source: "dashboard" as const,
              createdByMemberId: "m-1",
              createdAt: new Date("2026-04-09T11:00:00.000Z").toISOString(),
              updatedAt: new Date("2026-04-09T11:00:00.000Z").toISOString(),
            },
          ];
        },
      },
    },
    {
      async getOfflineSessionByShop(shop: string) {
        return {
          shop,
          accessToken: "token",
        };
      },
    },
    {
      async findByCompanyId() {
        return {
          companyId: "cmp-1",
          companyName: "Testfirma",
          orgNumber: "999999999",
          companyAddress: {
            line1: "Postadresse 99",
            line2: "",
            postalCode: "0101",
            city: "Oslo",
            country: "NO",
          },
        };
      },
    },
    {
      async replaceCustomerAddresses() {
        throw new AppError("SHOPIFY_TEMPORARY_FAILURE", "boom", 503, true);
      },
    },
  );

  await assert.rejects(
    () =>
      service.execute({
        syncIntentId: "intent-3",
        shop: "example.myshopify.com",
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "SHOPIFY_TEMPORARY_FAILURE");
      return true;
    },
  );

  assert.equal(harness.state.failures.length, 1);
});

test("dedupes delivery address when it matches post address", async () => {
  const gatewayCalls: Array<{
    customerId: string;
    canonicalAddresses: Array<{
      line1: string;
      line2: string | null;
      postalCode: string;
      city: string;
      country: string;
      company?: string;
    }>;
  }> = [];
  const service = new ProcessCompanyAddressSyncIntentService(
    {
      async findSyncIntentById(syncIntentId: string) {
        return {
          id: syncIntentId,
          companyId: "cmp-1",
          companyAddressId: null,
          operation: "ADDRESS_UPDATE" as const,
          status: "pending" as const,
          recipientCustomerIds: ["101"],
          payload: null,
          createdAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
        };
      },
      async markSyncIntentProcessing() {
        return true;
      },
      async markSyncIntentSucceeded() {
        return;
      },
      async markSyncIntentFailed() {
        throw new Error("should not be called");
      },
      async listByCompanyId() {
        return [
          {
            id: "addr-dup",
            companyId: "cmp-1",
            addressType: "delivery" as const,
            label: "Dup",
            line1: "Postadresse 99",
            line2: null,
            postalCode: "0101",
            city: "Oslo",
            country: "NO",
            source: "dashboard" as const,
            createdByMemberId: "m-1",
            createdAt: new Date("2026-04-09T11:00:00.000Z").toISOString(),
            updatedAt: new Date("2026-04-09T11:00:00.000Z").toISOString(),
          },
          {
            id: "addr-unique",
            companyId: "cmp-1",
            addressType: "delivery" as const,
            label: "Unique",
            line1: "Street 2",
            line2: "2",
            postalCode: "0002",
            city: "Oslo",
            country: "NO",
            source: "dashboard" as const,
            createdByMemberId: "m-1",
            createdAt: new Date("2026-04-09T12:00:00.000Z").toISOString(),
            updatedAt: new Date("2026-04-09T12:00:00.000Z").toISOString(),
          },
        ];
      },
    },
    {
      async getOfflineSessionByShop(shop: string) {
        return { shop, accessToken: "token" };
      },
    },
    {
      async findByCompanyId() {
        return {
          companyId: "cmp-1",
          companyName: "Testfirma",
          orgNumber: "999999999",
          companyAddress: {
            line1: "Postadresse 99",
            line2: "",
            postalCode: "0101",
            city: "Oslo",
            country: "NO",
          },
        };
      },
    },
    {
      async replaceCustomerAddresses(payload: {
        customerId: string;
        canonicalAddresses: Array<{
          line1: string;
          line2: string | null;
          postalCode: string;
          city: string;
          country: string;
          company?: string;
        }>;
      }) {
        gatewayCalls.push(payload);
      },
    },
  );

  await service.execute({
    syncIntentId: "intent-dedupe",
    shop: "example.myshopify.com",
  });

  assert.equal(gatewayCalls.length, 1);
  assert.equal(gatewayCalls[0]?.canonicalAddresses.length, 2);
  assert.equal(gatewayCalls[0]?.canonicalAddresses[0]?.line1, "Postadresse 99");
  assert.equal(gatewayCalls[0]?.canonicalAddresses[1]?.line1, "Street 2");
});

