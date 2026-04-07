import type { PrismaClient } from "@prisma/client";
import { MembershipRoleSchema, MembershipStatusSchema } from "../../../contracts/auth.schema";

export type CompanyMembershipRecord = {
  customerId: string;
  companyId: string;
  role: "administrator" | "user";
  status: "active" | "inactive";
};

export class CompanyMembershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCustomerId(customerId: string): Promise<CompanyMembershipRecord | null> {
    const membership = await this.prisma.companyMembership.findUnique({
      where: { customerId },
    });

    if (!membership) {
      return null;
    }

    return {
      customerId: membership.customerId,
      companyId: membership.companyId,
      role: MembershipRoleSchema.parse(membership.role),
      status: MembershipStatusSchema.parse(membership.status),
    };
  }

  async create(input: CompanyMembershipRecord): Promise<CompanyMembershipRecord> {
    const created = await this.prisma.companyMembership.create({
      data: {
        customerId: input.customerId,
        companyId: input.companyId,
        role: input.role,
        status: input.status,
      },
    });

    return {
      customerId: created.customerId,
      companyId: created.companyId,
      role: MembershipRoleSchema.parse(created.role),
      status: MembershipStatusSchema.parse(created.status),
    };
  }
}
