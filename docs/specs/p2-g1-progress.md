# P2-G1 Progress

## Goal metadata
- Phase/Goal: `P2-G1 - Rebase and Groundwork`
- Owner: `Architect/Tech Lead`
- Status: `in_progress`
- Last updated: `2026-04-07`

## Work package board
| ID | Work package | Owner role | Status | Dependencies | Notes |
|---|---|---|---|---|---|
| P2-G1-WP-1 | Legacy reconciliation and status alignment | Architect/Tech Lead | `done` | - | Completed reconciliation: legacy Goal 1/2 ledgers are historical, Phase 2 ledgers are active for all new execution tracking |
| P2-G1-WP-2 | Temporary vs permanent behavior register | Architect/Tech Lead | `in_progress` | P2-G1-WP-1 | Explicitly classify temporary POC behaviors (keep for dev, remove before production, or promote to permanent) |
| P2-G1-WP-3 | Production hardening checklist baseline | Quality and DevEx Agent | `todo` | P2-G1-WP-2 | Convert cross-phase guardrails into a practical verification checklist for release readiness |
| P2-G1-WP-4 | Canonical tracking adoption for active work | Architect/Tech Lead | `todo` | P2-G1-WP-1 | Move all new execution tracking to canonical `P<phase>-G<goal>-WP-<n>` IDs |
| P2-G1-WP-5 | Cleanup execution: dev/test behaviors | Backend Platform Agent | `todo` | P2-G1-WP-2 | Implement approved cleanup actions for temporary POC behaviors with no production regressions |
| P2-G1-WP-6 | Metaobject sync decision and cleanup path | Architect/Tech Lead | `todo` | P2-G1-WP-2 | Decide whether company-address metaobject sync remains product behavior or is retired as POC experiment; define execution path accordingly |

Status values:
- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

## Production Hardening Checklist Baseline (Draft)
This checklist is defined in `P2-G1` and executed in later hardening cycles.

- Customer-facing error UI contains plain-language guidance only (no raw technical payloads)
- Developer-only diagnostics are available through logs/support tooling with request correlation
- Dev-only URL state overrides are disabled or impossible in production runtime
- Shopify offline-session failure handling has a clear re-auth path for invalid/revoked tokens
- Phase-critical live verification evidence is captured and linked in progress ledgers
- Any temporary compatibility fallbacks are explicitly tracked with removal criteria

## Scheduled Cleanup Items (Explicit)
- Dev URL state overrides (`?status=...&role=...`):
  - keep available for current development phases
  - mandatory remove or hard-disable before production
  - execution owner: `P2-G1-WP-5`
- Company-address sync via Shopify metaobject:
  - currently treated as POC validation candidate pending product decision
  - decision owner: `P2-G1-WP-6`
  - cleanup/refactor execution owner (if retired): `P2-G1-WP-5`

Acceptance criteria for cleanup completion:
- Temporary behaviors are either:
  - promoted to permanent with explicit rationale, or
  - removed/hard-gated with verification evidence
- Roadmap/progress docs reflect final decision state and no ambiguous temporary status remains

## Cross-Team Artifact Note
- `docs/specs/brand-kit.md` is now the canonical frontend visual baseline for ongoing Phase 2 UI work.
- New UX/brand support artifacts can be added, but dashboard implementation decisions should reconcile to the canonical brand kit unless explicitly overridden by Architect decision.

## Legacy Reconciliation Summary
- `docs/specs/goal-1-progress.md` and `docs/specs/goal-2-progress.md` are treated as P1 historical ledgers.
- Canonical active tracking for new work is now:
  - `docs/specs/p2-g1-progress.md`
  - `docs/specs/p2-g2-progress.md`
- Legacy IDs remain valid historical references:
  - `Goal 1` -> `P1-G1`
  - `Goal 2` -> `P1-G2`
- New packages must use canonical IDs (`P<phase>-G<goal>-WP-<n>`).

## Role updates
Each role updates only its own section.

### Architect/Tech Lead
- Current package: `P2-G1-WP-1 - Legacy reconciliation and status alignment`
- Progress:
  - created canonical Phase 2 tracker for `P2-G1`
  - queued rebase/groundwork package board with ownership and dependencies
  - completed `P2-G1-WP-1` legacy reconciliation and confirmed active vs historical ledgers
- Decisions made:
  - use `docs/specs/program-execution-index.md` as canonical naming reference
  - keep legacy Goal 1/Goal 2 ledgers as historical records
- Blockers:
  - none
- Next package:
  - continue `P2-G1-WP-2` temporary-vs-permanent behavior classification register and prepare `P2-G1-WP-6` decision brief for metaobject sync path

### Backend Platform Agent
- Current package: `unassigned`
- Progress:
  - none
- Blockers:
  - none

### Frontend Embedded Agent
- Current package: `unassigned`
- Progress:
  - none
- Blockers:
  - none

### Quality and DevEx Agent
- Current package: `unassigned`
- Progress:
  - none
- Blockers:
  - none

## Architect validation log
| Date | Work package | Validation result | Notes |
|---|---|---|---|
| 2026-04-07 | P2-G1 setup | accepted | canonical tracker created with queued rebase/groundwork board |
| 2026-04-07 | P2-G1-WP-1 | accepted | legacy-vs-active tracking reconciliation completed and documented in P2 ledger |
