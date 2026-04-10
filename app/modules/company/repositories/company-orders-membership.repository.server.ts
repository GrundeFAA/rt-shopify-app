import type { PrismaClient } from "@prisma/client";

export type CompanyMemberStatus =
  | "active"
  | "inactive"
  | "pending_user_acceptance"
  | "pending_admin_approval"
  | "unknown";

export type CompanyOrderMembershipRecord = {
  customerId: string;
  companyId: string;
  status: CompanyMemberStatus;
};

function normalizeMembershipStatus(status: string): CompanyMemberStatus {
  if (status === "active" || status === "inactive") {
    return status;
  }

  if (status === "pending_user_acceptance" || status === "pending_admin_approval") {
    return status;
  }

  return "unknown";
}

export class CompanyOrdersMembershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCompanyAndCustomerIds(
    companyId: string,
    customerIds: readonly string[],
  ): Promise<Map<string, CompanyOrderMembershipRecord>> {
    const uniqueCustomerIds = [...new Set(customerIds.map((value) => value.trim()).filter(Boolean))];
    if (uniqueCustomerIds.length === 0) {
      return new Map();
    }

    const memberships = await this.prisma.companyMembership.findMany({
      where: {
        companyId,
        customerId: {
          in: uniqueCustomerIds,
        },
      },
      select: {
        customerId: true,
        companyId: true,
        status: true,
      },
    });

    const byCustomerId = new Map<string, CompanyOrderMembershipRecord>();
    for (const membership of memberships) {
      byCustomerId.set(membership.customerId, {
        customerId: membership.customerId,
        companyId: membership.companyId,
        status: normalizeMembershipStatus(membership.status),
      });
    }

    return byCustomerId;
  }
}
