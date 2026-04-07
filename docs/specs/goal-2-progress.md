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
| G2-WP-3 | Verification and reliability evidence for cart-context flow | Quality and DevEx Agent | `blocked` | G2-WP-1, G2-WP-2 | Backend/extension behavior verified; blocked on true storefront app-proxy runtime + checkout/order propagation evidence prerequisites |
| G2-WP-4 | Webhook-driven company onboarding + DB-backed membership resolution | Backend Platform Agent | `todo` | G2-WP-1 | Implement `customers/create` onboarding using customer note contract and replace `AUTH_MEMBERSHIP_MAP` as primary membership source for proxy/session flows |

Status values:
- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

## Role updates
Each role updates only its own section.

### Architect/Tech Lead
- Current package: `review of G2-WP-3 blocked verification report`
- Progress:
  - validated scoped feature against architecture and reliability standards
  - defined Goal 2 work packages and ownership boundaries
  - prepared cycle 1 prompts for safe execution sequence
  - reviewed and accepted `G2-WP-1` implementation with route-service-repository layering and typed contract alignment
  - reviewed and accepted `G2-WP-2` theme extension cart attribute writer behavior and silent-failure UX contract
  - reviewed `G2-WP-3` and accepted blocked status pending interactive storefront E2E evidence
- Decisions made:
  - this feature is tracked under Goal 2, not Goal 1
  - cycle 1 runs backend first, then frontend, then quality verification
- Blockers:
  - interactive storefront/customer session required to complete live `/apps/rt/cart-context` chain and order note-attribute propagation validation
- Next package:
  - launch `G2-WP-4` backend onboarding/membership package to remove env-map dependency

### Backend Platform Agent
- Current package: `G2-WP-1 - App proxy cart-context API endpoint`
- Progress:
  - Implemented `GET /api/b2b-proxy/cart-context` route (`app/routes/api.b2b-proxy.cart-context.tsx`) using existing `verifyAppProxyRequest` auth validation.
  - Kept route thin by delegating membership + company-profile resolution to `GetProxyCartContextService`.
  - Added typed/zod cart-context response contract with flat cart attributes:
    - `company_name`
    - `company_org_number`
    - `company_address_line1`
    - `company_address_line2`
    - `company_postal_code`
    - `company_city`
    - `company_country`
  - Added contract marshaling through `ProxyCartContextOutputSchema`.
  - Added success response cache policy `Cache-Control: no-store`.
  - Error path uses typed `AppError` + `toApiErrorResponse` contract unchanged.
- Files changed:
  - `app/contracts/company.schema.ts`
  - `app/modules/company/schemas.ts`
  - `app/modules/company/services/get-proxy-cart-context.service.ts`
  - `app/routes/api.b2b-proxy.cart-context.tsx`
  - `docs/specs/goal-2-progress.md`
- Verification:
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
- Blockers:
  - none
- Handoff:
  - Frontend Embedded Agent can now consume `GET /api/b2b-proxy/cart-context` from theme extension flow (`G2-WP-2`).

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
- Current package: `G2-WP-3 - Verification and reliability evidence for cart-context flow`
- Progress:
  - Ran baseline quality gates (`lint`, `typecheck`) successfully.
  - Executed runtime verification of cart-context API behavior via local running app route with real proxy-signature validation logic:
    - invalid/unauthenticated proxy context -> non-OK typed auth response
    - no membership -> non-OK typed auth response
    - active member with company profile -> expected cart-context payload returned with all required keys
    - missing company profile -> non-OK typed not-found response
  - Executed repeatable runtime harness for extension JS flow and confirmed:
    - non-OK proxy response exits silently
    - network failure exits silently
    - parsing failure exits silently
    - successful payload triggers `/cart/update.js` call with expected flat attribute payload
    - repeated executions do not throw and continue sending valid cart updates
  - Attempted true storefront app-proxy runtime verification (`/apps/rt/cart-context` via `shopify app dev`) but execution was blocked by non-interactive store-password prompt and no storefront-authenticated customer test session in this environment.
- Files changed:
  - `docs/specs/goal-2-progress.md`
- Verification evidence:
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - Proxy API scenario evidence (local runtime route checks):
    - missing signature -> `401 AUTH_INVALID_PROXY_SIGNATURE`
    - valid signature + unmapped customer -> `403 AUTH_NO_MEMBERSHIP`
    - valid signature + mapped active customer (`cmp_001`) -> `200` with payload keys:
      - `company_name`
      - `company_org_number`
      - `company_address_line1`
      - `company_address_line2`
      - `company_postal_code`
      - `company_city`
      - `company_country`
    - valid signature + mapped customer with missing company profile -> `404 RESOURCE_NOT_FOUND`
  - Extension runtime harness evidence (`extensions/cart-context-writer/assets/cart-context.js`):
    - non-OK proxy: one fetch call, zero `/cart/update.js` calls
    - network failure: one fetch call, zero `/cart/update.js` calls
    - JSON parse failure: one fetch call, zero `/cart/update.js` calls
    - active payload: two fetch calls, one `/cart/update.js` with expected attributes body
    - repeated loads (2 runs): two `/cart/update.js` calls, no thrown errors
- Blockers:
  - Required true storefront E2E path (`/apps/rt/cart-context` -> extension JS on storefront page -> Shopify cart mutation in browser context) is not executable in this non-interactive run because `shopify app dev` requires interactive store-password entry.
  - Required checkout/order note attribute propagation verification is not executable without controlled storefront customer session and order-placement test flow.
  - Missing prerequisite for release evidence completion:
    - interactive storefront session (password + customer login context) with app embed enabled
    - ability to inspect resulting cart attributes at checkout/order in a live store flow
- Handoff:
  - Architect/Tech Lead: keep `G2-WP-3` in blocked status pending storefront runtime evidence session.
  - Quality and DevEx Agent (next pass): run live storefront verification checklist once interactive store/customer session is available; then finalize release evidence.
  - Release recommendation: `NO-GO` until storefront E2E and checkout/order propagation evidence is captured.

## Architect validation log
| Date | Work package | Validation result | Notes |
|---|---|---|---|
| 2026-04-07 | Goal 2 planning setup | accepted | goal scope, ownership, and initial package sequencing approved |
| 2026-04-07 | G2-WP-1 | accepted | signed app-proxy auth reuse, thin route delegation, zod cart-context output contract, and no-store response header verified |
| 2026-04-07 | G2-WP-2 | accepted | theme extension app-embed JS writes `/apps/rt/cart-context` payload to `/cart/update.js` and exits silently on non-OK/network failures |
| 2026-04-07 | G2-WP-3 | blocked (validated) | automated/local evidence is strong; live storefront + checkout/order propagation proof is still required for GO decision |

