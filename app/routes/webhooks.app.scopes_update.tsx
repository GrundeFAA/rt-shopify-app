import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, topic, shop } = await authenticate.webhook(request);
  const current =
    payload && typeof payload === "object" && "current" in payload ? payload.current : undefined;

  console.log(
    JSON.stringify({
      event: "app_scopes_update_webhook_received",
      topic,
      shop,
      current,
    }),
  );

  return new Response();
};
