import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import { toApiErrorResponse } from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { requireDashboardSession } from "../modules/auth/middleware.server";
import { CompanySharedAddressesRepository } from "../modules/company/repositories/company-shared-addresses.repository.server";
import { CompanySharedAddressesService } from "../modules/company/services/company-shared-addresses.service";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== "POST") {
      throw new AppError(
        "VALIDATION_FAILED",
        "Only POST is supported for this endpoint.",
        400,
        false,
      );
    }

    const claims = requireDashboardSession(request);
    const service = new CompanySharedAddressesService(new CompanySharedAddressesRepository(db));
    const result = await service.unsetDefault({
      companyId: claims.companyId,
      customerId: claims.customerId,
    });

    return Response.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};
