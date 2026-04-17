import type { ActionFunctionArgs } from "react-router";
import { getOrCreateRequestId, toApiErrorResponse } from "../modules/auth/api-error.server";
import { maybeWebhookAdminServiceContext } from "../modules/shopify/admin.server";
import { processCustomersCreateWebhook } from "../modules/webhooks/services/process-customers-create-webhook.service";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const webhookContext = await authenticate.webhook(request);
    const adminContext = maybeWebhookAdminServiceContext(webhookContext, request);
    const requestId = adminContext?.requestId ?? getOrCreateRequestId(request);

    await processCustomersCreateWebhook({
      adminContext,
      payload: webhookContext.payload,
      requestId,
      shop: webhookContext.shop,
      topic: String(webhookContext.topic),
      webhookId: webhookContext.webhookId,
    });

    return new Response(null, {
      status: 200,
      headers: {
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};
