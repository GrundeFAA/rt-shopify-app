import { ZodError } from "zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  getOrCreateRequestId,
  toApiErrorResponse,
  validationDetailsFromIssues,
} from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { verifyPublicAppProxyRequest } from "../modules/auth/proxy.server";
import { registerCompany } from "../modules/onboarding/services/register-company.service";
import { RegisterCompanyPayloadSchema } from "../modules/onboarding/schemas/register-company.schema";
import { requireOfflineAdminServiceContext } from "../modules/shopify/admin.server";

async function readRegisterPayload(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();
    const payloadField = formData.get("payload");

    if (typeof payloadField === "string" && payloadField.trim()) {
      return JSON.parse(payloadField);
    }
  }

  throw new AppError(
    "VALIDATION_FAILED",
    "Registration payload must be sent as JSON or form-data payload field.",
    400,
    false,
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const proxyContext = verifyPublicAppProxyRequest(request);
    const rawPayload = await readRegisterPayload(request);
    const parseResult = RegisterCompanyPayloadSchema.safeParse(rawPayload);

    if (!parseResult.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Invalid registration payload.",
        400,
        false,
        validationDetailsFromIssues(parseResult.error.issues),
      );
    }

    const adminContext = await requireOfflineAdminServiceContext(proxyContext.shop, request);
    const result = await registerCompany(adminContext, parseResult.data);

    return Response.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "x-request-id": adminContext.requestId,
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return toApiErrorResponse(
        new AppError("VALIDATION_FAILED", "Invalid JSON payload.", 400, false),
        request,
      );
    }

    if (error instanceof ZodError) {
      return toApiErrorResponse(
        new AppError(
          "VALIDATION_FAILED",
          "Invalid registration payload.",
          400,
          false,
          validationDetailsFromIssues(error.issues),
        ),
        request,
      );
    }

    return toApiErrorResponse(error, request);
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const requestId = getOrCreateRequestId(request);

  return Response.json(
    {
      ok: false,
      message: "Use POST to submit company registration.",
    },
    {
      status: 405,
      headers: {
        "x-request-id": requestId,
      },
    },
  );
};
