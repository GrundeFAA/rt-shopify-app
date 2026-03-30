import { MembershipRole, MembershipStatus } from "../../contracts/auth.schema";

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
