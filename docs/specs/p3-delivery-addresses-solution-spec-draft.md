# Phase 3 Draft - Shared Delivery Addresses Solution Spec

## Purpose
Define a deterministic shared delivery address model where app DB is source of truth and Shopify customer addresses are synchronized projections for company members.

## Scope
In scope:
- shared company delivery address lifecycle (create, update, delete)
- member fan-out sync to Shopify customer addresses
- pending-to-active clean-slate address inheritance
- status-based sync eligibility rules
- reconciliation/retry behavior for sync failures

Out of scope:
- personal/private address model inside company context
- advanced geocoding/validation providers
- cross-company address sharing

## Core Decisions (Locked Draft)
1. App DB is canonical source of truth for company shared delivery addresses.
2. Shopify customer addresses are synchronized mirrors for eligible company members.
3. Eligible member statuses for ongoing address sync:
   - `active`
   - `inactive`
4. Pending members do not receive shared-address sync:
   - `pending_user_acceptance`
   - `pending_admin_approval`
5. On membership transition from pending -> active:
   - delete all Shopify customer addresses for that customer
   - sync full shared address set from app DB (clean slate)
6. In company context, delivery addresses are company-owned (not personal).
7. Controlled exception: external Shopify address changes from eligible members may be imported into app DB canonical set.
8. Default delivery address selection is user-specific preference, pointing to a shared company address.
9. If a shared address referenced as default is deleted, the user default reference is removed automatically.
10. "Canonical" defines authoritative target state, not permission to accept partial dashboard writes.
11. Address CRUD in dashboard is allowed for all `active` company members.
12. Dashboard command success requires canonical write + durable sync intent persistence (enqueue/outbox); no success response on partial command persistence.
13. Canonical address delete for MVP is hard delete.

## Source-Of-Truth and Projection Model

### Canonical store
- `CompanySharedAddress` records in app DB.

### Projection target
- Shopify customer addresses for each eligible member.

### Projection behavior
- Fan-out sync writes canonical address set to each eligible member.
- Projection must converge to canonical set after retries/reconciliation.

## Member Status Behavior Matrix
- `active`: receives full shared address sync
- `inactive`: receives full shared address sync
- `pending_user_acceptance`: no sync
- `pending_admin_approval`: no sync

## Primary Flows

### A) Create shared address in dashboard
1. Validate request and authorize `active` company membership.
2. Write address to app DB canonical table.
3. Enqueue fan-out sync to all eligible members (`active`, `inactive`).
4. Return success when canonical write is committed.
5. Projection sync may complete asynchronously with retry/reconciliation.

### B) Update shared address in dashboard
1. Validate request and authorize `active` company membership.
2. Update canonical app DB address.
3. Enqueue fan-out update to all eligible members.
4. Preserve deterministic canonical response regardless of projection lag.
5. Edit form must not include default-address controls.

### C) Delete shared address in dashboard
1. Validate request and authorize `active` company membership.
2. Delete canonical address from app DB.
3. Enqueue fan-out deletion from all eligible members.
4. Reconcile until mirrors converge.

### D) Pending -> Active membership transition (clean-slate inherit)
1. Transition membership to `active` via onboarding flow.
2. Delete all existing Shopify addresses for that customer.
3. Sync full canonical shared address set from app DB.
4. If delete or sync fails, mark reconciliation required and retry.

### E) External address changes outside dashboard (checkout/account UI)
Policy:
- Treat `customers/update` as a reconciliation/import trigger.
- If change comes from eligible member (`active` or `inactive`):
  - normalize and deduplicate address
  - import into canonical app DB set as `source=checkout_import`
  - enqueue fan-out sync to other eligible members
- If member is pending, ignore import for canonical set.
- App DB remains canonical after import; subsequent sync/reconcile converges mirrors to canonical set.

## API Surface (Draft)
- `GET /api/company/addresses`
  - list canonical shared addresses for current company
  - includes `myDefaultAddressId` for caller (nullable)
- `POST /api/company/addresses`
  - create canonical shared address
- `PATCH /api/company/addresses/:id`
  - update canonical shared address
- `DELETE /api/company/addresses/:id`
  - delete canonical shared address
- `POST /api/company/addresses/:id/set-default`
  - set caller's `defaultCompanyAddressId` to selected shared address
- `POST /api/company/addresses/unset-default`
  - clear caller's `defaultCompanyAddressId`

Support/repair operations (internal/system):
- enqueue member fan-out sync
- run drift reconciliation for company/member address projections
- process `customers/update` webhook as controlled import trigger

## Data Model (Draft)

### Canonical table
- `companySharedAddress`
  - `id`
  - `companyId`
  - `label` (optional display label)
  - `line1`
  - `line2` (optional)
  - `postalCode`
  - `city`
  - `country`
  - `source` (`dashboard`, `checkout_import`)
  - `createdByMemberId`
  - `createdAt`
  - `updatedAt`

### Member preference field (practical option)
- Add nullable `defaultCompanyAddressId` on `companyMembership`
  - points to `companySharedAddress.id`
  - referenced address must belong to same `companyId` as membership
  - user-specific preference only (does not alter shared address catalog)
  - on referenced address delete: set to `null` automatically

### Projection mapping table
- `companySharedAddressProjection`
  - `companyAddressId`
  - `customerId`
  - `shopifyAddressId`
  - `syncState` (`in_sync`, `pending`, `failed`)
  - `lastSyncedAt`
  - `lastErrorCode` (optional)

## Deterministic Scenarios
1. Admin creates address in dashboard:
   - canonical write succeeds
   - eligible members eventually converge via fan-out sync

2. Member is `inactive`:
   - still receives address sync to preserve company-consistent address set

3. Member is pending:
   - does not receive shared-address sync

4. Pending member becomes active:
   - clean-slate: delete all Shopify addresses
   - inherit full canonical shared set from app DB

5. External Shopify address add/edit by customer:
   - for eligible member, address can be imported into canonical set
   - imported address is deduplicated and tagged `source=checkout_import`
   - fan-out sync propagates to other eligible members

6. User selects default shared address:
   - update only that member's `defaultCompanyAddressId`
   - no change to shared address catalog
   - only one default is allowed per member at a time
   - setting a new default replaces previous default atomically

7. Shared address is deleted:
   - delete canonical address
   - clear `defaultCompanyAddressId` for members referencing deleted address

8. Member from same company updates/deletes/creates address:
   - allowed when membership status is `active`
   - forbidden for pending and inactive memberships

## Reliability Rules
- Dashboard command path (create/update/delete) is fail-closed for canonical persistence:
  - if canonical DB write or durable sync-intent persistence fails, operation fails
  - return success only after both canonical write and sync-intent persistence are committed
- Shopify projection fan-out is asynchronous and repairable through retry/reconciliation.
- Canonical DB writes are authoritative for target state and must not depend on immediate projection success.
- Projection failures must produce retryable jobs and reconciliation markers.
- Retry strategy should follow platform baseline backoff/jitter policy.
- Convergence is required outcome; temporary drift is allowed but must be repairable.

## Security Rules
- All dashboard address operations are company-scoped and server-authorized.
- Address mutation operations require membership status `active`.
- No cross-company address leakage.
- UI checks are not a security boundary.

## UI Contract (MVP)
1. Create form:
   - include a checkbox: `Set as my default delivery address (user-specific)`
   - checkbox only affects caller's `defaultCompanyAddressId`
2. Edit form:
   - must not include default-address controls
3. Address table:
   - include one default checkbox column for current user preference
   - checking a row sets it as default for current user
   - unchecking current default clears default (`null`)
   - only one row can be checked at a time for each user

## Error Contract Alignment
Use existing taxonomy from `docs/06-error-handling-and-reliability.md`:
- `VALIDATION_FAILED`
- `AUTH_*`
- `STATE_CONFLICT`
- `SHOPIFY_*`
- `INFRA_*`
- `SYNC_*` (including reconciliation/drift signals)

## Dependencies Before Backend Implementation
1. Onboarding status model finalized and implemented:
   - `pending_user_acceptance`
   - `pending_admin_approval`
   - `active`
   - `inactive`
2. Member activation transition hook available to run pending->active clean-slate inherit sync.
3. Background sync/reconciliation pipeline path accepted for address projection convergence.
4. `customers/update` webhook subscription and route handler available for controlled import trigger.
5. Shared Shopify sync foundation is production-ready and reusable across domains:
   - hard-sync orchestration pattern for fail-closed command paths
   - durable sync-intent persistence (outbox/job) before command success
   - standard retry/reconciliation worker contract and observability
   - reusable primitives documented to avoid one-off sync implementations per feature

## Open Decisions
1. Whether `inactive` members should keep receiving sync forever or only until explicit offboarding.
2. Max shared addresses per company (if any).
3. Country normalization/validation strictness for MVP.
4. Default fallback behavior when member default is cleared (null vs company primary).
5. Whether external checkout import dedup should use strict equality only or also fuzzy matching.

## Recommended Implementation Order
1. Finalize shared sync foundation contract (hard-sync + outbox + retry/reconciliation primitives).
2. Finalize canonical + projection schema.
3. Implement CRUD APIs on canonical shared addresses.
4. Implement fan-out sync workers for `active`/`inactive`.
5. Implement pending->active clean-slate inherit flow.
6. Add drift detection/reconciliation and retry observability.
7. Add scenario tests (pending exclusion, inactive inclusion, external drift convergence).

