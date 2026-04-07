import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { AppError } from "../modules/auth/errors";
import { CompanyMembershipRepository } from "../modules/auth/repositories/company-membership.repository.server";
import { CompanyProfileRepository } from "../modules/company/repositories/company-profile.repository.server";
import { OnboardingEventLogRepository } from "../modules/webhooks/repositories/onboarding-event-log.repository.server";
import { ProcessCustomersCreateOnboardingService } from "../modules/webhooks/services/process-customers-create-onboarding.service";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const webhookId = request.headers.get("x-shopify-webhook-id")?.trim();
    if (!webhookId) {
      throw new AppError("VALIDATION_FAILED", "Missing Shopify webhook id header.", 400, false);
    }

    const { payload, topic, shop } = await authenticate.webhook(request);
    const companyRepository = new CompanyProfileRepository(db);
    const membershipRepository = new CompanyMembershipRepository(db);
    const onboardingLogRepository = new OnboardingEventLogRepository(db);
    const onboardingService = new ProcessCustomersCreateOnboardingService(
      companyRepository,
      membershipRepository,
      onboardingLogRepository,
    );

    await onboardingService.execute({
      webhookId,
      topic,
      shop,
      payload,
    });

    return new Response();
  } catch (error) {
    if (error instanceof AppError && error.status < 500) {
      // Invalid note/payload scenarios are non-retryable and should ACK webhook delivery.
      console.error(
        JSON.stringify({
          event: "customers_create_onboarding_non_retryable",
          code: error.code,
          message: error.message,
        }),
      );
      return new Response();
    }

    throw error;
  }
};
