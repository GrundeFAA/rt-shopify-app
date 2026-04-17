import { z } from "zod";
import { AppError, isAppError } from "../auth/errors";

const GraphqlErrorSchema = z.object({
  message: z.string(),
  extensions: z.record(z.string(), z.unknown()).optional(),
});

const UserErrorSchema = z.object({
  field: z.array(z.union([z.string(), z.number()])).nullable().optional(),
  message: z.string(),
  code: z.string().nullable().optional(),
});

const AdminPayloadSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(GraphqlErrorSchema).optional(),
});

type AdminPayload = z.infer<typeof AdminPayloadSchema>;
export type ShopifyUserError = z.infer<typeof UserErrorSchema>;

type ErrorContext = {
  operationName: string;
  shop: string;
  fallbackMessage: string;
};

function getAdminPayload(payload: unknown): AdminPayload | undefined {
  const result = AdminPayloadSchema.safeParse(payload);
  return result.success ? result.data : undefined;
}

function inferShopifyErrorCode(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("throttled") ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("too many requests")
  ) {
    return {
      code: "SHOPIFY_RATE_LIMITED" as const,
      status: 429,
      retryable: true,
    };
  }

  return {
    code: "SHOPIFY_TEMPORARY_FAILURE" as const,
    status: 503,
    retryable: true,
  };
}

function getNestedValue(root: unknown, path: string[]): unknown {
  return path.reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, root);
}

export function getShopifyUserErrors(
  payload: unknown,
  userErrorPath: string[],
): ShopifyUserError[] {
  const parsedPayload = getAdminPayload(payload);
  if (!parsedPayload?.data) {
    return [];
  }

  const userErrors = getNestedValue(parsedPayload.data, [...userErrorPath, "userErrors"]);
  const result = z.array(UserErrorSchema).safeParse(userErrors);

  return result.success ? result.data : [];
}

export function throwIfAdminGraphqlErrors(
  payload: unknown,
  context: ErrorContext,
): void {
  const parsedPayload = getAdminPayload(payload);
  const graphqlErrors = parsedPayload?.errors ?? [];
  const firstMessage = graphqlErrors[0]?.message;

  if (!firstMessage) {
    return;
  }

  const classification = inferShopifyErrorCode(firstMessage);
  throw new AppError(
    classification.code,
    firstMessage || context.fallbackMessage,
    classification.status,
    classification.retryable,
    {
      operationName: context.operationName,
      shop: context.shop,
      graphqlErrors: graphqlErrors.map((error) => error.message),
    },
  );
}

export function throwIfAdminUserErrors(
  payload: unknown,
  context: ErrorContext & { userErrorPath: string[] },
): void {
  const userErrors = getShopifyUserErrors(payload, context.userErrorPath);
  if (userErrors.length === 0) {
    return;
  }

  throw new AppError("SHOPIFY_USER_ERROR", userErrors[0].message, 422, false, {
    operationName: context.operationName,
    shop: context.shop,
    userErrors,
  });
}

export function normalizeAdminApiError(
  error: unknown,
  context: ErrorContext,
): AppError {
  if (isAppError(error)) {
    return error;
  }

  const message =
    error instanceof Error && error.message ? error.message : context.fallbackMessage;
  const classification = inferShopifyErrorCode(message);

  return new AppError(
    classification.code,
    context.fallbackMessage,
    classification.status,
    classification.retryable,
    {
      operationName: context.operationName,
      shop: context.shop,
      cause: message,
    },
  );
}
