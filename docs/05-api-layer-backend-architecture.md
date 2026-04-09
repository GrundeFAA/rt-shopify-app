# API Layer Backend Architecture

## Purpose
Define the backend structure for a low-drift sync model between app DB and Shopify, using clear separation of responsibilities.

## Core Rule
Application services orchestrate use-cases. Repositories and Shopify gateways do not orchestrate each other.

## Sync Consistency Policy (Current Decision)
- Company/postal profile address is app-local in MVP and has no Shopify sync path.
- For workflows that are explicitly marked as hard-sync, no partial success is accepted.

## Hard-Sync Orchestration Standard (Implemented Pattern)
For cross-boundary write flows that must remain strongly aligned (Shopify + app DB), use the hard-sync orchestration pattern:

- Shared orchestrator in `app/modules/sync/core/hard-sync-orchestrator.ts`
- One operation adapter per aggregate/domain, not per field-level action
- Keep aggregate adapters only for workflows that remain explicitly hard-sync in accepted MVP scope.

Execution contract:
1. Read current app DB snapshot.
2. Write required Shopify mirror state first.
3. Write app DB second.
4. If app DB write fails after Shopify success, compensate Shopify back to snapshot.
5. Return success only when final state is aligned.

Error contract for hard-sync:
- Shopify write failure: fail with stage `SYNC_STAGE_SHOPIFY_WRITE_FAILED` and do not persist app DB write.
- DB write failure with successful compensation: fail with `SYNC_WRITE_ABORTED` and stage `SYNC_STAGE_DB_WRITE_FAILED`.
- DB write failure with failed compensation: fail with `SYNC_RECONCILIATION_MISMATCH` and stage `SYNC_STAGE_COMPENSATION_FAILED`.

## Layer Responsibilities

### API Route Handlers
- Parse/validate request
- Resolve auth context (customer, company, role)
- Apply coarse middleware checks (authenticated and active membership)
- Call one application service
- Return response DTO
- Follow `docs/07-validation-standard-zod.md` for schema and parse rules

### Application Services (Use-Case Orchestrators)
- Own business workflow and transaction boundaries
- Enforce authoritative role/permission checks for the action
- Read/write internal data through repositories
- Call Shopify through gateways when needed
- Emit outbox events for async sync flows

Examples:
- `UpdateUserProfileService`
- `GetDashboardSummaryService`
- `SyncCustomerFromShopifyService`

### Internal Repositories (App DB Only)
- Encapsulate Prisma/data access for internal tables
- Never call Shopify API
- Return domain records to services

Examples:
- `UserRepository`
- `CompanyRepository`
- `MembershipRepository`
- `OutboxRepository`

### Shopify Gateways (Shopify API Only)
- Encapsulate Admin API calls and payload mapping
- Handle retry/backoff and Shopify-specific errors
- Never write directly to app DB

Examples:
- `ShopifyCustomerGateway`
- `ShopifyOrderGateway`

### Sync Workers
- Consume outbox events
- Execute Shopify sync operations via gateways
- Update sync state and retry metadata in app DB
- Process customer onboarding webhooks and membership/tag synchronization

## Interaction Pattern
`Route Handler -> Application Service -> (Repositories + Shopify Gateways)`

Not allowed:
- `Repository -> Shopify API`
- `Gateway -> App DB`
- `Route Handler -> Repository + Gateway orchestration directly`

## Update Flow Pattern (Example: `update user.something`)
1. Route handler authenticates request and applies coarse middleware checks
2. Route handler calls `UpdateUserSomethingService`
3. Service loads current internal user state via repository
4. Service applies ownership rule:
   - App-owned field with hard-sync requirement: execute the hard-sync orchestrator (Shopify write -> app DB write -> Shopify compensation on DB failure)
   - App-owned field without hard-sync requirement: write app DB, enqueue outbox push to Shopify if mirrored
   - Shopify-owned field: call Shopify gateway first, then mirror to app DB
5. Service returns updated response model

## Ownership Rules
- Every synced field must have one source of truth
- Avoid dual-write fields for MVP
- If dual-write is unavoidable, define explicit conflict policy

Current MVP ownership decisions:
- Shared company delivery addresses: app DB source of truth, fan-out synced to member customers in Shopify
- User primary address: individual user-owned data, not part of shared address sync fan-out
- Orders: Shopify source of truth, mirrored/indexed in app DB for company dashboard queries
- Member activation status: app DB source of truth; Shopify tags mirror verification state (`b2b`, `b2b-unverified`)
- Company onboarding note payload: temporary source used only during `customers/create`, then removed

## Sync Safety Patterns
- Outbox for outbound changes
- Inbox/idempotency tracking for inbound webhooks
- Reconciliation jobs for drift repair
- Sync state on mapped records (`in_sync`, `pending_push`, `pending_pull`, `failed`, `conflict`)
- Webhook onboarding parser for temporary customer note contract (`company_name`, `company_org_number`, `company_address_line1`, `company_address_line2`, `company_postal_code`, `company_city`)
- One-customer-to-one-company invariant enforcement in onboarding workflow

## Suggested Module Layout
- `app/modules/auth/*`
- `app/modules/company/*`
- `app/modules/dashboard/*`
- `app/modules/sync/*`
- `app/infrastructure/repositories/*`
- `app/infrastructure/shopify-gateways/*`
- `app/infrastructure/jobs/*`

## MVP Checklist
- Services orchestrate all mutating workflows
- Repositories are internal DB only
- Shopify API calls are gateway-only
- Outbox + worker path exists for async sync
- Reconciliation plan exists for critical entities
- Error taxonomy and standard API error contract are enforced across handlers/services/gateways
- Validation is enforced at every boundary using the zod standard
