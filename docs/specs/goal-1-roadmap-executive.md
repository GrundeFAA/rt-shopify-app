# Goal 1 Executive Roadmap

## Objective
Deliver a production-safe embedded app foundation where:
1. The app reliably knows the logged-in user from trusted context.
2. The API layer orchestrates internal DB + Shopify correctly.
3. DB/Shopify errors are handled consistently and shown safely in frontend.
4. UI styling/layout remains isolated from storefront theme behavior.

## Business outcome
- Team can build feature work on a secure and stable base.
- Customers get a working embedded dashboard entry with predictable behavior.
- Engineering risk is reduced through typed contracts, layered architecture, and sync verification.

## Scope (Goal 1)
- Embedded proxy entry + identity/session handoff.
- Company profile read/update vertical slice (including address update).
- Typed error contract end-to-end.
- Frontend isolation verification.
- Temporary metaobject mirror checks for sync confidence.

Out of scope:
- Goal 2 items (to be defined later)
- Extended role matrix and advanced modules beyond first slice

## Milestones
1. **Embedded identity baseline**
   - Verified proxy request, trusted customer context, short-lived session flow.
2. **API integration baseline**
   - Layered route/service/repository/gateway flow with DB + Shopify integration.
3. **Error and UX reliability baseline**
   - Typed error mapping and deterministic frontend error states.
4. **Isolation baseline**
   - Confirm dashboard CSS/JS isolation from storefront/theme.
5. **Sync verification baseline (temporary)**
   - Mirror selected company fields into Shopify metaobject fields and detect drift.
6. **Release readiness**
   - Validation coverage, tests, observability, and quality gates complete.

## KPIs / success signals
- Authentication failures are explicit and fail closed.
- Unauthorized access attempts return correct states with no data leakage.
- Error responses include stable `code` and `requestId`.
- Drift checker can report app DB vs Shopify metaobject mismatches.
- Smoke checks confirm no theme-driven layout breakage.

## Governance
- Foundation docs `01-09` remain source context for architecture contracts.
- Execution details live in:
  - `docs/specs/goal-1-engineering-execution-plan.md`
  - `docs/guides/development-environment-setup.md`

