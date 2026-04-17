import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export default function Index() {
  return (
    <s-page heading="RT app">
      <s-section heading="Fresh baseline">
        <s-paragraph>
          This app has been reduced to a minimal Shopify runtime baseline so the
          new Shopify-native B2B implementation can be rebuilt cleanly.
        </s-paragraph>
      </s-section>
      <s-section heading="What remains">
        <s-paragraph>
          The remaining code is generic app infrastructure, lifecycle webhooks,
          extension scaffolding, and temporary boilerplate routes that can be
          rebuilt against Shopify Admin API.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
