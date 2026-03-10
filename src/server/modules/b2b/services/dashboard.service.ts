import type { PrismaClient } from "../../../../../generated/prisma";
import { companyMemberRepository } from "../repositories/company-member.repository";

export const dashboardService = {
  async getByShopifyCustomerId(db: PrismaClient, shopifyCustomerId: string) {
    const membership =
      await companyMemberRepository.findApprovedMembershipByCustomer(
        db,
        shopifyCustomerId,
      );

    if (!membership) {
      return {
        state: "PENDING_OR_MISSING" as const,
      };
    }

    return {
      state: "APPROVED" as const,
      company: {
        id: membership.company.id,
        name: membership.company.name,
        orgNumber: membership.company.orgNumber,
      },
      members: membership.company.members.map((member) => ({
        id: member.id,
        role: member.role,
        status: member.status,
        shopifyCustomerId: member.shopifyCustomerId,
      })),
      sharedOrders: [] as Array<{ id: string; name: string; total: number }>,
      documents: [] as Array<{ id: string; title: string }>,
    };
  },
};
