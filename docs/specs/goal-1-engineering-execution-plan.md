# Goal 1 Engineering Execution Plan

## Purpose
Translate Goal 1 into implementation phases with concrete engineering deliverables and acceptance criteria.

Related docs:
- `docs/specs/goal-1-roadmap-executive.md`
- `docs/guides/engineering-guidelines.md`
- `docs/guides/development-environment-setup.md`
- `docs/specs/goal-1-progress.md`
- `docs/runbooks/parallel-agent-delivery-model.md`

## Success criteria (engineering)
- Trusted logged-in customer context is resolved from verified app proxy requests.
- Route -> Service -> Repository/Gateway layering is enforced for first vertical slice.
- DB and Shopify failures map to typed error responses and deterministic frontend states.
- App UI is verified isolated from storefront/theme CSS and scripts.
- Temporary metaobject mirror verifies app DB sync integrity for selected company fields.

## Phase 1 - Identity and embedded entry
Deliver:
- `/apps/dashboard` proxy route with signature + timestamp freshness verification.
- Server-side customer context resolution (`logged_in_customer_id` after verification).
- Short-lived signed session token for iframe/API calls.
- Middleware for auth-required / no-membership / inactive-membership handling.

Acceptance:
- Invalid or expired signature returns unauthorized response.
- Missing customer context returns auth-required state.
- Session token claims are validated on every protected API request.

## Phase 2 - Company vertical slice (DB + Shopify)
Deliver:
- `company` module scaffolding (service, schema, repository contracts, gateway usage).
- Read company profile endpoint (`company_name`, `org_number`, `company_address`).
- Update company address endpoint with service-level role checks.
- Outbox/event hook for Shopify mirror update trigger.

Acceptance:
- Route handlers remain thin; service owns workflow.
- Repositories do DB only, gateways do Shopify only.
- Unauthorized role attempts return forbidden response.

## Phase 3 - Error contract and frontend handling
Deliver:
- Typed error mapping for:
  - DB validation/conflict/not-found paths
  - Shopify temporary/user/rate-limit failures
- Standard API error response contract in all Goal 1 endpoints.
- Frontend error-state rendering for `unauthorized`, `forbidden`, `temporarily_unavailable`, and `sync_in_progress`.

Acceptance:
- No raw internal stack traces leak to client responses.
- Frontend state is deterministic per error code.
- `requestId` is present and visible in support-facing error view.

## Phase 4 - Frontend isolation hardening
Deliver:
- Proxy shell renders iframe only (thin shell).
- Dashboard app loads its own assets inside iframe only.
- CSS isolation strategy enforced (no storefront CSS imports).
- Smoke test checklist for theme variance scenarios.

Acceptance:
- Theme changes do not break dashboard layout.
- Dashboard CSS does not affect storefront pages.

## Phase 5 - Metaobject mirror and drift verification (temporary)
Deliver:
- Metaobject mirror contract for company profile verification:
  - Type: `company`
  - Fields: `name`, `org_number`, `address` (with safe `members` preservation)
- Sync writer path from app DB updates to Shopify metaobject.
- Drift-check endpoint/job comparing app DB values against mirrored metaobject fields.
- Retry policy for transient Shopify failures.
- Enforce all-or-nothing write policy for company profile mirror flow (rollback app DB write if required Shopify mirror fails).

Acceptance:
- Company address update propagates to mirror flow.
- Drift check reports mismatches and retry outcomes.
- App DB remains source of truth in all business logic.
- No partial success for hard-sync flow: failed mirror write does not leave committed app DB change for that request.

## Phase 6 - Hardening and release gates
Deliver:
- Zod validation coverage at request/auth/integration boundaries.
- Unit and integration tests for Goal 1 critical paths.
- Reusable hard-sync orchestration module (saga-style) for cross-boundary writes:
  - standard stage lifecycle (`shopify_write`, `db_write`, `compensation`)
  - shared typed error semantics (`SYNC_WRITE_ABORTED`, `SYNC_RECONCILIATION_MISMATCH`)
  - adapter pattern so additional company mutating flows can reuse orchestration without duplicating logic
- Observability baseline:
  - error code rates
  - sync retry/dead-letter counters
  - drift mismatch counters

Acceptance:
- `npm run lint` passes.
- `npm run typecheck` passes.
- Company address update flow runs through shared hard-sync executor with no endpoint contract regressions.
- Goal 1 test suite passes in CI.
- Team review sign-off against success criteria.

## Sprint-style work breakdown (suggested)
### Sprint A
- Phase 1 + foundational schemas and auth middleware.

### Sprint B
- Phase 2 core read/update endpoints + service/repository/gateway separation.

### Sprint C
- Phase 3 error mapping + frontend error UX contract.

### Sprint D
- Phase 4 isolation verification + Phase 5 metaobject mirror baseline.

### Sprint E
- Phase 6 hardening, observability, and release readiness.

## Risks and mitigations
- **Risk:** Layer violations for speed.
  - **Mitigation:** PR checklist enforcement + architecture review gate.
- **Risk:** Shopify API transient instability.
  - **Mitigation:** retry with jitter + dead-letter + drift reconciliation.
- **Risk:** Token/session drift in iframe flow.
  - **Mitigation:** strict claim validation and short token TTL.
- **Risk:** Theme interaction regressions.
  - **Mitigation:** repeatable cross-theme smoke test checklist.

