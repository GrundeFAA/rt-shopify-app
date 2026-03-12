import { NextResponse } from "next/server";

import { env } from "#/env";
import { shopifyProxySignature } from "#/server/lib/shopify/proxy-signature";

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const proxyContext = shopifyProxySignature.verifyAppProxyRequest(
      url.searchParams,
    );
    const proxyToken = shopifyProxySignature.createDashboardContextToken(
      proxyContext,
    );

    const dashboardUrl = new URL("/b2b-dashboard", env.SHOPIFY_APP_URL);
    dashboardUrl.searchParams.set("proxyToken", proxyToken);

    const dashboardResponse = await fetch(dashboardUrl.toString());
    const html = await dashboardResponse.text();

    return new Response(html, {
      status: dashboardResponse.status,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Invalid app proxy request", error);
    return NextResponse.json(
      { ok: false, error: "Invalid proxy signature" },
      { status: 401 },
    );
  }
}
