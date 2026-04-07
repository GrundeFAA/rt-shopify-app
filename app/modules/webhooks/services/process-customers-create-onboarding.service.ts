import { AppError } from "../../auth/errors";
import { CompanyMembershipRepository } from "../../auth/repositories/company-membership.repository.server";
import { CompanyProfileRepository } from "../../company/repositories/company-profile.repository.server";
import { OnboardingEventLogRepository } from "../repositories/onboarding-event-log.repository.server";
import {
  CustomersCreateWebhookPayloadSchema,
  parseOnboardingNoteContract,
  toCompanyAddressFromOnboardingNote,
} from "../schemas/customers-create-onboarding.schema";

function toCompanyIdFromOrgNumber(orgNumber: string): string {
  const normalized = orgNumber
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40);
  return `cmp_${normalized || "unknown"}`;
}

export class ProcessCustomersCreateOnboardingService {
  constructor(
    private readonly companyRepository: CompanyProfileRepository,
    private readonly membershipRepository: CompanyMembershipRepository,
    private readonly onboardingLogRepository: OnboardingEventLogRepository,
  ) {}

  async execute(input: {
    webhookId: string;
    topic: string;
    shop: string;
    payload: unknown;
  }): Promise<void> {
    let payloadCustomerId: string | null = null;
    try {
      const payload = CustomersCreateWebhookPayloadSchema.parse(input.payload);
      payloadCustomerId = payload.id;
      const beginState = await this.onboardingLogRepository.begin({
        webhookId: input.webhookId,
        topic: input.topic,
        shop: input.shop,
        customerId: payload.id,
      });

      if (beginState === "duplicate") {
        return;
      }

      const note = (payload.note ?? "").trim();
      if (!note) {
        await this.onboardingLogRepository.complete({
          webhookId: input.webhookId,
          outcome: "ignored_missing_note",
        });
        return;
      }

      const onboardingNote = parseOnboardingNoteContract(note);
      if (!onboardingNote) {
        await this.onboardingLogRepository.complete({
          webhookId: input.webhookId,
          outcome: "ignored_invalid_note",
        });
        return;
      }

      const existingMembership = await this.membershipRepository.findByCustomerId(payload.id);
      const existingCompany = await this.companyRepository.findByOrgNumber(
        onboardingNote.company_org_number,
      );

      if (existingMembership) {
        const isSameCompany =
          existingCompany && existingMembership.companyId === existingCompany.companyId;

        await this.onboardingLogRepository.complete({
          webhookId: input.webhookId,
          outcome: isSameCompany ? "processed_already_linked" : "ignored_company_conflict",
          details: isSameCompany
            ? { companyId: existingMembership.companyId, customerId: payload.id }
            : {
                customerId: payload.id,
                existingCompanyId: existingMembership.companyId,
                requestedOrgNumber: onboardingNote.company_org_number,
              },
        });
        return;
      }

      let companyId = existingCompany?.companyId;
      if (!companyId) {
        const createdCompany = await this.companyRepository.create({
          companyId: toCompanyIdFromOrgNumber(onboardingNote.company_org_number),
          companyName: onboardingNote.company_name,
          orgNumber: onboardingNote.company_org_number,
          companyAddress: toCompanyAddressFromOnboardingNote(onboardingNote),
        });
        companyId = createdCompany.companyId;
      }

      if (!companyId) {
        throw new AppError("INTERNAL_ERROR", "Onboarding failed to resolve company.", 500, true);
      }

      const isFirstCompanyMember = !existingCompany;
      await this.membershipRepository.create({
        customerId: payload.id,
        companyId,
        role: isFirstCompanyMember ? "administrator" : "user",
        status: isFirstCompanyMember ? "active" : "inactive",
      });

      await this.onboardingLogRepository.complete({
        webhookId: input.webhookId,
        outcome: isFirstCompanyMember
          ? "processed_new_company"
          : "processed_existing_company_member",
        details: {
          customerId: payload.id,
          companyId,
          role: isFirstCompanyMember ? "administrator" : "user",
          status: isFirstCompanyMember ? "active" : "inactive",
        },
      });
    } catch (error) {
      try {
        await this.onboardingLogRepository.fail({
          webhookId: input.webhookId,
          reason: error instanceof AppError ? error.code : "INTERNAL_ERROR",
          details: {
            customerId: payloadCustomerId ?? undefined,
            causeMessage: error instanceof Error ? error.message : "Unknown failure.",
          },
        });
      } catch {
        // Preserve original error if fail-marking itself fails.
      }
      throw error;
    }
  }
}
