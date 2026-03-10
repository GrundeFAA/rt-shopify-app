import type { PrismaClient } from "../../../../../generated/prisma";
import { companyMemberRepository } from "../repositories/company-member.repository";
import { companyRepository } from "../repositories/company.repository";
import { membershipRequestRepository } from "../repositories/membership-request.repository";

type ShopifyCustomerPayload = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  note?: string | null;
};

type NormalizedNoteData = {
  companyName?: string;
  orgNumber?: string;
  vat?: string;
  phone?: string;
};

const normalizeCustomerNote = (note?: string | null): NormalizedNoteData => {
  if (!note) return {};

  const pairs = note
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawKey, ...rawValue] = line.split(":");
      return {
        key: rawKey?.trim().toLowerCase(),
        value: rawValue.join(":").trim(),
      };
    });

  const lookup = new Map(pairs.map((pair) => [pair.key, pair.value]));
  return {
    companyName: lookup.get("company") ?? lookup.get("company_name"),
    orgNumber: lookup.get("org_number") ?? lookup.get("orgnr"),
    vat: lookup.get("vat"),
    phone: lookup.get("phone"),
  };
};

const fallbackCompanyName = (payload: ShopifyCustomerPayload) => {
  const fullName = [payload.first_name, payload.last_name].filter(Boolean).join(" ");
  if (fullName) return `${fullName}'s Company`;
  if (payload.email) return `${payload.email.split("@")[0] ?? "Customer"} Company`;
  return `Company for ${payload.id}`;
};

export const customerSyncService = {
  async upsertPendingMembershipFromCustomer(
    db: PrismaClient,
    customer: ShopifyCustomerPayload,
  ) {
    const normalized = normalizeCustomerNote(customer.note);

    const company = await companyRepository.findOrCreate(db, {
      name: normalized.companyName ?? fallbackCompanyName(customer),
      orgNumber: normalized.orgNumber,
    });

    const existingMember = await companyMemberRepository.findByCompanyAndCustomer(db, {
      companyId: company.id,
      shopifyCustomerId: customer.id,
    });

    if (existingMember) {
      return {
        companyId: company.id,
        membershipId: existingMember.id,
        status: existingMember.status,
        role: existingMember.role,
      };
    }

    const approvedCount = await companyMemberRepository.countApprovedMembers(
      db,
      company.id,
    );
    const isFirstCompanyMember = approvedCount === 0;

    const member = await companyMemberRepository.create(db, {
      companyId: company.id,
      shopifyCustomerId: customer.id,
      role: isFirstCompanyMember ? "ADMIN" : "USER",
      status: isFirstCompanyMember ? "APPROVED" : "PENDING",
    });

    if (!isFirstCompanyMember) {
      await membershipRequestRepository.ensurePendingRequest(db, {
        companyId: company.id,
        shopifyCustomerId: customer.id,
        reason: "Auto-created from Shopify webhook",
      });
    }

    return {
      companyId: company.id,
      membershipId: member.id,
      status: member.status,
      role: member.role,
    };
  },
};
