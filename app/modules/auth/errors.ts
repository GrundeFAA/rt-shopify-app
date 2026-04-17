export type ErrorCode =
  | "AUTH_INVALID_PROXY_SIGNATURE"
  | "AUTH_EXPIRED_PROXY_REQUEST"
  | "AUTH_MISSING_CUSTOMER_CONTEXT"
  | "RESOURCE_NOT_FOUND"
  | "SHOPIFY_RATE_LIMITED"
  | "SHOPIFY_TEMPORARY_FAILURE"
  | "SHOPIFY_USER_ERROR"
  | "INFRA_TIMEOUT"
  | "INFRA_UNAVAILABLE"
  | "VALIDATION_FAILED"
  | "INTERNAL_ERROR";

export type ErrorDetails = Record<string, unknown> | undefined;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly details?: ErrorDetails;

  constructor(
    code: ErrorCode,
    message: string,
    status: number,
    retryable = false,
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
