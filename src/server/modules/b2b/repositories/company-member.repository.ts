import type { PrismaClient } from "../../../../../generated/prisma";

export const companyMemberRepository = {
  findByCompanyAndCustomer(
    db: PrismaClient,
    input: { companyId: string; shopifyCustomerId: string },
  ) {
    return db.companyMember.findUnique({
      where: {
        companyId_shopifyCustomerId: {
          companyId: input.companyId,
          shopifyCustomerId: input.shopifyCustomerId,
        },
      },
    });
  },

  upsertPending(
    db: PrismaClient,
    input: { companyId: string; shopifyCustomerId: string },
  ) {
    return db.companyMember.upsert({
      where: {
        companyId_shopifyCustomerId: {
          companyId: input.companyId,
          shopifyCustomerId: input.shopifyCustomerId,
        },
      },
      create: {
        companyId: input.companyId,
        shopifyCustomerId: input.shopifyCustomerId,
        status: "PENDING",
      },
      update: {
        status: "PENDING",
      },
    });
  },

  approve(
    db: PrismaClient,
    input: { companyId: string; shopifyCustomerId: string; role: "ADMIN" | "USER" },
  ) {
    return db.companyMember.update({
      where: {
        companyId_shopifyCustomerId: {
          companyId: input.companyId,
          shopifyCustomerId: input.shopifyCustomerId,
        },
      },
      data: {
        status: "APPROVED",
        role: input.role,
      },
    });
  },

  findApprovedMembershipByCustomer(db: PrismaClient, shopifyCustomerId: string) {
    return db.companyMember.findFirst({
      where: {
        shopifyCustomerId,
        status: "APPROVED",
      },
      include: {
        company: {
          include: {
            members: true,
          },
        },
      },
    });
  },

  countApprovedMembers(db: PrismaClient, companyId: string) {
    return db.companyMember.count({
      where: {
        companyId,
        status: "APPROVED",
      },
    });
  },

  listPendingWithCompany(db: PrismaClient) {
    return db.companyMember.findMany({
      where: { status: "PENDING" },
      include: { company: true },
      orderBy: { createdAt: "asc" },
    });
  },
};
