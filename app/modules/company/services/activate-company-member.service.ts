import { AppError } from "../../auth/errors";
import type { CompanyMembershipRepository } from "../../auth/repositories/company-membership.repository.server";
import type { MembershipStatus } from "../../../contracts/auth.schema";
import type { CompanySharedAddressesRepository } from "../repositories/company-shared-addresses.repository.server";
import type { ExecuteCompanyAddressSyncService } from "./execute-company-address-sync.service";

type MembershipRepository = Pick<
  CompanyMembershipRepository,
  "findByCustomerId" | "findById" | "updateStatus"
>;

type SharedAddressRepository = Pick<
  CompanySharedAddressesRepository,
  "enqueueActivationCleanSlateSyncIntent"
>;

type AddressSyncExecutor = Pick<ExecuteCompanyAddressSyncService, "execute">;

type ActivateCompanyMemberInput = {
  actorCustomerId: string;
  memberId: string;
  companyId: string;
  shop: string;
};

type ActivateCompanyMemberResult = {
  memberId: string;
  customerId: string;
  status: "active";
  previousStatus: MembershipStatus;
  cleanSlateSyncIntentId: string | null;
};

const ACTIVATION_ALLOWED_STATUSES: MembershipStatus[] = [
  "pending_admin_approval",
  "pending_user_acceptance",
  "inactive",
];

function isPendingStatus(status: MembershipStatus): boolean {
  return status === "pending_admin_approval" || status === "pending_user_acceptance";
}

export class ActivateCompanyMemberService {
  constructor(
    private readonly membershipRepository: MembershipRepository,
    private readonly sharedAddressRepository: SharedAddressRepository,
    private readonly addressSyncExecutor: AddressSyncExecutor,
  ) {}

  async execute(input: ActivateCompanyMemberInput): Promise<ActivateCompanyMemberResult> {
    const actorMembership = await this.membershipRepository.findByCustomerId(input.actorCustomerId);
    if (!actorMembership || actorMembership.companyId !== input.companyId) {
      throw new AppError("AUTH_NO_MEMBERSHIP", "No company membership was found.", 403, false);
    }
    if (actorMembership.status !== "active") {
      throw new AppError("AUTH_INACTIVE_MEMBERSHIP", "Only active members can activate users.", 403, false);
    }
    if (actorMembership.role !== "administrator") {
      throw new AppError("AUTH_FORBIDDEN_ROLE", "Only administrators can activate users.", 403, false);
    }

    const targetMembership = await this.membershipRepository.findById(input.memberId);
    if (!targetMembership || targetMembership.companyId !== input.companyId) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company membership was not found.", 404, false);
    }
    if (!ACTIVATION_ALLOWED_STATUSES.includes(targetMembership.status)) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Membership cannot be activated from current state.",
        409,
        false,
      );
    }

    const previousStatus = targetMembership.status;
    if (previousStatus === "active") {
      return {
        memberId: targetMembership.id,
        customerId: targetMembership.customerId,
        status: "active",
        previousStatus,
        cleanSlateSyncIntentId: null,
      };
    }

    const activated = await this.membershipRepository.updateStatus({
      membershipId: targetMembership.id,
      companyId: input.companyId,
      status: "active",
    });
    if (!activated) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company membership was not found.", 404, false);
    }

    let cleanSlateSyncIntentId: string | null = null;
    if (isPendingStatus(previousStatus)) {
      try {
        const cleanSlateIntent = await this.sharedAddressRepository.enqueueActivationCleanSlateSyncIntent({
          companyId: input.companyId,
          activatedCustomerId: targetMembership.customerId,
        });
        cleanSlateSyncIntentId = cleanSlateIntent.syncIntentId;

        await this.addressSyncExecutor.execute({
          syncIntentId: cleanSlateIntent.syncIntentId,
          companyId: input.companyId,
          shop: input.shop,
          failureMessage: "Member activation failed because clean-slate address sync failed.",
          recoveryReason: "membership_activation_clean_slate_failure",
          compensateSyncIntent: false,
          failureLogEvent: "member_activation_clean_slate_failed",
          recoveryLogEvent: "member_activation_clean_slate_recovery_failed",
        });
      } catch (error) {
        await this.membershipRepository.updateStatus({
          membershipId: targetMembership.id,
          companyId: input.companyId,
          status: previousStatus,
        });

        if (error instanceof AppError) {
          throw error;
        }
        throw new AppError(
          "SYNC_WRITE_ABORTED",
          "Member activation failed while syncing company addresses.",
          503,
          true,
        );
      }
    }

    return {
      memberId: targetMembership.id,
      customerId: targetMembership.customerId,
      status: "active",
      previousStatus,
      cleanSlateSyncIntentId,
    };
  }
}
