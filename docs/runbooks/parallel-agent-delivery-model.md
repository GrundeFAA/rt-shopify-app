# Parallel Agent Delivery Model

## Purpose
Define how the Architect/Tech Lead coordinates parallel agents so work packages do not interfere and progress is auditable.

## Operating model
- Architect/Tech Lead decomposes each goal into isolated work packages.
- Each work package is assigned to exactly one role owner.
- Agents work in parallel only when file ownership does not overlap.
- Each agent reports using a standard response template.
- Each agent updates the goal progress doc after every work package.

## Orchestration loop (default)
1. Architect proposes next step and safe parallelization plan.
2. Architect sends prompt(s) in chat.
3. Architect waits for result(s) and reviews each one.
4. Architect records acceptance/review/block decision in progress ledger.
5. When all expected results in the cycle are reviewed, Architect proposes the next step.
6. Repeat.

Guardrails:
- Do not send additional prompts while waiting for current-cycle review unless user asks.
- Keep user approval in the loop before launching a new cycle.

## Architect quick-fix policy during review
The Architect/Tech Lead may perform quick, low-risk fixes directly during review to reduce cycle latency.

Permitted quick-fix categories:
- config/env/setup corrections
- small reliability or contract-alignment fixes
- docs/progress ledger consistency fixes
- minimal bug fixes that do not change package ownership model

Not permitted under quick-fix policy:
- broad feature implementation
- cross-module refactors
- large scope changes that should be delegated as explicit work packages

## Non-interference rules (mandatory)
1. One work package, one owner role.
2. Do not edit files owned by another active work package.
3. Shared files require explicit Architect approval and sequencing.
4. If overlap is discovered, stop and escalate in response output.
5. Never merge assumptions from another agent without reading its progress update.

## File ownership baseline for Goal 1
- Backend Platform Agent:
  - `app/modules/auth/*`
  - `app/modules/company/*`
  - `app/routes/api.*`
  - `app/infrastructure/shopify-gateways/*`
  - `app/modules/sync/*`
  - `app/modules/webhooks/*`
- Frontend Embedded Agent:
  - `extensions/account-company-dashboard/*`
  - customer account UI extension files and related UI behavior
- Quality and DevEx Agent:
  - tests, test fixtures, reliability checks, verification docs
  - setup docs/scripts/tooling config (`package.json` scripts, local setup docs)
- Architect/Tech Lead:
  - docs, acceptance criteria, orchestration prompts, sequencing decisions

If ownership conflict exists, Architect decides the integration sequence and temporary lock.

## Prompt structure (Architect -> Agent)
All role prompts must follow this structure:

1. **Role identity and context**
   - Tell agent who they are.
   - Link their role doc in `docs/guides/roles/*`.
   - Link relevant foundation/spec docs.
2. **Task**
   - Clear deliverables and boundaries.
   - Explicit file ownership and forbidden edits.
3. **Progress documentation**
   - Tell agent exactly where to update progress:
     - `docs/specs/goal-<n>-progress.md`
   - Require an update after each completed work package.
4. **Response format**
   - Require standard response template (below).
5. **Tech lead guidance**
   - Include a short "implementation guidance" section with recommended approach, critical pitfalls, and verification focus.
   - Guidance must be role-specific (backend vs frontend vs quality), not generic.

## Prompt location policy (mandatory)
- Orchestration prompts are sent in chat only.
- Do not create or store per-work-package prompt documents in `docs/`.
- Agents infer who they are from chat context, then read their own role doc for behavior and boundaries.

## Standard prompt template
```md
You are the <ROLE NAME> for this project.
Act according to: `docs/guides/roles/role-<role>.md`.

Relevant context docs:
- <doc path>
- <doc path>

Work package: <goal/work package id and title>

Tasks:
1. <task>
2. <task>
3. <task>

Implementation guidance (Tech Lead):
- Recommended approach:
  - <how to execute safely and incrementally>
- Pitfalls to avoid:
  - <known failure modes/regression risks>
- Must-pass checks before handoff:
  - <contract/layering/error/UX checks>
- Verification focus:
  - <specific tests/manual checks for this package>

File ownership:
- Allowed:
  - <path/glob>
- Do not edit:
  - <path/glob>

Progress update requirements:
- Update `docs/specs/goal-<n>-progress.md`
- Fill/update your role section for this work package:
  - status
  - files changed
  - blockers
  - verification

Response requirements:
- Use the response template from `docs/runbooks/parallel-agent-delivery-model.md`
- If ownership conflict appears, stop and report `BLOCKED`.
```

Role-specific guidance examples:
- Backend: transaction boundaries, sync/retry semantics, typed error mapping, boundary validation, focused service/webhook tests.
- Frontend: deterministic state transitions, API contract adherence, localization/accessibility constraints, runtime regression checks.

## Standard response template (Agent -> Architect)
```md
Role: <role>
Work Package: <id/title>
Status: <DONE | PARTIAL | BLOCKED>

What I changed:
- <bullet>
- <bullet>

Files changed:
- `<path>`
- `<path>`

Verification:
- <lint/test/manual verification done>
- <result>

Progress doc update:
- Updated `docs/specs/goal-<n>-progress.md` in section `<role>/<work package>`

Risks/Blockers:
- <none or explicit blocker>

Next handoff suggestion:
- <who should take next package and why>
```

## Progress ledger rules
- One progress doc per goal:
  - `docs/specs/goal-<n>-progress.md`
- Every role writes only in its own role section.
- Architect validates updates at the end of each package.
- No package is considered done until progress ledger is updated.

## Escalation rules
- **BLOCKED (ownership conflict):** stop and request resequencing.
- **BLOCKED (missing context):** request exact doc/contract reference.
- **PARTIAL:** deliver completed subset + explicit remaining tasks.

