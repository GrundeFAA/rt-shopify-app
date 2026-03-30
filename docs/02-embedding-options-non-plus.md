# Embedding Options for Non-Plus Company Dashboard

## Goal
Choose how customers access the dashboard while preserving secure identity and company-level authorization.

## Options

### Option A: Theme App Extension
Embed dashboard widgets into customer-facing templates (for example account pages).

Pros:
- Native storefront feel
- Easy to place summary components in existing templates
- Good for small, contextual dashboard modules

Cons:
- Less ideal for large, app-like multi-section dashboard UX
- More constrained layout and interaction patterns

Best for:
- KPI cards, quick status, compact account widgets

---

### Option B: App Proxy Page (`/apps/...`)
Serve a full dashboard page from the app backend under the storefront domain via app proxy.

Pros:
- Full control over page architecture and feature depth
- Suitable for richer dashboard flows and navigation
- Can still feel native under storefront domain

Cons:
- Requires strict server-side request verification and auth layering
- More moving parts than simple theme blocks

Best for:
- Full company dashboard experience with sections, filters, and actions

---

### Option C: External Portal
Host dashboard on a separate domain/app shell.

Pros:
- Maximum flexibility
- Independent release cadence and architecture

Cons:
- Most complex auth and session handoff
- Least native Shopify/storefront experience

Best for:
- Highly custom portals with non-Shopify requirements

## Recommended MVP Choice
Start with **Option B (App Proxy)** for the main dashboard and add **Option A (Theme Extension)** later for lightweight summary widgets.

Rationale:
- The target is a full "company dashboard", not only a small account widget.
- App proxy gives enough UX control for a real dashboard without moving to an external portal.

## Decision Status
- **Chosen now:** Option B (App Proxy) as the primary dashboard entry point
- **Chosen isolation model:** App Proxy route renders iframe shell; dashboard UI runs inside iframe
- **Deferred:** Theme App Extension summaries (phase 2)
- **Not planned for MVP:** External portal

## How Customer Identity Is Resolved in App Proxy
When a customer opens `/apps/dashboard`, Shopify forwards the request to the app proxy target and includes signed query parameters.

Server flow:
1. Receive app proxy request
2. Verify app proxy `signature` parameter using app secret
3. Validate request freshness (timestamp window)
4. Read `logged_in_customer_id` from verified parameters (if present)
5. If missing, treat as guest/unauthenticated customer
6. Resolve membership (`customerId -> companyMembership -> role`)
7. Authorize action and return only company-scoped data

Notes:
- `logged_in_customer_id` is trusted only after signature verification.
- Authorization is always enforced server-side, never in client-only logic.
- Webhook authentication is separate and uses HMAC header verification.

## Frontend Isolation Recommendation (Chosen)
To keep frontend styles and behavior completely isolated from storefront/theme CSS:

- `/apps/dashboard` returns a minimal HTML shell with an iframe
- iframe `src` points to an app-hosted dashboard page
- all dashboard CSS/JS is loaded only inside iframe
- no theme CSS is imported into iframe app

Why this is chosen:
- Prevents theme CSS from overriding dashboard styles
- Prevents dashboard CSS from leaking into storefront pages
- Keeps dashboard UI stable across merchant theme changes

Operational notes:
- Keep the proxy route thin: verify request, resolve identity, issue short-lived session token, render iframe shell
- Keep business UI and API calls inside iframe app using server-side authorization

## Security Requirements (Applies to Any Option)
- Verify trusted request context on the server.
- Resolve authenticated customer identity server-side.
- Map `customerId -> companyMembership -> role` in app DB.
- Authorize each read/write action against membership and role.
- Never trust company identifiers sent from client without server validation.

## MVP Delivery Plan
1. Define backend auth + membership contract
2. Implement main dashboard delivery path (app proxy)
3. Add role-based company data reads
4. Add optional theme extension summaries
