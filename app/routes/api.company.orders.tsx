import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { ListCompanyOrdersQuerySchema } from "../contracts/company-orders.schema";
import {
  toApiErrorResponse,
  validationDetailsFromIssues,
} from "../modules/auth/api-error.server";
import { AppError } from "../modules/auth/errors";
import { requireDashboardSession } from "../modules/auth/middleware.server";
import { CompanyProfileRepository } from "../modules/company/repositories/company-profile.repository.server";
import { CompanyOrdersMembershipRepository } from "../modules/company/repositories/company-orders-membership.repository.server";
import { CompanyOrdersService } from "../modules/company/services/company-orders.service";
import { ShopifyOfflineSessionRepository } from "../modules/sync/repositories/shopify-offline-session.repository.server";
import { CompanyOrdersShopifyGateway } from "../infrastructure/shopify-gateways/company-orders.shopify-gateway.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const claims = requireDashboardSession(request);
    const parsedQuery = ListCompanyOrdersQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    if (!parsedQuery.success) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Invalid company orders query parameters.",
        400,
        false,
        validationDetailsFromIssues(parsedQuery.error.issues),
      );
    }

    const service = new CompanyOrdersService(
      new CompanyProfileRepository(db),
      new CompanyOrdersMembershipRepository(db),
      new ShopifyOfflineSessionRepository(db),
      new CompanyOrdersShopifyGateway(),
    );

    const result = await service.listCompanyOrders({
      companyId: claims.companyId,
      shop: claims.shop,
      limit: parsedQuery.data.limit,
      cursor: parsedQuery.data.cursor,
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
