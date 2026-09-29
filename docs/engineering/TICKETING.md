<!-- M8 approval checkpoint 2026-09-29: founder approved the clarified plan, DESIGN and M8-01..05 (D-046). Earlier pending-review wording below is historical. One Astra low implementation chat; coordinator reviews after handoff only. -->
# Ticketing and Milestone Decomposition

**Status:** Engineering operating source of truth  
**Applies to:** M1 through M13 and recognition R&D tasks

## Purpose

BUILD_PLAN.md is the stable, high-level roadmap. Tickets are the rolling,
implementation-level breakdown for the active milestone. They make work
reviewable and resumable without pretending that distant implementation details
are already known.

## Rolling Ticket Policy

Do not create detailed tickets for M1 through M13 all at once. Future details
would become stale as domain evidence, tests, retailer feedback, and earlier
milestones change what later work needs.

For each milestone:

1. read the current project state, active workflow record, milestone, decisions,
   and relevant product/architecture sources;
2. inspect the implemented code and migrations;
3. draft the smallest vertical tickets that produce verifiable behavior;
4. name acceptance criteria, test evidence, architecture risks, and blocking
   dependencies;
5. have the coordinating planner verify ticket granularity and dependency edges
   when the founder has delegated that judgment; otherwise ask the founder;
6. only then publish the milestone ticket set in tickets.md or the approved
   external tracker;
7. execute tickets in dependency order and update their status with evidence;
8. close or carry forward explicit remainder before planning the next milestone.

It is acceptable to identify a future milestone dependency early. Keep it as a
roadmap note or blocker rather than a detailed speculative ticket.

The coordinating planning/audit agent owns this process. The implementer updates
execution evidence but must not silently redesign tickets, approve decision
gates, or accept its own milestone. Material decisions still require the review
specified in AGENTS.md even when ticket sizing is delegated.

## Ticket Shape

Each implementation ticket should include:

- title and user or system outcome;
- vertical scope and explicit non-goals;
- source documents and decision references;
- likely modules/migrations;
- acceptance criteria;
- test and manual verification evidence;
- blocking and non-blocking dependencies;
- architecture, security, data, or device risks;
- status and completion evidence.

Avoid layer-only tickets such as “build all tables” followed by “build all UI”
when a smaller end-to-end slice can prove the contract. Infrastructure tickets
are appropriate when they unlock several vertical slices and have their own
testable completion condition.

## Relationship to Workflow State

- .agents/workflows/<task-id>.json answers what resumable task is active, who
  owns it, which gates are pending, and what happens next.
- tickets.md answers which verified work items compose the active milestone.
- PROJECT_STATE.md answers where the project is now.
- BUILD_PLAN.md answers the intended milestone order and high-level scope.
- DECISION_LOG.md records approved durable decisions.

These artifacts have different jobs. Keep each concise and correct instead of
copying full histories between them.

## Current Milestone Gate

M0–M7 local source/automated scope is independently accepted, with explicit
physical/release gates carried. Prior ledgers remain under
`docs/engineering/tickets/`; the M7 ledger is preserved there verbatim.
The active `tickets.md` contains proposed M8-01 through M8-05, registered in
`.agents/workflows/m8-unified-scanner.json`. Coordinator reviewed ticket size
and dependencies under the founder's delegated judgment. Founder review of the
M8 experience/native/contract plan precedes implementation; no M8 code or device
pass is claimed. M9 remains an isolated integration/audit task.
