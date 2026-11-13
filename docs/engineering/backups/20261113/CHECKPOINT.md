# Unfinished recovery checkpoint — 13 November 2026

Snapshot: m9-planning. Original branch: plan/m9-price-intelligence. Original HEAD: 1c8de0dca595ce804b8db605ff763683220c6380.

This is a laptop-failure backup, not a merge, release or claim that pending tests pass. P2-04 physical enrollment and final gallery/restart proof remain open at checkpoint time. Source checks already recorded in project documents are historical; no new full validation, APK build, installation, camera action, export or CI repair was performed for this backup. Do not replay uncertain phone actions or refund consumed attempts after restoring. Obtain fresh human READY before any photo and reconcile native state first.

All selected modified/untracked source, plans, test fixtures and helpers are in this commit. Synthetic fixture headers were inspected. The adjacent working-files.zip retains the selected working-file bytes before Git line-ending conversion; manifest.json records paths, sizes and SHA-256 values. Existing staged work, if present, is retained in the preceding backup commit. The original checkout, branch, index and dirty files were left untouched.

Not backed up here: ignored private phone photos/vectors/reports/raw device traces and experiment runs, APKs, signing credentials/keys, local environment files, caches, dependency/toolchain installations and excluded generated output. Most historical evidence links point into ignored local runs; a GitHub clone alone cannot reproduce or independently validate that evidence. Keep a separate approved private backup of those materials. Backup refs retain the existing project history; no unfinished changes were merged into main.

Restore by cloning the repository and checking out this backup branch. Read manifest.json, AGENTS.md, PROJECT_STATE.md and the scoped handoffs before resuming. Use the raw ZIP only to recover exact selected original bytes when required; do not overwrite newer work blindly. A separate machine needs its approved environment, dependencies and signing setup, and renewed device identity/readiness checks. Native source/APK/evidence bindings must be verified rather than assumed from this checkpoint.
