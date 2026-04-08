# Goal 2 Progress

> Historical ledger note: This file is maintained as `P1-G2` history. Active new execution tracking now uses canonical Phase 2 ledgers (`docs/specs/p2-g1-progress.md`, `docs/specs/p2-g2-progress.md`).

## Goal metadata
- Goal: `Goal 2 - B2B Cart Context (Company info as order attributes)`
- Owner: `Architect/Tech Lead`
- Status: `in_progress`
- Last updated: `2026-04-07`

## Work package board
| ID | Work package | Owner role | Status | Dependencies | Notes |
|---|---|---|---|---|---|
| G2-WP-1 | App proxy cart-context API endpoint (signed proxy auth -> membership -> company profile -> cart attribute payload) | Backend Platform Agent | `done` | - | Implemented `GET /api/b2b-proxy/cart-context` with signed proxy verification, membership+profile resolution service, and no-store cart-attribute payload contract |
| G2-WP-2 | Theme App Extension cart attribute writer | Frontend Embedded Agent | `done` | G2-WP-1 | Theme app extension scaffolded with storefront JS asset: `/apps/rt/cart-context` -> `/cart/update.js` attribute writer path available |
| G2-WP-3 | Verification and reliability evidence for cart-context flow | Quality and DevEx Agent | `done` | G2-WP-1, G2-WP-2 | Closed after product-owner live validation: onboarding outcomes verified for additional users (role/status rules) and company context propagation validated from cart attributes to order |
| G2-WP-4 | Webhook-driven company onboarding + DB-backed membership resolution | Backend Platform Agent | `done` | G2-WP-1 | Implemented customers/create onboarding with DB-first membership resolution; rework completed for webhook subscription wiring and retry-safe idempotency semantics |
| G2-WP-5 | Inactive membership landing screen (customer-facing) | Frontend Embedded Agent | `done` | G2-WP-4 | Added dedicated pending-activation dashboard screen for `AUTH_INACTIVE_MEMBERSHIP` with user guidance and no diagnostic payload exposure |
| G2-WP-7A | Error UX split policy + mapping spec (customer UI vs developer diagnostics) | Architect/Tech Lead | `done` | G2-WP-5 | Canonical mapping and production customer-message policy documented in reliability + MVP requirements docs |
| G2-WP-7B | Dashboard error mapping implementation (customer-safe UI copy) | Frontend Embedded Agent | `done` | G2-WP-7A | Mapping-table-driven dashboard error presentation implemented with plain-language copy and requestId support reference policy; raw diagnostics removed from customer-facing panel |
| G2-WP-7C | Error UX verification matrix and requestId correlation evidence | Quality and DevEx Agent | `done` | G2-WP-7B | Accepted after Architect + product-owner live validation pass; customer-facing copy and requestId support behavior verified in live usage |

Status values:
- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

## Role updates
Each role updates only its own section.

### Architect/Tech Lead
- Current package: `review of G2-WP-7B and G2-WP-7C`
- Progress:
  - validated scoped feature against architecture and reliability standards
  - defined Goal 2 work packages and ownership boundaries
  - prepared cycle 1 prompts for safe execution sequence
  - reviewed and accepted `G2-WP-1` implementation with route-service-repository layering and typed contract alignment
  - reviewed and accepted `G2-WP-2` theme extension cart attribute writer behavior and silent-failure UX contract
  - reviewed `G2-WP-3` and accepted blocked status pending interactive storefront E2E evidence
  - reviewed `G2-WP-4` and marked for rework due webhook wiring/idempotency reliability gaps
  - reviewed `G2-WP-4R` and accepted package after reliability/wiring fixes
  - reviewed `G2-WP-3C` and accepted blocked status (partial live evidence captured; closure prerequisites still missing)
  - reviewed and accepted `G2-WP-5` inactive-member landing UX; raw diagnostics are now suppressed for end users in this state
  - completed `G2-WP-7A` with canonical dashboard error mapping spec and production customer-message policy
  - reviewed and accepted `G2-WP-7B`; dashboard error rendering is now mapping-table-driven with customer-safe copy and support reference behavior
  - reviewed `G2-WP-7C` and accepted blocked status pending full live state-by-state runtime evidence capture
  - accepted final `G2-WP-3` closure after live product-owner validation: onboarding role/status behavior confirmed and company data propagation from cart to order confirmed
- Decisions made:
  - this feature is tracked under Goal 2, not Goal 1
  - cycle 1 runs backend first, then frontend, then quality verification
- Blockers:
  - none
- Next package:
  - prepare Goal 2 wrap-up summary and transition planning inputs for next roadmap phase

### Backend Platform Agent
- Current package: `G2-WP-4R - Reliability/wiring rework for customers/create onboarding`
- Progress:
  - Wired Shopify webhook subscription for `customers/create` in `shopify.app.toml` to `/webhooks/customers/create`.
  - Reworked idempotency begin handling in `OnboardingEventLogRepository.begin()`:
    - duplicate is returned only for unique conflict (`P2002`) with existing `completed` record
    - non-unique DB failures are surfaced as retryable `INFRA_UNAVAILABLE` (no duplicate masking)
  - Added safe processing status semantics (`processing` / `completed` / `failed`) for retry-safe recovery:
    - failed runs are re-entered as `processing` on retry
    - successful runs are written as `completed` with explicit `outcome` in details
  - Added `fail()` path updates from onboarding service so failures after begin are tracked and retriable.
  - Preserved onboarding business rules and existing membership-resolution behavior from prior package.
- Files changed:
  - `shopify.app.toml`
  - `app/modules/webhooks/services/process-customers-create-onboarding.service.ts`
  - `app/modules/webhooks/repositories/onboarding-event-log.repository.server.ts`
  - `docs/specs/goal-2-progress.md`
- Verification:
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - Executable reliability scenario evidence (service/repository harness run):
    - duplicate same webhook id -> no duplicate mutation (single membership/event record)
    - transient failure after begin -> retry completes successfully (record transitions to `completed`)
    - non-duplicate DB error in begin path -> surfaces `INFRA_UNAVAILABLE` (not mislabeled duplicate)
- Blockers:
  - none
- Migration/compatibility notes (env-map fallback decision):
  - DB-backed memberships are now primary (`CompanyMembership`).
  - `AUTH_MEMBERSHIP_MAP` is retained only as temporary fallback for non-migrated customers to avoid breaking in-flight proxy/session flows during rollout.
  - Follow-up after webhook backfill: remove env fallback to make DB membership mandatory.
- Handoff:
  - Architect/Tech Lead should review `G2-WP-4` reliability rework and decide acceptance from `review` to `done`.
  - Quality and DevEx Agent should validate live `customers/create` webhook retries against dev store with actual duplicate and transient-failure replay evidence.

### Frontend Embedded Agent
- Current package: `G2-WP-7B - Dashboard error mapping implementation (customer-safe UI copy)`
- Progress:
  - Implemented a code-level dashboard error mapping table aligned to the canonical mapping contract.
  - Refactored error panel rendering to use mapped customer-safe copy (`title`, `description`, `action`) instead of raw backend payload fields.
  - Preserved inactive membership behavior as dedicated pending-activation copy and policy-driven support reference visibility.
  - Removed customer-visible technical diagnostics and raw error payload exposure from dashboard error panel path.
- Files changed:
  - `app/routes/dashboard.tsx`
  - `docs/specs/goal-2-progress.md`
- Verification:
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - Manual behavior checks:
    - [x] Mapping-table-driven dashboard error rendering is active.
    - [x] Customer UI does not render raw diagnostics (`code`/`details`) in the error panel.
    - [x] Existing non-error flow remains intact.
- Blockers:
  - none
- Handoff:
  - Quality and DevEx Agent should validate inactive-member UX in live storefront session as part of remaining Goal 2 verification evidence.

### Quality and DevEx Agent
- Current package: `G2-WP-7C - Error UX verification matrix and requestId correlation evidence`
- Status: `done`
- Progress:
  - Re-ran required quality gates.
  - Collected live runtime evidence from active dev terminal session for multiple error states.
  - Verified requestId correlation behavior with concrete log evidence.
  - Re-validated customer-facing copy and technical payload exposure rules against current implementation.
- Files changed:
  - `docs/specs/goal-2-progress.md`
- Verification evidence:
  - Baseline gates:
    - `npm run lint` -> pass
    - `npm run typecheck` -> pass
  - Error UX matrix (strict re-run status):
    - `pending activation` -> **captured (live evidence)**:
      - log evidence: `/api/auth/session` with `AUTH_INACTIVE_MEMBERSHIP` (multiple requestIds observed)
      - expected user-facing behavior: pending activation guidance path confirmed by implemented copy policy
    - `forbidden` -> **captured (live evidence)**:
      - log evidence: `/api/company/profile` `PATCH` with `AUTH_FORBIDDEN_ROLE`
      - expected plain-language access-restricted copy confirmed in dashboard mapping table
    - `unauthorized` -> **captured (live evidence)**:
      - log evidence: `/api/auth/session` with `AUTH_INVALID_IFRAME_SESSION` and `AUTH_EXPIRED_IFRAME_SESSION`
      - expected auth-required plain-language copy confirmed in dashboard mapping table
    - `temporarily unavailable` -> **captured (live evidence)**:
      - log evidence: `/api/company/profile` `PATCH` with `INFRA_UNAVAILABLE` (`retryable=true`)
      - expected temporary issue + retry guidance confirmed in dashboard mapping table
    - `sync in progress` -> **not reproducible live in this pass**:
      - no live `SYNC_IN_PROGRESS` response observed in current runtime pass
      - code-level mapping remains present (`SYNC_IN_PROGRESS` + `details.syncState=sync_in_progress` -> `sync_in_progress`)
    - `ready/normal` -> **partially evidenced**:
      - dev runtime reached `Ready, watching for changes` and dashboard route requests observed
      - explicit screenshot/state-capture artifact for normal dashboard screen not available in this pass
  - Production-mode technical exposure check:
    - customer error panel renders plain-language title/description/action + optional support reference
    - raw technical `code`/`details` not rendered in customer panel path
  - RequestId correlation proof (live):
    - terminal log includes matching support-traceable requestIds in structured `api_error_response` events for captured states (for example `AUTH_FORBIDDEN_ROLE`, `AUTH_INACTIVE_MEMBERSHIP`, `INFRA_UNAVAILABLE`)
    - requestId is present in backend log payload and is expected to be surfaced in UI when `showRequestId=true`
  - Screenshot evidence status:
    - no screenshot files/artifacts are present in repo/workspace for this pass
- Blockers:
  - none (package accepted after product-owner live validation)
- Handoff:
  - Architect/Tech Lead: proceed with remaining Goal 2 live closure items under `G2-WP-3`.
  - Release recommendation for `G2-WP-7` package set: `GO` (accepted for current phase).

## Architect validation log
| Date | Work package | Validation result | Notes |
|---|---|---|---|
| 2026-04-07 | Goal 2 planning setup | accepted | goal scope, ownership, and initial package sequencing approved |
| 2026-04-07 | G2-WP-1 | accepted | signed app-proxy auth reuse, thin route delegation, zod cart-context output contract, and no-store response header verified |
| 2026-04-07 | G2-WP-2 | accepted | theme extension app-embed JS writes `/apps/rt/cart-context` payload to `/cart/update.js` and exits silently on non-OK/network failures |
| 2026-04-07 | G2-WP-3 | blocked (validated) | automated/local evidence is strong; live storefront + checkout/order propagation proof is still required for GO decision |
| 2026-04-07 | G2-WP-4 | review (rework required) | core onboarding flow exists, but customers/create webhook subscription is not wired and idempotency repository currently masks non-duplicate DB failures as duplicates |
| 2026-04-07 | G2-WP-4R | accepted | customers/create webhook subscription added; idempotency begin now distinguishes unique-duplicate vs infra errors; processing/failed/completed lifecycle supports retriable recovery |
| 2026-04-07 | G2-WP-3C | blocked (validated) | live gates executed and negative path proven, but required positive live onboarding outcomes + authenticated cart-context checkout/order propagation evidence still missing |
| 2026-04-07 | G2-WP-5 | accepted | inactive-membership state now renders a customer-facing pending-activation screen; raw debug/diagnostic payload is not shown for this state |
| 2026-04-07 | G2-WP-7A | accepted | error UX split policy and canonical dashboard mapping spec documented; production customer UI rule now explicitly forbids technical payload exposure |
| 2026-04-07 | G2-WP-7B | accepted | dashboard error UI now uses mapping-table-driven customer-safe copy/actions with policy-based requestId support reference and no raw technical payload rendering |
| 2026-04-07 | G2-WP-7C | accepted | quality evidence plus product-owner live validation accepted; dashboard error UX split is considered complete for current phase |
| 2026-04-07 | G2-WP-3 | accepted | live validation confirmed onboarding works for additional users with correct role/status outcomes and company data propagates from cart attributes into order context |

