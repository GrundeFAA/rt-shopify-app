import type { LoaderFunctionArgs } from "react-router";
import { MembershipRoleSchema, MembershipStatusSchema } from "../contracts/auth.schema";
import type { MembershipStatus } from "../contracts/auth.schema";
import { AppError } from "../modules/auth/errors";
import { resolveMembershipByCustomerId } from "../modules/auth/membership.server";
import { verifyAppProxyRequest } from "../modules/auth/proxy.server";
import {
  createDashboardSessionCookie,
  issueDashboardSessionToken,
} from "../modules/auth/session.server";
import { toApiErrorResponse } from "../modules/auth/api-error.server";

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderProxyShell(iframePath: string): string {
  const iframeSrc = escapeHtmlAttribute(iframePath);
  return `<!doctype html>
<html lang="no">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dashboard</title>
    <style>
      html, body { margin: 0; padding: 0; height: 100%; }
      iframe { border: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <iframe src="${iframeSrc}" title="RT kundedashboard"></iframe>
  </body>
</html>`;
}

function resolveIframeSource(request: Request): string {
  const configuredPath = process.env.DASHBOARD_IFRAME_PATH ?? "/dashboard";

  // Allow explicit absolute URLs when configured.
  if (/^https?:\/\//i.test(configuredPath)) {
    return configuredPath;
  }

  const hostEnv = process.env.HOST?.trim();
  if (hostEnv) {
    const hostUrl = /^https?:\/\//i.test(hostEnv) ? hostEnv : `https://${hostEnv}`;
    try {
      const parsedHost = new URL(hostUrl);
      if (!parsedHost.hostname.endsWith(".myshopify.com")) {
        return new URL(configuredPath, parsedHost.origin).toString();
      }
    } catch {
      // Continue to the next fallback.
    }
  }

  const configuredAppUrl = process.env.SHOPIFY_APP_URL?.trim();
  if (configuredAppUrl && !configuredAppUrl.includes("your-app-url.example")) {
    try {
      const parsedAppUrl = new URL(configuredAppUrl);
      if (!parsedAppUrl.hostname.endsWith(".myshopify.com")) {
        return new URL(configuredPath, parsedAppUrl.origin).toString();
      }
    } catch {
      // Continue to the next fallback.
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedHost && !forwardedHost.endsWith(".myshopify.com")) {
    const protocol = forwardedProto === "http" ? "http" : "https";
    return new URL(configuredPath, `${protocol}://${forwardedHost}`).toString();
  }

  // Relative paths must resolve to the app origin (not storefront origin).
  const requestUrl = new URL(request.url);
  if (requestUrl.protocol === "http:") {
    requestUrl.protocol = "https:";
  }
  return new URL(configuredPath, requestUrl.origin).toString();
}

function withQueryParam(urlValue: string, key: string, value: string): string {
  const url = new URL(urlValue);
  url.searchParams.set(key, value);
  return url.toString();
}

function getDevMembershipOverrides(request: Request): {
  role?: "administrator" | "user";
  status?: MembershipStatus;
} {
  if (process.env.NODE_ENV === "production") {
    return {};
  }

  const url = new URL(request.url);
  const roleParam = url.searchParams.get("role");
  const statusParam = url.searchParams.get("status");

  const parsedRole = roleParam ? MembershipRoleSchema.safeParse(roleParam) : null;
  const parsedStatus = statusParam ? MembershipStatusSchema.safeParse(statusParam) : null;

  return {
    role: parsedRole?.success ? parsedRole.data : undefined,
    status: parsedStatus?.success ? parsedStatus.data : undefined,
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const proxyContext = verifyAppProxyRequest(request);
    const membership = await resolveMembershipByCustomerId(proxyContext.customerId);

    if (!membership) {
      throw new AppError(
        "AUTH_NO_MEMBERSHIP",
        "No company membership is associated with this customer.",
        403,
        false,
      );
    }

    const devOverrides = getDevMembershipOverrides(request);
    const effectiveMembership = {
      ...membership,
      role: devOverrides.role ?? membership.role,
      status: devOverrides.status ?? membership.status,
    };
    const bypassInactiveGateForDevOverride =
      process.env.NODE_ENV !== "production" && Boolean(devOverrides.status);

    if (effectiveMembership.status !== "active" && !bypassInactiveGateForDevOverride) {
      throw new AppError(
        "AUTH_INACTIVE_MEMBERSHIP",
        "Your membership is pending activation.",
        403,
        false,
      );
    }

    const sessionToken = issueDashboardSessionToken({
      customerId: effectiveMembership.customerId,
      companyId: effectiveMembership.companyId,
      shop: proxyContext.shop,
      role: effectiveMembership.role,
      status: effectiveMembership.status,
    });

    const iframeSource = withQueryParam(
      resolveIframeSource(request),
      "st",
      sessionToken,
    );
    return new Response(renderProxyShell(iframeSource), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "set-cookie": createDashboardSessionCookie(sessionToken),
      },
    });
  } catch (error) {
    return toApiErrorResponse(error, request);
  }
};
