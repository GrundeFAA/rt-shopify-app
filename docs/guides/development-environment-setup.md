# Development Environment Setup

## Purpose
Provide a consistent, reproducible local setup for engineers working on this Shopify app.

## Core tooling
- Node.js version from `package.json` engines (`>=20.19 <22 || >=22.12`)
- npm (lockfile is npm-based)
- Shopify CLI (latest stable)
- Shopify Partner/dev store access

## Baseline setup (first run)
1. Install dependencies:
   - `npm install`
2. Generate Prisma client and apply migrations:
   - `npm run setup`
3. Run quality gates:
   - `npm run lint`
   - `npm run typecheck`

## Daily development workflow
1. Start local runtime:
   - `npm run dev`
2. Develop within required layering:
   - route -> service -> repository/gateway
3. Re-run quality gates before handoff:
   - `npm run lint`
   - `npm run typecheck`
   - relevant tests for changed scope
4. Verify behavior in the dev store or customer account preview as applicable.

## Shopify CLI local runtime assumptions
`npm run dev` runs `shopify app dev`. The expected runtime model is:
- Shopify CLI starts app services and local proxy processes.
- Shopify CLI manages local runtime wiring (including app URL updates during dev flow).
- Shopify CLI exposes a temporary tunnel URL in standard flow.

Assumption guardrails:
- Treat tunnel URLs as ephemeral runtime values.
- Do not hardcode tunnel hosts/paths in app source or shared docs.
- If CLI tunnel/provider behavior changes, follow current Shopify CLI guidance without changing auth/security contracts.

## Verification checklist
- App installs and opens from Shopify dev store flow.
- Customer account extension changes render in the expected customer surface.
- App proxy route is reachable in local development when that surface is under change.
- Database is writable and migrations are applied.
- Webhook endpoint is reachable in local runtime.
- `npm run lint` succeeds.
- `npm run typecheck` succeeds or has documented blocker with reproduction.

## Required environment categories
Use Shopify CLI-managed env where possible and fail fast on missing critical values.

Minimum categories:
- Shopify app credentials and API keys
- App URL / host values used by OAuth and app proxy callbacks
- Database connection settings
- Session/token signing secrets

## Troubleshooting
- **Auth or app proxy redirect/signature issues**
  - Restart `npm run dev` and confirm CLI has updated current app URLs.
  - Verify app proxy signature and timestamp checks are still enforced.
  - Confirm callback/host environment values come from current local runtime.

- **Database, Prisma, or migration failures**
  - Re-run `npm run setup`.
  - If schema/client drift is suspected, run `npm run prisma:generate:stable` followed by `npm run setup`.
  - Prisma client generation uses default engine behavior from Prisma client config.
  - `npm run setup` and `npm run dev` pre-dev now use a retrying generate wrapper (`scripts/prisma-generate-stable.mjs`) to mitigate transient Windows file-lock `EPERM` events.
  - Confirm DB location/permissions match current environment.
  - If `P1001` occurs, verify that `DATABASE_URL` points to a host reachable from your local machine (for example, public DB host, not private/internal-only hostname).
  - If `P3019` occurs after switching datasource provider (for example SQLite -> PostgreSQL), align migration history provider metadata before running `migrate deploy`.

- **Webhook delivery or signature failures**
  - Ensure app is running under `npm run dev` when webhook is sent.
  - Re-check webhook HMAC verification path and app secret source.
  - Re-register/restart local webhook subscription flow via Shopify CLI if needed.

- **Tunnel/network instability**
  - Restart `npm run dev` to refresh runtime tunnel wiring.
  - Check local firewall/proxy/network restrictions.
  - Update Shopify CLI and retry if tunnel setup repeatedly fails.

- **Typecheck fails with Shopify session storage type mismatch**
  - Symptom: Type mismatch between `@shopify/shopify-app-react-router` and `@shopify/shopify-app-session-storage-prisma`.
  - Check installed versions with `npm ls @shopify/shopify-api`.
  - If multiple major versions are installed, treat as dependency-compatibility issue and align package versions before marking setup as healthy.

## Team consistency rules
- Do not commit local secrets or machine-specific overrides.
- Keep startup validation strict at runtime boundaries.
- Update this guide when scripts, CLI assumptions, or verification flow change.

