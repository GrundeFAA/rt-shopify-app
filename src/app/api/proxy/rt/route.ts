import { shopifyProxySignature } from "#/server/lib/shopify/proxy-signature";

const htmlErrorResponse = (title: string, details: string) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1><p>${details}</p></body></html>`,
    {
      // Shopify often replaces non-2xx proxy responses with a generic storefront error page.
      // Return explicit HTML so we can see real proxy failures in-browser.
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    },
  );

export async function GET(request: Request) {
  const url = new URL(request.url);
  let proxyToken: string;

  try {
    const proxyContext = shopifyProxySignature.verifyAppProxyRequest(
      url.searchParams,
    );
    proxyToken = shopifyProxySignature.createDashboardContextToken(proxyContext);
  } catch (error) {
    console.error("Invalid app proxy request", error);
    return htmlErrorResponse(
      "Invalid app proxy request",
      "Signature validation failed. Open this page through the storefront app proxy URL.",
    );
  }

  try {
    // Resolve against current request host to avoid environment drift.
    const dashboardUrl = new URL("/b2b-dashboard", request.url);
    dashboardUrl.searchParams.set("proxyToken", proxyToken);

    const dashboardResponse = await fetch(dashboardUrl.toString(), {
      method: "GET",
      redirect: "follow",
    });
    const html = await dashboardResponse.text();

    return new Response(html, {
      status: dashboardResponse.status,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("App proxy dashboard fetch failed", error);
    return htmlErrorResponse(
      "Proxy upstream error",
      "The app proxy reached the app, but rendering the dashboard failed.",
    );
  }
}
