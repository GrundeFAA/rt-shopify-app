# Phase 3 Draft - User Onboarding Solution Spec

## Purpose
Define a practical, deterministic onboarding solution for company user add/create flows in the dashboard.

This draft is intentionally optimized for a small-team, non-enterprise context:
- simple actor flows
- explicit state transitions
- low operational overhead
- predictable conflict handling

## Scope
In scope:
- add/create company user flow from dashboard
- Shopify customer lookup/create handling
- app membership lifecycle and activation
- Shopify customer tag lifecycle synchronization for theme rendering
- deterministic API outcomes
- idempotency and race-safe behavior

Out of scope:
- advanced enterprise IAM workflows
- multi-company active memberships per user
- custom app email invite infrastructure

## Core Decisions
1. UI uses one action: `Opprett bruker`.
2. Backend executes a decision tree and returns deterministic outcomes.
3. App DB is source of truth for:
   - company link
   - role
   - membership status
4. Admin-added users require user-side acceptance before becoming `active`.
5. Admin activation is reserved for self-connected users created from Shopify webhook onboarding.
6. Shopify-native account invite email is optional helper for account activation only, and only relevant when legacy customer accounts are enabled.
7. Company onboarding semantics are enforced in app flows, not in Shopify email templates.
8. Shopify tags are a mirror of membership status for storefront/theme rendering only.

## Identity and Membership Constraints
- Email is normalized before all matching.
- A user/customer can have only one active company membership at a time (current policy).
- Cross-company conflict must be blocked by default and handled through explicit transfer flow later.

## Status Model (Locked Draft)
Use explicit membership states to separate user consent and admin approval paths:

- `pending_user_acceptance`
  - Admin has added/linked the user, but the user has not accepted company membership yet.
- `pending_admin_approval`
  - User is linked to company, but administrator approval is still required before access.
- `inactive`
  - User was previously active, but is now intentionally deactivated.
- `active`
  - User can access company dashboard.

Interpretation:
- Admin-added users start in `pending_user_acceptance` and become `active` after user acceptance.
- Self-connected users created via webhook on existing company start in `pending_admin_approval` and require admin activation.

## Primary Flows

### A) Admin add/create (`POST /api/company/members`)
Input:
- company context (from authenticated admin)
- email
- role (default `user`, optional `administrator` for explicit use-cases)

Backend decision flow:
1. Normalize email.
2. Check existing app membership by email/customer mapping.
3. Resolve Shopify customer by email:
   - If not found: create Shopify customer.
   - If found: reuse existing Shopify customer.
4. Apply conflict/idempotency rules:
   - Same company existing membership:
     - If `active`: return deterministic already-member result.
     - If `pending_user_acceptance`: return deterministic already-pending-user-acceptance result.
     - If `pending_admin_approval`: return deterministic already-pending-admin-approval result.
     - If `inactive`: return deterministic already-inactive result.
   - Other company membership: return `STATE_CONFLICT`.
5. Create membership with initial state:
   - `pending_user_acceptance`
6. Persist membership record and status.
7. Optionally trigger Shopify native account invite email when account activation is needed.

### B) User acceptance (`POST /api/company/members/accept`)
Used for memberships created by admin add flow.

Backend checks:
1. Resolve authenticated customer identity from dashboard session.
2. Resolve membership in same company for that identity.
3. Verify membership status is `pending_user_acceptance`.
4. Transition to `active`.
5. Persist membership status transition.

### C) Self-connect onboarding via webhook (`customers/create`)
Precondition:
- User self-registers in Shopify and includes company onboarding payload.
- Company already exists in app.

Backend checks:
1. Verify webhook signature and parse payload.
2. Resolve existing company by organization number.
3. Create/link membership as `pending_admin_approval`.
4. Persist membership status and onboarding source marker (`activationSource=self_registered`).
5. Administrator must activate before access is granted.

### D) Admin activation (`POST /api/company/members/:id/activate`)
Used for:
- approval of `pending_admin_approval` users
- reactivation of `inactive` users

Backend checks:
1. Caller is administrator for same company.
2. Membership status is `pending_admin_approval` or `inactive`.
3. No cross-company violation.
4. Transition to `active`.
5. Persist membership status transition.

## Scenario Matrix (Deterministic Outcomes)
1. Email not in Shopify + no app membership:
   - create Shopify customer
   - create membership (`pending_user_acceptance`) when added by admin
   - optional Shopify account invite email

2. Email exists in Shopify + no app membership:
   - reuse customer
   - create membership (`pending_user_acceptance`) when added by admin

3. Email exists + already member in same company:
   - idempotent response (already active / already pending_user_acceptance / already pending_admin_approval / already inactive)
   - no duplicate membership

4. Email exists + member in different company:
   - block with `STATE_CONFLICT`
   - require explicit transfer flow

5. User self-registers to existing company via webhook:
   - create/link membership as `pending_admin_approval`
   - require admin activation before access

6. User accepts admin-added membership:
   - membership transitions `pending_user_acceptance -> active`
   - access enabled after successful acceptance

7. Shopify/API transient failure during create/link:
   - return retryable dependency error
   - avoid partial inconsistent app state

8. Webhook or async timing race:
   - idempotent create/link semantics by normalized email + company context
   - reconciliation processes must not create duplicates

9. Admin cancels pending membership:
   - hard delete membership when status is `pending_user_acceptance` or `pending_admin_approval`
   - no audit history retained for deleted pending record

10. User cancels own pending-admin membership:
   - hard delete only when status is `pending_admin_approval` and membership belongs to caller

## API Surface
- `POST /api/company/members`
  - add/create/link user by email
- `POST /api/company/members/accept`
  - user-side acceptance of admin-created pending membership
- `POST /api/company/members/:id/activate`
  - admin approval/activation for `pending_admin_approval` and `inactive`
- `POST /api/company/members/:id/deactivate`
  - admin deactivation
- `DELETE /api/company/members/:id`
  - hard delete membership only when status is pending (`pending_user_acceptance` or `pending_admin_approval`)
  - forbidden for `active` and `inactive`

Potential later:
- `POST /api/company/members/:id/transfer` (explicit cross-company transfer flow)

## Required DB Constraints (Concurrency Safety)
Minimum persistence constraints to enforce deterministic behavior:
- unique membership per `customerId`
- unique membership per `(companyId, customerId)`
- unique normalized email mapping for pending/active lifecycle (single company membership policy)
- unique onboarding idempotency key/event key for webhook processing
- transactional create/link operations for customer+membership writes

## Membership Removal Rules
- Pending memberships are removable with hard delete (no audit history retained):
  - `pending_user_acceptance`
  - `pending_admin_approval`
- `active` and `inactive` memberships are not removable by delete endpoint.
- User self-cancel is allowed only for own `pending_admin_approval` membership.
- Admin cancel is allowed for company memberships in pending states.

## Shopify Tag Lifecycle (In Scope)
Tag policy for storefront/theme conditional rendering:
- `b2b` = active company member
- `b2b-unverified` = pending or inactive company member
- No company member tag = no company membership

Source-of-truth rule:
- App DB membership status is authoritative.
- Shopify tags must converge to that status through deterministic sync logic.

Lifecycle triggers:
1. Admin adds user -> membership becomes `pending_user_acceptance`:
   - ensure `b2b-unverified` present
   - ensure `b2b` absent
2. User accepts pending membership:
   - switch `b2b-unverified -> b2b`
3. Webhook self-connect on existing company -> membership becomes `pending_admin_approval`:
   - ensure `b2b-unverified` present
   - ensure `b2b` absent
4. Admin activates `pending_admin_approval` or `inactive` user:
   - switch `b2b-unverified -> b2b`
5. Admin deactivates active user:
   - switch `b2b -> b2b-unverified`
6. Pending membership is deleted:
   - remove `b2b-unverified` if present
7. Membership removed or transferred out of company scope (later flow):
   - remove both company membership tags for previous company context

Reliability rules for tag sync:
- Tag writes are idempotent and converge to expected final state.
- Tag write failures must not change source-of-truth membership state.
- Failed tag syncs are retried asynchronously and reconciled by background repair.
- Observability must include retry count, exhausted retries, and reconciliation outcomes.

## Error Contract Alignment
Use existing taxonomy in `docs/06-error-handling-and-reliability.md`:
- `VALIDATION_FAILED`
- `STATE_CONFLICT`
- `AUTH_*` for identity/session/permission issues
- `SHOPIFY_*`, `INFRA_*` for retryable dependency failures
- `INTERNAL_ERROR` fallback

Response shape remains standard:
- `code`
- `message` (customer-safe; Norwegian in production UI)
- `requestId`
- `retryable`
- `details` (internal-safe only)

## Pre-Implementation Dependencies (Hard Gates)
1. Membership status schema migration:
   - align DB + contracts + runtime schemas to:
     - `pending_user_acceptance`
     - `pending_admin_approval`
     - `active`
     - `inactive`
2. Error taxonomy and frontend mapping update:
   - introduce deterministic pending-state codes/mappings for:
     - pending user acceptance
     - pending admin approval
   - keep customer-safe copy policy and requestId behavior aligned with existing reliability docs

## Observability Requirements
- Keep request correlation (`requestId`) across onboarding/activation flows.
- outcome counters by scenario path
- conflict counts
- retryable dependency failures
- duplicate/idempotent no-op counts

## UI Behavior Rules (MVP)
- All user-facing copy is Norwegian (Bokmal).
- `pending_user_acceptance` state must clearly explain that user acceptance is required.
- `pending_admin_approval` state must clearly explain that administrator approval is required before access.
- `inactive` state must clearly explain that user is deactivated and must contact administrator for reactivation.
- Do not show technical diagnostics in production customer UI.

## Open Decisions To Finalize Before Implementation
1. Role assignment at creation:
   - default `user` only vs allow `administrator` assignment at create time
2. Transfer flow timing:
   - defer to later phase (recommended) vs include in first implementation
3. Exact shape for activation source metadata fields and enums

## Recommended Implementation Order
1. Lock state machine and transition policy.
2. Implement `POST /api/company/members` with idempotency + conflict handling.
3. Implement `POST /api/company/members/accept` transition (`pending_user_acceptance -> active`).
4. Implement webhook self-connect creation to `pending_admin_approval` and administrator activation/deactivation transitions.
5. Add UI state cards and deterministic outcome messages.
6. Add tests for scenario matrix and race/idempotency cases.

