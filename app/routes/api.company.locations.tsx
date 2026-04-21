import type { LoaderFunctionArgs } from "react-router";
import { toApiErrorResponse, validationDetailsFromIssues } from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { CompanyIdInputSchema } from "../modules/company/schemas/company.schema";
import { getCompanyLocations } from "../modules/company/services/get-company-locations.service";
import {
  applyAdminCors,
  requireAdminServiceContext,
} from "../modules/shopify/admin.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  let context: Awaited<ReturnType<typeof requireAdminServiceContext>> | null = null;

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

    context = await requireAdminServiceContext(request);
    const result = await getCompanyLocations(context, parseResult.data);

    return applyAdminCors(
      context,
      Response.json(result, {
        headers: {
          "Cache-Control": "no-store",
          "x-request-id": context.requestId,
        },
      }),
    );
  } catch (error) {
    const errorResponse = toApiErrorResponse(error, request);
    return context ? applyAdminCors(context, errorResponse) : errorResponse;
  }
};
