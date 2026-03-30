import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AppError, isAppError } from "./errors";

const ZodIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
  code: z.string(),
});

export type ApiErrorBody = {
  code: string;
  message: string;
  requestId: string;
  retryable: boolean;
  details?: Record<string, unknown>;
};

const REDACTED = "[redacted]";
const SENSITIVE_KEY_PATTERN = /(token|secret|authorization|password|cookie|accesskey|apikey)/i;
const TOKEN_VALUE_PATTERN =
  /(shpat_|shpca_|shpss_|xox[baprs]-|bearer\s+[a-z0-9._-]{8,})/i;

function sanitizeStringValue(value: string): string {
  if (TOKEN_VALUE_PATTERN.test(value)) {
    return REDACTED;
  }

  return value.length > 500 ? `${value.slice(0, 500)}...` : value;
}

function sanitizeUnknownValue(value: unknown, keyHint = "", depth = 0): unknown {
  if (depth > 4) {
    return "[truncated]";
  }

  if (keyHint && SENSITIVE_KEY_PATTERN.test(keyHint)) {
    return REDACTED;
  }

  if (typeof value === "string") {
    return sanitizeStringValue(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((entry) => sanitizeUnknownValue(entry, "", depth + 1));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const sanitized: Record<string, unknown> = {};

    for (const [key, entry] of entries) {
      if (key === "stack") {
        continue;
      }
      sanitized[key] = sanitizeUnknownValue(entry, key, depth + 1);
    }

    return sanitized;
  }

  return String(value);
}

function sanitizeDetails(
  details: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!details) {
    return undefined;
  }

  const sanitized = sanitizeUnknownValue(details);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) {
    return undefined;
  }

  return sanitized as Record<string, unknown>;
}

function sanitizeErrorMessage(message: string): string {
  return sanitizeStringValue(message);
}

export function getOrCreateRequestId(request: Request): string {
  return request.headers.get("x-request-id") ?? randomUUID();
}

export function toApiErrorResponse(error: unknown, request: Request): Response {
  const requestId = getOrCreateRequestId(request);
  const appError =
    isAppError(error)
      ? error
      : new AppError(
          "INTERNAL_ERROR",
          "An unexpected error occurred.",
          500,
          false,
        );

  const safeDetails = sanitizeDetails(
    appError.details as Record<string, unknown> | undefined,
  );

  const body: ApiErrorBody = {
    code: appError.code,
    message: sanitizeErrorMessage(appError.message),
    requestId,
    retryable: appError.retryable,
    details: safeDetails,
  };

  console.error(
    JSON.stringify({
      event: "api_error_response",
      requestId,
      path: new URL(request.url).pathname,
      method: request.method,
      code: body.code,
      status: appError.status,
      retryable: body.retryable,
      message: body.message,
      details: body.details,
    }),
  );

  return Response.json(body, {
    status: appError.status,
    headers: {
      "x-request-id": requestId,
    },
  });
}

export function createSyncInProgressError(
  message = "Synchronization is in progress.",
  diagnostics?: {
    upstreamCode?: string;
    stage?: string;
    retryable?: boolean;
    shop?: string;
    companyId?: string;
    causeMessage?: string;
    upstreamDetails?: Record<string, unknown>;
  },
): AppError {
  const details: Record<string, unknown> = {
    syncState: "sync_in_progress",
  };

  if (diagnostics?.upstreamCode) {
    details.upstreamCode = diagnostics.upstreamCode;
  }
  if (diagnostics?.stage) {
    details.stage = diagnostics.stage;
  }
  if (typeof diagnostics?.retryable === "boolean") {
    details.retryable = diagnostics.retryable;
  }
  if (diagnostics?.shop) {
    details.shop = diagnostics.shop;
  }
  if (diagnostics?.companyId) {
    details.companyId = diagnostics.companyId;
  }
  if (diagnostics?.causeMessage) {
    details.causeMessage = sanitizeErrorMessage(diagnostics.causeMessage);
  }
  if (diagnostics?.upstreamDetails && process.env.NODE_ENV !== "production") {
    details.upstreamDetails = diagnostics.upstreamDetails;
  }

  return new AppError("SYNC_IN_PROGRESS", message, 409, false, {
    ...details,
  });
}

export function validationDetailsFromIssues(
  issues: z.ZodIssue[],
): Record<string, unknown> {
  const sanitized = z.array(ZodIssueSchema).parse(
    issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
      code: issue.code,
    })),
  );

  return { issues: sanitized };
}
