# Parallel Agent Delivery Model

## Purpose
Define how the Architect and Tech Lead coordinates parallel work without file conflicts or architectural drift.

## Operating model
- Break work into isolated packages with one clear owner.
- Run packages in parallel only when file ownership does not overlap.
- Require each package to return verification evidence, changed files, and blockers.
- Use progress docs only when the current effort actually needs them.

## Orchestration loop
1. Propose the next step and identify packages that can run safely in parallel.
2. Send prompts in chat.
3. Wait for results.
4. Review each result.
5. Accept, reject, or resequence based on findings.
6. Repeat.

Guardrails:
- Do not start a new parallel cycle before resolving the current one unless the user asks.
- Keep the user in control of pacing.

## Architect quick-fix policy during review
Permitted quick fixes:
- small docs or setup corrections
- low-risk contract-alignment fixes
- minimal bug fixes that do not change package ownership

Not permitted:
- broad feature work
- cross-cutting refactors that deserve a dedicated package
- silent scope growth during review

## Non-interference rules
1. One work package, one owner role.
2. Do not edit files owned by another active package.
3. Shared files require explicit sequencing.
4. If overlap is discovered, stop and escalate.
5. Do not assume another agent's output is correct without reading it.

## File ownership baseline
- Backend Platform Agent:
  - `app/routes/api.*`
  - `app/routes/webhooks.*`
  - `app/modules/auth/*`
  - `app/modules/webhooks/*`
  - server-side feature modules tied to the package
- Frontend Embedded Agent:
  - `extensions/account-company-dashboard/*`
  - other extension files
  - embedded app UI files only when explicitly in scope
- Quality and DevEx Agent:
  - tests
  - setup docs
  - verification docs
  - tooling and script checks
- Architect and Tech Lead:
  - docs
  - package definitions
  - acceptance criteria
  - sequencing decisions

If ownership conflict exists, sequence the packages instead of parallelizing them.

## Prompt structure
All role prompts should include:
1. role identity and role doc path
2. relevant context docs
3. explicit tasks, boundaries, and forbidden edits
4. file ownership
5. progress update requirements when a progress doc exists
6. response format
7. verification expectations

## Standard prompt template
```md
You are the <ROLE NAME> for this project.
Act according to: `docs/guides/roles/role-<role>.md`.

Relevant context docs:
- <doc path>
- <doc path>

Work package: <title>

Tasks:
1. <task>
2. <task>

Implementation guidance:
- Recommended approach:
  - <safe incremental approach>
- Pitfalls to avoid:
  - <known failure modes>
- Must-pass checks:
  - <boundary/runtime/contract checks>
- Verification focus:
  - <tests/manual checks>

File ownership:
- Allowed:
  - <path/glob>
- Do not edit:
  - <path/glob>

Progress requirements:
- Update the relevant progress doc if one exists for this effort.

Response requirements:
- Use the standard response template from `docs/runbooks/parallel-agent-delivery-model.md`.
- If ownership conflict appears, return `BLOCKED`.
```

## Standard response template
```md
Role: <role>
Work Package: <title>
Status: <DONE | PARTIAL | BLOCKED>

What I changed:
- <bullet>
- <bullet>

Files changed:
- `<path>`
- `<path>`

Verification:
- <command or manual check>
- <result>

Progress doc update:
- <updated path or not applicable>

Risks or blockers:
- <none or explicit blocker>

Next handoff suggestion:
- <who should take next package and why>
```

## Escalation rules
- `BLOCKED`: ownership conflict, missing context, or external dependency prevents safe progress
- `PARTIAL`: a safe subset is complete and the remaining work is clearly described
