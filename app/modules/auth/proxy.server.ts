import { ProxyParamsSchema } from "../../contracts/auth.schema";
import { createSha256HmacHex, timingSafeHexEqual } from "../../shared/security/hmac.server";
import { AppError } from "./errors";

type VerifiedProxyContext = {
  customerId: string;
  timestamp: number;
  rawParams: URLSearchParams;
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

export function verifyAppProxyRequest(request: Request): VerifiedProxyContext {
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

  const parseResult = ProxyParamsSchema.safeParse({
    signature,
    timestamp: url.searchParams.get("timestamp"),
    logged_in_customer_id: url.searchParams.get("logged_in_customer_id"),
  });

  if (!parseResult.success) {
    throw new AppError(
      "AUTH_MISSING_CUSTOMER_CONTEXT",
      "Missing authenticated customer context.",
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
    customerId: parseResult.data.logged_in_customer_id,
    timestamp: parseResult.data.timestamp,
    rawParams: url.searchParams,
  };
}
