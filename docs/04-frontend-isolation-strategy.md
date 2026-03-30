# Frontend Isolation Strategy (App Proxy + Iframe)

## Goal
Keep dashboard frontend completely isolated from storefront theme CSS and scripts.

## Chosen Pattern
- Entry point: Shopify App Proxy route (`/apps/dashboard`)
- Render mode: minimal HTML shell with iframe
- Dashboard app: separate app-hosted page loaded inside iframe

## Why This Pattern
- Blocks theme CSS inheritance into dashboard UI
- Prevents dashboard styles/scripts from affecting storefront
- Reduces breakage when merchants change theme or apps

## Request and Rendering Flow
1. Customer requests `/apps/dashboard`
2. Shopify forwards signed app proxy request
3. Backend verifies signature and resolves `logged_in_customer_id`
4. Backend resolves company membership and role
5. Backend issues short-lived signed dashboard session token
6. Backend responds with iframe shell
7. Iframe app loads and fetches data with server-validated token

## Shell Responsibilities
- Verify app proxy signature
- Resolve identity and authorization context
- Create short-lived dashboard token
- Render only minimal layout and iframe container

## Iframe App Responsibilities
- Render all interactive dashboard UI
- Load all CSS/JS assets
- Call backend APIs using dashboard session token
- Handle unauthorized state and trigger re-entry flow

## Security Controls
- Signature verification for all app proxy entry requests
- Short-lived signed tokens for iframe API access
- Strict server-side authorization on every API route
- CSP with explicit `frame-ancestors` and allowed origins
- Do not trust raw client-side identifiers for authorization

## CSS Isolation Rules
- No storefront/theme CSS imported into iframe app
- Use scoped CSS strategy (CSS Modules or equivalent)
- Avoid global selectors that could conflict inside app itself

## MVP Definition of Done
- Dashboard renders only inside iframe app
- Theme CSS does not alter dashboard layout
- Dashboard CSS does not alter storefront pages
- Unauthorized and expired-session paths are handled safely
