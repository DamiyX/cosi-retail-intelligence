# M3 Audit Corrections

**Status:** Corrective implementation complete; independent re-audit required.
M3 is not accepted and M4 must not start.  
**Audit comparison:** accepted M2/planning baseline `9476297` to initial M3
implementation commit `2ff7b4f` on `feat/m3-sales`.  
**Recorded:** 2026-09-18

## Corrected findings

- **S1 — inventory truth:** sale detail now shows each immutable historical
  sale inventory delta separately from the current derived store-product
  balance. Negative derived stock is visibly labelled as a reconciliation
  signal, never a reason to reject or remove a completed sale. A derived-stock
  read failure leaves the saved sale visible and offers a retry.
- **S2 — evidence gaps:** real SQLite failure injection now covers every write
  position for a new credit customer/receivable, a selected customer account,
  and a multiline aggregate. Credit replay proves no duplicate customer,
  receivable, inventory, or outbox effect. Screen tests cover retained cart and
  customer input after local commit failure, deliberate retry, and local
  history retry.
- **T1 — store isolation:** the screen-facing sales client rejects inactive
  bound store/device context and returns no packages or store-owned price when
  a caller supplies another store's product. Product, customer, sales-list, and
  sale-detail client reads have two-store negative coverage.
- **T2 — exact arithmetic:** candidate cart add/edit totals are checked before
  state mutation; unsafe totals remain in the line form as an error rather than
  crashing render. Money and inventory aggregation now sums individually safe
  rows with `BigInt` and rejects an unsafe aggregate before conversion back to
  a JavaScript number.
- **T3 — focus lifecycle:** route focus state removes Sell and Quick Add
  hardware-Back listeners while their tab is blurred, then restores the active
  Sell listener when the tab regains focus.
- **T4 — recoverable reads:** initial/search/refresh product reads, package
  reads, and credit-customer lookup are bounded, retain in-memory inputs, and
  expose retry. A saved Quick Add product is never described as unsaved when a
  follow-up catalogue read fails. Existing-store/client construction failure
  presents retry rather than another-store setup.
- **T5 — continuity state:** the M3 workflow now uses the schema-valid
  `in_progress` state and the actual task identifier. Project summaries reflect
  M3 implementation plus pending re-audit rather than a future M3 branch.

## Evidence recorded in this pass

- `npm run validate` passed after the corrective code and tests: 143 domain and
  186 mobile tests (329 total / 25 suites), strict typecheck, and zero-warning
  lint.
- Focused real-SQLite/mobile regression suite passed before the full run:
  `__tests__/sales.test.ts`, `__tests__/sell.test.tsx`, and
  `__tests__/navigation.test.tsx` — 50 tests in 3 suites.
- Expo Doctor passed 21/21; `npx expo install --check` reports dependencies up
  to date (with `expo` intentionally excluded); Android export passed with
  1,341 modules and a 3 MB Hermes bundle.
- Workflow JSON Schema/date-time and gate dependency validation passed. Final
  `git diff --check` passed. The re-audit handoff must record the correction
  commit and a clean Git status.

## Boundaries and residual limits

- Migration 3 is already committed and was not edited. These corrections do
  not require a schema change or migration 4.
- No M4 work, push, merge, deployment, cloud build, device action, production
  data access, or destructive operation is included.
- The preserved Galaxy A15 evidence remains M1/M2-only. No M3 physical-device,
  large-text physical-rendering, or Metro development-client claim is made
  here; those gates remain deferred before an external beta/native-release
  claim.
