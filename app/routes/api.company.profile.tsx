import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import {
  toApiErrorResponse,
  validationDetailsFromIssues,
} from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { requireDashboardSession } from "../modules/auth/middleware.server";
import { CompanyAddressSchema } from "../contracts/company.schema";
import { CompanyProfileMirrorGateway } from "../infrastructure/shopify-gateways/company-profile-mirror.gateway.server";
import { CompanyProfileRepository } from "../modules/company/repositories/company-profile.repository.server";
import { GetCompanyProfileService } from "../modules/company/services/get-company-profile.service";
import { UpdateCompanyAddressService } from "../modules/company/services/update-company-address.service";
import { ShopifyOfflineSessionRepository } from "../modules/sync/repositories/shopify-offline-session.repository.server";
import { MirrorCompanyProfileService } from "../modules/sync/services/mirror-company-profile.service";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const claims = requireDashboardSession(request);
    const repository = new CompanyProfileRepository(db);
    const service = new GetCompanyProfileService(repository);

    const profile = await service.execute({
      companyId: claims.companyId,
    });

    return Response.json(profile, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    if (request.method !== "PATCH") {
      throw new AppError(
        "VALIDATION_FAILED",
        "Only PATCH is supported for this endpoint.",
        400,
        false,
      );
    }

    const claims = requireDashboardSession(request);
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw new AppError(
        "VALIDATION_FAILED",
        "Request body must be valid JSON.",
        400,
        false,
      );
    }

    const parsedAddress = CompanyAddressSchema.safeParse(body.company_address);
    if (!parsedAddress.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Request body validation failed.",
        400,
        false,
        validationDetailsFromIssues(parsedAddress.error.issues),
      );
    }

    const repository = new CompanyProfileRepository(db);
    const sessionRepository = new ShopifyOfflineSessionRepository(db);
    const mirrorGateway = new CompanyProfileMirrorGateway();
    const mirrorService = new MirrorCompanyProfileService(
      sessionRepository,
      mirrorGateway,
    );
    const service = new UpdateCompanyAddressService(repository, mirrorService);
    const updatedProfile = await service.execute({
      companyId: claims.companyId,
      shop: claims.shop,
      role: claims.role,
      companyAddress: parsedAddress.data,
    });

    return Response.json(updatedProfile, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};
