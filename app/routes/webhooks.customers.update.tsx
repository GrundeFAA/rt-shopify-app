import type { ActionFunctionArgs } from "react-router";
import { Prisma } from "@prisma/client";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { AppError } from "../modules/auth/errors";
import { CompanyAddressesShopifyGateway } from "../infrastructure/shopify-gateways/company-addresses.shopify-gateway.server";
import { CompanyProfileRepository } from "../modules/company/repositories/company-profile.repository.server";
import { CompanySharedAddressesRepository } from "../modules/company/repositories/company-shared-addresses.repository.server";
import { ProcessCompanyAddressSyncIntentService } from "../modules/company/services/process-company-address-sync-intent.service";
import { ShopifyOfflineSessionRepository } from "../modules/sync/repositories/shopify-offline-session.repository.server";
import { ProcessCustomersUpdateAddressImportService } from "../modules/webhooks/services/process-customers-update-address-import.service";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    console.log(
      JSON.stringify({
        event: "customers_update_webhook_received",
        method: request.method,
        path: new URL(request.url).pathname,
      }),
    );
    console.log(
      JSON.stringify({
        event: "customers_update_webhook_debug_marker_v2",
        marker: "code-change-live-check",
      }),
    );
    const webhookId = request.headers.get("x-shopify-webhook-id")?.trim();
    if (!webhookId) {
      throw new AppError("VALIDATION_FAILED", "Missing Shopify webhook id header.", 400, false);
    }

    const { payload, topic, shop } = await authenticate.webhook(request);
    try {
      await db.onboardingEventLog.create({
        data: {
          webhookId,
          topic,
          shop,
          customerId:
            payload && typeof payload === "object" && "id" in payload && typeof payload.id === "string"
              ? payload.id
              : null,
          status: "received",
          details: { source: "customers_update" },
        },
      });
    } catch (createError) {
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === "P2002"
      ) {
        console.log(
          JSON.stringify({
            event: "customers_update_webhook_duplicate_ignored",
            webhookId,
            topic,
            shop,
          }),
        );
        return new Response();
      }
      throw createError;
    }

    const service = new ProcessCustomersUpdateAddressImportService(
      new CompanySharedAddressesRepository(db),
      new CompanyProfileRepository(db),
    );
    const syncProcessor = new ProcessCompanyAddressSyncIntentService(
      new CompanySharedAddressesRepository(db),
      new ShopifyOfflineSessionRepository(db),
      new CompanyProfileRepository(db),
      new CompanyAddressesShopifyGateway(),
    );
    const result = await service.execute({
      webhookId,
      topic,
      shop,
      payload,
    });
    for (const syncIntentId of result.syncIntentIds) {
      await syncProcessor.execute({
        syncIntentId,
        shop,
      });
    }

    console.log(
      JSON.stringify({
        event: "customers_update_address_import_processed",
        webhookId,
        topic,
        shop,
        outcome: result.outcome,
        importedCount: result.importedCount,
        syncIntentIds: result.syncIntentIds,
      }),
    );

    return new Response();
  } catch (error) {
    if (error instanceof AppError && !error.retryable) {
      // Non-retryable validation/policy/dependency errors should ACK webhook delivery to avoid retry loops.
      console.error(
        JSON.stringify({
          event: "customers_update_address_import_non_retryable",
          code: error.code,
          message: error.message,
          status: error.status,
          details: error.details,
        }),
      );
      return new Response();
    }

    throw error;
  }
};
