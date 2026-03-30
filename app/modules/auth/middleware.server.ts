import type { DashboardSessionClaims } from "../../contracts/auth.schema";
import { AppError } from "./errors";
import {
  getDashboardSessionTokenFromRequest,
  validateDashboardSessionToken,
} from "./session.server";

export function requireDashboardSession(request: Request): DashboardSessionClaims {
  const token = getDashboardSessionTokenFromRequest(request);
  if (!token) {
    throw new AppError(
      "AUTH_INVALID_IFRAME_SESSION",
      "Authentication is required.",
      401,
      false,
    );
  }

  const claims = validateDashboardSessionToken(token);

  if (claims.status !== "active") {
    throw new AppError(
      "AUTH_INACTIVE_MEMBERSHIP",
      "Your membership is pending activation.",
      403,
      false,
    );
  }

  if (!claims.companyId) {
    throw new AppError(
      "AUTH_NO_MEMBERSHIP",
      "No company membership was found.",
      403,
      false,
    );
  }

  return claims;
}
