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
      <s-section heading="Current direction">
        <s-paragraph>
          This app is being simplified around Shopify-native B2B flows, customer
          account UI extensions, onboarding webhooks, and cart context support.
        </s-paragraph>
      </s-section>
      <s-section heading="What remains in the app backend">
        <s-paragraph>
          The old embedded dashboard and its custom API layer have been removed.
          The remaining backend should focus on onboarding, app proxy support,
          and the pieces still needed around Shopify-native B2B behavior.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
