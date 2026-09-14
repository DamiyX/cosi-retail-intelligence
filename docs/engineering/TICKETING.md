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

## Current M2 Gate

M1 passed independent source and automated re-audit on 2026-09-14. Its Galaxy
A15 5G native restart check is explicitly waived as an M2 entry blocker and
carried forward as mandatory before external beta/native release readiness.

The founder delegated M2 granularity, dependency, and design judgement to the
engineering planner. The reviewed M2 ticket set is published at repository root
in `tickets.md`. The implementation agent must complete M2 and stop for the
independent audit in `docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md` before
M3 tickets are created.
