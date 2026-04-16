import type { PrismaClient } from "@prisma/client";
import type { CompanySharedAddressInput } from "../../../contracts/company-addresses.schema";

export type CompanyMembershipStatus =
  | "active"
  | "inactive"
  | "pending_user_acceptance"
  | "pending_admin_approval"
  | "unknown";

export type CompanyMembershipActorRecord = {
  id: string;
  customerId: string;
  companyId: string;
  status: CompanyMembershipStatus;
};

export type CompanySharedAddressRecord = {
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

export type CompanyAddressSyncIntentRecord = {
  id: string;
  companyId: string;
  companyAddressId: string | null;
  operation: "ADDRESS_CREATE" | "ADDRESS_UPDATE" | "ADDRESS_DELETE";
  status: "pending" | "processing" | "succeeded" | "failed";
  recipientCustomerIds: string[];
  payload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

function normalizeIntentOperation(value: string): CompanyAddressSyncIntentRecord["operation"] {
  if (value === "ADDRESS_CREATE" || value === "ADDRESS_UPDATE" || value === "ADDRESS_DELETE") {
    return value;
  }
  return "ADDRESS_UPDATE";
}

function normalizeIntentStatus(value: string): CompanyAddressSyncIntentRecord["status"] {
  if (value === "pending" || value === "processing" || value === "succeeded" || value === "failed") {
    return value;
  }
  return "pending";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function mapSyncIntentRecord(record: {
  id: string;
  companyId: string;
  companyAddressId: string | null;
  operation: string;
  status: string;
  recipientCustomerIds: unknown;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
}): CompanyAddressSyncIntentRecord {
  const payload =
    record.payload && typeof record.payload === "object" && !Array.isArray(record.payload)
      ? (record.payload as Record<string, unknown>)
      : null;

  return {
    id: record.id,
    companyId: record.companyId,
    companyAddressId: record.companyAddressId,
    operation: normalizeIntentOperation(record.operation),
    status: normalizeIntentStatus(record.status),
    recipientCustomerIds: toStringArray(record.recipientCustomerIds),
    payload,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeMembershipStatus(status: string): CompanyMembershipStatus {
  if (status === "active" || status === "inactive") {
    return status;
  }
  if (status === "pending_user_acceptance" || status === "pending_admin_approval") {
    return status;
  }

  return "unknown";
}

function mapAddressRecord(record: {
  id: string;
  companyId: string;
  addressType: string;
  label: string | null;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  source: string;
  createdByMemberId: string;
  createdAt: Date;
  updatedAt: Date;
}): CompanySharedAddressRecord {
  return {
    id: record.id,
    companyId: record.companyId,
    addressType: record.addressType === "post" ? "post" : "delivery",
    label: record.label,
    line1: record.line1,
    line2: record.line2,
    postalCode: record.postalCode,
    city: record.city,
    country: record.country,
    source: record.source === "checkout_import" ? "checkout_import" : "dashboard",
    createdByMemberId: record.createdByMemberId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export class CompanySharedAddressesRepository {
  private static readonly STALE_PROCESSING_LOCK_MS = 5 * 60 * 1000;

  constructor(private readonly prisma: PrismaClient) {}

  async findMembershipByCustomerId(customerId: string): Promise<CompanyMembershipActorRecord | null> {
    const membership = await this.prisma.companyMembership.findUnique({
      where: { customerId },
      select: {
        id: true,
        customerId: true,
        companyId: true,
        status: true,
      },
    });
    if (!membership) {
      return null;
    }

    return {
      id: membership.id,
      customerId: membership.customerId,
      companyId: membership.companyId,
      status: normalizeMembershipStatus(membership.status),
    };
  }

  async listByCompanyId(companyId: string): Promise<CompanySharedAddressRecord[]> {
    const addresses = await this.prisma.companySharedAddress.findMany({
      where: {
        companyId,
        addressType: "delivery",
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });

    return addresses.map(mapAddressRecord);
  }

  async findByIdAndCompanyId(
    companyId: string,
    addressId: string,
  ): Promise<CompanySharedAddressRecord | null> {
    const address = await this.prisma.companySharedAddress.findFirst({
      where: {
        id: addressId,
        companyId,
        addressType: "delivery",
      },
    });

    return address ? mapAddressRecord(address) : null;
  }

  async listSyncEligibleCustomerIds(companyId: string): Promise<string[]> {
    const members = await this.prisma.companyMembership.findMany({
      where: {
        companyId,
        status: {
          in: ["active", "inactive"],
        },
      },
      select: {
        customerId: true,
      },
      orderBy: {
        customerId: "asc",
      },
    });

    return members.map((member) => member.customerId);
  }

  async importCheckoutAddressWithSyncIntent(input: {
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
  }): Promise<{
    imported: boolean;
    address: CompanySharedAddressRecord | null;
    syncIntentId: string | null;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.companySharedAddress.findFirst({
        where: {
          companyId: input.companyId,
          addressType: "delivery",
          line1: input.address.line1,
          line2: input.address.line2,
          postalCode: input.address.postalCode,
          city: input.address.city,
          country: input.address.country,
        },
      });

      if (existing) {
        return {
          imported: false,
          address: mapAddressRecord(existing),
          syncIntentId: null,
        };
      }

      const created = await tx.companySharedAddress.create({
        data: {
          companyId: input.companyId,
          addressType: "delivery",
          label: null,
          line1: input.address.line1,
          line2: input.address.line2,
          postalCode: input.address.postalCode,
          city: input.address.city,
          country: input.address.country,
          source: "checkout_import",
          createdByMemberId: input.actorMembershipId,
        },
      });

      const intent = await tx.companyAddressSyncIntent.create({
        data: {
          companyId: input.companyId,
          companyAddressId: created.id,
          operation: "ADDRESS_CREATE",
          status: "pending",
          recipientCustomerIds: input.syncEligibleCustomerIds,
          payload: {
            trigger: "customers_update_webhook",
            triggerCustomerId: input.triggeredByCustomerId,
            addressId: created.id,
          },
        },
      });

      return {
        imported: true,
        address: mapAddressRecord(created),
        syncIntentId: intent.id,
      };
    });
  }

  async enqueueWebhookReconcileSyncIntent(input: {
    companyId: string;
    triggeredByCustomerId: string;
    syncEligibleCustomerIds: string[];
  }): Promise<{ syncIntentId: string }> {
    const intent = await this.prisma.companyAddressSyncIntent.create({
      data: {
        companyId: input.companyId,
        companyAddressId: null,
        operation: "ADDRESS_UPDATE",
        status: "pending",
        recipientCustomerIds: input.syncEligibleCustomerIds,
        payload: {
          trigger: "customers_update_webhook",
          triggerCustomerId: input.triggeredByCustomerId,
          reconcileOnly: true,
        },
      },
    });

    return {
      syncIntentId: intent.id,
    };
  }

  async enqueueDashboardPostAddressSyncIntent(input: {
    companyId: string;
    syncEligibleCustomerIds: string[];
  }): Promise<{ syncIntentId: string }> {
    const intent = await this.prisma.companyAddressSyncIntent.create({
      data: {
        companyId: input.companyId,
        companyAddressId: null,
        operation: "ADDRESS_UPDATE",
        status: "pending",
        recipientCustomerIds: input.syncEligibleCustomerIds,
        payload: {
          trigger: "dashboard_post_address_update",
        },
      },
    });

    return {
      syncIntentId: intent.id,
    };
  }

  async enqueueRecoverySyncIntent(input: {
    companyId: string;
    syncEligibleCustomerIds: string[];
    reason: string;
  }): Promise<{ syncIntentId: string }> {
    const intent = await this.prisma.companyAddressSyncIntent.create({
      data: {
        companyId: input.companyId,
        companyAddressId: null,
        operation: "ADDRESS_UPDATE",
        status: "pending",
        recipientCustomerIds: input.syncEligibleCustomerIds,
        payload: {
          trigger: "rollback_recovery",
          reason: input.reason,
        },
      },
    });

    return {
      syncIntentId: intent.id,
    };
  }

  async enqueueActivationCleanSlateSyncIntent(input: {
    companyId: string;
    activatedCustomerId: string;
  }): Promise<{ syncIntentId: string }> {
    const intent = await this.prisma.companyAddressSyncIntent.create({
      data: {
        companyId: input.companyId,
        companyAddressId: null,
        operation: "ADDRESS_UPDATE",
        status: "pending",
        recipientCustomerIds: [input.activatedCustomerId],
        payload: {
          trigger: "membership_activation_clean_slate",
          activatedCustomerId: input.activatedCustomerId,
        },
      },
    });

    return {
      syncIntentId: intent.id,
    };
  }

  async hasRecentWebhookReconcileIntent(input: {
    companyId: string;
    triggeredByCustomerId: string;
    withinSeconds: number;
  }): Promise<boolean> {
    void input.triggeredByCustomerId;
    const windowStart = new Date(Date.now() - Math.max(1, input.withinSeconds) * 1000);
    const existing = await this.prisma.companyAddressSyncIntent.findFirst({
      where: {
        companyId: input.companyId,
        operation: "ADDRESS_UPDATE",
        status: {
          in: ["pending", "processing", "succeeded"],
        },
        createdAt: {
          gte: windowStart,
        },
        payload: {
          path: ["trigger"],
          equals: "customers_update_webhook",
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Boolean(existing);
  }

  async createWithSyncIntent(input: {
    companyId: string;
    actorMembershipId: string;
    address: CompanySharedAddressInput;
    syncEligibleCustomerIds: string[];
  }): Promise<{ address: CompanySharedAddressRecord; syncIntentId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.companySharedAddress.create({
        data: {
          companyId: input.companyId,
          addressType: "delivery",
          label: input.address.label?.trim() || null,
          line1: input.address.line1.trim(),
          line2: input.address.line2?.trim() || null,
          postalCode: input.address.postalCode.trim(),
          city: input.address.city.trim(),
          country: input.address.country.trim().toUpperCase(),
          source: "dashboard",
          createdByMemberId: input.actorMembershipId,
        },
      });

      const intent = await tx.companyAddressSyncIntent.create({
        data: {
          companyId: input.companyId,
          companyAddressId: created.id,
          operation: "ADDRESS_CREATE",
          status: "pending",
          recipientCustomerIds: input.syncEligibleCustomerIds,
          payload: {
            trigger: "dashboard",
            addressId: created.id,
            rollback: {
              kind: "create",
              createdAddressId: created.id,
            },
          },
        },
      });

      return {
        address: mapAddressRecord(created),
        syncIntentId: intent.id,
      };
    });
  }

  async updateWithSyncIntent(input: {
    companyId: string;
    addressId: string;
    address: CompanySharedAddressInput;
    syncEligibleCustomerIds: string[];
  }): Promise<{ address: CompanySharedAddressRecord; syncIntentId: string } | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.companySharedAddress.findFirst({
        where: {
          id: input.addressId,
          companyId: input.companyId,
          addressType: "delivery",
        },
      });
      if (!existing) {
        return null;
      }

      const updated = await tx.companySharedAddress.update({
        where: { id: existing.id },
        data: {
          label: input.address.label?.trim() || null,
          line1: input.address.line1.trim(),
          line2: input.address.line2?.trim() || null,
          postalCode: input.address.postalCode.trim(),
          city: input.address.city.trim(),
          country: input.address.country.trim().toUpperCase(),
        },
      });

      const intent = await tx.companyAddressSyncIntent.create({
        data: {
          companyId: input.companyId,
          companyAddressId: existing.id,
          operation: "ADDRESS_UPDATE",
          status: "pending",
          recipientCustomerIds: input.syncEligibleCustomerIds,
          payload: {
            trigger: "dashboard",
            addressId: existing.id,
            rollback: {
              kind: "update",
              previousAddress: {
                id: existing.id,
                companyId: existing.companyId,
                addressType: existing.addressType,
                label: existing.label,
                line1: existing.line1,
                line2: existing.line2,
                postalCode: existing.postalCode,
                city: existing.city,
                country: existing.country,
                source: existing.source,
                createdByMemberId: existing.createdByMemberId,
                createdAt: existing.createdAt.toISOString(),
                updatedAt: existing.updatedAt.toISOString(),
              },
            },
          },
        },
      });

      return {
        address: mapAddressRecord(updated),
        syncIntentId: intent.id,
      };
    });
  }

  async deleteWithSyncIntent(input: {
    companyId: string;
    addressId: string;
    syncEligibleCustomerIds: string[];
  }): Promise<{ deletedAddressId: string; syncIntentId: string } | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.companySharedAddress.findFirst({
        where: {
          id: input.addressId,
          companyId: input.companyId,
          addressType: "delivery",
        },
      });
      if (!existing) {
        return null;
      }

      await tx.companySharedAddress.delete({
        where: { id: existing.id },
      });

      const intent = await tx.companyAddressSyncIntent.create({
        data: {
          companyId: input.companyId,
          companyAddressId: null,
          operation: "ADDRESS_DELETE",
          status: "pending",
          recipientCustomerIds: input.syncEligibleCustomerIds,
          payload: {
            trigger: "dashboard",
            deletedAddressId: existing.id,
            rollback: {
              kind: "delete",
              deletedAddress: {
                id: existing.id,
                companyId: existing.companyId,
                addressType: existing.addressType,
                label: existing.label,
                line1: existing.line1,
                line2: existing.line2,
                postalCode: existing.postalCode,
                city: existing.city,
                country: existing.country,
                source: existing.source,
                createdByMemberId: existing.createdByMemberId,
                createdAt: existing.createdAt.toISOString(),
                updatedAt: existing.updatedAt.toISOString(),
              },
            },
          },
        },
      });

      return {
        deletedAddressId: existing.id,
        syncIntentId: intent.id,
      };
    });
  }

  async findSyncIntentById(intentId: string): Promise<CompanyAddressSyncIntentRecord | null> {
    const intent = await this.prisma.companyAddressSyncIntent.findUnique({
      where: { id: intentId },
    });
    if (!intent) {
      return null;
    }

    return mapSyncIntentRecord(intent);
  }

  async markSyncIntentProcessing(intentId: string): Promise<boolean> {
    const staleCutoff = new Date(Date.now() - CompanySharedAddressesRepository.STALE_PROCESSING_LOCK_MS);
    const result = await this.prisma.companyAddressSyncIntent.updateMany({
      where: {
        id: intentId,
        OR: [
          {
            status: {
              in: ["pending", "failed"],
            },
          },
          {
            status: "processing",
            updatedAt: {
              lte: staleCutoff,
            },
          },
        ],
      },
      data: {
        status: "processing",
      },
    });
    return result.count > 0;
  }

  async markSyncIntentSucceeded(intentId: string): Promise<void> {
    const current = await this.prisma.companyAddressSyncIntent.findUnique({
      where: { id: intentId },
      select: { payload: true },
    });
    const currentPayload = toObjectRecord(current?.payload);

    await this.prisma.companyAddressSyncIntent.update({
      where: { id: intentId },
      data: {
        status: "succeeded",
        payload: {
          ...(currentPayload ?? {}),
          lifecycle: {
            result: "succeeded",
            completedAt: new Date().toISOString(),
          },
        },
      },
    });
  }

  async markSyncIntentFailed(intentId: string, details: Record<string, unknown>): Promise<void> {
    const current = await this.prisma.companyAddressSyncIntent.findUnique({
      where: { id: intentId },
      select: { payload: true },
    });
    const currentPayload = toObjectRecord(current?.payload);

    await this.prisma.companyAddressSyncIntent.update({
      where: { id: intentId },
      data: {
        status: "failed",
        payload: {
          ...(currentPayload ?? {}),
          lifecycle: {
            result: "failed",
            failedAt: new Date().toISOString(),
            ...details,
          },
        },
      },
    });
  }

  async compensateFailedSyncIntent(intentId: string): Promise<boolean> {
    const intent = await this.prisma.companyAddressSyncIntent.findUnique({
      where: { id: intentId },
    });
    if (!intent || intent.status !== "failed") {
      return false;
    }

    const payload = toObjectRecord(intent.payload);
    const rollback = toObjectRecord(payload?.rollback);
    if (!rollback || typeof rollback.kind !== "string") {
      return false;
    }

    if (rollback.kind === "create") {
      const createdAddressId =
        typeof rollback.createdAddressId === "string" ? rollback.createdAddressId : null;
      if (!createdAddressId) {
        return false;
      }

      await this.prisma.$transaction(async (tx) => {
        const existingAddress = await tx.companySharedAddress.findFirst({
          where: {
            id: createdAddressId,
            companyId: intent.companyId,
          },
          select: { id: true },
        });
        if (existingAddress) {
          await tx.companySharedAddress.delete({
            where: { id: createdAddressId },
          });
        }
      });
    } else if (rollback.kind === "update") {
      const previousAddress = toObjectRecord(rollback.previousAddress);
      if (!previousAddress || typeof previousAddress.id !== "string") {
        return false;
      }

      await this.prisma.companySharedAddress.updateMany({
        where: {
          id: previousAddress.id,
          companyId: intent.companyId,
        },
        data: {
          label: typeof previousAddress.label === "string" ? previousAddress.label : null,
          line1: typeof previousAddress.line1 === "string" ? previousAddress.line1 : "",
          line2: typeof previousAddress.line2 === "string" ? previousAddress.line2 : null,
          postalCode: typeof previousAddress.postalCode === "string" ? previousAddress.postalCode : "",
          city: typeof previousAddress.city === "string" ? previousAddress.city : "",
          country: typeof previousAddress.country === "string" ? previousAddress.country : "",
          source:
            previousAddress.source === "checkout_import" ? "checkout_import" : "dashboard",
        },
      });
    } else if (rollback.kind === "delete") {
      const deletedAddress = toObjectRecord(rollback.deletedAddress);
      if (!deletedAddress || typeof deletedAddress.id !== "string") {
        return false;
      }
      const deletedAddressId = deletedAddress.id;

      await this.prisma.$transaction(async (tx) => {
        const existingAddress = await tx.companySharedAddress.findFirst({
          where: {
            id: deletedAddressId,
            companyId: intent.companyId,
          },
          select: { id: true },
        });

        if (!existingAddress) {
          const createdByMemberId =
            typeof deletedAddress.createdByMemberId === "string"
              ? deletedAddress.createdByMemberId.trim()
              : "";
          if (!createdByMemberId) {
            throw new Error("Rollback payload missing createdByMemberId.");
          }

          await tx.companySharedAddress.create({
            data: {
              id: deletedAddressId,
              companyId: intent.companyId,
              addressType:
                deletedAddress.addressType === "post" ? "post" : "delivery",
              label: typeof deletedAddress.label === "string" ? deletedAddress.label : null,
              line1: typeof deletedAddress.line1 === "string" ? deletedAddress.line1 : "",
              line2: typeof deletedAddress.line2 === "string" ? deletedAddress.line2 : null,
              postalCode: typeof deletedAddress.postalCode === "string" ? deletedAddress.postalCode : "",
              city: typeof deletedAddress.city === "string" ? deletedAddress.city : "",
              country: typeof deletedAddress.country === "string" ? deletedAddress.country : "",
              source: deletedAddress.source === "checkout_import" ? "checkout_import" : "dashboard",
              createdByMemberId,
            },
          });
        }

      });
    } else {
      return false;
    }

    const latestPayload = toObjectRecord(intent.payload) ?? {};
    await this.prisma.companyAddressSyncIntent.update({
      where: { id: intentId },
      data: {
        payload: {
          ...latestPayload,
          compensation: {
            applied: true,
            appliedAt: new Date().toISOString(),
          },
        },
      },
    });

    return true;
  }
}
