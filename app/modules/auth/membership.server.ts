import { MembershipRole, MembershipStatus } from "../../contracts/auth.schema";
import db from "../../db.server";
import { CompanyMembershipRepository } from "./repositories/company-membership.repository.server";

export type MembershipContext = {
  customerId: string;
  companyId: string;
  role: MembershipRole;
  status: MembershipStatus;
};

type EnvMembershipMap = Record<
  string,
  {
    companyId?: string;
    role?: MembershipRole;
    status?: MembershipStatus;
  }
>;

function getMembershipMapFromEnv(): EnvMembershipMap {
  const rawMap = process.env.AUTH_MEMBERSHIP_MAP;
  if (!rawMap) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawMap) as EnvMembershipMap;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export async function resolveMembershipByCustomerId(
  customerId: string,
): Promise<MembershipContext | null> {
  const repository = new CompanyMembershipRepository(db);
  const persistedMembership = await repository.findByCustomerId(customerId);
  if (persistedMembership) {
    return {
      customerId: persistedMembership.customerId,
      companyId: persistedMembership.companyId,
      role: persistedMembership.role,
      status: persistedMembership.status,
    };
  }

  // Temporary compatibility fallback until webhook onboarding is fully rolled out.
  const membershipMap = getMembershipMapFromEnv();
  const entry = membershipMap[customerId];

  if (!entry?.companyId || !entry.role || !entry.status) {
    return null;
  }

  return {
    customerId,
    companyId: entry.companyId,
    role: entry.role,
    status: entry.status,
  };
}
