# Engineering Guidelines and Codebase Structure

## Purpose
This document defines how engineers should structure code in the current Shopify-native app baseline.

Use it to keep the repo aligned around a simple rule set:

- Shopify owns company, location, contact, and metafield business data
- customer-facing UI lives in customer account extensions first
- server routes stay thin and delegate real logic into focused modules
- app database usage is limited to runtime and session persistence unless an explicit architecture decision says otherwise

## Architecture baseline

### Source of truth
- Shopify is the source of truth for B2B company data.
- Company settings, company users, locations, and related custom data should live on Shopify entities or Shopify-managed metafields.
- Do not recreate a parallel business record model in the app database without an explicit architecture decision.

### Primary surfaces
- `extensions/account-company-dashboard/` for customer account UX
- `app/routes/webhooks.*` for Shopify webhooks
- `app/routes/api.*` for app-owned HTTP endpoints such as app proxy handlers
- `app/modules/*` for focused server-side logic
- `app/shared/*` for generic reusable helpers only

## Engineering principles
1. **Security first**
   - Never trust client-provided identifiers for authorization.
   - Enforce authorization server-side or through Shopify-managed surface constraints.

2. **Thin edges, clear ownership**
   - Routes parse requests and return responses.
   - Module helpers and services own orchestration and business rules.
   - Shared utilities stay generic and focused.

3. **Shopify-native by default**
   - Reach for Shopify Admin API, Customer Account API, and metafields before inventing app-managed mirrors.
   - Add app-owned persistence only when Shopify cannot be the durable owner of the needed state.

4. **Locality over abstraction**
   - Keep logic close to the feature that owns it.
   - Extract shared helpers only after multiple real call sites prove the API.

5. **Explicit contracts**
   - Validate external input at boundaries.
   - Keep response and error shapes stable and easy to reason about.

## Required layering rules
The default interaction pattern is:

`Route handler -> module helper/service -> external boundary`

External boundaries include:
- Shopify Admin API clients
- Customer Account API helpers
- app proxy verification helpers
- Prisma and session persistence

### Route handlers
- Validate request shape, auth context, and required identifiers.
- Perform coarse access checks.
- Delegate non-trivial use-cases to a focused module function.
- Map result or error output back to HTTP responses.

### Module helpers and services
- Own orchestration and business decisions.
- Hide transport details from route handlers when that improves clarity.
- Keep side effects explicit and easy to test.

### Shared helpers
- Contain generic logic only.
- Stay free of company-specific business rules.
- Typical categories: security helpers, response helpers, formatting and parsing utilities.

### Forbidden patterns
- React components deciding authorization on their own.
- Route handlers growing into multi-step business workflows.
- Generic shared helpers that secretly encode one feature's business rules.
- Reintroducing app-managed mirrors of Shopify business data by default.

## When to split files
Split a file when one or more of these are true:
- it has more than one reason to change
- it mixes transport, business logic, and persistence concerns
- it is difficult to review without scrolling through unrelated exports
- test setup must mock unrelated behavior from the same file repeatedly

Do not split solely to satisfy an arbitrary line count.

## Shared code rules
### Module-local first
Create helpers within a module when logic is:
- domain-specific
- used by one feature family
- likely to evolve with that feature

### Promote to shared only when
- at least two modules need it
- the name is generic and honest
- the helper does not depend on feature-specific assumptions

Never place feature authorization logic in a generic shared utility.

## Suggested folder structure
Use the current repo shape as the baseline:

```text
app/
  routes/
    api.*.tsx
    webhooks.*.tsx
    app*.tsx

  modules/
    auth/
    webhooks/
    <feature>/

  contracts/
  shared/

extensions/
  account-company-dashboard/
```

Notes:
- Keep customer account UI in extensions unless there is a strong platform reason not to.
- Keep route files thin and put reusable logic in `app/modules/`.
- Prefer discoverable file paths over deep folder nesting.

## Naming conventions
- Services and helpers: name by action and domain, for example `loadCompanySettings` or `processCustomerCreateWebhook`
- Schemas: `<Action>InputSchema`, `<Action>PayloadSchema`, or similarly explicit names
- Route handlers: map to real surfaces and actions, not internal implementation details

## Validation and error handling
- Validate external input at boundaries.
- Fail closed on auth or signature problems.
- Use stable error codes and messages where consumers depend on them.
- Keep error mapping centralized when multiple routes share the same behavior.

## Frontend rules
- Customer-facing company UX belongs in customer account extensions first.
- Embedded admin UI should exist only for true admin workflows that cannot live in the customer account surface.
- UI components should render authorized data, not make authoritative permission decisions.
- Model loading, empty, error, and success states explicitly.

## Testing and verification
Minimum expectations for non-trivial changes:
- targeted unit tests when business logic is extracted
- route or integration coverage for risky webhook or app proxy behavior
- manual verification in the dev store for extension UX changes

Before handoff or merge:
- `npm run lint`
- `npm run typecheck`
- relevant tests for changed files or modules

## Pull request checklist
Each PR should answer:
1. What surface changed?
2. Is Shopify still the source of truth for the affected business data?
3. Are route boundaries still thin and clear?
4. Is input validation present where data enters the app?
5. Are new abstractions justified by more than one real use-case?
6. What verification proves the behavior?

## Team working agreement
- Prefer explicit, boring code over clever indirection.
- Document meaningful architecture changes in `docs/`.
- If a change needs app-owned persistence beyond runtime or session state, call that out explicitly in the PR.
