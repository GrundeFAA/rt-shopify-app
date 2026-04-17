import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  getOrCreateRequestId,
  toApiErrorResponse,
  validationDetailsFromIssues,
} from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { CreateCompanyLocationInputSchema } from "../modules/company/schemas/company.schema";
import { createCompanyLocation } from "../modules/company/services/create-company-location.service";
import {
  requireCustomerAccountServiceContext,
  requireOfflineAdminServiceContext,
} from "../modules/shopify/admin.server";

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

    const parseResult = CreateCompanyLocationInputSchema.safeParse(payload);
    if (!parseResult.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Invalid company location payload.",
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
    const result = await createCompanyLocation(
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
    return customerAccountContext ? customerAccountContext.cors(errorResponse) : errorResponse;
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return Response.json(
    {
      ok: false,
      message: "Use POST to create company locations.",
    },
    {
      status: 405,
      headers: {
        "x-request-id": getOrCreateRequestId(request),
      },
    },
  );
};
