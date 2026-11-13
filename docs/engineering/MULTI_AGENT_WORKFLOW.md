# MULTI_AGENT_WORKFLOW — Retail Commerce Intelligence

**Version:** 1.0  
**Status:** Engineering operating source of truth  
**Purpose:** Allow Codex, Gemini, OpenCode, Antigravity, another coding agent, or a human engineer to continue the same project safely without depending on one tool's chat memory.

---

# 1. Core Principle

The repository is the permanent project memory.

AI models and coding tools are interchangeable workers.

A task does **not** belong to Codex, Gemini, OpenCode, Antigravity, or any other model.

It belongs to:

- the repository;
- the current Git branch;
- the current milestone/task;
- the source-of-truth documents;
- the current code and tests.

If one agent reaches a token/context/usage limit, another compatible agent should be able to continue the same work.

---

# 1.1 Founder Model and Sequential Handoff Policy

Founder instruction, recorded 2026-10-01, supersedes earlier chat/task model
preferences. Apply it to existing and new agents:

- Coordinator planning, reasoning and independent audit: GPT-6.1 Sol, high.
- Implementation, code changes and technical corrections: GPT-6.1 Sol, high.
- Phone verification, browser/computer control and bounded web lookup: GPT-6.1
  Sol, medium. Technical analysis or code repair follows the high-effort rule.
- Routine utility operations such as opening Docker, downloads, installation
  and approved Git operations: GPT-6.1 Sol, low (the currently supported lowest
  effort). These settings do not authorize spending or external effects.
- Before dispatching an agent or changing its settings, tell the founder the
  proposed model/effort and purpose. The defaults above are authorized; any
  different model or effort above high requires explicit founder approval first.
  In particular, do not reuse older Astra, Terra, Luna or GPT-5.6 settings.
- Agents cannot assume they can change their own model. For a Low/Medium agent's
  bounded technical correction, the October25 amendment below supplies standing
  approval for the coordinator to apply Sol6.1 High, then return it to the normal
  task setting. Other model changes follow the explicit-approval rules above.
- A usage-limit or model switch resumes the same task branch and unfinished
  work. Inspect current commits/diff and passed evidence; do not restart or
  discard another agent's valid work.
- Maintain sequential ownership: the implementer works alone, then stops and
  sends a handoff to the coordinator when directly authorized by the founder.
  The coordinator audits only after that stop, sends concrete corrections if
  needed, and stops again while implementation resumes. Do not duplicate work
  or poll/wait in loops. A direct report-back does not itself guarantee that the
  receiving chat is automatically resumed; report actual delivery/tool status.

October2 bounded exception: founder authorized Astra for Track B planning only,
then explicitly said begin. Track B implementation remains GPT-6.1 Sol HIGH.
This exception does not authorize Astra for utilities or automatic later escalation.

October4 founder clarification: all M8 planning, including the first real-photo
experiment and its laptop tool, is to be done by Astra. The founder selected
the main chat for independent planning/reconciliation; planning grants no install,
download, implementation, inference or dispatch authority. Subsequent implementation
and coordinator code audit use GPT-6.1 Sol HIGH, sequential stopped handoffs;
the code audit precedes private-photo execution. Founder may later request Astra
final review separately. Routine utilities retain the lower-effort policy above.

This is a project preference, not a new architecture or milestone acceptance
rule. If the host cannot change the current coordinator model/settings, tell the
founder to select GPT-6.1 Sol high in the app; do not claim a switch occurred.

### October23 founder amendment — independent test execution and routine recovery

Founder explicitly requested less coordinator involvement in mundane test/setup
problems and direct interaction between the test agent and the founder. This
amendment supersedes older task briefs that require coordinator escalation for
every routine observation, connection or operator mistake. It does not change
test acceptance criteria, native safety limits or consequential-action approvals.

- Use Sol6.1 Medium for interactive phone testing and routine diagnostic judgement;
  High for implementation, helper/code corrections and independent code audits.
  Low remains suitable for fixed utility steps. Model effort does not enlarge
  authority. Finish an active command before changing execution settings; never
  restart an effect because the model/effort or chat changed.
- The assigned test agent owns the complete approved test and routine recovery,
  communicates directly with the founder and returns one stopped handoff with
  actual results. The coordinator plans, resolves material scope/code questions
  and independently audits the completed handoff. Avoid micro-dispatches for each
  observation or filename. Preserve sequential source ownership.
- The agent may ask the founder to unlock/foreground the owning app, supply the
  current Wireless debugging address/port, correct framing before capture, or
  identify the filename/destination they actually chose. It may connect to that
  exact already-paired endpoint and verify the same selected hardware/build/app.
  No random discovery, new pairing/credentials, unrelated devices or radio changes
  contrary to a test's required online/offline state.
- A failed read-only UI/status/file-metadata observation may have at most TWO
  bounded recovery attempts per incident, with fresh identity/readiness checks,
  distinct intent/receipt names and no concurrent native job. Record the original
  failure and each attempt. No unbounded polling or retries until green. Repeated
  failure after those attempts, unavailable tooling or uncertainty escalates.
- Reconcile an operator action before repeating anything: when the founder has
  already pressed Save, inspect the existing native receipt and selected local
  test document. For a prefilled filename, ask the founder directly and inspect
  only the relevant test-export names. Match exact job/source/APK/count/hash
  before transfer; no general Downloads/gallery/private-data inventory.
- Apparent installer success plus ordinary transfer progress permits read-only
  installed-hash/UID/data checks, not a reinstall. UI observation errors do not
  establish camera/export failure. Preserve original strict-helper errors and
  use approved read-only observation procedures; never forge a completion record.
- Keep at-most-once capture, install, export and Save effects where required.
  An uncertain effect, consumed native journal, expired human-readiness window or
  prior Save must NOT be replayed. A replacement capture, evidence deletion/reset,
  new permission/dependency, code/helper guard change, acceptance-threshold change
  or material source/privacy/ownership problem still goes to the coordinator.
  Urgent data-loss/security risk escalates immediately; do not try twice first.
- Use already authorized tools/commands within the reviewed resource/data scope.
  Do not modify a frozen helper, bypass native admission checks or expand an
  export merely to continue. Test procedure may adapt routine read-only command
  sequencing and direct human setup within this amendment; code changes require
  the High implementation lane and stopped independent review.
- If the founder is absent, do independent work and leave only the human-dependent
  part pending. Do not open a timed picker or trigger a new physical capture while
  awaiting them. Existing no-late-photo and no-late-Save limits remain.
- Final handoff briefly lists material recoveries, original failures and their
  resolution, commands/evidence, remaining uncertainty and STOP/lease release.
  Routine navigation needs no transcript; failures relevant to interpreting test
  validity must not be hidden. No coordinator ping is needed for each resolved
  minor issue. Notify the coordinator directly when complete or truly blocked.

Track B application: see
`docs/recognition/PHONE_TEST_EXECUTION_RECOVERY_20261023.md`.

### October25 founder amendment — agent-owned diagnosis and correction

**3 November clarification:** founder reaffirmed that an agent finding an ordinary scoped build/self-review defect should diagnose it, apply one evidence-backed correction and verify it before reporting a failure to the coordinator. Do not introduce a coordinator-only permission handoff for each routine build-wrapper/cache mistake. Preserve original failures and distinct effect receipts. A target of one completed APK must not be turned into a coordinator-created ban on ordinary repair; genuine founder-imposed hard attempt/resource limits and at-most-once physical/install/export constraints still apply. If the agent's bounded correction fails, send evidence to the coordinator. If the coordinator-issued recovery also fails, request the founder's Astra selection for diagnosis/planning before another implementation/build experiment. Do not auto-switch to Astra. For the current ZXing build, corrected A2 has failed; further build is held for that review. No source, dependency, permission, test-criteria or physical allowance expansion follows from this clarification.

Founder explicitly approved this workflow for current agents, future agents and
previous agents when resumed. This supersedes older briefs requiring coordinator
diagnosis or permission for every ordinary defect within an approved task. It
changes recovery responsibility, not the task's mutation ceiling, action budget,
acceptance criteria or host/tool policy.

1. **The assigned agent owns ordinary recovery.** Inspect the evidence, identify
   the cause, make one bounded correction within the approved scope and run the
   relevant checks. A coherent repair includes normal compile/lint/test cleanup;
   it is not permission for unrelated speculative fixes or retries until green.
   If verified, continue the approved task without a coordinator ping for each
   resolved issue. Preserve the original failure and meaningful repair evidence.
2. **Code correction runs at Sol6.1 High; ask the founder first.** October26
   correction supersedes the earlier coordinator-first setting route. A Low/Medium
   agent settles active commands, checkpoints, then sends the founder a direct
   actionable request to switch that same chat to High and resume. Give a brief
   symptom and say that diagnosis/first repair remains with the agent. Allow at
   least 60 seconds from delivery for the founder to respond; do not message the
   coordinator about the setting during that window. A reply that the founder is
   changing it counts as a response: wait for their completion rather than racing
   the manual change. If the founder explicitly says they are unavailable, or no
   response arrives after 60 seconds, request the already-authorized setting-only
   fallback from the coordinator. Elapsed time is not new consent: fallback applies
   only to the previously approved effort change, without expanding task authority.
   Keep the founder question pending while waiting; do not issue duplicate requests.
   Record that the setting was applied or superseded so neither route changes it
   twice. Never claim a switch without supported confirmation. Diagnosis/repair
   stays with that same agent; no new coordinator implementation plan is needed
   for an ordinary scoped repair. After required repair checks/review, return to
   Medium for interactive testing or the task's established utility setting.
3. **Escalate a failed repair with evidence.** When that bounded correction does
   not solve the problem, stop with the symptom, reproduction/evidence, attempted
   correction, check results, preserved state and specific remaining question.
   The coordinator reviews that work and chooses the next approach without
   restarting diagnosis blindly or repeating consumed effects.
4. **Astra follows unresolved coordinator recovery.** If the coordinator's next
   approach also fails, or a larger planning/architecture decision is needed,
   request the founder's Astra switch for investigation/planning. This is not an
   automatic model switch and does not authorize architecture changes. Existing
   M8 Astra planning preferences remain; routine scoped bug correction is High.
5. **Keep independent final review.** The agent self-checks, then stops/releases
   ownership and sends the completion handoff. The coordinator independently
   audits material work and evidence. Self-repair does not waive an established
   source/artifact review required before device/private-data/external effects.

Routine connection recovery, locating the intended test file, own-app navigation
and operator setup stay with the executing agent under the October23 bounds.
Ask the founder directly for missing connection/unlock/framing/file-choice input;
questions remain pending while they prepare. Do not route mundane questions
through the coordinator. An effort-setting request is not a technical handover;
the October26 founder-first/60-second fallback rule above also applies to every
new or resumed assignment. An agent already at High does not request High again.

Escalate immediately when the action would exceed approved scope or authority:
data deletion/reset, repeating consumed/uncertain photo/export/install effects,
new permissions/dependencies, changing test limits/thresholds, architecture or
ownership changes, or a material security/data-loss risk. Do not try a repair
first merely to satisfy the one-attempt rule. Host/tool policy stops must be
respected; no alternate automation to bypass a blocked action. Read-only recovery
and a code correction do not grant authority to replay the failed physical effect.

Prefer the same agent for repair. Use a separate bounded repair worker only when
delegation is authorized and the problem is substantial/separable enough to
justify coordination. Temporary workers do not delegate further. Preserve one
writer and a clear return contract; never spawn a repair agent for every small bug.

Every new/resumed assignment must reference this amendment and state the approved
scope, model/effort, ordinary self-repair authority, escalation triggers, required
checks and stopped handoff. Briefs should cover a coherent useful slice instead of
forcing micro-handoffs for routine diagnosis/build-staging cleanup. Existing
milestone, privacy and consequential-action gates remain explicit.

---

# 2. What Carries Context Between Agents

The next agent should recover context from:

1. `AGENTS.md`
2. `docs/engineering/PROJECT_STATE.md`
3. `.agents/workflows/index.json` and the unarchived task record
4. `.agents/contexts/project-context.md`
5. `tickets.md` when it exists for the active milestone
6. the relevant milestone in `docs/engineering/BUILD_PLAN.md`
7. `docs/decisions/DECISION_LOG.md`
8. relevant product/architecture documents
9. relevant app-flow, stack, design, and audit context
10. current Git branch
11. `git status`
12. recent Git commits
13. current uncommitted `git diff`, if any
14. tests/build results and code itself

Do not depend on the previous AI chat transcript.

`PROJECT_STATE.md` answers where the project is now. The active workflow JSON
answers which resumable task and gate comes next. `tickets.md`, when published
for the active milestone, provides the verified execution breakdown. These
artifacts complement each other and must not carry conflicting status.

The implementation agent must stop after the active milestone and hand the
branch back for the independent audit defined in
`docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md`. A new model may perform the
audit, but it must inspect the actual diff and evidence rather than accepting the
implementer's completion claim.

---

# 3. Branches Belong to Work, Not AI Models

Do **not** create branches such as:

```text
codex-work
gemini-work
opencode-work
```

merely because the model changed.

Use task/milestone branches such as:

```text
feat/m3-sales
feat/m4-restocking
fix/sync-idempotency
r-and-d/recognition-r1
```

If Codex starts `feat/m3-sales` and stops halfway:

> Gemini, OpenCode, or another agent continues `feat/m3-sales`.

The model can change while the branch stays the same.

---

# 4. Same-Laptop Agent Switching

If switching AI tools on the same computer:

1. stop the previous agent;
2. keep the same repository and branch;
3. start the new agent in that same working directory;
4. instruct it to read `AGENTS.md` and `PROJECT_STATE.md`;
5. make it inspect:
   - `git status`
   - recent commits
   - current diff
   - relevant tests
6. continue from the existing state.

A commit is recommended before switching when the current work is coherent, but it is not mandatory on the same laptop if the next agent can inspect the working tree safely.

The new agent must not assume uncommitted code is correct merely because another model wrote it.

---

# 5. Cross-Laptop Switching

GitHub is the shared remote and transfer mechanism.

Each laptop clones the repository once.

When moving work from Laptop A to Laptop B:

## Laptop A

```text
review current changes
run reasonable tests
commit
push
```

A work-in-progress commit is acceptable when necessary:

```text
wip: continue M3 sales flow
```

## Laptop B

```text
fetch/pull
checkout the same task branch
verify current status
continue
```

Do not manually copy the project folder between laptops as the normal workflow.

---

# 6. Rule Before Changing Laptops

Important work that must be available on another computer must be:

> committed and pushed.

Uncommitted files exist only on that local machine.

If work is incomplete but needs to move:

> make a WIP commit and push it.

Safe continuity is more important than perfect commit history during development.

---

# 7. `main` Branch

`main` represents the latest accepted working project state.

Do not use `main` as a scratchpad.

Normal feature work should happen on a task branch.

Merge to `main` after:

- relevant implementation is complete;
- required tests pass;
- acceptance criteria are reviewed;
- major conflicts are resolved.

---

# 8. One Active Agent on One Working Tree

Do not allow two autonomous coding agents to write simultaneously into the exact same working directory.

They can overwrite each other's changes and produce an incoherent Git state.

For the normal workflow:

> one working tree → one active writer at a time.

Switching models is fine.

Concurrent writing in the same directory is not.

---

# 9. Truly Parallel Work

Separate branches/worktrees are only necessary when work is intentionally parallel.

Example:

```text
feat/m5-inventory
r-and-d/recognition-r2
```

If two agents work simultaneously:

- use separate Git branches;
- preferably use separate Git worktrees/directories;
- avoid changing the same schema/contracts concurrently.

Parallel work should be merged only after conflict/review checks.

---

# 10. Git Worktrees

Git worktrees are optional, not required for normal model switching.

Use them when two tasks genuinely run at the same time.

Example conceptual layout:

```text
C:/Projects/COS-main
C:/Projects/COS-inventory
C:/Projects/COS-recognition
```

Each points to a different branch of the same Git repository.

Do not create a worktree solely because you changed from Codex to Gemini.

---

# 11. Agent Handoff Procedure

When a new AI agent takes over an existing task, tell it to:

1. read `AGENTS.md`;
2. read `PROJECT_STATE.md`;
3. read `.agents/workflows/index.json` and the active task record;
4. read `tickets.md`, the milestone requirements, and relevant context files;
5. read `docs/engineering/IMPLEMENTATION_AUDIT_WORKFLOW.md`;
6. inspect current branch;
7. inspect `git status`;
8. inspect recent commit history;
9. inspect uncommitted diff;
10. run or inspect relevant tests;
11. summarize what is already complete;
12. identify what remains;
13. continue without restarting the feature from scratch.

If it finds broken/incomplete prior work, it should repair it rather than blindly extending it.

---

# 12. Mid-Task Handoff

A dedicated handoff document is not required for every model switch.

The current branch, commits, diff, tests and source-of-truth documents are the handoff.

If the previous agent has enough context remaining, it may leave a concise final summary.

If it stops unexpectedly due to usage/context limits, the next agent should reconstruct state from Git and code.

This is intentional.

---

# 13. Agent-Specific Instruction Files

`AGENTS.md` is the canonical shared engineering instruction file.

If an AI tool expects another filename, create only a thin adapter that points back to `AGENTS.md`.

Example:

```text
GEMINI.md
```

should tell Gemini to read:

- `AGENTS.md`;
- `PROJECT_STATE.md`;
- relevant source-of-truth documents.

Do not duplicate the full architecture inside tool-specific instruction files.

---

# 14. Tool-Specific Files Must Stay Thin

Bad:

```text
AGENTS.md       20 pages
GEMINI.md       duplicate 20 pages
OTHER_AI.md     another duplicate
```

Good:

```text
AGENTS.md                 canonical rules
GEMINI.md                 small adapter
tool-specific config      only when required
```

This avoids instruction drift.

---

# 15. If a New AI Tool Does Not Read `AGENTS.md`

When introducing a new coding tool:

1. check its current project-instruction convention;
2. create a minimal adapter/config only if required;
3. point it to `AGENTS.md`;
4. do not duplicate the product documentation;
5. record a durable workflow change only if it materially affects the project.

---

# 16. Cross-Agent Review

A second model may review work from the first model.

It does not need a separate branch if it is only reading/reviewing.

If the reviewer will modify code:

- it may continue on the same task branch sequentially;
- or use a separate branch/worktree if review and implementation are occurring concurrently.

The important distinction is:

> sequential continuation can share the branch;
> simultaneous independent modification should not share the working tree.

---

# 17. Switching Because a Better Model Appears

No architecture change is required.

The new agent should:

- open the same repository;
- read the same source-of-truth;
- inspect the same branch;
- continue.

The project must not become dependent on proprietary memory from one AI provider.

---

# 18. Switching Because of Token / Usage Limits

If possible before limit exhaustion:

1. finish the smallest coherent code unit;
2. run relevant tests;
3. commit;
4. push if switching laptops;
5. stop.

If the limit hits unexpectedly:

- preserve the working tree;
- do not reset changes;
- let the next agent inspect the diff and continue.

---

# 19. Multi-Laptop Development Environment

Git synchronizes repository content.

It does not synchronize installed software.

Each development laptop should have compatible versions of:

- Git;
- Node/npm;
- Android/Expo tooling;
- relevant coding agents/IDEs.

The repository should pin/document important versions where practical.

M0 should establish:

- package lockfile;
- Node version requirement;
- environment-variable template;
- reproducible npm scripts;
- Expo/EAS configuration.

---

# 20. Secrets Across Laptops

Never use GitHub as a secret-transfer mechanism.

Do not commit:

- service-role keys;
- private API keys;
- passwords;
- signing secrets.

Use:

- `.env.example` in Git;
- ignored local environment files;
- approved EAS/Supabase secret stores;
- password manager/secure transfer for human-managed secrets.

Each laptop receives required local secrets securely.

---

# 21. Large Recognition Assets

Normal code/docs belong in Git.

Large datasets/models should not be pushed casually into ordinary Git history.

Use:

- versioned manifests;
- checksums;
- documented storage locations;
- release/object storage where appropriate.

Both laptops/agents should be able to obtain the same referenced dataset/model version.

---

# 22. Merge Conflicts

When a pull/merge conflict occurs:

- do not blindly choose "ours" or "theirs";
- understand both changes;
- check source-of-truth docs;
- run relevant tests after resolution.

For architecture/domain conflicts, escalate before guessing.

---

# 23. Pull Before Starting Work

At the beginning of work on a laptop:

1. verify branch;
2. fetch/pull latest remote changes;
3. inspect `PROJECT_STATE.md`;
4. inspect current task state.

Do not start a new coding session on a knowingly stale branch.

---

# 24. Push Before Leaving a Laptop

Before ending work on a machine when you may continue elsewhere:

1. save files;
2. inspect `git status`;
3. run reasonable tests;
4. commit;
5. push;
6. verify remote accepted the branch.

This is the normal cross-device handoff.

---

# 25. No AI Owns Architectural Authority

AI agents may challenge decisions with evidence.

They may not silently rewrite established architecture.

The authority chain remains:

- source-of-truth documents;
- approved decisions;
- founder/architecture review for material changes.

A model being newer or "smarter" does not automatically override existing decisions.

---

# 26. Continuation Prompt Pattern

When changing from one AI to another mid-task:

```text
Continue the existing work in this repository.

Read AGENTS.md and docs/engineering/PROJECT_STATE.md first.
Then inspect the current Git branch, git status, recent commits, and
all uncommitted changes.

Read the relevant milestone and architecture documents for the work
already in progress.

Do not restart the task from scratch and do not discard existing
changes merely because another AI created them.

First summarize:
1. what is already implemented;
2. what remains;
3. any problems you see in the existing implementation;
4. the next concrete steps.

Then continue the work, following the repository source of truth.
```

---

# 27. Cross-Laptop Continuation Prompt Pattern

After pulling the same branch on another laptop:

```text
I am continuing this project from another development machine.

Read AGENTS.md and PROJECT_STATE.md.
Inspect the current branch and recent commits.
Verify the working tree and run the relevant validation commands.

Continue the current milestone from the repository state.
Do not assume prior chat context is available.
The repository, Git history, tests, and documentation are the source
of truth.
```

---

# 28. Final Principle

The goal is:

> **Any capable coding agent on any configured development laptop should be able to continue the project from the repository without requiring the previous model's conversation history.**

Git provides continuity of code.

Repository documentation provides continuity of decisions.

Tests provide continuity of expected behavior.

The AI model is replaceable.

## Track B R0 audit preference — founder instruction October2

This packet only: before independently auditing the new R0 implementation chat,
ask the founder to switch the coordinator to Terra MEDIUM if preferred. The
coordinator cannot switch its own model. If the founder does not reply after a
reasonable opportunity, Sol6.1 HIGH is the explicitly authorized fallback. A reply
selecting a model controls the audit. This does not authorize auto-escalation or
change the R0 implementer setting of Sol6.1 HIGH. Maintain sequential ownership.

## Physical test communication — founder instruction October23

For the current12-attempt P2-03 run, main retains execution ownership. Keep the
session open while waiting for the founder's action selection; use one action
prompt per acquisition and allow time to read/setup. A capture readiness window
starts only after the founder selects READY, never when the question is posted.
After this run, delegate further test execution to the testing agent; coordinator
owns planning, dispatch, review and audit. This does not expand capture budgets,
permit late/repeated shutters, or resume the currently paused Track B chat.
