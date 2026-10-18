# Implementation and Independent Audit Workflow

**Status:** Engineering operating source of truth  
**Applies to:** M1 through M13 and Recognition Track B

## Operating Decision

The coordinating planning/audit agent directs the build and creates each
milestone's plan, tickets, workflow registration and implementation prompt.
A separate implementation task executes only that milestone and stops for
independent audit. Its self-checks do not replace the independent audit.

Use one new, separate task per milestone, sequentially. Return corrections to
that milestone's existing task and branch. Do not substitute a subagent when
the founder requests a separate task. The coordinator does not edit or audit
the shared checkout while the implementer is writing. The next milestone's
task starts only after independent acceptance and its own planning gates.

The founder's current implementation and code-correction selection is
GPT-6.1 Sol HIGH. Earlier Luna/Terra preferences are superseded. Utilities follow
the founder's current lower-effort policy; other models or escalation require
explicit approval.

October3 clarification: the main M0 coordinator performs every independent
audit and owns acceptance. Do not create a separate audit chat or delegate this
responsibility. A milestone implementer stops with evidence; the coordinator
reviews it directly, sends concrete corrections to that same implementation
chat if needed, and stops while implementation resumes. The Independent Auditor
role below describes the coordinator's review responsibilities, not another
agent to dispatch. Automatic receipt of a handoff does not guarantee automatic
chat resumption; report the delivery status truthfully.

For COSI, auditing only after M1–M3 or M1–M5 would allow a domain, package,
transaction, costing, or inventory defect to spread into several dependent
milestones. The default audit unit is therefore one milestone.

## Responsibilities

### Coordinating Planning/Audit Agent

- owns milestone plans, ticket granularity, dependency and acceptance review,
  workflow registration, and implementation/correction prompts;
- identifies material decisions for founder review before implementation;
- independently audits returned work and verifies corrections before acceptance;
- does not delegate planning or independent acceptance to the implementer.

### External Implementation Agent

- reads repository truth instead of relying on a pasted chat history;
- works on the existing task branch and active published tickets;
- implements approved current-milestone tickets and assigned corrections only;
- does not create or approve milestone plans, tickets, durable decisions, or
  independent acceptance; reports contradictions to the coordinator;
- keeps the workspace green after each ticket;
- updates ticket checkboxes and workflow evidence honestly;
- sends a complete report to the coordinating task and stops at the audit gate;
- does not push, merge, deploy, or start the next milestone without the user's
  authorization and the required audit.

### Independent Auditor

- inspects the actual branch, working-tree diff, migrations, tests, and source
  documents;
- checks every ticket acceptance criterion and milestone acceptance claim;
- challenges data integrity, offline behavior, regressions, security boundaries,
  accessibility when UI exists, and evidence limitations;
- returns either an accepted audit or a correction prompt with concrete,
  prioritized findings;
- does not implement the next milestone while corrections remain open.

### Founder

- owns product goals and approves material changes to established architecture
  or product behavior;
- does not need to judge routine ticket size, implementation detail, or test
  organization;
- authorizes external Git, deployment, account, and production actions when
  required.

## Milestone Control Loop

1. The planning/audit side creates or refreshes the active workflow JSON and
   publishes tickets for one milestone.
2. The implementation agent executes all ready tickets in dependency order.
3. The implementation agent runs acceptance checks, updates tickets, project
   state, and workflow evidence, then stops.
4. The auditor reviews the actual implementation and evidence.
5. If findings exist, the auditor supplies one correction prompt. The same
   implementation branch remains active until corrections pass.
6. After acceptance, the milestone is marked complete.
7. The planning/audit side reads the new code and evidence, then creates the next
   milestone's tickets. Distant tickets are not guessed in advance.

This loop continues through M13. Recognition Track B may run in a separate
branch/worktree only when its changes do not conflict with shared domain,
schema, or recognition contracts.

After the M1 audit, complete the product design gate before publishing M2
tickets. M2 introduces the first substantial catalogue UI and must use an
approved `DESIGN.md` rather than extending the M0 technical shell by inference.

## Audit Gate Strength

- M1–M7: full milestone audit because these establish domain, transaction,
  costing, inventory, finance, and synchronization correctness.
- M8–M12: full milestone audit because scanner, shared data, staff permissions,
  and recognition introduce device or trust-boundary risk.
- M13: release-readiness audit across the complete MVP.

Small fixes inside a milestone do not require a separate founder checkpoint.
The implementation agent may correct its own test or lint failures before
submitting the milestone.

## Pasteable Initial Implementation Prompt

Use this prompt only after the current continuity/ticket changes are committed
to the task branch or are otherwise visible in the implementation agent's
working tree:

    You are the implementation engineer for COSI. Your long-term assignment is
    to build the approved MVP from M1 through M13, but you must work through one
    audited milestone at a time.

    Start with M1 only. Do not start M2 in this run.

    Before changing code:
    1. Read AGENTS.md.
    2. Read docs/engineering/PROJECT_STATE.md.
    3. Read docs/engineering/MULTI_AGENT_WORKFLOW.md.
    4. Read docs/engineering/BUILD_PLAN.md, especially M1.
    5. Read docs/engineering/TICKETING.md and tickets.md.
    6. Read .agents/workflows/index.json and the active task record.
    7. Read .agents/contexts/project-context.md,
       .agents/contexts/stack-context.md, and the source documents referenced by
       the M1 tickets.
    8. Inspect the branch, git status, recent commits, current diff, existing
       application code, tests, and package manifests.

    Treat repository documents as project memory. Flag a conflict rather than
    guessing. Do not redesign the product, change an established architecture
    decision, select a recognition model/runtime, or implement M2+ scope.

    Implement tickets M1-01 through M1-05 in dependency order. Work
    autonomously within approved M1 scope. After each ticket, keep typecheck,
    lint, and relevant tests green and update only evidence that actually
    passed. Use explicit SQL migrations and typed repository boundaries unless
    an approved decision says otherwise.

    At the end of M1:
    - run every ticket and milestone acceptance check;
    - perform the required Galaxy A15 5G restart verification;
    - update tickets.md, PROJECT_STATE.md, and the active workflow JSON;
    - update DECISION_LOG.md only for an approved durable decision;
    - report changed files, dependencies, migrations, tests and exact results,
      manual checks, limitations, unresolved risks, and git status;
    - stop and wait for independent audit before M2.

    Do not push, merge, deploy, spend money, or alter production/external
    systems unless the user explicitly authorizes that action.

## Continuation After a Passed Audit

After each accepted milestone, use:

    Continue the COSI build from the repository state. Read AGENTS.md,
    PROJECT_STATE.md, the active workflow JSON, BUILD_PLAN.md, and the newly
    published tickets.md. Implement only the active milestone's tickets, keep
    checks green after each ticket, update evidence, and stop at the next
    milestone audit gate. Do not infer or begin unpublished future work.

## Initial M1 Implementation Prompt

Use this prompt after the current documentation changes are committed, the M0
pull request is accepted, and the `feat/m1-domain-local-database` task branch is
created:

    You are the implementation engineer for COSI. Your long-term assignment may
    continue through M13, but your active scope is M1 Domain + Local Database
    only.

    Work in the existing COSI repository on branch
    feat/m1-domain-local-database. Before changing code, read AGENTS.md,
    docs/engineering/PROJECT_STATE.md, .agents/workflows/index.json and the
    active task record, .agents/contexts/project-context.md,
    .agents/contexts/stack-context.md, docs/engineering/BUILD_PLAN.md M1,
    docs/engineering/TICKETING.md,
    docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md, tickets.md,
    docs/architecture/DOMAIN_DATA_MODEL.md,
    docs/architecture/TECHNICAL_ARCHITECTURE.md,
    docs/architecture/OFFLINE_SYNC.md, and
    docs/decisions/DECISION_LOG.md. Inspect Git status, recent commits, current
    files, package manifests, and tests.

    Implement tickets M1-01 through M1-05 in dependency order. Use the exact
    ticket acceptance criteria as contracts. Keep typecheck, lint, and tests
    green after every ticket. Add only dependencies required by M1 and verify
    Expo compatibility before adding native packages. Do not implement M2,
    Supabase Auth, remote schema, sync transport, catalogue, sales, inventory,
    recognition, or final product design.

    Update ticket checkboxes only when evidence exists. Update
    .agents/workflows/m1-domain-local-database.json and
    docs/engineering/PROJECT_STATE.md as work progresses. At the end, run all M1
    checks and the required Galaxy A15 5G restart verification. Return a
    milestone report listing changed files and migrations, commands and exact
    results, manual checks, acceptance evidence, unresolved risks, and
    documentation updates.

    Stop after M1. Do not start M2, push, merge, deploy, or change external
    accounts. Leave the implementation ready for independent audit.
