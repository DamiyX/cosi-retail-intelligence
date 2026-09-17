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
5. ask the founder to verify ticket granularity and dependency edges;
6. only then publish the milestone ticket set in tickets.md or the approved
   external tracker;
7. execute tickets in dependency order and update their status with evidence;
8. close or carry forward explicit remainder before planning the next milestone.

It is acceptable to identify a future milestone dependency early. Keep it as a
roadmap note or blocker rather than a detailed speculative ticket.

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

M1 passed independent source and automated re-audit on 2026-09-14. On
2026-09-15, the Galaxy A15 5G preview build proved local-store and temporary
catalogue creation, force-stop/relaunch retention, airplane-mode retention,
and 1.3 text-scale rendering. The development-client/Metro-specific check is
still open because its downloaded APK was corrupted before installation; it
remains required before an external beta/native release claim.

M2 passed independent source and automated audit on 2026-09-14 after correction
of integrity, replay, preference, fresh-install, and navigation defects. The
founder then approved D-036/D-037 and the M3 Sell-flow baseline. M3-01 through
M3-05 are published in `tickets.md` and registered in
`.agents/workflows/m3-sales.json`; their source/automated scope was independently
accepted on 2026-09-18, with physical/release gates carried. The next milestone
may open only its separate planning gate; no M4 feature code is included in the
M3 acceptance checkpoint.
