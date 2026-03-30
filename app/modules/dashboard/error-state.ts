export type DashboardFrontendState =
  | "ready"
  | "unauthorized"
  | "forbidden"
  | "temporarily_unavailable"
  | "sync_in_progress";

export type DashboardErrorState = Exclude<DashboardFrontendState, "ready">;

export type ApiErrorContract = {
  code: string;
  message: string;
  requestId: string;
  retryable: boolean;
  details?: Record<string, unknown>;
};

export type DiagnosticEntry = {
  key: string;
  value: string;
};

const UNAUTHORIZED_CODES = new Set<string>([
  "AUTH_INVALID_PROXY_SIGNATURE",
  "AUTH_EXPIRED_PROXY_REQUEST",
  "AUTH_MISSING_CUSTOMER_CONTEXT",
  "AUTH_INVALID_IFRAME_SESSION",
  "AUTH_EXPIRED_IFRAME_SESSION",
]);

const FORBIDDEN_CODES = new Set<string>([
  "AUTH_FORBIDDEN_ROLE",
  "AUTH_INACTIVE_MEMBERSHIP",
  "AUTH_NO_MEMBERSHIP",
]);

const TEMPORARILY_UNAVAILABLE_CODES = new Set<string>([
  "SHOPIFY_RATE_LIMITED",
  "SHOPIFY_TEMPORARY_FAILURE",
  "INFRA_TIMEOUT",
  "INFRA_UNAVAILABLE",
]);

function getDetailString(
  details: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = details?.[key];
  return typeof value === "string" ? value : null;
}

function formatDiagnosticValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

export function toDiagnosticEntries(
  details: Record<string, unknown> | undefined,
): DiagnosticEntry[] {
  if (!details) {
    return [];
  }

  return Object.entries(details)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({
      key,
      value: formatDiagnosticValue(value),
    }));
}

function isSyncInProgressError(error: ApiErrorContract): boolean {
  const syncState = getDetailString(error.details, "syncState");
  return error.code === "SYNC_IN_PROGRESS" && syncState === "sync_in_progress";
}

export function toDashboardFrontendState(
  error: ApiErrorContract,
): DashboardErrorState {
  if (UNAUTHORIZED_CODES.has(error.code)) {
    return "unauthorized";
  }

  if (FORBIDDEN_CODES.has(error.code)) {
    return "forbidden";
  }

  if (isSyncInProgressError(error)) {
    return "sync_in_progress";
  }

  if (error.retryable || TEMPORARILY_UNAVAILABLE_CODES.has(error.code)) {
    return "temporarily_unavailable";
  }

  return "temporarily_unavailable";
}
