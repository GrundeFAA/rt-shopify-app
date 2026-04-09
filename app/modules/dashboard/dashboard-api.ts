import type { CompanyAddress } from "./dashboard.types";
import type { ApiErrorContract } from "./error-state";

export function makeRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function readErrorContract(response: Response): Promise<ApiErrorContract> {
  const requestIdFromHeader = response.headers.get("x-request-id") ?? makeRequestId();
  const fallback: ApiErrorContract = {
    code: "INTERNAL_ERROR",
    message: "Kunne ikke laste dashbordsesjon.",
    requestId: requestIdFromHeader,
    retryable: true,
  };

  try {
    const raw = await response.json();
    if (
      typeof raw?.code === "string" &&
      typeof raw?.message === "string" &&
      typeof raw?.requestId === "string" &&
      typeof raw?.retryable === "boolean"
    ) {
      return {
        code: raw.code,
        message: raw.message,
        requestId: raw.requestId,
        retryable: raw.retryable,
        details:
          raw.details && typeof raw.details === "object"
            ? (raw.details as Record<string, unknown>)
            : undefined,
      };
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export function createBootstrapHeaders(
  request: Request,
  iframeSessionToken: string | null,
): Headers {
  const headers = new Headers({
    cookie: request.headers.get("cookie") ?? "",
    "x-request-id": request.headers.get("x-request-id") ?? makeRequestId(),
  });

  if (iframeSessionToken) {
    headers.set("authorization", `Bearer ${iframeSessionToken}`);
  }

  return headers;
}

export function createApiHeaders(authToken: string | null): Headers {
  const headers = new Headers({
    "content-type": "application/json",
    "x-request-id": makeRequestId(),
  });

  if (authToken) {
    headers.set("authorization", `Bearer ${authToken}`);
  }

  return headers;
}

export async function patchCompanyAddress(
  address: CompanyAddress,
  authToken: string | null,
): Promise<Response> {
  return fetch("/api/company/profile", {
    method: "PATCH",
    headers: createApiHeaders(authToken),
    body: JSON.stringify({
      company_address: address,
    }),
  });
}
