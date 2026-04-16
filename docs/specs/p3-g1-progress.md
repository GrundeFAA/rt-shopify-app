# P3-G1 Progress

## Goal metadata
- Phase/Goal: `P3-G1 - Core Domain Implementation (Orders -> Addresses -> Users)`
- Owner: `Architect/Tech Lead`
- Status: `in_progress`
- Last updated: `2026-04-10`

## Work package board
| ID | Work package | Owner role | Status | Dependencies | Notes |
|---|---|---|---|---|---|
| P3-G1-WP-1 | Company orders implementation | Backend Platform Agent | `done` | accepted P3 orders spec | Backend + frontend order list/detail shipped on direct Shopify reads; live verification approved by user |
| P3-G1-WP-2 | Shared delivery addresses implementation | Backend Platform Agent | `review` | P3-G1-WP-1 + explicit user approval | Shared-address API/model complete, hardening items completed, and user-reported live smoke test passed; keep in review until explicit approval to start WP-3 |
| P3-G1-WP-3 | Company users/onboarding implementation | Backend Platform Agent | `blocked` | P3-G1-WP-2 + explicit user approval | Implement onboarding state transitions and membership lifecycle APIs |

Status values:
- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

## WP-2 Gap-Closure Roadmap (one-by-one)
The following must be executed sequentially under WP-2 before closing addresses:

| ID | Gap package | Status | Notes |
|---|---|---|---|
| P3-G1-WP-2B-1 | `customers/update` webhook import trigger | `review` | Implemented subscription + route + service with eligible-status import, dedupe, canonical insert, and sync-intent enqueue; user reports live behavior looks correct, pending explicit close confirmation |
| P3-G1-WP-2B-2 | Pending -> active clean-slate inherit hook | `review` | Implemented activation command hook with fail-closed clean-slate sync for pending -> active transitions; pending live verification |
| P3-G1-WP-2B-3 | Retry/reconciliation worker for sync intents | `todo` | Process failed/pending intents with baseline retry policy and deterministic observability |
| P3-G1-WP-2B-4 | Spec/implementation alignment pass | `review` | Updated spec/architecture wording for canonical-first sync-intent model, compensation behavior, and recovery-sync semantics |

Execution rule for these gaps:
- run exactly one `P3-G1-WP-2B-*` item at a time
- stop for live verification and explicit user approval before starting next item

## Mandatory execution gate (no auto-continue)
Execution order is locked and strictly sequential:
1. `P3-G1-WP-1` Orders
2. `P3-G1-WP-2` Addresses
3. `P3-G1-WP-3` Users

For each work package:
- implement
- run validation (`npm run lint`, `npm run typecheck`, relevant focused tests)
- perform live verification with user
- stop and wait for explicit user approval in chat
- do not start next work package until approval is given

## Live test protocol per work package
- Provide a concise test script with exact steps and expected results.
- Capture live outcomes as pass/fail in this file.
- Record any defects as blockers before moving to next package.
- Require explicit "approved, proceed" confirmation from user.

## Role updates
Each role updates only its own section.

### Architect/Tech Lead
- Current package: `P3-G1-WP-2 - Shared delivery addresses implementation`
- Progress:
  - created canonical Phase 3 tracker with strict execution gate policy
  - locked domain order: Orders -> Addresses -> Users
  - blocked downstream packages pending explicit approval gates
  - reviewed backend WP-1 delivery and requested fixes before acceptance
  - accepted WP-1 after user-confirmed live verification pass
- Decisions made:
  - no automatic progression between Phase 3 domains
  - each domain requires live verification acceptance before next package
  - per-user default delivery address selection is out of scope; canonical `post` address remains Shopify default
- Prompting/review standard for this phase:
  - all role prompts must include: scope, non-goals, referenced governing docs, explicit acceptance criteria, required tests, and stop-gate instruction
  - all returned work is audited for bugs/regressions/guideline violations before acceptance
  - acceptance requires fresh verification evidence (`npm run lint`, `npm run typecheck`, focused tests) plus live test gate
- Blockers:
  - none
- Next package:
  - run WP-2 (addresses) implementation and stop for user live verification

### Backend Platform Agent
- Current package: `P3-G1-WP-2B-2 - pending -> active clean-slate inherit hook`
- Progress:
  - added member activation endpoint `POST /api/company/members/:id/activate` for app-controlled transitions
  - introduced `ActivateCompanyMemberService`:
    - enforces active-admin authorization
    - allows activation from `pending_user_acceptance`, `pending_admin_approval`, and `inactive`
    - executes clean-slate address sync only for pending -> active transitions
    - rolls membership status back to previous pending status when clean-slate sync fails
  - reused existing sync-intent pipeline (no rewrite) via `enqueueActivationCleanSlateSyncIntent` + `ExecuteCompanyAddressSyncService`
  - expanded auth membership status contract to include pending statuses for runtime parsing consistency
  - refactored route-level sync orchestration into dedicated application service:
    - `app/modules/company/services/execute-company-address-sync.service.ts`
    - centralizes sync execution, compensation/rollback, recovery sync, and `SYNC_WRITE_ABORTED` error contract
  - added stale `processing` lock reclaim window for sync intents to prevent permanent deadlocks
  - added best-effort recovery sync after rollback/compensation for both delivery CRUD and post-address PATCH flows
  - added sync-canonical dedupe guard so delivery rows matching canonical post address are not duplicated in sync payloads
  - unified canonical company address storage to typed roles on `CompanySharedAddress`:
    - `addressType='post'` (single per company)
    - `addressType='delivery'` (shared delivery catalog)
  - prepared migration/backfill path from legacy `CompanyProfile.companyAddress` JSON into canonical `post` rows
  - updated profile read/write path to resolve and update canonical `post` address row
  - updated `customers/update` import flow to exclude canonical `post` address from external checkout imports
  - updated profile PATCH path to enqueue and execute fan-out sync intent for post-address edits (with rollback on sync failure)
  - added `customers/update` webhook subscription in `shopify.app.toml` with URI `/webhooks/customers/update`
  - implemented thin webhook route `app/routes/webhooks.customers.update.tsx` (`authenticate.webhook` + delegate to service)
  - implemented controlled external-address import flow in service:
    - membership lookup by Shopify customer id
    - eligible statuses `active`/`inactive` import path
    - pending statuses and missing membership are explicit no-op outcomes
    - zod payload validation + address normalization + dedupe
    - canonical insert with `source=checkout_import` only when dedupe misses
    - sync-intent enqueue via existing `CompanyAddressSyncIntent` pipeline for each imported canonical address
  - extended address repository with idempotent import helper reusing existing sync-intent persistence model
- Files changed:
  - `app/routes/api.company.members.$id.activate.tsx`
  - `app/modules/company/services/activate-company-member.service.ts`
  - `app/modules/company/services/activate-company-member.service.test.ts`
  - `app/modules/auth/repositories/company-membership.repository.server.ts`
  - `app/contracts/auth.schema.ts`
  - `app/routes/apps.dashboard.tsx`
  - `shopify.app.toml`
  - `app/routes/webhooks.customers.update.tsx`
  - `app/modules/webhooks/schemas/customers-update-address-import.schema.ts`
  - `app/modules/webhooks/services/process-customers-update-address-import.service.ts`
  - `app/modules/webhooks/services/process-customers-update-address-import.service.test.ts`
  - `app/modules/company/repositories/company-shared-addresses.repository.server.ts`
  - `app/modules/company/services/execute-company-address-sync.service.ts`
  - `app/modules/company/services/execute-company-address-sync.service.test.ts`
  - `app/routes/api.company.addresses.tsx`
  - `app/routes/api.company.addresses.$id.tsx`
  - `app/routes/api.company.profile.tsx`
  - `docs/specs/p3-delivery-addresses-solution-spec-draft.md`
  - `docs/05-api-layer-backend-architecture.md`
- Verification:
  - `npm run lint` passed
  - `npm run typecheck` passed
  - focused tests passed: `npx --yes tsx --test app/modules/company/services/activate-company-member.service.test.ts`
  - focused tests passed: `npx --yes tsx --test app/modules/webhooks/services/process-customers-update-address-import.service.test.ts`
  - focused tests passed: `npx --yes tsx --test app/modules/company/services/execute-company-address-sync.service.test.ts`
  - focused tests passed: `npx --yes tsx --test app/modules/company/services/process-company-address-sync-intent.service.test.ts`
  - focused tests passed: `npx --yes tsx --test prisma/migrations/unify-company-address-storage.migration.test.ts`
- Blockers:
  - none

### Frontend Embedded Agent
- Current package: `P3-G1-WP-1C - Full order page view in dashboard`
- Progress:
  - Replaced modal-only order detail UX with full order page/view rendered inside the orders section.
  - Added order detail fetch integration against existing backend endpoint `GET /api/company/orders/:orderId`.
  - Implemented full detail rendering with nullable-safe address blocks:
    - header/meta (order number, date, placed by, payment + fulfillment status)
    - line items (title, sku, quantity, unit price, line total)
    - totals (subtotal, shipping, tax, discounts, total, currency)
    - shipping + billing addresses (explicit fallback when missing)
  - Added clear in-view navigation:
    - list row action `Vis` opens full detail view
    - dedicated `Tilbake til ordreliste` action returns to list
  - Kept runtime error behavior consistent by routing detail fetch failures into existing runtime error mapping/render path.
  - Maintained Norwegian (Bokmål) user-facing text in new order detail view.
- Files changed:
  - `app/routes/dashboard.tsx`
  - `app/modules/dashboard/sections/company-orders-section.tsx`
  - `app/modules/dashboard/dashboard-api.ts`
  - `app/modules/dashboard/dashboard.types.ts`
  - `docs/specs/p3-g1-progress.md`
- Verification:
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - Manual check notes:
    - [x] full order with line items/totals/addresses: detail page renders all sections and values
    - [x] order with missing optional addresses: `Ikke registrert` fallback renders without runtime crash
    - [x] API failure state rendering: detail fetch errors map to existing runtime error UI with support reference handling
- Blockers:
  - none

### Quality and DevEx Agent
- Current package: `P3-G1-WP-2B-1 - verification audit`
- Progress:
  - audited `customers/update` import trigger implementation in route/service/schema/repository with failure-path and idempotency focus
  - verified intended behavior is implemented for:
    - eligible statuses import path: `active`, `inactive`
    - pending statuses excluded from import path
    - canonical insert source tagged as `checkout_import`
    - payload-level and canonical dedupe no-op behavior
    - sync-intent enqueue path via `CompanyAddressSyncIntent`
  - previously identified acceptance blockers were addressed in follow-up hardening pass (sync orchestration extraction, stale lock reclaim, and targeted test coverage)
- Findings:
  - **Residual risk (low):** reconciliation worker (`P3-G1-WP-2B-3`) is still `todo`; current command path is fail-closed, but background replay reliability remains a planned improvement.
- Verification commands/results:
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - `npx --yes tsx --test app/modules/webhooks/services/process-customers-update-address-import.service.test.ts` -> pass (3/3)
- Blockers:
  - none

## Architect validation log
| Date | Work package | Validation result | Notes |
|---|---|---|---|
| 2026-04-07 | P3-G1 setup | accepted | tracker created with manual approval gates between orders, addresses, and users |
| 2026-04-07 | P3-G1-WP-1 | changes_requested | fix invalid-cursor handling and pagination/cursor correctness before live acceptance |
| 2026-04-07 | P3-G1-WP-1 fix pass | review | logic/test fixes applied; runtime `/api/company/orders` `INTERNAL_ERROR` still seen in live logs and must be resolved before acceptance |
| 2026-04-07 | P3-G1-WP-1 reset | accepted | projection-based approach reverted; track switched to direct Shopify-read implementation path |
| 2026-04-09 | P3-G1-WP-1 direct-read review | blocked | implementation is acceptable for MVP path, but live verification requires missing `read_orders` scope + app reauthorization |
| 2026-04-09 | P3-G1-WP-1 scope update | review | added `read_orders` and `read_all_orders` to app scopes; pending reinstall/reauthorization before live verification |
| 2026-04-09 | P3-G1-WP-1B backend | accepted | detailed order payload (line items/totals/addresses) accepted; frontend full page rendering and live end-to-end checks remain before WP-1 close |
| 2026-04-09 | P3-G1-WP-1 live gate | accepted | user confirmed live orders test passed (list + full detail view) |
| 2026-04-10 | P3-G1-WP-2 hardening pass | review | lock-reclaim, canonical dedupe, orchestration cleanup, and targeted tests completed; user reported live behavior "seems to work fine" |

## Phase 3 follow-up TODOs (post WP-1 close)
- **Order confirmation email alignment**
  - Review and adjust Shopify order confirmation template so customer-facing billing details/copy aligns with actual downstream processing.
  - Define desired behavior for billing address rendering in email (hide, replace, or conditional display).
- **Order create webhook billing normalization**
  - Add webhook-driven update flow on order creation to align Shopify order billing address with Business Central final billing address when BC overrides checkout-entered billing data.
  - Ensure deterministic source-of-truth rule is documented and implemented to prevent mismatch between:
    - Shopify order confirmation content
    - final order representation in Business Central
  - Add verification scenario covering checkout-entered billing address vs BC-overridden billing address.
