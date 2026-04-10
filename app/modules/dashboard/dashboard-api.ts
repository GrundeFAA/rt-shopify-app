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

export async function fetchCompanyOrders(
  request: Request,
  iframeSessionToken: string | null,
): Promise<Response> {
  const headers = createBootstrapHeaders(request, iframeSessionToken);
  const ordersUrl = new URL("/api/company/orders", request.url);
  ordersUrl.searchParams.set("limit", "20");
  if (iframeSessionToken) {
    ordersUrl.searchParams.set("st", iframeSessionToken);
  }

  return fetch(ordersUrl, {
    method: "GET",
    headers,
  });
}

export async function fetchCompanyAddresses(
  request: Request,
  iframeSessionToken: string | null,
): Promise<Response> {
  const headers = createBootstrapHeaders(request, iframeSessionToken);
  const addressesUrl = new URL("/api/company/addresses", request.url);
  if (iframeSessionToken) {
    addressesUrl.searchParams.set("st", iframeSessionToken);
  }

  return fetch(addressesUrl, {
    method: "GET",
    headers,
  });
}

export async function fetchCompanyOrderDetail(
  orderId: string,
  authToken: string | null,
): Promise<Response> {
  return fetch(`/api/company/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: createApiHeaders(authToken),
  });
}

export async function createCompanyAddress(
  input: {
    address: {
      label?: string;
      line1: string;
      line2?: string;
      postalCode: string;
      city: string;
      country: string;
    };
    setAsMyDefault: boolean;
  },
  authToken: string | null,
): Promise<Response> {
  return fetch("/api/company/addresses", {
    method: "POST",
    headers: createApiHeaders(authToken),
    body: JSON.stringify(input),
  });
}

export async function updateCompanyAddress(
  addressId: string,
  input: {
    address: {
      label?: string;
      line1: string;
      line2?: string;
      postalCode: string;
      city: string;
      country: string;
    };
  },
  authToken: string | null,
): Promise<Response> {
  return fetch(`/api/company/addresses/${encodeURIComponent(addressId)}`, {
    method: "PATCH",
    headers: createApiHeaders(authToken),
    body: JSON.stringify(input),
  });
}

export async function deleteCompanyAddress(
  addressId: string,
  authToken: string | null,
): Promise<Response> {
  return fetch(`/api/company/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE",
    headers: createApiHeaders(authToken),
  });
}

export async function setMyDefaultCompanyAddress(
  addressId: string,
  authToken: string | null,
): Promise<Response> {
  return fetch(`/api/company/addresses/${encodeURIComponent(addressId)}/set-default`, {
    method: "POST",
    headers: createApiHeaders(authToken),
  });
}

export async function unsetMyDefaultCompanyAddress(authToken: string | null): Promise<Response> {
  return fetch("/api/company/addresses/unset-default", {
    method: "POST",
    headers: createApiHeaders(authToken),
  });
}
