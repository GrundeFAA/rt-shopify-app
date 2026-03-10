import { NextResponse } from "next/server";

import { db } from "#/server/db";
import { shopifyWebhookService } from "#/server/modules/b2b/services/shopify-webhook.service";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;
    const result = await shopifyWebhookService.handleCustomerCreate(db, payload);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("customers/create webhook failed", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
