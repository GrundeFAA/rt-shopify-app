import { createHmac } from "node:crypto";

import { db } from "#/server/db";
import { env } from "#/env";
import { dashboardService } from "#/server/modules/b2b/services/dashboard.service";
import { shopifyProxySignature } from "#/server/lib/shopify/proxy-signature";

// application/liquid tells Shopify to render our content inside the store theme.
// text/html bypasses the theme and causes theme JS to redirect to /404.
const liquidResponse = (body: string) =>
  new Response(body, {
    status: 200,
    headers: { "content-type": "application/liquid; charset=utf-8" },
  });

export async function GET(request: Request) {
  const url = new URL(request.url);

  // ── DEBUG ────────────────────────────────────────────────────────────────
  console.log("[proxy-debug] request.url       :", request.url);
  console.log("[proxy-debug] search string     :", url.search);

  const allParams: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    allParams[k] = v;
  }
  console.log("[proxy-debug] all params        :", JSON.stringify(allParams));

  const sig = url.searchParams.get("signature");
  const paramsForHmac = [...url.searchParams.entries()]
    .filter(([k]) => k !== "signature")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("");
  const recomputed = createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
    .update(paramsForHmac)
    .digest("hex");
  console.log("[proxy-debug] hmac message      :", paramsForHmac);
  console.log("[proxy-debug] received sig      :", sig);
  console.log("[proxy-debug] recomputed sig    :", recomputed);
  console.log("[proxy-debug] sig match         :", sig === recomputed);
  console.log(
    "[proxy-debug] secret (last 6)  :",
    env.SHOPIFY_CLIENT_SECRET.slice(-6),
  );
  // ── END DEBUG ─────────────────────────────────────────────────────────────

  let customerId: string | undefined;

  try {
    const proxyContext = shopifyProxySignature.verifyAppProxyRequest(
      url.searchParams,
    );
    customerId = proxyContext.loggedInCustomerId;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[proxy-debug] verification failed:", msg);
    return liquidResponse(
      `<h1>Invalid request</h1><p>This page must be opened through the Shopify storefront.</p>`,
    );
  }

  if (!customerId) {
    return liquidResponse(
      `<h1>Login required</h1><p>Please log in to your customer account to access the B2B dashboard.</p>`,
    );
  }

  try {
    const dashboard = await dashboardService.getByShopifyCustomerId(
      db,
      customerId,
    );

    if (dashboard.state === "PENDING_OR_MISSING") {
      return liquidResponse(
        `<h1>B2B Dashboard</h1><p>Your membership is pending approval. Please contact us if you need access.</p>`,
      );
    }

    const memberRows = dashboard.members
      .map(
        (m) =>
          `<li>${m.shopifyCustomerId} &mdash; ${m.role} (${m.status})</li>`,
      )
      .join("");

    return liquidResponse(`
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
    return liquidResponse(
      `<h1>Error</h1><p>Something went wrong loading your dashboard. Please try again.</p>`,
    );
  }
}
