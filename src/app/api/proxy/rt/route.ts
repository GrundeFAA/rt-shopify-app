import { NextResponse } from "next/server";

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

    const rewriteUrl = new URL("/b2b-dashboard", request.url);
    rewriteUrl.searchParams.set("proxyToken", proxyToken);
    return NextResponse.rewrite(rewriteUrl);
  } catch (error) {
    console.error("Invalid app proxy request", error);
    return NextResponse.json(
      { ok: false, error: "Invalid proxy signature" },
      { status: 401 },
    );
  }
}
