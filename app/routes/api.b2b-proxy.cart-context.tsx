import type { LoaderFunctionArgs } from "react-router";
import db from "../db.server";
import { verifyAppProxyRequest } from "../modules/auth/proxy.server";
import { toApiErrorResponse } from "../modules/auth/api-error.server";
import { CompanyProfileRepository } from "../modules/company/repositories/company-profile.repository.server";
import { GetProxyCartContextService } from "../modules/company/services/get-proxy-cart-context.service";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const proxyContext = verifyAppProxyRequest(request);
    const companyRepository = new CompanyProfileRepository(db);
    const service = new GetProxyCartContextService(companyRepository);

    const cartContext = await service.execute({
      customerId: proxyContext.customerId,
    });

    return Response.json(cartContext, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};
