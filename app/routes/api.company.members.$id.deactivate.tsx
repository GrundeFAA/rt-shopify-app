import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import db from "../db.server";
import {
  toApiErrorResponse,
  validationDetailsFromIssues,
} from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { requireDashboardSession } from "../modules/auth/middleware.server";
import { CompanyMembershipRepository } from "../modules/auth/repositories/company-membership.repository.server";
import { DeactivateCompanyMemberService } from "../modules/company/services/deactivate-company-member.service";

const DeactivateMemberParamsSchema = z.object({
  id: z.string().trim().min(1),
});

function buildService(): DeactivateCompanyMemberService {
  return new DeactivateCompanyMemberService(new CompanyMembershipRepository(db));
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
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
    const parsedParams = DeactivateMemberParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Invalid company membership id.",
        400,
        false,
        validationDetailsFromIssues(parsedParams.error.issues),
      );
    }

    const service = buildService();
    const result = await service.execute({
      actorCustomerId: claims.customerId,
      memberId: parsedParams.data.id,
      companyId: claims.companyId,
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
