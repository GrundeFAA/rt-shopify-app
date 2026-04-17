import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, topic, shop } = await authenticate.webhook(request);
  const customerId =
    payload && typeof payload === "object" && "id" in payload ? payload.id : undefined;

  console.log(
    JSON.stringify({
      event: "customers_create_webhook_received",
      topic,
      shop,
      customerId,
    }),
  );

  return new Response();
};
