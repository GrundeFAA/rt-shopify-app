# Auth and Authorization Contract (Draft)

## Purpose
Define what is considered trusted identity and how company access is authorized for each request.

## Scope
This contract applies to customer-facing dashboard routes delivered via Shopify App Proxy (`/apps/...`).

## Identity Sources
- Shopify-signed app proxy request context is the authentication source.
- Internal app records provide company membership and role.
- Validation rules for auth context and token claims follow `docs/07-validation-standard-zod.md`.

## Trust Model
- Trusted: server-verified customer identity
- Trusted: server-side membership lookup in app database
- Not trusted: raw client payload identifiers without validation

## Required Authorization Steps (Server-Side)
1. Verify app proxy `signature` parameter with app secret
2. Validate timestamp freshness to reduce replay risk
3. Resolve current `customerId` from verified `logged_in_customer_id`
4. Lookup active membership record for that customer
5. Resolve `companyId` and `role`
6. Verify membership `status` is `active`
7. Check route-level permission for the requested action
8. Return only company-scoped data for authorized membership

## App Proxy Request Lifecycle (MVP)
1. Customer opens storefront path `/apps/dashboard`
2. Shopify forwards request to app proxy URL
3. App verifies app proxy `signature` before processing any identity fields
4. App reads verified customer context and resolves membership
5. App creates short-lived dashboard session token bound to customer and company
6. App serves minimal HTML shell with iframe pointing to dashboard UI route
7. iframe app uses session token and server APIs for authorized company data

## Iframe Session Handoff Rules (MVP)
- Session token must be short-lived and signed by the app
- Token must include at minimum: `customerId`, `companyId`, `role`, `status`, `exp`, `iat`, `jti`
- Token must be validated on every iframe API request
- Refresh/reissue is handled server-side only
- Do not expose privileged data in unsigned query parameters

## Suggested MVP Role Matrix
- `administrator`
  - Full access for current MVP scope
- `user`
  - Limited access for current MVP scope

## Membership Status Model (MVP)
- `active`: dashboard access allowed
- `inactive`: dashboard access blocked until administrator approval

## Route Access Model (Initial)
- Dashboard overview: `user` and `administrator`
- Shared address add/remove: `user` and `administrator`
- Membership approval/activation: `administrator` only
- Any dashboard route requires `active` membership status

## Middleware and Service Enforcement
- Middleware performs coarse checks:
  - authenticated customer context exists
  - active membership status
  - redirect inactive users to pending-activation page
- Application services are the authoritative permission enforcement point for action-level authorization.

## Audit Logging (MVP)
Log at minimum:
- Authenticated customer ID
- Resolved company ID
- Resolved role
- Action attempted
- Success/failure and timestamp

## Failure Handling Rules
- Missing or invalid signature: reject request
- Unauthenticated customer (no `logged_in_customer_id`): return auth-required response
- Authenticated but no membership: return onboarding/no-access state
- Authenticated with inactive membership: return pending-activation/no-access state
- Authenticated with insufficient role: return forbidden response
- Expired or invalid iframe session token: return unauthorized and re-initiate proxy entry flow

## Open Decisions
- Should role inheritance be strict or configurable per company?
- Additional `user` role limits outside current MVP routes
