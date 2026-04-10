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

  private async findPostAddress(companyId: string): Promise<CompanyAddress | null> {
    const postAddress = await this.prisma.companySharedAddress.findFirst({
      where: {
        companyId,
        addressType: "post",
      },
      select: {
        line1: true,
        line2: true,
        postalCode: true,
        city: true,
        country: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    if (!postAddress) {
      return null;
    }

    return CompanyAddressSchema.parse({
      line1: postAddress.line1,
      line2: postAddress.line2 ?? undefined,
      postalCode: postAddress.postalCode,
      city: postAddress.city,
      country: postAddress.country,
    });
  }

  async findByCompanyId(companyId: string): Promise<CompanyProfileRecord | null> {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { companyId },
    });

    if (!profile) {
      return null;
    }

    const postAddress = await this.findPostAddress(profile.companyId);
    if (!postAddress) {
      return null;
    }

    return {
      companyId: profile.companyId,
      companyName: profile.companyName,
      orgNumber: profile.orgNumber,
      companyAddress: postAddress,
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

    await this.prisma.$transaction(async (tx) => {
      const postAddress = await tx.companySharedAddress.findFirst({
        where: {
          companyId,
          addressType: "post",
        },
        select: {
          id: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });

      if (!postAddress) {
        await tx.companySharedAddress.create({
          data: {
            companyId,
            addressType: "post",
            label: "Postadresse",
            line1: normalizedAddress.line1.trim(),
            line2: normalizedAddress.line2?.trim() || null,
            postalCode: normalizedAddress.postalCode.trim(),
            city: normalizedAddress.city.trim(),
            country: normalizedAddress.country.trim().toUpperCase(),
            source: "dashboard",
            createdByMemberId: "system",
          },
        });
        return;
      }

      await tx.companySharedAddress.update({
        where: {
          id: postAddress.id,
        },
        data: {
          line1: normalizedAddress.line1.trim(),
          line2: normalizedAddress.line2?.trim() || null,
          postalCode: normalizedAddress.postalCode.trim(),
          city: normalizedAddress.city.trim(),
          country: normalizedAddress.country.trim().toUpperCase(),
        },
      });
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

    const postAddress = await this.findPostAddress(profile.companyId);
    if (!postAddress) {
      return null;
    }

    return {
      companyId: profile.companyId,
      companyName: profile.companyName,
      orgNumber: profile.orgNumber,
      companyAddress: postAddress,
    };
  }

  async create(input: {
    companyId: string;
    companyName: string;
    orgNumber: string;
    companyAddress: CompanyAddress;
  }): Promise<CompanyProfileRecord> {
    const normalizedAddress = CompanyAddressSchema.parse(input.companyAddress);
    const created = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.companyProfile.create({
        data: {
          companyId: input.companyId,
          companyName: input.companyName,
          orgNumber: input.orgNumber,
        },
      });

      await tx.companySharedAddress.create({
        data: {
          companyId: input.companyId,
          addressType: "post",
          label: "Postadresse",
          line1: normalizedAddress.line1.trim(),
          line2: normalizedAddress.line2?.trim() || null,
          postalCode: normalizedAddress.postalCode.trim(),
          city: normalizedAddress.city.trim(),
          country: normalizedAddress.country.trim().toUpperCase(),
          source: "dashboard",
          createdByMemberId: "system",
        },
      });

      return profile;
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
