import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { CompanyAddressesShopifyGateway } from "../infrastructure/shopify-gateways/company-addresses.shopify-gateway.server";
import {
  toApiErrorResponse,
  validationDetailsFromIssues,
} from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { requireDashboardSession } from "../modules/auth/middleware.server";
import { CompanyAddressSchema } from "../contracts/company.schema";
import { CompanySharedAddressesRepository } from "../modules/company/repositories/company-shared-addresses.repository.server";
import { CompanyProfileRepository } from "../modules/company/repositories/company-profile.repository.server";
import { ExecuteCompanyAddressSyncService } from "../modules/company/services/execute-company-address-sync.service";
import { GetCompanyProfileService } from "../modules/company/services/get-company-profile.service";
import { ProcessCompanyAddressSyncIntentService } from "../modules/company/services/process-company-address-sync-intent.service";
import { UpdateCompanyAddressService } from "../modules/company/services/update-company-address.service";
import { ShopifyOfflineSessionRepository } from "../modules/sync/repositories/shopify-offline-session.repository.server";

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
    const service = new UpdateCompanyAddressService(repository);
    const previousProfile = await repository.findByCompanyId(claims.companyId);
    if (!previousProfile) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company profile was not found.", 404, false);
    }

    const updatedProfile = await service.execute({
      companyId: claims.companyId,
      shop: claims.shop,
      role: claims.role,
      companyAddress: parsedAddress.data,
    });
    const sharedAddressesRepository = new CompanySharedAddressesRepository(db);
    const syncEligibleCustomerIds = await sharedAddressesRepository.listSyncEligibleCustomerIds(
      claims.companyId,
    );
    const syncIntent = await sharedAddressesRepository.enqueueDashboardPostAddressSyncIntent({
      companyId: claims.companyId,
      syncEligibleCustomerIds,
    });

    const syncProcessor = new ProcessCompanyAddressSyncIntentService(
      sharedAddressesRepository,
      new ShopifyOfflineSessionRepository(db),
      repository,
      new CompanyAddressesShopifyGateway(),
    );
    const syncExecution = new ExecuteCompanyAddressSyncService(
      sharedAddressesRepository,
      syncProcessor,
    );
    await syncExecution.execute({
      syncIntentId: syncIntent.syncIntentId,
      companyId: claims.companyId,
      shop: claims.shop,
      failureMessage: "Post address sync failed and the operation was rolled back.",
      recoveryReason: "post_address_sync_failure_after_profile_rollback",
      failureLogEvent: "company_profile_post_address_sync_failed",
      recoveryLogEvent: "company_profile_post_address_recovery_failed",
      rollbackCanonical: async () => {
        await repository.updateCompanyAddress(claims.companyId, previousProfile.companyAddress);
        return true;
      },
    });

    return Response.json(updatedProfile, { status: 200 });
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};
