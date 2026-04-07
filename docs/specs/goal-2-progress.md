# Goal 2 Progress

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
| G2-WP-3 | Verification and reliability evidence for cart-context flow | Quality and DevEx Agent | `blocked` | G2-WP-1, G2-WP-2 | G2-WP-3D rerun completed; baseline gates pass but required live onboarding outcomes and authenticated storefront checkout propagation evidence are still missing |
| G2-WP-4 | Webhook-driven company onboarding + DB-backed membership resolution | Backend Platform Agent | `done` | G2-WP-1 | Implemented customers/create onboarding with DB-first membership resolution; rework completed for webhook subscription wiring and retry-safe idempotency semantics |

Status values:
- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

## Role updates
Each role updates only its own section.

### Architect/Tech Lead
- Current package: `review of G2-WP-3C live closure pass`
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
- Decisions made:
  - this feature is tracked under Goal 2, not Goal 1
  - cycle 1 runs backend first, then frontend, then quality verification
- Blockers:
  - interactive storefront/customer session required to complete live `/apps/rt/cart-context` chain and order note-attribute propagation validation
- Next package:
  - execute guided live onboarding data setup + authenticated storefront checkout pass, then rerun final G2-WP-3 closure evidence

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
- Current package: `G2-WP-2 - Theme App Extension cart attribute writer`
- Progress:
  - Scaffolded Theme App Extension under `extensions/cart-context-writer` with theme extension config and app embed block.
  - Added storefront JS asset that executes on load, fetches `/apps/rt/cart-context`, and exits silently on any non-OK/network/parsing failure.
  - Implemented flat attribute writer to `POST /cart/update.js` using `{ attributes: { ...payload } }` when cart-context response is successful.
  - Added safe handling for optional/empty values (including empty `company_address_line2`) by accepting string/number/boolean values and skipping unsupported/null values without errors.
  - Kept auth and membership logic server-side only; extension consumes proxy endpoint only and performs cart attribute write.
- Files changed:
  - `extensions/cart-context-writer/shopify.extension.toml`
  - `extensions/cart-context-writer/blocks/cart-context-writer.liquid`
  - `extensions/cart-context-writer/assets/cart-context.js`
  - `docs/specs/goal-2-progress.md`
- Verification:
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - Manual logic review:
    - [x] non-OK cart-context response returns early with no user-facing error
    - [x] network exceptions are swallowed (silent no-op)
    - [x] cart update payload shape matches `{ attributes: { ...payload } }`
- Blockers:
  - none
- Handoff:
  - Quality and DevEx Agent for `G2-WP-3` runtime verification of storefront attribute writes and checkout/order propagation.

### Quality and DevEx Agent
- Current package: `G2-WP-3D - Final live closure after onboarding data setup`
- Status: `blocked`
- Progress:
  - Re-ran closure validation pass with updated backend/data state checks.
  - Re-ran baseline quality gates.
  - Queried live DB evidence for onboarding outcomes and membership creation.
  - Re-validated that closure prerequisites remain unmet for required onboarding and checkout propagation scenarios.
- Files changed:
  - `docs/specs/goal-2-progress.md`
- Live verification evidence summary:
  - Baseline gates:
    - `npm run lint` -> pass
    - `npm run typecheck` -> pass
  - DB outcome verification (live query evidence):
    - `OnboardingEventLog`: 1 record, outcome list = `["ignored_invalid_note"]`
    - `CompanyMembership`: 0 records
    - required outcomes not present:
      - `processed_new_company`
      - `processed_existing_company_member`
  - Duplicate replay verification:
    - not verifiable from live data because there is no successful onboarding mutation baseline to replay against
  - Authenticated storefront chain verification:
    - no captured live evidence in this pass for:
      - mapped/linked member `GET /apps/rt/cart-context` success payload
      - extension-driven `/cart/update.js` write from authenticated storefront customer session
      - checkout/order note-attribute propagation containing company fields
- Blockers:
  - Missing prerequisite: two real `customers/create` onboarding events with valid note payloads for the same org that produce:
    - first user -> `processed_new_company` + `administrator/active`
    - second user -> `processed_existing_company_member` + `user/inactive`
  - Missing prerequisite: duplicate replay evidence for a successful onboarding webhook id showing no duplicate membership mutation.
  - Missing prerequisite: authenticated storefront customer session tied to persisted membership, with captured cart update and checkout/order attribute propagation evidence.
- Handoff:
  - Backend Platform Agent + Architect/Tech Lead: complete live onboarding data setup (two valid customers same org + duplicate replay) and confirm persisted outcomes in DB.
  - Quality and DevEx Agent (next pass): execute final authenticated storefront-to-checkout capture and close `G2-WP-3`.
  - Final release recommendation: `NO-GO` until prerequisites above are satisfied.

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

