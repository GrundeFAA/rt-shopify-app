import type { PrismaClient } from "@prisma/client";
import { MembershipRoleSchema, MembershipStatusSchema } from "../../../contracts/auth.schema";
import type { MembershipStatus } from "../../../contracts/auth.schema";

export type CompanyMembershipRecord = {
  id: string;
  customerId: string;
  companyId: string;
  role: "administrator" | "user";
  status: MembershipStatus;
};

export type CreateCompanyMembershipInput = Omit<CompanyMembershipRecord, "id">;

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
      id: membership.id,
      customerId: membership.customerId,
      companyId: membership.companyId,
      role: MembershipRoleSchema.parse(membership.role),
      status: MembershipStatusSchema.parse(membership.status),
    };
  }

  async create(input: CreateCompanyMembershipInput): Promise<CompanyMembershipRecord> {
    const created = await this.prisma.companyMembership.create({
      data: {
        customerId: input.customerId,
        companyId: input.companyId,
        role: input.role,
        status: input.status,
      },
    });

    return {
      id: created.id,
      customerId: created.customerId,
      companyId: created.companyId,
      role: MembershipRoleSchema.parse(created.role),
      status: MembershipStatusSchema.parse(created.status),
    };
  }

  async findById(id: string): Promise<CompanyMembershipRecord | null> {
    const membership = await this.prisma.companyMembership.findUnique({
      where: { id },
    });

    if (!membership) {
      return null;
    }

    return {
      id: membership.id,
      customerId: membership.customerId,
      companyId: membership.companyId,
      role: MembershipRoleSchema.parse(membership.role),
      status: MembershipStatusSchema.parse(membership.status),
    };
  }

  async updateStatus(input: {
    membershipId: string;
    companyId: string;
    status: MembershipStatus;
  }): Promise<boolean> {
    const updated = await this.prisma.companyMembership.updateMany({
      where: {
        id: input.membershipId,
        companyId: input.companyId,
      },
      data: {
        status: input.status,
      },
    });

    return updated.count > 0;
  }

  async listByCompanyId(companyId: string): Promise<CompanyMembershipRecord[]> {
    const memberships = await this.prisma.companyMembership.findMany({
      where: { companyId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return memberships.map((membership) => ({
      id: membership.id,
      customerId: membership.customerId,
      companyId: membership.companyId,
      role: MembershipRoleSchema.parse(membership.role),
      status: MembershipStatusSchema.parse(membership.status),
    }));
  }
}
