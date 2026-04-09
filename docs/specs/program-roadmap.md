# Program Roadmap - Product "What"

## Product Definition
This app is a supplement to the Shopify My Account experience for a non-Plus store.

The purpose is to give business customers (organizations buying from an organization) a better account experience where:
- the company is the real customer entity
- multiple users can act on behalf of that company
- company-level data and workflows are available even without Shopify Plus

This app is a layer above Shopify data. It enriches workflows, while Shopify remains the commerce backbone.

## Integration Boundary
- This app stores company-specific data that is not practical to model in standard Shopify customer/account flows without Plus.
- When information must flow to downstream systems (for example Business Central via existing Shopify integration), the app carries that context through Shopify-native surfaces such as attributes/metafields.
- The app does not require a direct integration from this app to Business Central.

## Core Problems To Solve

### 1) Shared Company Dashboard
**Problem**
- Company employees need one shared account view, not isolated individual customer views.

**Outcome**
- Authorized users from the same company can access a shared dashboard context.

### 2) Company Master Data
**Problem**
- Company information must be maintained at company level, not duplicated across individual users.

**Outcome**
- Company-level fields are available and manageable, including:
  - company name
  - organization number
  - postal/invoice address
  - invoice preference (email or EHF)

### 3) Company-Wide Order Visibility
**Problem**
- Employees need visibility across all orders placed by members of the same company.

**Outcome**
- The dashboard provides a company-level order view across company members.

### 4) Shared Delivery Addresses
**Problem**
- Teams need reusable delivery destinations managed for the company.

**Outcome**
- Company users can use shared delivery addresses in a controlled way.

### 5) Company User Management
**Problem**
- Companies need to manage who can access the shared account context.

**Outcome**
- The app supports company user management and invitation flows.

## Phase 1 (POC) Purpose
Validate the core product assumptions above in real usage, and identify what should become permanent product behavior versus what was only exploratory testing.

## Important POC Notes (Exploratory Work)
Some POC implementations are intentionally experimental and are not automatically part of the end program:

- Full user-facing diagnostic error detail:
  - In POC, detailed error visibility helps development and debugging.
  - In final product, error presentation should be split between developer diagnostics and cleaner end-user messaging.

- Address sync via Shopify metaobject:
  - In POC, this was used to test sync capability/patterns.
  - Final decision: retired for MVP. Company/postal address has no Shopify sync mechanism.

## Current POC Status (High-Level)
### Proven Enough To Continue
- Shared account context baseline is functioning.
- Company profile and cart-context enrichment flows are implemented in prototype form.
- Onboarding/membership and sync patterns have been prototyped and tested.

### Still To Confirm Before Locking Product Decisions
- Final behavior for end-user error messaging versus internal diagnostics.
- Final strategy for carrying company data through Shopify (what fields, where, and why).
- End-to-end validation for onboarding, company mapping, and order-context propagation in live conditions.

## Phase 2 Draft (High-Level)
Phase 2 focuses on rebase, groundwork, and defining final MVP scope through UI-first clarification.

Execution tracking for Phase 2:
- `docs/specs/p2-g1-progress.md`
- `docs/specs/p2-g2-progress.md`

Frontend visual baseline for Phase 2:
- `docs/specs/brand-kit.md` (canonical brand/visual reference for dashboard UI work)

Phase 2 sequence (high-level):
1. Rebase and groundwork
2. Tailwind baseline setup for dashboard UI
3. UI skeleton build-out
4. Scope lock through UI review

### 1) Rebase and Groundwork
**Goal**
- Consolidate what we learned in POC and reset temporary decisions before expanding features.

**Outcome**
- POC-only behaviors are clearly separated from long-term product behavior.
- Stable boundaries for data ownership and user-facing behavior are clarified.

### 2) UI Skeleton First
**Goal**
- Build the shared dashboard structure and page skeletons first, before deep feature expansion.

**Outcome**
- We can validate the full account journey as screens and states, not as isolated backend flows.
- Navigation and information architecture are visible and testable early.
- Tailwind is available as the primary UI styling baseline before skeleton implementation starts.

### 3) Scope Through UI
**Goal**
- Use concrete UI flows to decide what is truly in MVP versus later.

**Outcome**
- Each area of the dashboard is explicitly categorized as:
  - must have now
  - later phase
  - out of current scope

## Phase 3 Draft Dependencies (Spec-First)
Before backend implementation for new dashboard domains, solution specs must be finalized and accepted:
- `docs/specs/p3-user-onboarding-solution-spec-draft.md`
- `docs/specs/p3-order-history-solution-spec-draft.md`

Additional domain specs (for example shared delivery addresses) should follow the same spec-first dependency rule.

## Cross-Phase Production Guardrails (Do Not Forget)
These items may exist temporarily across multiple development phases for speed, but must be removed or hard-disabled before production readiness.

### Development test overrides in customer-facing entry flows
- URL-driven membership test overrides (for example `?status=inactive&role=user`) are allowed in development to speed up UI/error-state testing.
- Before production, these overrides must be removed or impossible to activate in production runtime.
- This is a mandatory hardening checkpoint, not optional cleanup.

### Customer-facing UX quality bar for dashboard
- The dashboard is a customer-facing surface for non-technical users and must feel clear, trustworthy, and easy to use.
- Production UI text should use plain language and action-oriented guidance.
- Internal system details (technical error codes, diagnostics, stack-like context) must not be shown in production customer UI.
- Support workflows should rely on request correlation identifiers and internal logs, not technical payload exposure to customers.

## Non-Goals For This Document
- No technical design details.
- No API or schema specifications.
- No work package planning or role assignment detail.
