import type { AdminServiceContext } from "../../shopify/admin.server";

type ProcessCustomersCreateWebhookInput = {
  adminContext?: AdminServiceContext;
  payload: Record<string, unknown>;
  requestId: string;
  shop: string;
  topic: string;
  webhookId: string;
};

export async function processCustomersCreateWebhook({
  adminContext,
  payload,
  requestId,
  shop,
  topic,
  webhookId,
}: ProcessCustomersCreateWebhookInput): Promise<void> {
  const customerId = "id" in payload ? payload.id : undefined;

  console.log(
    JSON.stringify({
      event: "customers_create_webhook_received",
      requestId,
      topic,
      webhookId,
      shop,
      customerId,
      adminSessionAvailable: Boolean(adminContext),
    }),
  );
}
