import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { toApiErrorResponse } from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { requireDashboardSession } from "../modules/auth/middleware.server";
import { CompanyMembershipRepository } from "../modules/auth/repositories/company-membership.repository.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    if (request.method !== "GET") {
      throw new AppError(
        "VALIDATION_FAILED",
        "Only GET is supported for this endpoint.",
        400,
        false,
      );
    }

    const claims = requireDashboardSession(request);
    if (claims.role !== "administrator") {
      throw new AppError("AUTH_FORBIDDEN_ROLE", "Only administrators can list members.", 403, false);
    }

    const repository = new CompanyMembershipRepository(db);
    const memberships = await repository.listByCompanyId(claims.companyId);

    return Response.json(
      {
        members: memberships.map((membership) => ({
          id: membership.id,
          customerId: membership.customerId,
          companyId: membership.companyId,
          role: membership.role,
          status: membership.status,
        })),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};
