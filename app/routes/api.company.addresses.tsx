import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { CompanyAddressesShopifyGateway } from "../infrastructure/shopify-gateways/company-addresses.shopify-gateway.server";
import {
  CreateCompanyAddressInputSchema,
} from "../contracts/company-addresses.schema";
import {
  toApiErrorResponse,
  validationDetailsFromIssues,
} from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { requireDashboardSession } from "../modules/auth/middleware.server";
import { CompanySharedAddressesRepository } from "../modules/company/repositories/company-shared-addresses.repository.server";
import { CompanyProfileRepository } from "../modules/company/repositories/company-profile.repository.server";
import { CompanySharedAddressesService } from "../modules/company/services/company-shared-addresses.service";
import { ExecuteCompanyAddressSyncService } from "../modules/company/services/execute-company-address-sync.service";
import { ProcessCompanyAddressSyncIntentService } from "../modules/company/services/process-company-address-sync-intent.service";
import { ShopifyOfflineSessionRepository } from "../modules/sync/repositories/shopify-offline-session.repository.server";

function buildService(): CompanySharedAddressesService {
  return new CompanySharedAddressesService(new CompanySharedAddressesRepository(db));
}

function buildSyncProcessor(): ProcessCompanyAddressSyncIntentService {
  return new ProcessCompanyAddressSyncIntentService(
    new CompanySharedAddressesRepository(db),
    new ShopifyOfflineSessionRepository(db),
    new CompanyProfileRepository(db),
    new CompanyAddressesShopifyGateway(),
  );
}

async function enforceSyncOrRollback(input: {
  syncIntentId: string;
  shop: string;
  companyId: string;
}): Promise<void> {
  const sharedAddressesRepository = new CompanySharedAddressesRepository(db);
  const service = new ExecuteCompanyAddressSyncService(sharedAddressesRepository, buildSyncProcessor());
  await service.execute({
    syncIntentId: input.syncIntentId,
    companyId: input.companyId,
    shop: input.shop,
    failureMessage: "Address sync failed and the operation was rolled back.",
    recoveryReason: "dashboard_sync_failure_after_partial_projection",
    compensateSyncIntent: true,
    failureLogEvent: "company_address_sync_intent_processing_failed",
    recoveryLogEvent: "company_address_sync_recovery_failed",
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const claims = requireDashboardSession(request);
    const service = buildService();
    const result = await service.list({
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError(
        "VALIDATION_FAILED",
        "Request body must be valid JSON.",
        400,
        false,
      );
    }

    const parsedBody = CreateCompanyAddressInputSchema.safeParse(body);
    if (!parsedBody.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Request body validation failed.",
        400,
        false,
        validationDetailsFromIssues(parsedBody.error.issues),
      );
    }

    const service = buildService();
    const result = await service.create({
      companyId: claims.companyId,
      customerId: claims.customerId,
      address: parsedBody.data.address,
      setAsMyDefault: parsedBody.data.setAsMyDefault,
    });
    await enforceSyncOrRollback({
      syncIntentId: result.syncIntentId,
      shop: claims.shop,
      companyId: claims.companyId,
    });

    return Response.json(result, {
      status: 201,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};
