import type { PrismaClient } from "@prisma/client";
import {
  CompanyAddress,
  CompanyAddressSchema,
  CompanyProfile,
} from "../../../contracts/company.schema";

type CompanyProfileRecord = {
  companyId: string;
  companyName: string;
  orgNumber: string;
  companyAddress: CompanyAddress;
};

export class CompanyProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCompanyId(companyId: string): Promise<CompanyProfileRecord | null> {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { companyId },
    });

    if (!profile) {
      return null;
    }

    return {
      companyId: profile.companyId,
      companyName: profile.companyName,
      orgNumber: profile.orgNumber,
      companyAddress: CompanyAddressSchema.parse(profile.companyAddress),
    };
  }

  async updateCompanyAddress(
    companyId: string,
    companyAddress: CompanyAddress,
  ): Promise<CompanyProfileRecord | null> {
    const existing = await this.findByCompanyId(companyId);
    if (!existing) {
      return null;
    }

    const updated = await this.prisma.companyProfile.update({
      where: { companyId },
      data: {
        companyAddress,
      },
    });

    return {
      companyId: updated.companyId,
      companyName: updated.companyName,
      orgNumber: updated.orgNumber,
      companyAddress: CompanyAddressSchema.parse(updated.companyAddress),
    };
  }

  static toProfileDto(record: CompanyProfileRecord): CompanyProfile {
    return {
      company_name: record.companyName,
      org_number: record.orgNumber,
      company_address: record.companyAddress,
    };
  }
}
