import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { toApiErrorResponse } from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { requireDashboardSession } from "../modules/auth/middleware.server";
import { CompanyProfileRepository } from "../modules/company/repositories/company-profile.repository.server";
import { ShopifyOfflineSessionRepository } from "../modules/sync/repositories/shopify-offline-session.repository.server";
import { VerifyCompanyProfileDriftService } from "../modules/sync/services/verify-company-profile-drift.service";
import { CompanyProfileMirrorGateway } from "../infrastructure/shopify-gateways/company-profile-mirror.gateway.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const claims = requireDashboardSession(request);
    if (claims.role !== "administrator") {
      throw new AppError(
        "AUTH_FORBIDDEN_ROLE",
        "Only administrators can verify company mirror drift.",
        403,
        false,
      );
    }

    const companyRepository = new CompanyProfileRepository(db);
    const sessionRepository = new ShopifyOfflineSessionRepository(db);
    const gateway = new CompanyProfileMirrorGateway();
    const service = new VerifyCompanyProfileDriftService(
      companyRepository,
      sessionRepository,
      gateway,
    );

    const report = await service.execute(claims.companyId);
    return Response.json(report, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};
