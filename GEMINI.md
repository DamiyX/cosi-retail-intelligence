# GEMINI.md

This repository's canonical engineering instructions are in:

> `AGENTS.md`

Read `AGENTS.md` first.

Then read:

- `docs/engineering/PROJECT_STATE.md`
- the relevant milestone in `docs/engineering/BUILD_PLAN.md`
- `docs/engineering/MULTI_AGENT_WORKFLOW.md`
- the relevant product/architecture documents for the current task
- `docs/decisions/DECISION_LOG.md` before reopening established decisions

The project is intentionally AI-tool-independent.

If work was started by Codex, OpenCode, another Gemini session, another model, or a human engineer:

- inspect the current Git branch;
- inspect `git status`;
- inspect recent commits;
- inspect uncommitted changes;
- continue from the repository state.

Do not restart completed work merely because previous chat context is unavailable.

Do not create alternative product/architecture rules in `GEMINI.md`.

`AGENTS.md` and the repository source-of-truth documents remain authoritative.
