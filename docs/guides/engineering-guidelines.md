# Engineering Guidelines and Codebase Structure

## Purpose
This document defines how engineers structure code and make design decisions in this repository so we stay aligned, move fast, and avoid architectural drift.

It complements these foundation docs:
- `docs/01-company-dashboard-context.md`
- `docs/03-auth-and-authorization-contract.md`
- `docs/05-api-layer-backend-architecture.md`
- `docs/06-error-handling-and-reliability.md`
- `docs/07-validation-standard-zod.md`
- `docs/08-company-dashboard-mvp-requirements.md`
- `docs/09-customer-onboarding-webhook-flow.md`

## Engineering Principles
1. **Security first, fail closed**
   - Never trust raw client identifiers for authorization.
   - Auth and permission checks are enforced server-side.

2. **Separation of concerns over convenience**
   - Route handlers, services, repositories, and gateways each have one responsibility.
   - Do not blur boundaries to reduce short-term code duplication.

3. **DRY, but only at the right level**
   - Duplicate a small amount of code if shared abstraction would couple unrelated domains.
   - Extract only when behavior is truly shared and stable.

4. **Locality over premature generalization**
   - Keep logic close to the module that owns it.
   - Introduce shared utilities only after at least two clear production use-cases.

5. **Explicit contracts at boundaries**
   - Validate all external input with zod.
   - Use typed errors and the standard API error shape.

6. **Single source of truth per field**
   - Follow ownership rules for app DB vs Shopify-managed data.
   - Do not introduce hidden dual-write flows.

## Required Layering Rules
The required interaction pattern is:

`Route Handler -> Application Service -> (Repository + Shopify Gateway)`

### Route handlers
- Validate request input, auth context, and token claims.
- Perform coarse auth checks (authenticated + membership status).
- Call exactly one application service per primary action.
- Return response DTOs and map typed errors to standard API responses.

### Application services
- Own use-case orchestration and transaction boundaries.
- Enforce authoritative role/permission checks.
- Coordinate repository writes, gateway calls, and outbox enqueueing.
- Contain business decisions, not transport details.

### Repositories
- App DB access only.
- No Shopify API calls.
- No orchestration logic.

### Shopify gateways
- Shopify API access only.
- Normalize Shopify errors to typed dependency errors.
- No direct app DB writes.

### Forbidden patterns
- Repository calling Shopify.
- Gateway writing app DB.
- Route handler orchestrating repository + gateway directly.
- Business rules hidden in React components.

## DRY vs Separation of Concerns Decision Framework
Use this checklist before extracting shared code:

1. Is the repeated logic in the **same domain** and **same layer**?
   - If no: do not share yet.
2. Are there at least two real call sites with matching lifecycle and change cadence?
   - If no: keep local.
3. Would extraction reduce cognitive load (not just line count)?
   - If no: keep local.
4. Can the shared API be named clearly without domain leakage?
   - If no: keep local.
5. Do tests become simpler and more stable after extraction?
   - If no: keep local.

Default rule: prefer **small, intentional duplication** over a wrong abstraction.

## When to Split Files
Split a file when one or more of these are true:
- It has more than one reason to change (mixed responsibilities).
- It mixes layers (for example route parsing + domain logic + persistence).
- It is difficult to navigate in normal review (roughly >250-300 lines or multiple unrelated exports).
- The file has 3+ top-level concepts (for example schema + mapper + service + formatter).
- Test setup repeatedly mocks unrelated behavior from the same file.

Do not split only to hit an arbitrary line limit if cohesion is still high.

## Helper and Utility Rules
### Module-local helpers (default)
Create helper files inside the module when logic is:
- Domain-specific (company/member/order onboarding semantics).
- Used only by one module or use-case family.
- Likely to evolve with that module.

Example location:
- `app/modules/company/helpers/*`
- `app/modules/onboarding/helpers/*`

### Shared helpers (strict)
Promote to shared only when:
- Used by at least two modules.
- Free of domain-specific assumptions.
- API is stable and naming is generic.

Allowed shared categories:
- `app/shared/errors/*` (typed errors and mapping helpers)
- `app/shared/result/*` (result wrappers if used)
- `app/shared/dates/*` (pure date formatting/parsing utilities)
- `app/shared/security/*` (signature/timing-safe helpers)

Never place business authorization logic in shared generic utils.

## Refactor Triggers
Refactor before adding more features when any trigger is hit:
- Repeated bug class appears in the same area twice.
- A use-case requires touching 4+ files across unrelated directories.
- A service has grown into multiple independent workflows.
- New feature requires bypassing architecture rules to fit.
- Error handling is inconsistent with the standard taxonomy.
- Validation is missing or duplicated inconsistently at boundaries.

Refactor scope should be incremental:
- First isolate behavior with tests.
- Move one seam at a time (schema, mapper, service extraction).
- Keep public contracts stable during refactor.

## Target Folder Structure
Adopt the following structure as the feature set grows:

```text
app/
  routes/                                 # React Router route modules only
    apps.dashboard.tsx                    # App proxy shell route example
    api.company.members.tsx               # API route example

  modules/
    auth/
      services/
      schemas.ts
      permissions.ts
      types.ts
    company/
      services/
      repositories/
      mappers/
      helpers/
      schemas.ts
      types.ts
    dashboard/
      services/
      dto.ts
      schemas.ts
    onboarding/
      services/
      schemas.ts
      note-parser.ts
    webhooks/
      handlers/
      schemas/
      services/
    sync/
      services/
      workers/
      outbox/
      reconciliation/

  infrastructure/
    db/
      prisma-client.server.ts
    repositories/                         # cross-module repository implementations
    shopify-gateways/
      schemas/
      mappers/
    jobs/
      workers/
      scheduler/

  contracts/                              # cross-module zod contracts
  shared/                                 # generic cross-module utilities only
```

Notes:
- Keep route files thin and move business logic into modules.
- Keep domain ownership obvious from file path.
- Avoid deep nesting beyond what improves discoverability.

## Naming Conventions
- Services: `<Verb><Entity>Service` (for example `GetDashboardSummaryService`)
- Repositories: `<Entity>Repository`
- Gateways: `Shopify<Entity>Gateway`
- Schemas: follow `docs/07-validation-standard-zod.md`
  - `<Action>InputSchema`
  - `<Action>OutputSchema`
  - `<Token>ClaimsSchema`
- Route handlers should map to action/use-case names, not implementation details.

## Validation and Error Standards (Mandatory)
- Every external boundary uses zod validation.
- Route handlers use `safeParse` and return `VALIDATION_FAILED` on invalid input.
- Auth-shape failures map to auth error codes, not generic validation codes.
- Services throw typed domain/dependency/internal errors only.
- API responses follow the standard error shape (`code`, `message`, `requestId`, `retryable`, `details`).

## Frontend and UI Isolation Rules
- App proxy route serves a minimal shell and iframe only.
- Dashboard UI, CSS, and JS live inside iframe app.
- No storefront/theme CSS imported into dashboard iframe app.
- React components must not perform authorization decisions; they consume authorized API results.

## Testing and Quality Gates
Minimum expectations for all non-trivial changes:
- Unit tests for new service logic and schema validation.
- Integration tests for high-risk routes (auth, membership, onboarding, sync).
- Idempotency tests for webhook and retryable sync flows.
- Regression tests for changed contracts or ownership rules.

Before merge:
- `npm run lint`
- `npm run typecheck`
- Relevant tests for changed modules

## Pull Request Checklist
Each PR should answer:
1. Which layer is changed and why?
2. Are boundaries preserved (route/service/repository/gateway)?
3. Is zod validation present at every affected boundary?
4. Are typed errors mapped to standard API responses?
5. Is data ownership (Shopify vs app DB) unchanged or explicitly updated?
6. Is this extraction a real shared abstraction or premature DRY?
7. What tests prove the behavior?

## Team Working Agreement
- Prefer clarity and explicitness over clever abstractions.
- Keep module boundaries strict, especially around auth and sync.
- Record meaningful architecture changes by updating docs in `docs/`.
- If a change conflicts with these rules, raise it early in PR description and propose an explicit exception.

