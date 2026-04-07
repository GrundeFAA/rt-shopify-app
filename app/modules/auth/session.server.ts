import { randomUUID } from "node:crypto";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";
import {
  DashboardSessionClaims,
  DashboardSessionClaimsSchema,
  MembershipRole,
  MembershipStatus,
} from "../../contracts/auth.schema";
import { signJwtHs256, verifyJwtHs256 } from "../../shared/security/jwt.server";
import { AppError } from "./errors";

const DASHBOARD_SESSION_COOKIE_NAME = "rt_dashboard_session";
const DEFAULT_DASHBOARD_SESSION_TTL_SECONDS = 300;

export type CreateDashboardSessionInput = {
  customerId: string;
  companyId: string;
  role: MembershipRole;
  status: MembershipStatus;
};

function getSessionSecret(): string {
  const dashboardSecret = process.env.DASHBOARD_SESSION_SECRET?.trim();
  if (dashboardSecret) {
    return dashboardSecret;
  }

  return process.env.SHOPIFY_API_SECRET?.trim() ?? "";
}

function getSessionTtlSeconds(): number {
  const parsed = Number(process.env.DASHBOARD_SESSION_TTL_SECONDS ?? DEFAULT_DASHBOARD_SESSION_TTL_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DASHBOARD_SESSION_TTL_SECONDS;
}

export function issueDashboardSessionToken(input: CreateDashboardSessionInput): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new AppError("INTERNAL_ERROR", "Missing dashboard session secret.", 500, false);
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const claims: DashboardSessionClaims = {
    customerId: input.customerId,
    companyId: input.companyId,
    role: input.role,
    status: input.status,
    iat: nowInSeconds,
    exp: nowInSeconds + getSessionTtlSeconds(),
    jti: randomUUID(),
  };

  return signJwtHs256(claims, secret);
}

export function validateDashboardSessionToken(token: string): DashboardSessionClaims {
  const secret = getSessionSecret();
  if (!secret) {
    throw new AppError("INTERNAL_ERROR", "Missing dashboard session secret.", 500, false);
  }

  const payload = verifyJwtHs256(token, secret);
  if (!payload) {
    throw new AppError(
      "AUTH_INVALID_IFRAME_SESSION",
      "Invalid dashboard session token.",
      401,
      false,
    );
  }

  const parsedClaims = DashboardSessionClaimsSchema.safeParse(payload);
  if (!parsedClaims.success) {
    throw new AppError(
      "AUTH_INVALID_IFRAME_SESSION",
      "Malformed dashboard session claims.",
      401,
      false,
    );
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (parsedClaims.data.exp <= nowInSeconds) {
    throw new AppError(
      "AUTH_EXPIRED_IFRAME_SESSION",
      "Dashboard session expired.",
      401,
      false,
    );
  }

  return parsedClaims.data;
}

export function createDashboardSessionCookie(token: string): string {
  return serializeCookie(DASHBOARD_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // Iframe dashboard runs in a third-party context relative to storefront origin.
    // SameSite=None + Secure is required so the session cookie is sent to app routes.
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: getSessionTtlSeconds(),
  });
}

export function clearDashboardSessionCookie(): string {
  return serializeCookie(DASHBOARD_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 0,
  });
}

export function getDashboardSessionTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice("bearer ".length).trim();
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = parseCookie(cookieHeader);
    const cookieToken = cookies[DASHBOARD_SESSION_COOKIE_NAME] ?? null;
    if (cookieToken) {
      return cookieToken;
    }
  }

  // Fallback for bootstrap calls that provide iframe session token in query.
  const queryToken = new URL(request.url).searchParams.get("st")?.trim();
  return queryToken || null;
}
