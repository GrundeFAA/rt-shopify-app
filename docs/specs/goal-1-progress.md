# Goal 1 Progress

> Historical ledger note: This file is maintained as `P1-G1` history. Active new execution tracking now uses canonical Phase 2 ledgers (`docs/specs/p2-g1-progress.md`, `docs/specs/p2-g2-progress.md`).

## Goal metadata
- Goal: `Goal 1 - Embedded App Foundation`
- Owner: `Architect/Tech Lead`
- Status: `in_progress`
- Last updated: `2026-03-30`

## Work package board
| ID | Work package | Owner role | Status | Dependencies | Notes |
|---|---|---|---|---|---|
| G1-WP-1 | Embedded identity baseline (proxy verification + session handoff) | Backend Platform Agent | done | - | Phase 1 |
| G1-WP-2 | Company profile read/update API vertical slice | Backend Platform Agent | done | G1-WP-1 | Phase 2 vertical slice implemented with DB-backed company profile read + address update |
| G1-WP-3 | Shopify gateway + temporary mirror sync | Backend Platform Agent | done | G1-WP-2 | Company metaobject mirror active; drift endpoint includes metaobject mismatch summary (G1-WP-3B) |
| G1-WP-4 | Frontend iframe shell and deterministic error states | Frontend Embedded Agent | done | G1-WP-1, G1-WP-2 | dashboard iframe now includes company-address update + drift sync UI path (`/apps/rt/dashboard` -> save -> sync report) with deterministic error-state fallbacks |
| G1-WP-5 | Dev environment baseline verification and setup hardening | Quality and DevEx Agent | done | - | global typecheck gate restored by Shopify dependency alignment (G1-WP-5A) |
| G1-WP-6 | End-to-end verification and reliability gates | Quality and DevEx Agent | blocked | G1-WP-1, G1-WP-2, G1-WP-3, G1-WP-4, G1-WP-5 | G1-WP-6C: session-secret fallback fixed; Prisma EPERM still reproducible on this machine despite retry mitigation; release recommendation remains NO-GO |
| G1-WP-7 | Actionable error diagnostics (backend + frontend error section) | Backend Platform Agent | done | G1-WP-3, G1-WP-4 | Added safe diagnostic propagation (`upstreamCode`, `stage`, `causeMessage`) + requestId-correlated server logging and in-page dashboard diagnostics section |
| G1-WP-8 | Strong sync semantics for company address update (no partial success) | Backend Platform Agent | done | G1-WP-2, G1-WP-3, G1-WP-7 | `PATCH /api/company/profile` now enforces strong-sync semantics: Shopify write first, DB write second, with Shopify compensation on DB-write failure |
| G1-WP-9 | Reusable hard-sync orchestration extraction (saga-style) | Backend Platform Agent | todo | G1-WP-8 | Extract reusable sync executor for Shopify-first -> DB-write -> compensation flow, then migrate company address update to adapter-based orchestration without API contract changes |

Status values:
- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

## Role updates
Each role updates only its own section.

### Architect/Tech Lead
- Current package: `review of G1-WP-3B metaobject mirror extension`
- Progress:
  - accepted `G1-WP-1` as done with known temporary membership resolver caveat
  - accepted `G1-WP-5` as partial/review and confirmed typecheck blocker was real and cross-cutting
  - validated `G1-WP-5A` results and confirmed quality gates are restored
  - validated `G1-WP-4B` and accepted `G1-WP-4` as done
  - validated `G1-WP-2` and accepted company profile read/update vertical slice
  - validated `G1-WP-3` and accepted Shopify mirror/drift flow package
  - validated `G1-WP-6` blocker report with command-level reproduction
  - validated `G1-WP-6A` runtime stabilization and migration alignment
  - validated `G1-WP-6B` blocker report; Prisma EPERM reproduced again
  - validated `G1-WP-6C` partial reliability fix: session-secret fallback fixed, Prisma EPERM still reproducible
  - validated `G1-WP-3B` metaobject mirror extension; lint/typecheck pass and existing endpoint contracts remain intact
- Decisions made:
  - parallel-agent process runs via `docs/runbooks/parallel-agent-delivery-model.md`
  - per-goal progress ledger required for package completion
  - do not generate/store prompts in docs; prompts remain chat-only
- Blockers:
  - non-deterministic Prisma generate/runtime stability on Windows (`EPERM` rename on query engine binary)
  - missing executable Goal 1 automated integration/E2E test suite for release gate evidence
- Next package:
  - G1-WP-9: extract reusable hard-sync orchestration module and migrate company address flow to it
  - rerun `G1-WP-6` verification evidence cycle after runtime is stable

### Backend Platform Agent
- Current package: `G1-WP-8 - Strong sync semantics for company address update (no partial success)`
- Progress:
  - Refactored company address update workflow to strong-sync orchestration in service layer:
    - reads current DB snapshot first
    - writes Shopify mirror first
    - writes app DB only after Shopify success
    - attempts Shopify compensation to previous snapshot when DB write fails after Shopify success
  - Eliminated partial-success behavior for `PATCH /api/company/profile`; DB is no longer persisted on Shopify write failure.
  - Added explicit sync stage diagnostics for failure analysis:
    - `SYNC_STAGE_SHOPIFY_WRITE_FAILED`
    - `SYNC_STAGE_DB_WRITE_FAILED`
    - `SYNC_STAGE_COMPENSATION_FAILED`
  - Added structured logs for strong-sync failure/compensation stages in company update service.
  - Preserved deterministic API error contract shape and request correlation via existing `toApiErrorResponse` path.
- Files changed:
  - `app/infrastructure/shopify-gateways/company-profile-mirror.gateway.server.ts`
  - `app/modules/company/services/update-company-address.service.ts`
  - `app/modules/sync/services/mirror-company-profile.service.ts`
  - `docs/specs/goal-1-progress.md`
- Verification:
  - `npm run lint` passes.
  - `npm run typecheck` passes.
  - Scenario simulation evidence (run in local harness, output captured in package report):
    - Shopify failure => DB unchanged (`dbUpdateCalls: 0`)
    - DB failure after Shopify success => compensation write attempted and applied (second mirror write to previous value)
    - Success => DB + mirror end state aligned to new address
- Blockers:
  - True distributed atomicity cannot be guaranteed across external Shopify API + DB transaction boundary (no cross-system transaction primitive). Implemented mitigation: compensating rollback on DB-failure-after-Shopify-write, explicit stage diagnostics, and failure response when final alignment cannot be guaranteed.
- Handoff:
  - Quality and DevEx Agent should run live endpoint validation against real Shopify to confirm compensation branch behavior under induced DB failure in controlled test environment.
  - Architect/Tech Lead should decide whether to keep strong-sync for this endpoint only, or apply same semantics to future company mutating operations.

### Frontend Embedded Agent
- Current package: `G1-WP-4C - Frontend company address update + sync status flow`
- Progress:
  - Extended iframe dashboard loader to fetch company profile via `GET /api/company/profile` after session bootstrap, while preserving deterministic top-level error rendering (`unauthorized`, `forbidden`, `temporarily_unavailable`, `sync_in_progress`).
  - Added editable company address form in iframe UI, wired to `PATCH /api/company/profile`.
  - Added post-save sync verification flow calling `GET /api/sync/company-profile-drift` and rendering sync state (`inSync`) plus mismatch summary entries.
  - Kept token/bootstrap compatibility for cookie-restricted iframe contexts by reusing bootstrap bearer token for client-side API calls when available.
  - Performed cleanup by removing temporary `st` query parameter from URL after mount while preserving in-memory bootstrap auth fallback for subsequent UI calls.
- Files changed:
  - `app/routes/dashboard.tsx`
  - `app/modules/dashboard/dashboard-view.module.css`
  - `docs/specs/goal-1-progress.md`
- Verification:
  - `npx eslint app/routes/dashboard.tsx` -> pass.
  - `npm run typecheck` -> pass.
  - Contract-alignment checks:
    - [x] Profile read/write uses documented endpoints and payload key `company_address`.
    - [x] Drift report UI uses `inSync` and `mismatches` fields from sync report contract.
    - [x] Existing deterministic error-state mapping utility remains intact and is reused for API failures.
  - UI path availability:
    - [x] Address update path available in iframe dashboard: `/apps/rt/dashboard` -> edit address -> save -> sync status/mismatch summary.
- Blockers:
  - none (no backend contract mismatch encountered in implemented endpoint/field usage).
- Handoff:
  - Quality and DevEx Agent: run end-to-end validation of the new frontend path with real update payloads and capture runtime evidence for save success + drift mismatch rendering under `G1-WP-6`.

### Quality and DevEx Agent
- Current package: `G1-WP-6B - Final verification evidence and release recommendation`
- Progress:
  - Re-ran required final gates and captured reproducible command evidence (including non-deterministic Prisma behavior).
  - Executed a manual but repeatable runtime verification matrix for available Goal 1 paths while local runtime was healthy.
  - Verified frontend error-state contract mapping with executable checks for all required states (`unauthorized`, `forbidden`, `temporarily_unavailable`, `sync_in_progress`).
  - Re-attempted runtime verification with temporary session-secret override to continue session-bootstrap checks; local runtime regressed with recurring Prisma `EPERM` failures.
  - Assessed release readiness and confirmed `NO-GO` recommendation.
- Files changed:
  - `docs/specs/goal-1-progress.md`
- Verification commands and observed outcomes:
  - Final gate runs (initial):
    - `npm run lint` -> pass
    - `npm run typecheck` -> pass
    - `npx prisma generate` -> pass
    - `npm run setup` -> pass (`No pending migrations to apply`)
  - Runtime matrix (executed while local runtime was healthy):
    - `GET /apps/dashboard` (no signature) -> `401 AUTH_INVALID_PROXY_SIGNATURE`
    - `GET /apps/dashboard` (valid signature, no membership) -> `403 AUTH_NO_MEMBERSHIP`
    - `GET /api/auth/session` (no token) -> `401 AUTH_INVALID_IFRAME_SESSION`
    - `GET /api/auth/session` (token) -> `500 INTERNAL_ERROR` when `DASHBOARD_SESSION_SECRET` is empty-string configured in env
    - `GET /api/company/profile` (token) -> blocked by same session-secret env issue (`500 INTERNAL_ERROR`)
    - `PATCH /api/company/profile` (admin/non-admin) -> blocked by same session-secret env issue (`500 INTERNAL_ERROR`)
    - `GET /api/sync/company-profile-drift` (admin/non-admin) -> blocked by same session-secret env issue (`500 INTERNAL_ERROR`)
  - Frontend error-state contract checks:
    - `npx tsx -e "import { toDashboardFrontendState } ..."` -> pass
    - observed mappings:
      - `AUTH_INVALID_IFRAME_SESSION` -> `unauthorized`
      - `AUTH_FORBIDDEN_ROLE` -> `forbidden`
      - `INFRA_UNAVAILABLE` -> `temporarily_unavailable`
      - `SYNC_IN_PROGRESS` + `details.syncState='sync_in_progress'` -> `sync_in_progress`
  - Runtime stability re-check (follow-up, same package run):
    - `npx prisma generate` -> fail (recurring) `EPERM ... query-engine-windows.exe.tmp* -> query-engine-windows.exe`
    - `npm run setup` -> fail (same recurring `EPERM`)
    - `npm run dev` with temporary session-secret override -> fail due same recurring pre-dev `prisma generate` `EPERM`
  - Automated Goal 1 tests:
    - no `test` script in `package.json`
    - no discovered `*.test.*` / `*.spec.*` files for Goal 1 coverage
  - Cross-theme iframe isolation smoke checks:
    - runtime cross-theme execution not completed in this pass (requires stable dev runtime and controlled theme-switch runbook/harness)
    - static isolation evidence still aligned (`apps.dashboard` thin shell iframe pattern + dashboard CSS module usage)
- Blockers:
  - Critical: Prisma client generation is non-deterministic on this machine (`EPERM` rename on query-engine binary) and blocks reproducible runtime verification.
  - Critical: env configuration behavior (`DASHBOARD_SESSION_SECRET` present but empty) causes session bootstrap API failures (`500 INTERNAL_ERROR`) unless explicitly overridden.
  - Critical release-evidence gap: no executable automated Goal 1 integration/E2E test suite.
  - Missing prerequisites for full matrix completion:
    - stable `npm run dev` session for repeated endpoint validation
    - non-empty dashboard session secret in runtime env (or code-level fallback fix decision)
    - repeatable theme-switch smoke procedure for cross-theme runtime checks
- Handoff:
  - Backend Platform Agent: stabilize Prisma generate behavior on Windows and decide minimal fix for empty `DASHBOARD_SESSION_SECRET` fallback behavior.
  - Quality and DevEx Agent (next pass): rerun full runtime matrix once runtime and env prerequisites are stable; capture cross-theme smoke execution evidence.
  - Architect/Tech Lead: keep `G1-WP-6` blocked and maintain `NO-GO` for Goal 1 closure until blockers above are cleared.

## Architect validation log
| Date | Work package | Validation result | Notes |
|---|---|---|---|
| 2026-03-30 | process setup | accepted | role documents, runbook, and progress docs created |
| 2026-03-30 | G1-WP-1 | accepted | done with temporary `AUTH_MEMBERSHIP_MAP` resolver caveat tracked for follow-up |
| 2026-03-30 | G1-WP-5 | accepted (partial) | docs/setup hardened; blocked on cross-cutting typecheck dependency mismatch |
| 2026-03-30 | G1-WP-4 | accepted (conditional) | implementation looks aligned; keep in review until role section is updated and backend sync-in-progress signal is finalized |
| 2026-03-30 | G1-WP-5A | accepted | Shopify dependency/type skew resolved; `npm run typecheck` and `npm run lint` pass |
| 2026-03-30 | G1-WP-4B | accepted | frontend mapping locked to finalized sync signal; ledger and isolation notes complete |
| 2026-03-30 | G1-WP-2 | accepted | DB-backed profile API slice complete; layering and validation aligned; known expected `RESOURCE_NOT_FOUND` until profile seed/onboarding path exists |
| 2026-03-30 | G1-WP-3 | accepted | mirror write + drift endpoint implemented with typed retry/dependency errors; assumes valid offline session context |
| 2026-03-30 | G1-WP-6 | blocked | lint/typecheck pass, but runtime `npm run dev` blocked by Prisma EPERM and no executable Goal 1 automated E2E/integration evidence |
| 2026-03-30 | G1-WP-6A | accepted | runtime unblocked (`prisma generate`, `setup`, `dev`, `lint`, `typecheck` verified); remaining blocker is verification evidence suite |
| 2026-03-30 | G1-WP-6B | blocked | Prisma EPERM recurred and session-secret empty-string fallback bug blocks runtime endpoint verification; release recommendation remains NO-GO |
| 2026-03-30 | G1-WP-6C | blocked (partial fix) | session-secret fallback fixed; Prisma EPERM still blocks reproducible runtime verification |
| 2026-03-30 | G1-WP-3B | accepted | company metaobject upsert added with deterministic handle + members preservation; drift report includes optional metaobject summary |
| 2026-03-30 | G1-WP-8 | accepted (after rework) | strong-sync semantics verified; compensation-success path now returns `SYNC_WRITE_ABORTED`, compensation-failure path remains `SYNC_RECONCILIATION_MISMATCH` |

