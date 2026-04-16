import type { ActionFunctionArgs } from "react-router";
import { z } from "zod";
import db from "../db.server";
import { CompanyAddressesShopifyGateway } from "../infrastructure/shopify-gateways/company-addresses.shopify-gateway.server";
import {
  toApiErrorResponse,
  validationDetailsFromIssues,
} from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { requireDashboardSession } from "../modules/auth/middleware.server";
import { CompanyMembershipRepository } from "../modules/auth/repositories/company-membership.repository.server";
import { CompanyProfileRepository } from "../modules/company/repositories/company-profile.repository.server";
import { CompanySharedAddressesRepository } from "../modules/company/repositories/company-shared-addresses.repository.server";
import { ActivateCompanyMemberService } from "../modules/company/services/activate-company-member.service";
import { ExecuteCompanyAddressSyncService } from "../modules/company/services/execute-company-address-sync.service";
import { ProcessCompanyAddressSyncIntentService } from "../modules/company/services/process-company-address-sync-intent.service";
import { ShopifyOfflineSessionRepository } from "../modules/sync/repositories/shopify-offline-session.repository.server";

const ActivateMemberParamsSchema = z.object({
  id: z.string().trim().min(1),
});

function buildSyncProcessor(): ProcessCompanyAddressSyncIntentService {
  return new ProcessCompanyAddressSyncIntentService(
    new CompanySharedAddressesRepository(db),
    new ShopifyOfflineSessionRepository(db),
    new CompanyProfileRepository(db),
    new CompanyAddressesShopifyGateway(),
  );
}

function buildActivationService(): ActivateCompanyMemberService {
  const sharedAddressesRepository = new CompanySharedAddressesRepository(db);
  const addressSyncExecutor = new ExecuteCompanyAddressSyncService(
    sharedAddressesRepository,
    buildSyncProcessor(),
  );
  return new ActivateCompanyMemberService(
    new CompanyMembershipRepository(db),
    sharedAddressesRepository,
    addressSyncExecutor,
  );
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
    const parsedParams = ActivateMemberParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Invalid company membership id.",
        400,
        false,
        validationDetailsFromIssues(parsedParams.error.issues),
      );
    }

    const service = buildActivationService();
    const result = await service.execute({
      actorCustomerId: claims.customerId,
      memberId: parsedParams.data.id,
      companyId: claims.companyId,
      shop: claims.shop,
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
