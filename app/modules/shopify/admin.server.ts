import type {
  AdminApiContext,
  WebhookContext,
} from "@shopify/shopify-app-react-router/server";
import type { JwtPayload } from "@shopify/shopify-api";
import type { Session } from "@shopify/shopify-api";
import { z } from "zod";
import { authenticate, unauthenticated } from "../../shopify.server";
import { getOrCreateRequestId } from "../auth/api-error.server";
import { AppError } from "../auth/errors";
import {
  normalizeAdminApiError,
  throwIfAdminGraphqlErrors,
  throwIfAdminUserErrors,
} from "./admin-errors.server";

type AuthenticatedAdminContext = Awaited<ReturnType<typeof authenticate.admin>>;
type UnauthenticatedAdminContext = Awaited<ReturnType<typeof unauthenticated.admin>>;

export type AdminServiceContext = {
  admin: AdminApiContext;
  session: Session;
  shop: string;
  requestId: string;
  source: "admin" | "webhook" | "offline";
  cors?: AuthenticatedAdminContext["cors"];
};

export type CustomerAccountServiceContext = {
  cors: (response: Response) => Response;
  requestId: string;
  sessionToken: JwtPayload;
  shop: string;
};

type GraphqlVariables = Record<string, unknown>;

type ExecuteAdminGraphqlOptions<TData> = {
  context: AdminServiceContext;
  document: string;
  operationName: string;
  fallbackMessage: string;
  dataSchema: z.ZodType<TData>;
  variables?: GraphqlVariables;
  userErrorPath?: string[];
};

function buildAdminServiceContext(
  source: AdminServiceContext["source"],
  requestId: string,
  context: Pick<AuthenticatedAdminContext, "admin" | "session" | "cors">,
): AdminServiceContext;
function buildAdminServiceContext(
  source: AdminServiceContext["source"],
  requestId: string,
  context: Pick<UnauthenticatedAdminContext, "admin" | "session">,
): AdminServiceContext;
function buildAdminServiceContext(
  source: AdminServiceContext["source"],
  requestId: string,
  context:
    | Pick<AuthenticatedAdminContext, "admin" | "session" | "cors">
    | Pick<UnauthenticatedAdminContext, "admin" | "session">,
): AdminServiceContext {
  return {
    admin: context.admin,
    session: context.session,
    shop: context.session.shop,
    requestId,
    source,
    cors: "cors" in context ? context.cors : undefined,
  };
}

export async function requireAdminServiceContext(
  request: Request,
): Promise<AdminServiceContext> {
  const authContext = await authenticate.admin(request);

  return buildAdminServiceContext(
    "admin",
    getOrCreateRequestId(request),
    authContext,
  );
}

export async function requireOfflineAdminServiceContext(
  shop: string,
  request: Request,
): Promise<AdminServiceContext> {
  const offlineContext = await unauthenticated.admin(shop);

  return buildAdminServiceContext(
    "offline",
    getOrCreateRequestId(request),
    offlineContext,
  );
}

export async function requireCustomerAccountServiceContext(
  request: Request,
): Promise<CustomerAccountServiceContext> {
  const publicContext = await authenticate.public.customerAccount(request, {
    corsHeaders: ["x-request-id"],
  });
  const requestId = getOrCreateRequestId(request);
  const destination = publicContext.sessionToken.dest;

  if (!destination || typeof destination !== "string") {
    throw new AppError(
      "AUTH_FORBIDDEN",
      "Missing customer account session destination.",
      401,
      false,
    );
  }

  const shop = destination.startsWith("http://") || destination.startsWith("https://")
    ? new URL(destination).host
    : destination;

  return {
    cors: publicContext.cors,
    requestId,
    sessionToken: publicContext.sessionToken,
    shop,
  };
}

export function maybeWebhookAdminServiceContext(
  webhookContext: WebhookContext,
  request: Request,
): AdminServiceContext | undefined {
  if (!webhookContext.session || !webhookContext.admin) {
    return undefined;
  }

  return buildAdminServiceContext("webhook", getOrCreateRequestId(request), {
    admin: webhookContext.admin,
    session: webhookContext.session,
  });
}

export function applyAdminCors(
  context: AdminServiceContext,
  response: Response,
): Response {
  return context.cors ? context.cors(response) : response;
}

export async function executeAdminGraphql<TData>({
  context,
  document,
  operationName,
  fallbackMessage,
  dataSchema,
  variables,
  userErrorPath = [],
}: ExecuteAdminGraphqlOptions<TData>): Promise<TData> {
  try {
    const response = await context.admin.graphql(
      document,
      variables ? { variables } : undefined,
    );
    const payload = await response.json();

    throwIfAdminGraphqlErrors(payload, {
      operationName,
      shop: context.shop,
      fallbackMessage,
    });

    if (userErrorPath.length > 0) {
      throwIfAdminUserErrors(payload, {
        operationName,
        shop: context.shop,
        fallbackMessage,
        userErrorPath,
      });
    }

    const data = (payload as { data?: unknown }).data;
    const result = dataSchema.safeParse(data);

    if (!result.success) {
      throw new AppError(
        "SHOPIFY_TEMPORARY_FAILURE",
        fallbackMessage,
        502,
        true,
        {
          operationName,
          shop: context.shop,
          issues: result.error.issues,
        },
      );
    }

    return result.data;
  } catch (error) {
    throw normalizeAdminApiError(error, {
      operationName,
      shop: context.shop,
      fallbackMessage,
    });
  }
}

export function toShopifyGid(resourceName: string, id: string): string {
  return id.startsWith("gid://") ? id : `gid://shopify/${resourceName}/${id}`;
}
