import { db } from "#/server/db";
import { dashboardService } from "#/server/modules/b2b/services/dashboard.service";
import { shopifyProxySignature } from "#/server/lib/shopify/proxy-signature";

const htmlResponse = (body: string) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>B2B Dashboard</title></head><body>${body}</body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );

export async function GET(request: Request) {
  const url = new URL(request.url);

  let customerId: string | undefined;

  try {
    const proxyContext = shopifyProxySignature.verifyAppProxyRequest(
      url.searchParams,
    );
    customerId = proxyContext.loggedInCustomerId;
  } catch (error) {
    console.error("Invalid app proxy request", error);
    return htmlResponse(
      `<h1>Invalid request</h1><p>This page must be opened through the Shopify storefront.</p>`,
    );
  }

  if (!customerId) {
    return htmlResponse(
      `<h1>Login required</h1><p>Please log in to your customer account to access the B2B dashboard.</p>`,
    );
  }

  try {
    const dashboard = await dashboardService.getByShopifyCustomerId(
      db,
      customerId,
    );

    if (dashboard.state === "PENDING_OR_MISSING") {
      return htmlResponse(
        `<h1>B2B Dashboard</h1><p>Your membership is pending approval. Please contact us if you need access.</p>`,
      );
    }

    const memberRows = dashboard.members
      .map(
        (m) =>
          `<li>${m.shopifyCustomerId} &mdash; ${m.role} (${m.status})</li>`,
      )
      .join("");

    return htmlResponse(`
      <h1>B2B Dashboard</h1>
      <p>Customer: ${customerId}</p>
      <h2>Company</h2>
      <p>Name: ${dashboard.company.name}</p>
      <p>Org number: ${dashboard.company.orgNumber ?? "Not provided"}</p>
      <h2>Members</h2>
      <ul>${memberRows}</ul>
    `);
  } catch (error) {
    console.error("App proxy dashboard render failed", error);
    return htmlResponse(
      `<h1>Error</h1><p>Something went wrong loading your dashboard. Please try again.</p>`,
    );
  }
}
