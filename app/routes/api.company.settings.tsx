import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { toApiErrorResponse, validationDetailsFromIssues } from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import {
  CompanyIdInputSchema,
  UpdateCompanySettingsInputSchema,
} from "../modules/company/schemas/company.schema";
import { getCompanySettings } from "../modules/company/services/get-company-settings.service";
import { updateCompanySettings } from "../modules/company/services/update-company-settings.service";
import {
  applyAdminCors,
  requireAdminServiceContext,
} from "../modules/shopify/admin.server";

function jsonSuccess(context: { requestId: string }, body: unknown): Response {
  return Response.json(body, {
    headers: {
      "Cache-Control": "no-store",
      "x-request-id": context.requestId,
    },
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const parseResult = CompanyIdInputSchema.safeParse({
      companyId: new URL(request.url).searchParams.get("companyId"),
    });

    if (!parseResult.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Missing or invalid company identifier.",
        400,
        false,
        validationDetailsFromIssues(parseResult.error.issues),
      );
    }

    const context = await requireAdminServiceContext(request);
    const result = await getCompanySettings(context, parseResult.data);

    return applyAdminCors(context, jsonSuccess(context, result));
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new AppError("VALIDATION_FAILED", "Request body must be valid JSON.", 400, false);
    }

    const parseResult = UpdateCompanySettingsInputSchema.safeParse(payload);
    if (!parseResult.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Invalid company settings payload.",
        400,
        false,
        validationDetailsFromIssues(parseResult.error.issues),
      );
    }

    const context = await requireAdminServiceContext(request);
    const result = await updateCompanySettings(context, parseResult.data);

    return applyAdminCors(context, jsonSuccess(context, result));
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};
