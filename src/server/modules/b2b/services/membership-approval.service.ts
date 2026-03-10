import type { PrismaClient } from "../../../../../generated/prisma";
import { companyMemberRepository } from "../repositories/company-member.repository";
import { membershipRequestRepository } from "../repositories/membership-request.repository";

export const membershipApprovalService = {
  async approveMembership(
    db: PrismaClient,
    input: { companyId: string; shopifyCustomerId: string },
  ) {
    const approvedCount = await companyMemberRepository.countApprovedMembers(
      db,
      input.companyId,
    );

    const role = approvedCount === 0 ? "ADMIN" : "USER";
    const member = await companyMemberRepository.approve(db, {
      companyId: input.companyId,
      shopifyCustomerId: input.shopifyCustomerId,
      role,
    });

    await membershipRequestRepository.markApproved(db, input);

    // POC: Tag sync towards Shopify should be called here.
    return member;
  },
};
