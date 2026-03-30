# Error Handling and Reliability

## Purpose
Define a consistent error-handling strategy that supports secure auth flows, stable UX, and low-drift sync between app DB and Shopify.

## Design Principles
- Fail closed on auth and signature validation errors
- Use typed, machine-readable errors across all backend layers
- Never leak internal stack traces or secrets to clients
- Treat sync as eventually consistent with bounded drift and automatic repair
- For workflows marked hard-sync, never return success on partial DB/Shopify completion

## Error Taxonomy

### Authentication and Authorization
- `AUTH_INVALID_PROXY_SIGNATURE`
- `AUTH_EXPIRED_PROXY_REQUEST`
- `AUTH_MISSING_CUSTOMER_CONTEXT`
- `AUTH_INVALID_IFRAME_SESSION`
- `AUTH_EXPIRED_IFRAME_SESSION`
- `AUTH_FORBIDDEN_ROLE`
- `AUTH_INACTIVE_MEMBERSHIP`

### Request and Domain Validation
- `VALIDATION_FAILED`
- `RESOURCE_NOT_FOUND`
- `STATE_CONFLICT`
- `ONBOARDING_NOTE_PARSE_FAILED`
- `ONBOARDING_COMPANY_MISMATCH`

### External Dependency (Shopify / Infrastructure)
- `SHOPIFY_RATE_LIMITED`
- `SHOPIFY_TEMPORARY_FAILURE`
- `SHOPIFY_USER_ERROR`
- `INFRA_TIMEOUT`
- `INFRA_UNAVAILABLE`

### Sync and Data Consistency
- `SYNC_ENQUEUE_FAILED`
- `SYNC_PROCESSING_FAILED`
- `SYNC_RETRY_EXHAUSTED`
- `SYNC_RECONCILIATION_MISMATCH`
- `SYNC_TAG_UPDATE_FAILED`
- `SYNC_WRITE_ABORTED`

### Internal
- `INTERNAL_ERROR`

## HTTP Mapping Guidelines
- `400`: validation and malformed requests
- `401`: unauthenticated or invalid session/signature
- `403`: authenticated but insufficient role
- `404`: resource not found in authorized scope
- `409`: state/version conflict
- `429`: rate limited (Shopify or app-level)
- `503`: temporary dependency failure
- `500`: unhandled internal error

## Standard API Error Response
All JSON API endpoints should return this error shape:

- `code`: stable machine-readable error code
- `message`: safe user-facing message
- `requestId`: request correlation ID for support
- `retryable`: boolean for client retry behavior
- `details`: optional validation/debug-safe metadata

Validation failures are defined by `docs/07-validation-standard-zod.md` and must map to `VALIDATION_FAILED` with field-level details.

## Layer-by-Layer Error Handling

### Route Handlers
- Validate request payload and auth context early
- Convert thrown typed errors to standard API response shape
- Generate/propagate `requestId` in all responses
- Use zod `safeParse` at request boundaries and map failures consistently

### Application Services
- Throw typed domain errors only
- Convert unknown infrastructure exceptions to typed internal/dependency errors
- Keep business-state transitions explicit and recoverable
- For hard-sync workflows, wrap DB writes in a transaction and abort/rollback on Shopify mirror failure

### Repositories
- Map DB-specific errors (unique constraints, not found, transaction conflicts) to domain-level error codes
- Do not return raw database errors directly

### Shopify Gateways
- Normalize Shopify API errors into typed dependency errors
- Mark retryability (`true` for transient transport/5xx/429 conditions, `false` for user-errors)
- Attach non-sensitive context for observability

## Reliability Patterns for Low Drift
- Outbox pattern for outbound sync operations
- Inbox/idempotency table for webhook dedupe
- Exponential backoff with jitter for retries
- Dead-letter handling after retry exhaustion
- Periodic reconciliation jobs to detect and repair drift

## Retry Policy (Baseline)
- Retry only retryable errors
- Suggested backoff schedule: `1s`, `5s`, `15s`, `60s`, `5m`
- Add jitter to avoid synchronized retry spikes
- Cap attempts and move to dead-letter state on exhaustion

## Security Failure Rules
- Invalid app proxy `signature`: reject request immediately
- Expired proxy timestamp: reject request
- Invalid/expired iframe session token: return unauthorized and require re-entry via proxy route
- Missing membership or insufficient role: return no-access/forbidden without exposing protected data

Webhook signature validation is a separate flow and uses Shopify HMAC header verification.

## Frontend Error UX Contract
- Show deterministic states:
  - `unauthorized`
  - `forbidden`
  - `temporarily_unavailable`
  - `sync_in_progress`
- Show retry controls only when `retryable = true`
- Display `requestId` in support/error view
- For `AUTH_INACTIVE_MEMBERSHIP`, redirect to pending-activation page with administrator contact guidance

## Observability and Alerting
Track and alert on:
- API error rate by `code`
- Shopify `429` and `5xx` rates
- Outbox queue backlog age
- Dead-letter event count
- Reconciliation mismatch count and repair success rate

## Incident Playbook (MVP)
1. Identify dominant error code and affected endpoint/service
2. Confirm whether failure is auth, dependency, or sync related
3. Check outbox backlog and dead-letter growth
4. Run targeted reconciliation for impacted entities
5. Verify recovery with error-rate and drift metrics
