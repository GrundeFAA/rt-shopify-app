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
- Active roadmap stage: **Phase 2**
- Phase 2 starts after P1 validation and focuses on:
  1. rebase and groundwork
  2. Tailwind baseline setup
  3. UI skeleton build-out
  4. scope lock through UI review

Reference: `docs/specs/program-roadmap.md`

## Tracking Rules Going Forward
1. New work should use canonical IDs (`P2-Gx-WP-y` and onward).
2. Keep legacy goal files unchanged for historical traceability.
3. When referencing old work in new docs/prompts, include both IDs when helpful:
   - example: `P1-G2 (legacy Goal 2)`
4. Progress boards must show canonical IDs for all new items.
5. Architect updates this index when a new phase starts.

## Active Phase 2 Tracking Files
Canonical Phase 2 progress ledgers are now active:
- `docs/specs/p2-g1-progress.md`
- `docs/specs/p2-g2-progress.md`

Legacy ledgers remain reference history:
- `docs/specs/goal-1-progress.md` (`P1-G1` history)
- `docs/specs/goal-2-progress.md` (`P1-G2` history)
