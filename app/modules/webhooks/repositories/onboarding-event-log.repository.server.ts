import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "../../auth/errors";

export type OnboardingEventStatus =
  | "processing"
  | "completed"
  | "failed";

export class OnboardingEventLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async begin(input: {
    webhookId: string;
    topic: string;
    shop: string;
    customerId: string;
  }): Promise<"started" | "duplicate"> {
    try {
      await this.prisma.onboardingEventLog.create({
        data: {
          webhookId: input.webhookId,
          topic: input.topic,
          shop: input.shop,
          customerId: input.customerId,
          status: "processing",
        },
      });
      return "started";
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existing = await this.prisma.onboardingEventLog.findUnique({
          where: { webhookId: input.webhookId },
        });

        if (!existing) {
          throw new AppError(
            "INFRA_UNAVAILABLE",
            "Onboarding idempotency lookup failed after unique conflict.",
            503,
            true,
          );
        }

        if (existing.status === "completed") {
          return "duplicate";
        }

        await this.prisma.onboardingEventLog.update({
          where: { webhookId: input.webhookId },
          data: {
            status: "processing",
            details: undefined,
          },
        });

        return "started";
      }

      throw new AppError(
        "INFRA_UNAVAILABLE",
        "Unable to initialize onboarding idempotency record.",
        503,
        true,
        {
          stage: "onboarding_event_log_begin",
          causeMessage: error instanceof Error ? error.message : "Unknown DB failure.",
        },
      );
    }
  }

  async complete(input: {
    webhookId: string;
    outcome:
      | "processed_new_company"
      | "processed_existing_company_member"
      | "processed_already_linked"
      | "ignored_missing_note"
      | "ignored_invalid_note"
      | "ignored_company_conflict";
    details?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.onboardingEventLog.update({
      where: { webhookId: input.webhookId },
      data: {
        status: "completed",
        details: {
          outcome: input.outcome,
          ...(input.details ?? {}),
        } as Prisma.InputJsonValue,
      },
    });
  }

  async fail(input: {
    webhookId: string;
    reason: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.onboardingEventLog.update({
      where: { webhookId: input.webhookId },
      data: {
        status: "failed",
        details: {
          reason: input.reason,
          ...(input.details ?? {}),
        } as Prisma.InputJsonValue,
      },
    });
  }
}
