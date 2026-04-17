import type { AdminServiceContext } from "../../shopify/admin.server";

type ProcessAppScopesUpdateWebhookInput = {
  adminContext?: AdminServiceContext;
  payload: Record<string, unknown>;
  requestId: string;
  shop: string;
  topic: string;
  webhookId: string;
};

export async function processAppScopesUpdateWebhook({
  adminContext,
  payload,
  requestId,
  shop,
  topic,
  webhookId,
}: ProcessAppScopesUpdateWebhookInput): Promise<void> {
  const currentScopes = "current" in payload ? payload.current : undefined;

  console.log(
    JSON.stringify({
      event: "app_scopes_update_webhook_received",
      requestId,
      topic,
      webhookId,
      shop,
      currentScopes,
      adminSessionAvailable: Boolean(adminContext),
    }),
  );
}
