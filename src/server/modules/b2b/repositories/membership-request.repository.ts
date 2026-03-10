import type { PrismaClient } from "../../../../../generated/prisma";

export const membershipRequestRepository = {
  /**
   * Ensures exactly one PENDING request exists per customer+company pair.
   * Safe to call on both customers/create and customers/update webhooks.
   */
  async ensurePendingRequest(
    db: PrismaClient,
    input: {
      companyId: string;
      shopifyCustomerId: string;
      reason?: string;
    },
  ) {
    const existing = await db.membershipRequest.findFirst({
      where: {
        companyId: input.companyId,
        shopifyCustomerId: input.shopifyCustomerId,
        status: "PENDING",
      },
    });

    if (existing) return existing;

    return db.membershipRequest.create({
      data: {
        companyId: input.companyId,
        shopifyCustomerId: input.shopifyCustomerId,
        status: "PENDING",
        reason: input.reason,
      },
    });
  },

  markApproved(
    db: PrismaClient,
    input: { companyId: string; shopifyCustomerId: string },
  ) {
    return db.membershipRequest.updateMany({
      where: {
        companyId: input.companyId,
        shopifyCustomerId: input.shopifyCustomerId,
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
      },
    });
  },
};
