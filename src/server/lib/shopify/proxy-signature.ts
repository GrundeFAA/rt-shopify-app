import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "#/env";

const SHOP_DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
const CONTEXT_TOKEN_TTL_MS = 5 * 60 * 1000;

type ProxyContext = {
  shopDomain: string;
  loggedInCustomerId: string;
};

type DashboardContextTokenPayload = {
  shopDomain: string;
  loggedInCustomerId: string;
  exp: number;
};

const normalizeShopDomain = (shop: string) =>
  shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

const createHexDigest = (input: string) =>
  createHmac("sha256", env.SHOPIFY_CLIENT_SECRET).update(input).digest("hex");

const secureHexEqual = (leftHex: string, rightHex: string) => {
  const left = Buffer.from(leftHex, "utf8");
  const right = Buffer.from(rightHex, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

const serializeAppProxyMessage = (params: URLSearchParams) => {
  const grouped = new Map<string, string[]>();

  for (const [key, value] of params.entries()) {
    if (key === "signature") continue;
    const values = grouped.get(key) ?? [];
    values.push(value);
    grouped.set(key, values);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => `${key}=${values.join(",")}`)
    .join("");
};

const signTokenBody = (tokenBody: string) => createHexDigest(tokenBody);

export const shopifyProxySignature = {
  verifyAppProxyRequest(searchParams: URLSearchParams): ProxyContext {
    const signature = searchParams.get("signature");
    const shopRaw = searchParams.get("shop");
    const loggedInCustomerId = searchParams.get("logged_in_customer_id");

    if (!signature) throw new Error("Missing app proxy signature");
    if (!shopRaw) throw new Error("Missing shop");
    if (!loggedInCustomerId) throw new Error("Missing logged_in_customer_id");

    const shopDomain = normalizeShopDomain(shopRaw);
    if (!SHOP_DOMAIN_REGEX.test(shopDomain)) {
      throw new Error("Invalid shop domain");
    }

    if (shopDomain !== env.SHOPIFY_STORE_DOMAIN) {
      throw new Error("Unexpected shop domain");
    }

    const message = serializeAppProxyMessage(searchParams);
    const expectedSignature = createHexDigest(message);
    if (!secureHexEqual(signature, expectedSignature)) {
      throw new Error("Invalid app proxy signature");
    }

    return { shopDomain, loggedInCustomerId };
  },

  createDashboardContextToken(input: {
    shopDomain: string;
    loggedInCustomerId: string;
  }) {
    const payload: DashboardContextTokenPayload = {
      shopDomain: input.shopDomain,
      loggedInCustomerId: input.loggedInCustomerId,
      exp: Date.now() + CONTEXT_TOKEN_TTL_MS,
    };
    const tokenBody = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = signTokenBody(tokenBody);
    return `${tokenBody}.${signature}`;
  },

  verifyDashboardContextToken(token: string): ProxyContext {
    const [tokenBody, signature] = token.split(".");
    if (!tokenBody || !signature) {
      throw new Error("Malformed dashboard context token");
    }

    const expectedSignature = signTokenBody(tokenBody);
    if (!secureHexEqual(signature, expectedSignature)) {
      throw new Error("Invalid dashboard context token signature");
    }

    let payload: DashboardContextTokenPayload;
    try {
      payload = JSON.parse(
        Buffer.from(tokenBody, "base64url").toString("utf8"),
      ) as DashboardContextTokenPayload;
    } catch {
      throw new Error("Invalid dashboard context token payload");
    }

    if (!payload.loggedInCustomerId || !payload.shopDomain || !payload.exp) {
      throw new Error("Incomplete dashboard context token");
    }
    if (Date.now() > payload.exp) {
      throw new Error("Expired dashboard context token");
    }
    if (payload.shopDomain !== env.SHOPIFY_STORE_DOMAIN) {
      throw new Error("Unexpected shop in dashboard context token");
    }

    return {
      shopDomain: payload.shopDomain,
      loggedInCustomerId: payload.loggedInCustomerId,
    };
  },
};
