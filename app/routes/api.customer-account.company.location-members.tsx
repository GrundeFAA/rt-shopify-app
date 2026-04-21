import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  getOrCreateRequestId,
  toApiErrorResponse,
  validationDetailsFromIssues,
} from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { CompanyLocationMembersInputSchema } from "../modules/company/schemas/company.schema";
import { getCustomerAccountLocationMembers } from "../modules/company/services/customer-account-company-dashboard.service";
import {
  requireCustomerAccountServiceContext,
  requireOfflineAdminServiceContext,
} from "../modules/shopify/admin.server";

function buildCustomerAccountCorsHeaders(request: Request): Headers {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, X-Request-Id",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });

  if (origin === "https://extensions.shopifycdn.com") {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  let customerAccountContext;

  try {
    customerAccountContext = await requireCustomerAccountServiceContext(request);

    let payload;
    try {
      payload = await request.json();
    } catch {
      throw new AppError("VALIDATION_FAILED", "Request body must be valid JSON.", 400, false);
    }

    const parseResult = CompanyLocationMembersInputSchema.safeParse(payload);
    if (!parseResult.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Invalid company location members payload.",
        400,
        false,
        validationDetailsFromIssues(parseResult.error.issues),
      );
    }

    const currentCustomerId = customerAccountContext.sessionToken.sub;
    if (!currentCustomerId || typeof currentCustomerId !== "string") {
      throw new AppError(
        "AUTH_FORBIDDEN",
        "Missing authenticated customer identity.",
        401,
        false,
      );
    }

    const adminContext = await requireOfflineAdminServiceContext(
      customerAccountContext.shop,
      request,
    );
    const result = await getCustomerAccountLocationMembers(
      adminContext,
      currentCustomerId,
      parseResult.data,
    );

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
      message: "Use POST to load company location members.",
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
