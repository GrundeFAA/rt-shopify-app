import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(
    JSON.stringify({
      event: "app_uninstalled_webhook_received",
      topic,
      shop,
    }),
  );

  return new Response();
};
