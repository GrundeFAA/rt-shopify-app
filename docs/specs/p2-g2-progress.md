# P2-G2 Progress

## Goal metadata
- Phase/Goal: `P2-G2 - Tailwind Baseline, UI Skeleton, and Scope Lock`
- Owner: `Architect/Tech Lead`
- Status: `in_progress`
- Last updated: `2026-03-30`

## Work package board
| ID | Work package | Owner role | Status | Dependencies | Notes |
|---|---|---|---|---|---|
| P2-G2-WP-1 | Tailwind baseline setup for dashboard iframe UI | Frontend Embedded Agent | `done` | - | Tailwind + PostCSS baseline configured and loaded only from dashboard iframe route stylesheet links |
| P2-G2-WP-2A | Dashboard redesign spike (brand-kit + Tailwind) | Frontend Embedded Agent | `done` | P2-G2-WP-1 | Dashboard page redesigned with brand-kit visual language and Tailwind utility workflow while preserving existing auth/error/save behavior |
| P2-G2-WP-2 | Tailwind baseline verification and isolation checks | Quality and DevEx Agent | `todo` | P2-G2-WP-2A | Verify Tailwind works in iframe app surface and does not create storefront/theme leakage concerns after redesign spike |
| P2-G2-WP-3 | UI skeleton implementation (structure + states) | Frontend Embedded Agent | `done` | P2-G2-WP-2 | Dashboard route integrated with prepared component library and section navigation for company info, company orders, shared delivery addresses, and users/invites while preserving working flows |
| P2-G2-WP-4 | UI-led scope lock review (`must`/`later`/`out`) | Architect/Tech Lead | `todo` | P2-G2-WP-3 | Freeze Phase 2 MVP scope from concrete skeleton flows and states |

Status values:
- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

## Frontend Brand Baseline (Mandatory)
- Canonical brand/visual reference for all Phase 2 dashboard UI work:
  - `docs/specs/brand-kit.md`
- This baseline applies to:
  - Tailwind token mapping
  - typography/color/radius/spacing choices
  - component styling decisions for skeleton and follow-on UI work

## Role updates
Each role updates only its own section.

### Architect/Tech Lead
- Current package: `review of P2-G2-WP-1 tailwind baseline`
- Progress:
  - created canonical Phase 2 tracker for `P2-G2`
  - queued Tailwind-first sequence and downstream skeleton/scope-lock packages
  - reviewed and accepted `P2-G2-WP-1` tailwind baseline setup for dashboard iframe scope
- Decisions made:
  - Tailwind baseline is mandatory before UI skeleton implementation
  - scope lock happens only after skeleton is visible and reviewable
- Blockers:
  - none
- Next package:
  - run `P2-G2-WP-2A` dashboard redesign spike using brand-kit baseline + Tailwind

### Backend Platform Agent
- Current package: `unassigned`
- Progress:
  - none
- Blockers:
  - none

### Frontend Embedded Agent
- Current package: `P2-G2-WP-3R3 - Dashboard skeleton UX polish + localization + action controls`
- Progress:
  - Refined company info UX to compact, content-first layout:
    - removed boxed mini-cards for identity fields
    - moved org number directly under company name
    - moved address editing behind modal with explicit action button
  - Introduced reusable form scaffolding for dashboard sections:
    - `DashboardFormLayout`, `DashboardFormSection`, `DashboardFormRow`
    - applied to company info with `Postadresse` + `Fakturainnstillinger`
  - Updated invoice preference UX:
    - invoice email always present
    - EHF optional as primary delivery
    - removed EHF identifier input (org number basis)
  - Updated orders section:
    - replaced generic status/reference columns with Shopify-relevant columns (`betalingsstatus`, `oppfyllelsesstatus`, `bestilt av`)
    - row-level `Vis` now opens order-details modal
  - Updated delivery addresses section:
    - removed country/status columns
    - added `Lagt til av`
    - added row-level `Rediger` action with edit modal
  - Updated users section:
    - standardized roles to `bruker` / `administrator`
    - added admin-only action menu (HeadlessUI ellipsis) with `Sett aktiv` / `Sett inaktiv`
    - removed visible action header text and aligned action control to table edge
  - Localized user-facing frontend copy to Norwegian across dashboard UI:
    - tabs, table headers, buttons, modal copy, sync copy, runtime error UI copy
    - iframe shell language updated to `no`
  - Preserved working flows:
    - full-page startup/auth error rendering stays route-level and deterministic
    - runtime error mapping copy remains unchanged
    - address PATCH save flow and sync report flow remain unchanged
    - no backend/API contract changes
- Files changed:
  - `app/routes/dashboard.tsx`
  - `app/routes/apps.dashboard.tsx`
  - `app/modules/dashboard/dashboard-api.ts`
  - `app/modules/dashboard/dashboard.types.ts`
  - `app/modules/dashboard/dashboard.constants.ts`
  - `app/modules/dashboard/error-copy.ts`
  - `app/modules/dashboard/sections/company-info-section.tsx`
  - `app/modules/dashboard/sections/company-orders-section.tsx`
  - `app/modules/dashboard/sections/shared-delivery-addresses-section.tsx`
  - `app/modules/dashboard/sections/users-invites-section.tsx`
  - `app/modules/dashboard/components/dashboard-form-layout.tsx`
  - `app/modules/dashboard/components/dashboard-row-actions-menu.tsx`
  - `app/modules/dashboard/components/dashboard-table.tsx`
  - `app/modules/dashboard/components/dashboard-modal.tsx`
  - `app/modules/dashboard/components/dashboard-alert-modal.tsx`
  - `app/modules/dashboard/components/dashboard-tabs.tsx`
  - `app/modules/dashboard/components/index.ts`
  - `docs/specs/p2-g2-progress.md`
- Verification:
  - `npm run lint` -> pass
  - `npm run typecheck` -> pass
  - Functional checks:
    - [x] full-page error states still render deterministically
    - [x] runtime error alert still renders with mapped copy
    - [x] address save action still submits via existing PATCH flow
    - [x] sync status panel still updates after save
    - [x] tabs + mobile select stay synchronized via stable section keys
    - [x] order row action opens modal details
    - [x] delivery address row action opens edit modal
    - [x] user actions menu visible only for administrators
    - [x] all exposed dashboard UI copy presented in Norwegian
- Blockers:
  - none
- Handoff:
  - Architect/Tech Lead should review this polish pass and decide whether to freeze `P2-G2-WP-3` outputs or run one focused QA cycle before scope-lock (`P2-G2-WP-4`).

### Quality and DevEx Agent
- Current package: `unassigned`
- Progress:
  - none
- Blockers:
  - none

## Architect validation log
| Date | Work package | Validation result | Notes |
|---|---|---|---|
| 2026-04-07 | P2-G2 setup | accepted | canonical tracker created with Tailwind-first sequencing and scope-lock package path |
| 2026-04-07 | P2-G2-WP-1 | accepted | tailwind/postcss baseline configured for dashboard iframe route scope with lint/typecheck passing |

## Scope-Lock Review Method (`must` / `later` / `out`)
This method is executed in `P2-G2-WP-4` after skeleton screens exist.

Per skeleton section, classify using product behavior only (not implementation detail):
- `must`: required for current phase MVP acceptance
- `later`: valid roadmap item, deferred from current MVP
- `out`: explicitly excluded from current scope

Review outputs:
- final classification table per section
- dependency notes and sequencing implications
- explicit MVP boundary statement for Phase 2 execution
