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
      companyAddress: CompanyAddressSchema.parse({
        line1: profile.addressLine1,
        line2: profile.addressLine2 ?? undefined,
        postalCode: profile.addressPostalCode,
        city: profile.addressCity,
        country: profile.addressCountry,
      }),
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
    const normalizedAddress = CompanyAddressSchema.parse(companyAddress);
    await this.prisma.companyProfile.update({
      where: { companyId },
      data: {
        addressLine1: normalizedAddress.line1.trim(),
        addressLine2: normalizedAddress.line2?.trim() || null,
        addressPostalCode: normalizedAddress.postalCode.trim(),
        addressCity: normalizedAddress.city.trim(),
        addressCountry: normalizedAddress.country.trim().toUpperCase(),
      },
    });

    return this.findByCompanyId(companyId);
  }

  async findByOrgNumber(orgNumber: string): Promise<CompanyProfileRecord | null> {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { orgNumber },
    });

    if (!profile) {
      return null;
    }

    return {
      companyId: profile.companyId,
      companyName: profile.companyName,
      orgNumber: profile.orgNumber,
      companyAddress: CompanyAddressSchema.parse({
        line1: profile.addressLine1,
        line2: profile.addressLine2 ?? undefined,
        postalCode: profile.addressPostalCode,
        city: profile.addressCity,
        country: profile.addressCountry,
      }),
    };
  }

  async create(input: {
    companyId: string;
    companyName: string;
    orgNumber: string;
    companyAddress: CompanyAddress;
  }): Promise<CompanyProfileRecord> {
    const normalizedAddress = CompanyAddressSchema.parse(input.companyAddress);
    const created = await this.prisma.companyProfile.create({
      data: {
        companyId: input.companyId,
        companyName: input.companyName,
        orgNumber: input.orgNumber,
        addressLine1: normalizedAddress.line1.trim(),
        addressLine2: normalizedAddress.line2?.trim() || null,
        addressPostalCode: normalizedAddress.postalCode.trim(),
        addressCity: normalizedAddress.city.trim(),
        addressCountry: normalizedAddress.country.trim().toUpperCase(),
      },
    });

    return {
      companyId: created.companyId,
      companyName: created.companyName,
      orgNumber: created.orgNumber,
      companyAddress: normalizedAddress,
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
