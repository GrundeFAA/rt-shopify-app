import type { AdminServiceContext } from "../../shopify/admin.server";

type ProcessAppUninstalledWebhookInput = {
  adminContext?: AdminServiceContext;
  requestId: string;
  shop: string;
  topic: string;
  webhookId: string;
};

export async function processAppUninstalledWebhook({
  adminContext,
  requestId,
  shop,
  topic,
  webhookId,
}: ProcessAppUninstalledWebhookInput): Promise<void> {
  console.log(
    JSON.stringify({
      event: "app_uninstalled_webhook_received",
      requestId,
      topic,
      webhookId,
      shop,
      adminSessionAvailable: Boolean(adminContext),
    }),
  );
}
