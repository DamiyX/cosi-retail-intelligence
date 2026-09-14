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
