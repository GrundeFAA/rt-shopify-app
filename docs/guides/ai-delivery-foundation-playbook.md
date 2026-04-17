# AI Delivery Foundation Playbook (Project-Agnostic)

## Purpose
This playbook explains how to set up a reusable AI-assisted engineering system for any software project. It defines:
- the minimum documentation foundation
- team roles (including Tech Lead as orchestrator and reviewer)
- prompt and review standards
- delivery workflow for parallel contributors (human or AI)
- quality gates and governance rules

Use this as a starting baseline, then adapt domain details for each new product.

## Goals and non-goals
### Goals
- Create consistent execution quality across tasks and contributors.
- Reduce ambiguity in prompts, handoffs, and acceptance decisions.
- Protect architecture boundaries and product reliability.
- Enable parallel delivery without file ownership collisions.
- Make progress and quality auditable over time.

### Non-goals
- This playbook does not define your product architecture itself.
- This playbook does not replace technical design docs for major features.
- This playbook does not force one programming language or framework.

## System overview
At a high level, the system has five layers:
1. **Foundation docs**: stable rules, contracts, and standards.
2. **Roles**: clear ownership and accountabilities per work package.
3. **Prompt protocol**: structured task assignment with boundaries and required outputs.
4. **Review protocol**: risk-first review and explicit accept/reject criteria.
5. **Progress ledger**: continuous status updates tied to goals/work packages.

If one layer is missing, quality and predictability drop quickly.

## Step 1: Create the minimum documentation foundation
Create these files first in every new project.

### 1) Context and goals
- `docs/01-project-context.md`
- `docs/02-product-goals-and-scope.md`

Must answer:
- who the users are
- what outcomes matter
- what is explicitly out of scope for this phase

### 2) Architecture and boundaries
- `docs/03-system-architecture.md`
- `docs/04-module-boundaries.md`

Must answer:
- major components and data flow
- ownership boundaries between layers/modules
- forbidden coupling patterns

### 3) Reliability and error handling
- `docs/05-reliability-and-error-handling.md`

Must answer:
- canonical error taxonomy
- retry/idempotency expectations
- fail-open vs fail-closed decisions per workflow type

### 4) Validation and contracts
- `docs/06-validation-and-schema-standards.md`

Must answer:
- where input validation is mandatory
- schema naming conventions
- how contract changes are versioned and reviewed

### 5) Engineering guidelines
- `docs/guides/engineering-guidelines.md`

Must answer:
- layering rules and forbidden shortcuts
- helper/utility extraction standards
- testing and merge quality gates

### 6) Role definitions
- `docs/guides/roles/role-architect-tech-lead.md`
- `docs/guides/roles/role-backend-platform-agent.md`
- `docs/guides/roles/role-frontend-embedded-agent.md`
- `docs/guides/roles/role-quality-devex-agent.md`

Must answer:
- mission, responsibilities, and boundaries per role
- acceptance criteria for role output

### 7) Orchestration runbook
- `docs/runbooks/parallel-agent-delivery-model.md`

Must answer:
- how work is split, assigned, reviewed, and accepted
- conflict and escalation protocol

## Step 2: Define architecture guardrails
Your engineering guideline should include strict guardrails such as:

- **Layer boundaries**: for example `Transport -> Application -> Persistence/Integration`.
- **Single source of truth**: one owner system per critical field/record.
- **Boundary validation**: all external input validated before use.
- **Typed errors**: predictable error categories with stable response shape.
- **No hidden orchestration**: route/controller files stay thin; business logic lives in application layer.

When guardrails are explicit, reviews become objective rather than style debates.

## Step 3: Define the Tech Lead role as the orchestration authority
The Tech Lead role is central to system quality.

### Core responsibilities
- Decompose goals into small, isolated work packages.
- Assign ownership with non-overlapping write scope.
- Generate high-quality prompts with explicit constraints.
- Review outcomes with risk-first mindset.
- Accept/reject packages based on predefined criteria.
- Keep progress ledger accurate and current.

### What the Tech Lead should not do
- Do not delegate tasks with vague prompts ("implement feature X").
- Do not allow overlapping ownership in parallel without sequencing.
- Do not accept changes without verification evidence.
- Do not skip architecture/boundary checks because tests passed.

## Step 4: Standardize work package design
Each work package should be:
- small enough to complete in one focused cycle
- owned by exactly one role
- linked to specific files/modules
- testable with concrete verification steps
- traceable in progress docs

Recommended package size:
- 1-4 files for routine tasks
- up to 8 files only when tightly related and low risk

If a task spans many modules and concerns, split it first.

## Step 5: Adopt a strict prompt standard
Every assignment prompt should include the same sections.

### Mandatory prompt sections
1. Role identity and role doc
2. Relevant context docs
3. Exact in-scope tasks
4. Explicit out-of-scope constraints
5. File ownership (allowed and forbidden paths)
6. Verification requirements
7. Progress update requirement
8. Required response format

### Prompt quality rules
- Write implementation-specific instructions, not generic outcomes.
- Include known failure modes and pitfalls to avoid.
- State must-pass checks for handoff acceptance.
- Require concrete evidence for verification (commands and result).

## Step 6: Standardize response and handoff format
Require all contributors to use one response shape:

```md
Role: <role>
Work Package: <id/title>
Status: <DONE | PARTIAL | BLOCKED>

What changed:
- <bullet>
- <bullet>

Files changed:
- `<path>`
- `<path>`

Verification:
- <command/check>
- <result>

Progress update:
- Updated `<progress-doc-path>` section `<role/work-package>`

Risks/Blockers:
- <none or explicit blocker>

Suggested next step:
- <handoff target + reason>
```

Uniform handoffs reduce review time and make blockers visible.

## Step 7: Run the orchestration loop
Use this loop continuously:

1. Tech Lead proposes next cycle and safe parallelization.
2. Tech Lead sends structured prompt(s).
3. Contributors execute and report in standard format.
4. Tech Lead performs risk-first review.
5. Tech Lead marks each package as accepted, conditional, or rejected.
6. Progress ledger is updated.
7. Next cycle is planned.

Rules:
- No new package prompts while current cycle is awaiting review (unless explicitly agreed).
- If ownership conflict appears, stop and resequence.
- No package is "done" until ledger and verification are complete.

## Step 8: Make review risk-first and architecture-aware
Review order should be:
1. correctness and regressions
2. architecture boundary adherence
3. validation and error handling standards
4. test quality and coverage gaps
5. maintainability/readability

### Review checklist (minimum)
- Does this change violate layer boundaries?
- Are contracts validated at all external boundaries?
- Are errors mapped to the standard taxonomy/shape?
- Is ownership/source-of-truth unchanged or explicitly migrated?
- Are tests appropriate for changed behavior?
- Is there hidden coupling introduced for convenience?

## Step 9: Add quality gates before merge
Set mandatory merge gates in CI and team policy:

- Static checks (`lint`, `typecheck`, format consistency)
- Relevant automated tests for touched modules
- Contract/schema checks where applicable
- Optional smoke/integration tests for high-risk changes

PR template should require:
- scope and non-goals
- architecture impact statement
- test evidence
- risk notes and rollback considerations

## Step 10: Implement file ownership and non-interference rules
Parallel work only succeeds with explicit ownership rules.

### Non-interference rules
1. One package has one owner role.
2. Shared files need explicit sequencing approval.
3. Active package owners do not modify each other's files.
4. If collision is discovered, mark `BLOCKED` and escalate.
5. Integrations happen only after both sides are reviewed.

### Practical ownership setup
- Keep an ownership map in runbook or goal progress docs.
- Use path globs for allowed/forbidden scope.
- Update ownership map when module structure changes.

## Step 11: Require progress ledger updates
Maintain one progress doc per goal/epic, for example:
- `docs/specs/goal-<n>-progress.md`

Each package entry should include:
- status
- owner role
- files changed
- verification evidence
- blockers/risks
- acceptance decision

Without this ledger, parallel delivery becomes opaque and hard to audit.

## Step 12: Define exception and escalation policy
When normal flow cannot continue, use explicit statuses:
- `BLOCKED`: ownership conflict, missing dependency, missing context
- `PARTIAL`: safe subset delivered, remainder clearly listed
- `REJECTED`: fails acceptance criteria

Escalation protocol:
1. state blocker clearly
2. list what was attempted
3. propose 1-2 resolution options
4. wait for sequencing decision

## Step 13: Bootstrap templates for new projects
Create these templates before feature work starts:

- `docs/templates/work-package-prompt-template.md`
- `docs/templates/work-package-response-template.md`
- `docs/templates/review-checklist-template.md`
- `docs/templates/progress-ledger-template.md`

This removes setup friction and improves consistency from day one.

## Suggested default folder structure
Use a structure that keeps docs discoverable:

```text
docs/
  01-project-context.md
  02-product-goals-and-scope.md
  03-system-architecture.md
  04-module-boundaries.md
  05-reliability-and-error-handling.md
  06-validation-and-schema-standards.md
  guides/
    engineering-guidelines.md
    roles/
      role-architect-tech-lead.md
      role-backend-platform-agent.md
      role-frontend-embedded-agent.md
      role-quality-devex-agent.md
  runbooks/
    parallel-agent-delivery-model.md
  specs/
    goal-1-progress.md
    goal-2-progress.md
  templates/
    work-package-prompt-template.md
    work-package-response-template.md
    review-checklist-template.md
    progress-ledger-template.md
```

## Example Tech Lead assignment prompt (general)
```md
You are the <ROLE NAME> for this project.
Act according to: `docs/guides/roles/role-<role>.md`.

Relevant docs:
- `docs/03-system-architecture.md`
- `docs/04-module-boundaries.md`
- `docs/05-reliability-and-error-handling.md`
- `docs/06-validation-and-schema-standards.md`
- `docs/guides/engineering-guidelines.md`

Work package: <ID and title>

Tasks:
1. <task>
2. <task>

Out of scope:
- <constraint>

Implementation guidance:
- Recommended approach:
  - <stepwise approach>
- Pitfalls to avoid:
  - <risk>
- Must-pass checks:
  - <boundary/contract/error checks>
- Verification focus:
  - <tests/manual checks>

File ownership:
- Allowed:
  - <path/glob>
- Do not edit:
  - <path/glob>

Progress requirements:
- Update `docs/specs/goal-<n>-progress.md` with status, files, verification, blockers.

Response requirements:
- Use the standard response template from `docs/runbooks/parallel-agent-delivery-model.md`.
- If ownership conflict appears, return `BLOCKED`.
```

## Governance model and cadence
Recommended recurring rituals:
- **Daily**: quick orchestration sync (active packages, blockers, resequencing).
- **Per package**: risk-first review and acceptance decision.
- **Weekly**: architecture drift and prompt quality review.
- **Per milestone**: update standards docs based on lessons learned.

Metrics to track:
- package cycle time
- rejection rate at review
- blocker frequency by cause
- defect escape rate after merge
- percentage of packages with complete verification evidence

## Anti-patterns to avoid
- vague prompts without boundaries
- parallel assignments with overlapping file ownership
- accepting work based on "looks fine" instead of checks
- skipping progress ledger updates
- undocumented exceptions to architecture rules
- moving business logic into transport/UI layer for speed

## Adoption plan for a new project (first 2 weeks)
### Days 1-2
- Write context, goals, architecture, reliability, and validation docs.
- Create role docs and runbook.

### Days 3-4
- Set templates and PR checklist.
- Define initial ownership map by module/path.

### Days 5-7
- Execute first 3-5 work packages using full protocol.
- Run retrospective on prompt quality and review findings.

### Week 2
- Refine rules based on real frictions.
- Add CI gates and strengthen verification requirements.
- Freeze baseline standards and start scaling package throughput.

## Definition of done for this foundation
You can consider the foundation "ready" when:
- all minimum docs exist and are internally consistent
- role boundaries are explicit and used in practice
- assignment prompts follow one standard template
- review decisions are criteria-based and auditable
- progress ledger is active and current
- merge gates are enforced in CI/team policy

---
If you only implement one thing first, implement the Tech Lead prompt/review system with explicit ownership boundaries. It delivers the biggest immediate quality gain and makes all later scaling easier.
