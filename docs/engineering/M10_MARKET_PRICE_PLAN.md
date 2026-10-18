# M10 — bounded market-price infrastructure

Date:2026-10-03. Coordinator-owned plan; implementation authority is the
founder's unattended M9 -> M10 -> M11 instruction. GPT-6.1 Sol HIGH implements
in one separate chat; main coordinator alone audits its stopped return.
This is source implementation, not permission to share any real retailer data.
Founder delegated routine product/technical judgement and ticket granularity.

## Outcome, baseline and verified gaps

Owners can understand contribution consent and see a clearly labelled,
geographically relevant market cost range when sufficient eligible observations
exist. Their own M9 history remains independently useful offline. No data
means insufficient data, never simulated prices, market density or confidence.

Destination is COSI-m8-planning, plan/m8-unified-scanner at66ea3fc plus valid
uncommitted M8/Track B preparation and independently accepted M9 integration. Do not switch
branch, reset/stash, clone, commit unrelated work or bulk-replace screens.
M9 C1 repair is independently accepted in M9_INTEGRATION_AUDIT.md:16 fresh
regressions and546 protected hashes match. Earlier68 selected passes and1,183
full builder tests/17 skips remain historical. No schema/native/dependency change.
Physical/live gates pending.

Actual schema1–26 and M7 server migrations have immutable private purchase
observations. contribution_consent is constrained false locally; M7 envelopes
also require false. No market zone, canonical cross-store product/package
mapping, market consent state, shared contribution or market cache exists.
Local variant IDs and scanned codes are NOT automatically platform identity.
M7 already stores authoritative accepted observations and applied operations;
reuse those facts instead of accepting client-asserted prices/consent/identity.

## Reviewed direction and authority ceiling — D-051

Keep immutable M1–M9 facts and business outbox/protocol unchanged. Add a separate
revocable, server-authoritative market eligibility/consent record and private
sanitized projection over accepted M7 purchase facts. Original false flags
remain original receipt facts, never rewritten. Only explicit acknowledged
OWNER market consent can authorize the separate projection; false alone never
becomes true by migration, store enrolment, sync or model inference.

All external contribution/release paths remain DISABLED by default in app and
server. Tests use isolated fixtures only. No hosted call/data upload, scheduler,
real zone/catalogue seed, persistent migration or external activation is allowed.
Source controls may use injected test transports; the shipped default must show
availability honestly and send nothing. Existing M7 business sync is unaffected.

An authoritative activation/privacy review and real PostgreSQL/Auth/Edge tests
are required before enabling. Numerical policy below is a conservative,
versioned prototype policy chosen under founder delegation, not a claim of
anonymity, statistically representative coverage or legal compliance.

## Consent, authority and concurrency

- Default OFF. OWNER only can enable/disable contribution or select an approved
  market zone; present ACTIVE account, active authenticated OWNER membership
  and enrolled ACTIVE device are checked
  server-side on every control/read request using current M7 identity relations.
  ADMIN/STAFF/foreign/revoked/unauthenticated requests fail closed. Market reads
  are OWNER-only initially; M11 may later introduce approved permissions.
- A control request has store/device, globally unique operation ID, expected
  server version, policy version and explicitly selected zone. Hash-bind replay
  to meaning; conflict on changed body/version. Serialize generation changes
  per store. A delayed enable from before a disable must never re-enable.
- Enable acknowledgement records server time and current accepted sync revision
  as prospective cutoffs. No automatic historical backfill. Eligible purchase
  must be observed at/after that generation's enable time AND accepted after
  its cutoff revision. Backdated/offline-earlier receipts remain personal only.
- Disable locally suppresses attempted sharing immediately; UI distinguishes
  local OFF/pending confirmation from server-confirmed OFF. No silent offline
  enable or optimistic statement that the server changed. A timeout reconciles
  its operation/state before another change; retry/restart preserves intent.
- Server revocation excludes this store's contributions and invalidates affected
  released snapshots in the same transaction. Re-enable starts a new generation;
  previous eligible observations are not silently resurrected. Private purchase
  history remains intact. Offline cached releases cannot be recalled instantly:
  expose expiry and document this limitation; no immediate global erasure claim.

## Identity, zones and sanitization

Use restricted server-side approved market variant/package reference records
and explicit store-local-to-market mappings with version, canonical conversion
and source review. References are a minimal identity seam, not a new universal
catalogue or crowdsourced recognition engine. Do not infer mappings by names,
barcode alone, local ID equality, OCR or internet search. Missing/unreviewed/
ambiguous/inactive mapping means NOT eligible. A package conversion mismatch
rejects eligibility. Test fixtures demonstrate mapping; no real seed is claimed.

Use approved geographic zones with country/city/region/name/status. Owner selects
one; no GPS, exact address or nationwide fallback. Invalid/missing/foreign-country
zone means NOT eligible. A zone/generation change starts prospective eligibility.

The sanitizer reads accepted private M7 observation/purchase facts server-side,
validates source/type/store/positive quantity/VALID status/currency, canonical
package/conversion and bounded exact rational price. Zero, corrupt, estimated,
unavailable, future-dated or unmapped costs are ineligible. Body-supplied price,
store/consent claims, supplier text and calculated confidence are never trusted.
Future-dated observations are excluded until their time is no longer future.
Store zone must match both approved geography and currency policy.

Restricted projection holds market variant/package, zone, currency, exact
package/base-unit rational costs, observed time, source type, validation/policy
versions. Keep necessary source observation/store/generation provenance in
unexposed private storage for deduplication/revocation and one-store weighting.
This is sanitized confidential data, NOT irreversible anonymous data.
No retailer/supplier/customer identity, contact/address, private SKU/name/photo,
purchase total/quantity or raw purchase envelope is returned to other stores.
No client can query raw contributions or manufacture mappings/observations.

## Aggregation and release policy v1

Only one most recent eligible observation per independent store contributes
to each approved variant/package/zone/currency cohort in a30-day UTC window.
Deterministic ties: observed time, accepted server revision, observation ID.
Bulk purchases/retries/multiple devices cannot increase a store's weight.
Use exact rational ordering and median (even midpoint remains rational), minimum
and maximum of the selected per-store observations. Never use binary floats for
authoritative arithmetic; round only in the presentation. Packages/currencies/
variants/zones must not be mixed. Preserve normalized base facts but aggregate
per canonical package initially; cross-package market comparison is deferred.

At least FIVE distinct currently consenting eligible stores are required for a
release. Four stores with many observations still produce INSUFFICIENT_DATA
and no numeric range/median. Above threshold, observationCount means selected
representative observations/distinct stores, not all historic transactions.
Confidence is LIMITED prototype coverage; no invented percentage/high-confidence
rating. Trend is absent until separately validated; optional field not simulated.

Only controlled operator-side refresh generates versioned release snapshots;
no app-supplied arbitrary cohort/window/threshold or recompute endpoint. Bound
read requests to100 approved product-package keys and server-fixed policy.
No new hosted cron/job is created. Server response distinguishes DISABLED,
UNMAPPED, INSUFFICIENT_DATA and AVAILABLE; no sparse competitor-specific detail.
Release metadata: identity/package/zone/currency, range/median, representative
count, LIMITED coverage, observed-through/calculated timestamps, policy version,
revision and validUntil (at most24 hours after calculation). The30-day window
and timestamps are visible. Do not call the output a universal current price.

Five-store suppression is only an initial safeguard. Release privacy review must
consider extremes, collusion, differencing, independent-store/Sybil validation
and appropriate threshold/rounding/cohort policy before external activation.
Do not claim these concerns solved by removing retailer names.

## API/storage and integration shape

Add versioned market-only contracts alongside existing contracts; no edits to
business SyncOperation schemas/families. Reuse authenticated session/HTTP and
server auth-to-app-user/membership/device checks. Narrow control/state/read RPCs
are online-confirmed configuration/server-generated cache reads, not a second
business transaction sync protocol. Prefer existing bounded adapter patterns.
Independent operation IDs and expected-version conflicts remain enforced.

Add source-only server migration(s) after existing M8 identifier guard, containing
restricted market config/policy, approved identities/packages/mappings/zones,
store consent/current generation plus request/event ledger, private contributions
and release snapshots. Actual small table decomposition may follow invariants;
do not introduce unrelated platform catalogue administration. RLS on every new
table, revoked default/table EXECUTE privileges and explicit least-privilege
function grants. Private schemas remain unexposed. Definer RPCs, if necessary,
must have explicit auth checks, fully qualified names/fixed safe search path
and narrowly granted execution. Operator helpers unavailable to app users.

One additive SQLite migration27 should store market control acknowledgement/
pending intent and bounded signal cache (split only if a concrete invariant
requires it). No business-history rewrite/backfill; existing1–26 unchanged.
Cache keys include store context, approved mapping/version, variant/package,
zone/currency and policy. Validate the entire response before atomic cache
replacement; insufficient/disabled/revoked/changed mapping tombstones old numeric
results. Older responses cannot overwrite newer revision or a changed context.
Offline market view may use unexpired saved data with saved/stale timestamps;
after validUntil show unavailable/stale, never fresh numeric advice. Expiry is
evaluated on every read/resume. Network/cache failure never blocks sales/restock,
M9, sync or scanner and never erases private facts.

## UX baseline

Use a compact More -> Market prices route with one contribution/settings area
and product-based relevant results. Show current store/zone and experimental
status. Explain contribution fields and excluded private information before
explicit opt-in, no prechecked switch/dark pattern. OFF/disabled/online-required/
pending/retry/conflict states are visible; unavailable backend remains unavailable.
Keep personal price history distinct and navigable. Do not add a permanent tab
or dense Home cards, notifications, selling-price suggestions or charts.
Result shows package/currency/zone, range/typical, contributor count meaning,
window/freshness/LIMITED coverage and saved/expired status. Unknown identity or
insufficient coverage is a useful honest empty state, not an onboarding blocker.
Large touch targets, reading order, accessible labels and text expansion required.

## Allowed source and protected baseline

Allowed: new market domain utilities/tests, new market contracts/export/tests,
new mobile market client/transport/cache/control/presentation/screens/tests,
additive migration27/repository export, More route/menu link, and additive server
market SQL/functions/SQL tests. Existing auth/HTTP utilities may be consumed;
do not broaden their behavior. Minimal package export/route adaptations allowed.
No new dependency. Record all exact changes and initial protected hashes.
Do not alter old migrations, M7 push/pull/materializer/worker, purchases/costing,
M9 arithmetic/client/screens, scanner/photo/audio/sale/basket, recognition-lab,
native config, secrets, existing manifests/lockfiles or existing M8/Track B/root
tickets. If this ceiling is insufficient, stop with a concrete explanation.

Use M10_MARKET_PRICE_TICKETS.md, M10 workflow and M10 PROJECT_STATE paragraph
for evidence. Preserve other ledgers and dirt. New migration source may be
authored but cannot be applied to any persistent/hosted database in this window.
Do not start Docker/Postgres or live Auth, run a cloud build, touch phone/Metro,
change models, commit/push/merge or begin M11.

## Evidence and source acceptance

Focused tests: consent/version/replay/revocation; sanitizer allowlist/no forged
prices;4-vs5 independent stores; same-store/duplicate-device inflation; exact
odd/even rational median; package/currency/zone separation; future/stale/zero/
unmapped exclusion; revocation/cohort loss; scope/revision/expired cache and
malformed response; populated26->27 upgrade/restart; M7/M8/M9 compatibility;
accessible enabled/disabled/pending/insufficient/cached screens and routes.
Use fixtures explicitly labelled synthetic; no claims of real market density.

Author SQL boundary tests for role/table/function privileges, membership/device,
consent races, replay/hash conflict, authority of source/mapping and aggregate
results. Execution requires an approved disposable PostgreSQL environment.
If none is already authorized/available WITHOUT starting services or persistent
migration, record NOT RUN: SQL mocks/static tests cannot pass the live gate.
Do not launch Docker or use hosted credentials to manufacture a pass. Coordinator
may accept bounded source with this explicit blocker; external activation stays
blocked. M11 source planning may follow coordinator source acceptance; production
permissions/market readiness do not follow automatically.

Run focused tests, all typechecks/zero-warning lint, full validate, Doctor,
dependency check and Android export. Capture actual exits/skips and scope.
Deliver M10_IMPLEMENTATION_HANDOFF.md with baseline/final status/hash proof,
migrations and exact evidence. STOP commands/edits and report to coordinator
01a098ef-d830-7531-bca7-2d66b0a5b587; coordinator directly audits before M11.

## Bounded reference check

October3 Supabase changelog fetched; September25 PG15.19/17.11 notice reviewed.
No proposed ltree, legacy-cipher encryption, float-GiST or custom estimator use;
this source review does not inspect/upgrade a live instance.
https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes
Function privileges/search-path and RLS boundaries checked against official docs:
https://supabase.com/docs/guides/database/functions
https://supabase.com/docs/guides/database/postgres/row-level-security
No new framework, extension, middleware or schema deployment method is adopted.
