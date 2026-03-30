import type { LoaderFunctionArgs } from "react-router";
import { AppError } from "../modules/auth/errors";
import { requireDashboardSession } from "../modules/auth/middleware.server";
import { toApiErrorResponse } from "../modules/auth/api-error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const claims = requireDashboardSession(request);

    return Response.json({
      customerId: claims.customerId,
      companyId: claims.companyId,
      role: claims.role,
      status: claims.status,
      iat: claims.iat,
      exp: claims.exp,
      jti: claims.jti,
    });
  } catch (error) {
    if (error instanceof AppError && error.code === "AUTH_NO_MEMBERSHIP") {
      return toApiErrorResponse(
        new AppError(
          "AUTH_NO_MEMBERSHIP",
          "No membership was found for this authenticated customer.",
          403,
          false,
        ),
        request,
      );
    }

    return toApiErrorResponse(error, request);
  }
};
