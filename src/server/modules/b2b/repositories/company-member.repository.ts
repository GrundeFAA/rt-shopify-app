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

  create(
    db: PrismaClient,
    input: {
      companyId: string;
      shopifyCustomerId: string;
      role: "ADMIN" | "USER";
      status: "PENDING" | "APPROVED";
    },
  ) {
    return db.companyMember.create({
      data: {
        companyId: input.companyId,
        shopifyCustomerId: input.shopifyCustomerId,
        role: input.role,
        status: input.status,
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
