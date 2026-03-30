# Documentation Structure and Naming

## Why this exists
`docs/01-09` define the current project foundation (scope, architecture, contracts, and MVP behavior).  
New documents should not continue numeric sequencing by default.

## Documentation taxonomy
Use purpose-based naming for all new docs:

- `docs/guides/*`
  - Practical engineering guidance for implementation and team alignment.
  - Role-specific guidance lives in `docs/guides/roles/*`.
- `docs/specs/*`
  - Feature or domain specifications that define behavior and acceptance criteria.
  - Goal progress ledgers live in `docs/specs/goal-*-progress.md`.
- `docs/runbooks/*`
  - Operational playbooks for incidents, deploys, migrations, and support.
- `docs/adrs/*`
  - Architecture Decision Records for meaningful technical decisions and tradeoffs.

## Current baseline (foundation docs)
The numbered docs remain the current foundation set:

- `docs/01-company-dashboard-context.md`
- `docs/02-embedding-options-non-plus.md`
- `docs/03-auth-and-authorization-contract.md`
- `docs/04-frontend-isolation-strategy.md`
- `docs/05-api-layer-backend-architecture.md`
- `docs/06-error-handling-and-reliability.md`
- `docs/07-validation-standard-zod.md`
- `docs/08-company-dashboard-mvp-requirements.md`
- `docs/09-customer-onboarding-webhook-flow.md`

## Naming rules for new docs
- Do not add new top-level numbered docs unless we intentionally publish a new baseline set.
- Use clear kebab-case names based on purpose, for example:
  - `docs/guides/engineering-guidelines.md`
  - `docs/specs/company-member-activation.md`
  - `docs/runbooks/onboarding-webhook-recovery.md`
  - `docs/adrs/2026-03-30-dashboard-auth-token-strategy.md`

## Updating docs in PRs
When code changes alter behavior or architecture:
- Update the relevant foundation/spec doc.
- If implementation guidance changed, update `docs/guides/engineering-guidelines.md`.
- If a major architecture decision changed, add an ADR in `docs/adrs/`.

