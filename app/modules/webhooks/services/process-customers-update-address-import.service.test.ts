import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../../auth/errors";
import { ProcessCustomersUpdateAddressImportService } from "./process-customers-update-address-import.service";

type MembershipStatus =
  | "active"
  | "inactive"
  | "pending_user_acceptance"
  | "pending_admin_approval"
  | "unknown";

function createHarness(input: {
  membership:
    | {
        id: string;
        customerId: string;
        companyId: string;
        status: MembershipStatus;
      }
    | null;
  existingKeys?: string[];
  syncEligibleCustomerIds?: string[];
  canonicalSharedAddresses?: Array<{
    line1: string;
    line2: string | null;
    postalCode: string;
    city: string;
    country: string;
  }>;
  companyAddress?: {
    line1: string;
    line2?: string;
    postalCode: string;
    city: string;
    country: string;
  };
}) {
  const seenAddresses = new Set(input.existingKeys ?? []);
  const imported: string[] = [];
  const syncIntentIds: string[] = [];
  const recipientBatches: string[][] = [];
  const reconcileRecipientBatches: string[][] = [];
  let syncIntentCounter = 0;

  const repository = {
    async findMembershipByCustomerId() {
      return input.membership;
    },
    async listSyncEligibleCustomerIds() {
      return input.syncEligibleCustomerIds ?? ["1001", "1002"];
    },
    async importCheckoutAddressWithSyncIntent(payload: {
      companyId: string;
      actorMembershipId: string;
      triggeredByCustomerId: string;
      address: {
        line1: string;
        line2: string | null;
        postalCode: string;
        city: string;
        country: string;
      };
      syncEligibleCustomerIds: string[];
    }) {
      recipientBatches.push(payload.syncEligibleCustomerIds);
      const key = [
        payload.companyId,
        payload.address.line1.toLowerCase(),
        payload.address.line2?.toLowerCase() ?? "",
        payload.address.postalCode.toLowerCase(),
        payload.address.city.toLowerCase(),
        payload.address.country.toLowerCase(),
      ].join("|");

      if (seenAddresses.has(key)) {
        return {
          imported: false,
          address: null,
          syncIntentId: null,
        };
      }
      seenAddresses.add(key);

      imported.push(key);
      syncIntentCounter += 1;
      const intentId = `intent-${syncIntentCounter}`;
      syncIntentIds.push(intentId);

      return {
        imported: true,
        address: {
          id: `addr-${syncIntentCounter}`,
          companyId: payload.companyId,
          addressType: "delivery" as const,
          label: null,
          line1: payload.address.line1,
          line2: payload.address.line2,
          postalCode: payload.address.postalCode,
          city: payload.address.city,
          country: payload.address.country,
          source: "checkout_import" as const,
          createdByMemberId: payload.actorMembershipId,
          createdAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
        },
        syncIntentId: intentId,
      };
    },
    async enqueueWebhookReconcileSyncIntent(payload: {
      companyId: string;
      triggeredByCustomerId: string;
      syncEligibleCustomerIds: string[];
    }) {
      void payload.companyId;
      void payload.triggeredByCustomerId;
      reconcileRecipientBatches.push(payload.syncEligibleCustomerIds);
      syncIntentCounter += 1;
      const intentId = `intent-${syncIntentCounter}`;
      syncIntentIds.push(intentId);
      return {
        syncIntentId: intentId,
      };
    },
    async hasRecentWebhookReconcileIntent() {
      return false;
    },
    async listByCompanyId() {
      return (input.canonicalSharedAddresses ?? []).map((address, index) => ({
        id: `addr-${index + 1}`,
        companyId: input.membership?.companyId ?? "cmp-1",
        addressType: "delivery" as const,
        label: null,
        line1: address.line1,
        line2: address.line2,
        postalCode: address.postalCode,
        city: address.city,
        country: address.country,
        source: "checkout_import" as const,
        createdByMemberId: input.membership?.id ?? "m-1",
        createdAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
      }));
    },
  };

  const companyProfileRepository = {
    async findByCompanyId() {
      return {
        id: "profile-1",
        companyId: input.membership?.companyId ?? "cmp-1",
        companyName: "Test Company",
        orgNumber: "123",
        companyAddress: input.companyAddress ?? {
          line1: "Street 1",
          line2: undefined,
          postalCode: "0001",
          city: "Oslo",
          country: "NO",
        },
        contactEmail: "test@example.com",
        contactPhone: null,
        website: null,
        invoiceEmail: null,
        invoiceReference: null,
        createdAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
      };
    },
  };

  return {
    service: new ProcessCustomersUpdateAddressImportService(repository, companyProfileRepository),
    imported,
    syncIntentIds,
    recipientBatches,
    reconcileRecipientBatches,
  };
}

test("imports normalized/deduped addresses for active member and enqueues sync intents", async () => {
  const harness = createHarness({
    membership: {
      id: "m-1",
      customerId: "1001",
      companyId: "cmp-1",
      status: "active",
    },
  });

  const result = await harness.service.execute({
    webhookId: "wh_1",
    topic: "customers/update",
    shop: "example.myshopify.com",
    payload: {
      id: "1001",
      default_address: {
        address1: "Street 1",
        address2: "",
        zip: "0001",
        city: "Oslo",
        country_code: "no",
      },
      addresses: [
        {
          address1: "Street 1",
          address2: null,
          zip: "0001",
          city: "Oslo",
          country_code: "NO",
        },
        {
          address1: "Street 2",
          address2: "2",
          zip: "0002",
          city: "Oslo",
          country_code: "NO",
        },
      ],
    },
  });

  assert.equal(result.outcome, "processed_imported_addresses");
  assert.equal(result.importedCount, 1);
  assert.deepEqual(result.syncIntentIds, ["intent-1"]);
  assert.equal(harness.imported.length, 1);
  assert.deepEqual(harness.recipientBatches, [["1001", "1002"]]);
});

test("returns no-op for pending membership and missing membership", async () => {
  const pendingHarness = createHarness({
    membership: {
      id: "m-2",
      customerId: "1002",
      companyId: "cmp-1",
      status: "pending_admin_approval",
    },
  });
  const pendingResult = await pendingHarness.service.execute({
    webhookId: "wh_2",
    topic: "customers/update",
    shop: "example.myshopify.com",
    payload: {
      id: "1002",
      addresses: [
        {
          address1: "Street 3",
          zip: "0003",
          city: "Oslo",
          country_code: "NO",
        },
      ],
    },
  });
  assert.equal(pendingResult.outcome, "ignored_pending_membership");
  assert.equal(pendingResult.importedCount, 0);

  const missingHarness = createHarness({ membership: null });
  const missingResult = await missingHarness.service.execute({
    webhookId: "wh_3",
    topic: "customers/update",
    shop: "example.myshopify.com",
    payload: {
      id: "9999",
      addresses: [],
    },
  });
  assert.equal(missingResult.outcome, "ignored_no_membership");
  assert.equal(missingResult.importedCount, 0);
});

test("is idempotent for duplicate external addresses", async () => {
  const existingKey = ["cmp-1", "street 9", "", "0009", "oslo", "no"].join("|");
  const harness = createHarness({
    membership: {
      id: "m-3",
      customerId: "1003",
      companyId: "cmp-1",
      status: "inactive",
    },
    existingKeys: [existingKey],
    companyAddress: {
      line1: "Street 9",
      line2: undefined,
      postalCode: "0009",
      city: "Oslo",
      country: "NO",
    },
  });

  const result = await harness.service.execute({
    webhookId: "wh_4",
    topic: "customers/update",
    shop: "example.myshopify.com",
    payload: {
      id: "1003",
      default_address: {
        address1: "Street 9",
        zip: "0009",
        city: "Oslo",
        country_code: "NO",
      },
      addresses: [
        {
          address1: "Street 9",
          zip: "0009",
          city: "Oslo",
          country_code: "NO",
        },
      ],
    },
  });

  assert.equal(result.outcome, "ignored_all_deduped");
  assert.equal(result.importedCount, 0);
  assert.deepEqual(result.syncIntentIds, []);
  assert.deepEqual(harness.reconcileRecipientBatches, []);
});

test("enqueues reconcile when webhook payload is missing canonical addresses", async () => {
  const harness = createHarness({
    membership: {
      id: "m-4",
      customerId: "1004",
      companyId: "cmp-1",
      status: "active",
    },
    existingKeys: [["cmp-1", "street 9", "", "0009", "oslo", "no"].join("|")],
    canonicalSharedAddresses: [
      {
        line1: "Street 9",
        line2: null,
        postalCode: "0009",
        city: "Oslo",
        country: "NO",
      },
      {
        line1: "Street 10",
        line2: null,
        postalCode: "0010",
        city: "Oslo",
        country: "NO",
      },
    ],
    companyAddress: {
      line1: "Street 1",
      line2: undefined,
      postalCode: "0001",
      city: "Oslo",
      country: "NO",
    },
  });

  const result = await harness.service.execute({
    webhookId: "wh_5",
    topic: "customers/update",
    shop: "example.myshopify.com",
    payload: {
      id: "1004",
      addresses: [
        {
          address1: "Street 9",
          zip: "0009",
          city: "Oslo",
          country_code: "NO",
        },
      ],
    },
  });

  assert.equal(result.outcome, "processed_reconcile_only");
  assert.equal(result.importedCount, 0);
  assert.deepEqual(result.syncIntentIds, ["intent-1"]);
  assert.deepEqual(harness.reconcileRecipientBatches, [["1001", "1002"]]);
});

test("skips reconcile when recent webhook reconcile exists", async () => {
  const repository = {
    async findMembershipByCustomerId() {
      return {
        id: "m-6",
        customerId: "1006",
        companyId: "cmp-1",
        status: "active",
      } as const;
    },
    async listSyncEligibleCustomerIds() {
      return ["1001", "1002"];
    },
    async importCheckoutAddressWithSyncIntent() {
      return {
        imported: false,
        address: null,
        syncIntentId: null,
      } as const;
    },
    async enqueueWebhookReconcileSyncIntent() {
      throw new Error("should not enqueue when cooldown is active");
    },
    async hasRecentWebhookReconcileIntent() {
      return true;
    },
    async listByCompanyId() {
      return [
        {
          id: "addr-10",
          companyId: "cmp-1",
          addressType: "delivery" as const,
          label: null,
          line1: "Street 10",
          line2: null,
          postalCode: "0010",
          city: "Oslo",
          country: "NO",
          source: "checkout_import" as const,
          createdByMemberId: "m-6",
          createdAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
        },
      ];
    },
  };
  const companyProfileRepository = {
    async findByCompanyId() {
      return {
        id: "profile-1",
        companyId: "cmp-1",
        companyName: "Test Company",
        orgNumber: "123",
        companyAddress: {
          line1: "Street 1",
          line2: undefined,
          postalCode: "0001",
          city: "Oslo",
          country: "NO",
        },
        contactEmail: "test@example.com",
        contactPhone: null,
        website: null,
        invoiceEmail: null,
        invoiceReference: null,
        createdAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
      };
    },
  };

  const service = new ProcessCustomersUpdateAddressImportService(repository, companyProfileRepository);
  const result = await service.execute({
    webhookId: "wh_6",
    topic: "customers/update",
    shop: "example.myshopify.com",
    payload: {
      id: "1006",
      addresses: [
        {
          address1: "Street 9",
          zip: "0009",
          city: "Oslo",
          country_code: "NO",
        },
      ],
    },
  });

  assert.equal(result.outcome, "ignored_all_deduped");
  assert.equal(result.importedCount, 0);
  assert.deepEqual(result.syncIntentIds, []);
});

test("propagates retryable import failures for webhook retry behavior", async () => {
  const service = new ProcessCustomersUpdateAddressImportService(
    {
      async findMembershipByCustomerId() {
        return {
          id: "m-retry",
          customerId: "2001",
          companyId: "cmp-2",
          status: "active",
        } as const;
      },
      async listSyncEligibleCustomerIds() {
        return ["2001", "2002"];
      },
      async importCheckoutAddressWithSyncIntent() {
        throw new AppError(
          "INFRA_UNAVAILABLE",
          "Database unavailable while persisting imported checkout address.",
          503,
          true,
        );
      },
      async enqueueWebhookReconcileSyncIntent() {
        throw new Error("should not be called");
      },
      async hasRecentWebhookReconcileIntent() {
        return false;
      },
      async listByCompanyId() {
        return [];
      },
    },
    {
      async findByCompanyId() {
        return {
          id: "profile-1",
          companyId: "cmp-2",
          companyName: "Retry Company",
          orgNumber: "123",
          companyAddress: {
            line1: "Post 1",
            line2: undefined,
            postalCode: "1111",
            city: "Oslo",
            country: "NO",
          },
          contactEmail: null,
          contactPhone: null,
          website: null,
          invoiceEmail: null,
          invoiceReference: null,
          createdAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
          updatedAt: new Date("2026-04-09T10:00:00.000Z").toISOString(),
        };
      },
    },
  );

  await assert.rejects(
    () =>
      service.execute({
        webhookId: "wh_retry",
        topic: "customers/update",
        shop: "example.myshopify.com",
        payload: {
          id: "2001",
          default_address: {
            address1: "Street Retry",
            zip: "2000",
            city: "Oslo",
            country_code: "NO",
          },
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "INFRA_UNAVAILABLE");
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

test("does not import canonical post address from webhook payload", async () => {
  const harness = createHarness({
    membership: {
      id: "m-post",
      customerId: "3001",
      companyId: "cmp-post",
      status: "active",
    },
    companyAddress: {
      line1: "Post 100",
      line2: undefined,
      postalCode: "0100",
      city: "Oslo",
      country: "NO",
    },
  });

  const result = await harness.service.execute({
    webhookId: "wh_post",
    topic: "customers/update",
    shop: "example.myshopify.com",
    payload: {
      id: "3001",
      default_address: {
        address1: "Post 100",
        zip: "0100",
        city: "Oslo",
        country_code: "NO",
      },
      addresses: [
        {
          address1: "Post 100",
          zip: "0100",
          city: "Oslo",
          country_code: "NO",
        },
      ],
    },
  });

  assert.equal(result.outcome, "ignored_all_deduped");
  assert.equal(result.importedCount, 0);
  assert.deepEqual(result.syncIntentIds, []);
  assert.equal(harness.imported.length, 0);
});
