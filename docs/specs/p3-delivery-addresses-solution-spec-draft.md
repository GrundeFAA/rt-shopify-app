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
- user-managed default delivery address preference

## Core Decisions (Locked Draft)
1. App DB is canonical source of truth for company addresses with typed roles.
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
6. Canonical address roles are:
   - `post` (exactly one per company, edited from company info section)
   - `delivery` (shared company delivery catalog)
7. In company context, delivery addresses are company-owned (not personal).
8. Controlled exception: external Shopify address changes from eligible members may be imported into canonical `delivery` addresses.
9. Webhook import must never create or overwrite canonical `post` address.
10. Shopify default address for synced members is always canonical `post` address.
11. MVP has no member-specific default delivery address preference.
12. "Canonical" defines authoritative target state, not permission to accept partial success writes.
13. Address CRUD in dashboard is allowed for all `active` company members.
14. Dashboard command success requires canonical write + durable sync intent persistence (enqueue/outbox); no success response on partial command persistence.
15. Canonical address delete for MVP is hard delete for `delivery` addresses.

## Source-Of-Truth and Projection Model

### Canonical store
- `CompanySharedAddress` records in app DB.

### Projection target
- Shopify customer addresses for each eligible member.

### Projection behavior
- Fan-out sync writes canonical address set to each eligible member.
- Canonical `post` address is always projected first and marked as default in Shopify.
- Projection must converge to canonical set after retries/reconciliation.

## Member Status Behavior Matrix
- `active`: receives full shared address sync
- `inactive`: receives full shared address sync
- `pending_user_acceptance`: no sync
- `pending_admin_approval`: no sync

## Primary Flows

### A) Create shared address in dashboard
1. Validate request and authorize `active` company membership.
2. Write address to app DB canonical table + persist sync intent transactionally.
3. Execute projection sync to all eligible members (`active`, `inactive`) before HTTP success.
4. If projection sync fails, compensate canonical write (rollback payload) and return failure.
5. Run best-effort recovery sync after compensation to reduce temporary projection drift.

### B) Update shared address in dashboard
1. Validate request and authorize `active` company membership.
2. Update canonical app DB address + persist sync intent transactionally.
3. Execute fan-out update to all eligible members.
4. If projection sync fails, compensate canonical write and return failure.
5. Edit form must not include default-address controls.

### C) Delete shared address in dashboard
1. Validate request and authorize `active` company membership.
2. Delete canonical address from app DB + persist sync intent transactionally.
3. Execute fan-out deletion from all eligible members.
4. If projection sync fails, compensate canonical delete and return failure.
5. Reconcile until mirrors converge.

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
  - enqueue fan-out sync to all eligible members
- If member is pending, ignore import for canonical set.
- App DB remains canonical after import; subsequent sync/reconcile converges mirrors to canonical set.

## API Surface (Draft)
- `GET /api/company/addresses`
  - list canonical shared addresses for current company
- `POST /api/company/addresses`
  - create canonical shared address
- `PATCH /api/company/addresses/:id`
  - update canonical shared address
- `DELETE /api/company/addresses/:id`
  - delete canonical shared address

Support/repair operations (internal/system):
- enqueue member fan-out sync
- run drift reconciliation for company/member address projections
- process `customers/update` webhook as controlled import trigger

## Data Model (Draft)

### Canonical table
- `companySharedAddress`
  - `id`
  - `companyId`
  - `addressType` (`post`, `delivery`)
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

Invariants:
- exactly one `post` address per `companyId`
- `delivery` addresses are 0..n per `companyId`

### Projection intent table
- `companyAddressSyncIntent`
  - `id`
  - `companyId`
  - `companyAddressId` (nullable for reconcile/recovery intents)
  - `operation` (`ADDRESS_CREATE`, `ADDRESS_UPDATE`, `ADDRESS_DELETE`)
  - `status` (`pending`, `processing`, `succeeded`, `failed`)
  - `recipientCustomerIds` (JSON array)
  - `payload` (JSON metadata, rollback payload, trigger/recovery context)
  - `createdAt`
  - `updatedAt`

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
   - canonical `post` address is excluded from import candidates
   - fan-out sync propagates to other eligible members

6. Shared address is deleted:
   - delete canonical address
   - next sync converges mirrors to canonical set

7. Member from same company updates/deletes/creates address:
   - allowed when membership status is `active`
   - forbidden for pending and inactive memberships

## Reliability Rules
- Dashboard command path (create/update/delete) is fail-closed for canonical persistence:
  - if canonical DB write or durable sync-intent persistence fails, operation fails
  - return success only after both canonical write and sync-intent persistence are committed
- Dashboard command path executes immediate projection sync attempt before success response.
- If immediate projection fails:
  - canonical state is compensated/rolled back
  - operation returns `SYNC_WRITE_ABORTED`
  - best-effort recovery sync is executed to reduce drift
- Canonical DB writes are authoritative target state.
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
   - no default-address controls are shown
2. Edit form:
   - must not include default-address controls
3. Address table:
   - no per-user default selection controls are shown
   - `post` address is handled in company info flow and remains Shopify default during sync

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
4. Whether external checkout import dedup should use strict equality only or also fuzzy matching.

## Recommended Implementation Order
1. Finalize shared sync foundation contract (hard-sync + outbox + retry/reconciliation primitives).
2. Finalize canonical + projection schema.
3. Implement CRUD APIs on canonical shared addresses.
4. Implement fan-out sync workers for `active`/`inactive`.
5. Implement pending->active clean-slate inherit flow.
6. Add drift detection/reconciliation and retry observability.
7. Add scenario tests (pending exclusion, inactive inclusion, external drift convergence).

