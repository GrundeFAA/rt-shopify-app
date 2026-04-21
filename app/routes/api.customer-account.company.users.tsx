import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  getOrCreateRequestId,
  toApiErrorResponse,
  validationDetailsFromIssues,
} from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import {
  InviteCompanyUserInputSchema,
  UpdateCompanyUserInputSchema,
} from "../modules/company/schemas/company.schema";
import { inviteCompanyUser } from "../modules/company/services/invite-company-user.service";
import { updateCompanyUser } from "../modules/company/services/update-company-user.service";
import {
  requireCustomerAccountServiceContext,
  requireOfflineAdminServiceContext,
} from "../modules/shopify/admin.server";

function buildCustomerAccountCorsHeaders(request: Request): Headers {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, X-Request-Id",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });

  if (origin === "https://extensions.shopifycdn.com") {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function getInvalidPayloadMessage(method: string) {
  return method === "PATCH"
    ? "Invalid company user update payload."
    : "Invalid company user payload.";
}

export const action = async ({ request }: ActionFunctionArgs) => {
  let customerAccountContext;
  const allowedMethods = new Set(["POST", "PATCH"]);

  try {
    customerAccountContext = await requireCustomerAccountServiceContext(request);

    if (!allowedMethods.has(request.method)) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Method not allowed. Use POST to invite company users or PATCH to edit company users.",
        405,
        false,
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      throw new AppError("VALIDATION_FAILED", "Request body must be valid JSON.", 400, false);
    }

    const currentCustomerId = customerAccountContext.sessionToken.sub;
    if (!currentCustomerId || typeof currentCustomerId !== "string") {
      throw new AppError(
        "AUTH_UNAUTHENTICATED",
        "Missing authenticated customer identity.",
        401,
        false,
      );
    }

    const adminContext = await requireOfflineAdminServiceContext(
      customerAccountContext.shop,
      request,
    );
    let result;

    if (request.method === "PATCH") {
      const parseResult = UpdateCompanyUserInputSchema.safeParse(payload);
      if (!parseResult.success) {
        throw new AppError(
          "VALIDATION_FAILED",
          getInvalidPayloadMessage(request.method),
          400,
          false,
          validationDetailsFromIssues(parseResult.error.issues),
        );
      }

      result = await updateCompanyUser(adminContext, currentCustomerId, parseResult.data);
    } else {
      const parseResult = InviteCompanyUserInputSchema.safeParse(payload);
      if (!parseResult.success) {
        throw new AppError(
          "VALIDATION_FAILED",
          getInvalidPayloadMessage(request.method),
          400,
          false,
          validationDetailsFromIssues(parseResult.error.issues),
        );
      }

      result = await inviteCompanyUser(adminContext, currentCustomerId, parseResult.data);
    }

    return customerAccountContext.cors(
      Response.json(result, {
        headers: {
          "Cache-Control": "no-store",
          "x-request-id": adminContext.requestId,
        },
      }),
    );
  } catch (error) {
    const errorResponse = toApiErrorResponse(error, request);

    if (customerAccountContext) {
      return customerAccountContext.cors(errorResponse);
    }

    const headers = buildCustomerAccountCorsHeaders(request);
    for (const [key, value] of headers.entries()) {
      errorResponse.headers.set(key, value);
    }

    return errorResponse;
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: buildCustomerAccountCorsHeaders(request),
    });
  }

  return Response.json(
    {
      ok: false,
      message: "Use POST to invite company users or PATCH to edit company users.",
    },
    {
      status: 405,
      headers: {
        ...Object.fromEntries(buildCustomerAccountCorsHeaders(request).entries()),
        "x-request-id": getOrCreateRequestId(request),
      },
    },
  );
};
