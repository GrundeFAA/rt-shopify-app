import { AppError } from "../../auth/errors";
import type { CompanyMembershipRepository } from "../../auth/repositories/company-membership.repository.server";

type MembershipRepository = Pick<CompanyMembershipRepository, "findByCustomerId" | "findById" | "updateStatus">;

type DeactivateCompanyMemberInput = {
  actorCustomerId: string;
  memberId: string;
  companyId: string;
};

type DeactivateCompanyMemberResult = {
  memberId: string;
  customerId: string;
  status: "inactive";
  previousStatus: "active";
};

export class DeactivateCompanyMemberService {
  constructor(private readonly membershipRepository: MembershipRepository) {}

  async execute(input: DeactivateCompanyMemberInput): Promise<DeactivateCompanyMemberResult> {
    const actorMembership = await this.membershipRepository.findByCustomerId(input.actorCustomerId);
    if (!actorMembership || actorMembership.companyId !== input.companyId) {
      throw new AppError("AUTH_NO_MEMBERSHIP", "No company membership was found.", 403, false);
    }
    if (actorMembership.status !== "active") {
      throw new AppError(
        "AUTH_INACTIVE_MEMBERSHIP",
        "Only active members can deactivate users.",
        403,
        false,
      );
    }
    if (actorMembership.role !== "administrator") {
      throw new AppError("AUTH_FORBIDDEN_ROLE", "Only administrators can deactivate users.", 403, false);
    }

    const targetMembership = await this.membershipRepository.findById(input.memberId);
    if (!targetMembership || targetMembership.companyId !== input.companyId) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company membership was not found.", 404, false);
    }
    if (targetMembership.status !== "active") {
      throw new AppError(
        "VALIDATION_FAILED",
        "Membership cannot be deactivated from current state.",
        409,
        false,
      );
    }

    const updated = await this.membershipRepository.updateStatus({
      membershipId: targetMembership.id,
      companyId: input.companyId,
      status: "inactive",
    });
    if (!updated) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company membership was not found.", 404, false);
    }

    return {
      memberId: targetMembership.id,
      customerId: targetMembership.customerId,
      status: "inactive",
      previousStatus: "active",
    };
  }
}
