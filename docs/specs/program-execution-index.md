# Program Execution Index

## Purpose
Provide one clear execution hierarchy so planning and tracking are not split between conflicting naming schemes.

This index defines:
- how we name phases, goals, and work packages
- how legacy goal documents map into the new structure
- which phase/goal is currently active

## Naming Hierarchy (Canonical)
- **Phase** = timeline stage (for example `P1`, `P2`)
- **Goal** = objective inside a phase (for example `P2-G1`)
- **Work Package** = execution unit inside a goal (for example `P2-G1-WP-3`)

Canonical ID format:
- `P<phase>-G<goal>`
- `P<phase>-G<goal>-WP-<n>`

Example:
- `P2-G1` = first goal in Phase 2
- `P2-G1-WP-2` = second work package under that goal

## Legacy -> Canonical Mapping
These mappings preserve history without renaming old files.

- Legacy `Goal 1 - Embedded App Foundation`
  - Canonical: `P1-G1`
  - Progress file: `docs/specs/goal-1-progress.md`

- Legacy `Goal 2 - B2B Cart Context (Company info as order attributes)`
  - Canonical: `P1-G2`
  - Progress file: `docs/specs/goal-2-progress.md`

## Current Execution State
- Active roadmap stage: **Phase 3**
- Phase 3 starts with a strict sequential execution gate:
  1. Orders implementation
  2. Addresses implementation
  3. Users/onboarding implementation
- Movement between steps requires explicit user approval after live testing.

Reference: `docs/specs/program-roadmap.md`

## Tracking Rules Going Forward
1. New work should use canonical IDs (`P2-Gx-WP-y` and onward).
2. Keep legacy goal files unchanged for historical traceability.
3. When referencing old work in new docs/prompts, include both IDs when helpful:
   - example: `P1-G2 (legacy Goal 2)`
4. Progress boards must show canonical IDs for all new items.
5. Architect updates this index when a new phase starts.

## Tech Lead Prompting and Review Standard (Mandatory)
The Architect/Tech Lead is responsible for assigning work and producing execution-ready prompts for other roles.

Prompt requirements for each work package:
1. Include exact scope and non-goals for the specific package.
2. Include required references to governing docs (architecture, reliability, validation, MVP requirements, active spec).
3. Include implementation guidance like a senior engineer:
   - preferred file ownership/layering
   - expected transaction boundaries
   - expected error mapping and failure semantics
   - expected tests and verification commands
4. Include explicit acceptance criteria and handoff format.
5. Include stop-gate instruction: do not continue to next package without explicit user approval.

Review requirements for each returned package:
1. Run an audit mindset first: search for bugs, regressions, policy violations, and missing tests.
2. Verify behavior against source specs, not only against the prompt text.
3. Confirm layering and data-ownership rules from engineering guidelines.
4. Re-run required checks (`lint`, `typecheck`, focused tests) before acceptance.
5. Record decision in progress ledger as `accepted` or `changes_requested` with concrete findings.

## Active Phase 2 Tracking Files
Canonical Phase 2 progress ledgers are now active:
- `docs/specs/p2-g1-progress.md`
- `docs/specs/p2-g2-progress.md`

## Active Phase 3 Tracking Files
- `docs/specs/p3-g1-progress.md`

Legacy ledgers remain reference history:
- `docs/specs/goal-1-progress.md` (`P1-G1` history)
- `docs/specs/goal-2-progress.md` (`P1-G2` history)
