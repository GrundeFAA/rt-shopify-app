import { ProxyParamsSchema, PublicProxyParamsSchema } from "../../contracts/auth.schema";
import { createSha256HmacHex, timingSafeHexEqual } from "../../shared/security/hmac.server";
import { AppError } from "./errors";

type VerifiedPublicProxyContext = {
  shop: string;
  timestamp: number;
  rawParams: URLSearchParams;
  customerId?: string;
};

const DEFAULT_PROXY_MAX_AGE_SECONDS = 300;
const DEFAULT_PROXY_FUTURE_SKEW_SECONDS = 5;

function toSortedProxyPayload(searchParams: URLSearchParams): string {
  const entries = [...new Set(searchParams.keys())]
    .filter((key) => key !== "signature")
    .sort((left, right) => left.localeCompare(right))
    .map((key) => {
      const value = searchParams.getAll(key).join(",");
      return `${key}=${value}`;
    });

  return entries.join("");
}

function verifySignedAppProxyRequest(request: Request): VerifiedPublicProxyContext {
  const url = new URL(request.url);
  const signature = url.searchParams.get("signature");

  if (!signature) {
    throw new AppError(
      "AUTH_INVALID_PROXY_SIGNATURE",
      "Missing proxy signature.",
      401,
      false,
    );
  }

  const parseResult = PublicProxyParamsSchema.safeParse({
    signature,
    shop: url.searchParams.get("shop"),
    timestamp: url.searchParams.get("timestamp"),
    logged_in_customer_id: url.searchParams.get("logged_in_customer_id"),
  });

  if (!parseResult.success) {
    throw new AppError(
      "AUTH_INVALID_PROXY_SIGNATURE",
      "Missing or invalid proxy request context.",
      401,
      false,
    );
  }

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    throw new AppError("INTERNAL_ERROR", "Missing proxy verification secret.", 500, false);
  }

  const payload = toSortedProxyPayload(url.searchParams);
  const expectedSignature = createSha256HmacHex(secret, payload);
  if (!timingSafeHexEqual(signature, expectedSignature)) {
    throw new AppError(
      "AUTH_INVALID_PROXY_SIGNATURE",
      "Invalid proxy signature.",
      401,
      false,
    );
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const freshnessWindowSeconds = Number(process.env.PROXY_MAX_AGE_SECONDS ?? DEFAULT_PROXY_MAX_AGE_SECONDS);
  const allowedFutureSkewSeconds = Number(
    process.env.PROXY_ALLOWED_FUTURE_SKEW_SECONDS ?? DEFAULT_PROXY_FUTURE_SKEW_SECONDS,
  );
  const age = nowInSeconds - parseResult.data.timestamp;
  if (age < -allowedFutureSkewSeconds || age > freshnessWindowSeconds) {
    throw new AppError(
      "AUTH_EXPIRED_PROXY_REQUEST",
      "Proxy request timestamp is expired.",
      401,
      false,
      { ageSeconds: age, freshnessWindowSeconds, allowedFutureSkewSeconds },
    );
  }

  return {
    shop: parseResult.data.shop,
    timestamp: parseResult.data.timestamp,
    rawParams: url.searchParams,
    customerId: parseResult.data.logged_in_customer_id ?? undefined,
  };
}

export function verifyPublicAppProxyRequest(request: Request): VerifiedPublicProxyContext {
  return verifySignedAppProxyRequest(request);
}

export function verifyAppProxyRequest(
  request: Request,
): VerifiedPublicProxyContext & { customerId: string } {
  const proxyContext = verifySignedAppProxyRequest(request);
  const parseResult = ProxyParamsSchema.safeParse({
    signature: proxyContext.rawParams.get("signature"),
    shop: proxyContext.shop,
    timestamp: proxyContext.timestamp,
    logged_in_customer_id: proxyContext.customerId,
  });

  if (!parseResult.success) {
    throw new AppError(
      "AUTH_MISSING_CUSTOMER_CONTEXT",
      "Missing authenticated customer context.",
      401,
      false,
    );
  }

  return {
    ...proxyContext,
    customerId: parseResult.data.logged_in_customer_id,
  };
}
