# Repository Continuity Context

## Purpose

This directory holds small, factual continuity artifacts for resumable work. It
does not replace the product, architecture, engineering, or decision documents
under docs/.

## Rules

- Read ../AGENTS.md first.
- Keep project summaries factual and link to the authoritative source.
- If a context summary conflicts with an approved source document, the source
  document wins and the context summary must be corrected.
- Store one resumable task per .agents/workflows/<task-id>.json and register it
  in .agents/workflows/index.json.
- Validate workflow records against the schemas in .agents/schemas/.
- Record decisions in docs/decisions/DECISION_LOG.md; do not hide decisions in
  workflow state.
- Record no credentials, tokens, personal data, full chat transcripts, or copied
  tool output.
- Detailed tickets are rolling execution artifacts. Follow
  docs/engineering/TICKETING.md before publishing or changing them.

## Directory Contract

- contexts/: active whole-project summaries used to route future work.
- workflows/: current resumable task state and the task index.
- schemas/: versioned validation contracts for workflow state.

## Maintenance

Update a context only when project truth changes. Update a workflow record when
its task changes state, owner, evidence, blockers, or next action. Archive a
finished task by setting status to complete and archived to true; keep only
genuinely active tasks unarchived.
