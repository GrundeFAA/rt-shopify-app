# Validation Standard (Zod)

## Purpose
Define a single validation approach for request input, auth context, token claims, webhook payloads, and Shopify API payload mapping.

## Scope
This standard applies to:
- App Proxy entry route validation
- Iframe API route input validation
- Auth/session claim validation
- Webhook payload validation
- Shopify response parsing before domain mapping

## Library Decision
- Use `zod` as the primary runtime validation library.
- Prefer schema-first validation for every external boundary.

## Validation Boundaries (Required)

### Request Boundary
Validate all:
- path params
- query params
- headers used for auth context
- JSON body payloads

### Auth Boundary
Validate:
- app proxy signed parameter shape before trust
- iframe token claims (`customerId`, `companyId`, `role`, `exp`, `iat`)
- resolved auth context object used by services

### Integration Boundary
Validate:
- incoming webhook payloads
- Shopify API responses before writing app DB records

### Configuration Boundary
Validate environment variables at process startup.

## Parse Strategy
- Use `safeParse` in route handlers and integration adapters
- Convert validation failures to `VALIDATION_FAILED` response contract
- Use `parse` only in places where throwing is intentional and centrally handled

## Error Mapping
Validation failures must map to:
- `code`: `VALIDATION_FAILED`
- `retryable`: `false`
- `details`: structured field-level issues
- HTTP status: `400`

Auth-context shape failures map to auth codes (not generic validation) when applicable:
- `AUTH_INVALID_PROXY_SIGNATURE`
- `AUTH_INVALID_IFRAME_SESSION`

## Schema Location Convention
- Module-local schemas:
  - `app/modules/<module>/schemas.ts`
- Shared contracts:
  - `app/contracts/<domain>.schema.ts`
- Integration schemas:
  - `app/infrastructure/shopify-gateways/schemas/*`
  - `app/modules/webhooks/schemas/*`

## Naming Convention
- Input schemas: `<Action>NameInputSchema`
- Output schemas: `<Action>NameOutputSchema`
- Context schemas: `<Context>NameSchema`
- Token schemas: `<Token>NameClaimsSchema`

## Service Layer Rule
Application services should receive already-validated input objects.
If service-level invariants are needed, validate with dedicated domain schemas before state changes.

## Webhook and Sync Rule
No webhook or Shopify API payload may be persisted without schema validation and mapping.

## Testing Requirements
- Unit tests for each schema (valid + invalid examples)
- Contract tests for high-risk endpoints and webhook handlers
- Regression tests for changed schemas that affect sync-critical entities

## MVP Acceptance Criteria
- Every API route validates input using zod
- Auth context and token claims are zod-validated
- Shopify payloads are zod-validated before persistence
- Validation errors follow the standard error response contract
