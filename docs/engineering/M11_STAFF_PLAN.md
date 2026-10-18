# M11 — Staff attribution, owner review and access groundwork

Date:2026-10-03. Founder has authorized continuing M11, superseding the earlier
hold. Coordinator owns planning/tickets and EVERY independent audit. One new
implementation chat, GPT-6.1 Sol HIGH, works alone and returns STOPPED.

## Verified starting point

Actual checkout: `C:\Users\doyew\Documents\DEV 2\COSI-m8-planning`;
branch `plan/m8-unified-scanner`, HEAD `66ea3fc22595a48d7355d1729bb879496cc98896`.
M9 and M10 software source accepted; M10 activation OFF and all unrun live gates
remain pending. Valid M8/Track B/M9/M10 uncommitted work must be preserved.

Schema27 already has users, OWNER/ADMIN/STAFF memberships, user-bound devices and
actor IDs in sales, purchases, money-out, inventory reconciliations/checks and
attempts. First local provisioning binds an OWNER to its device. Pilot sync is
owner-specific. Existing M7 server reference restoration preserves inactive
historical identities under D-045. Do not reinterpret historical provenance as
current permission, or rewrite facts after a member is suspended.

Observed source gaps: sales/purchases/inventory client resolvers accept an ACTIVE
membership without always checking users.status; finance selects an OWNER without
the same account check. Several select the first member when identity is omitted,
and construction alone does not establish ongoing access. Direct command paths
must be inspected too, not merely screen visibility. These are source observations
until reproduced; implementer must retain failure/denial evidence.

Existing PRD owner/admin wording is narrowed by D-040/D-041/D-044 and M9/M10
OWNER controls. Those established finance/reconciliation/price rules remain.
No implicit ADMIN money-out or STAFF financial-report grant is authorized.

## Deliverable and release boundary

Deliver a source-reviewed foundation: accurate current actor resolution,
consistent revocation checks, owner activity/accountability view and conservative
owner member/device status-control prototype. D-052 is the source ceiling.

**This is not permission to enable real staff accounts.** Existing store-wide
sync/bootstrap and full business graphs are not a proven least-privilege cashier
feed. No cashier may receive all owner cost/expense/withdrawal/history/reference
data merely because the account is a member. Current shipped staff enrollment/
switching/management transport stays unavailable until the live authority and
staff data-visibility gates are separately designed, verified and approved.
Do not introduce a local role picker, arbitrary actor selector, PIN-as-Auth,
fake authenticated user, offline privilege grant or shared-owner impersonation.

Current internal operations that already accept non-owner actors must retain
their documented semantics unless a concrete security defect requires narrowing.
Do not turn that into new end-user staff activation. OWNER-only operations stay
OWNER-only. Ambiguous or absent identity fails closed; a bound ACTIVE device user
is a valid local identity anchor, not proof of remote authentication.

## Four sequential vertical tickets

M11-01 current actor/access correctness -> M11-02 owner activity visibility ->
M11-03 conservative member/device control source -> M11-04 evidence/return.
Full acceptance criteria are in M11_STAFF_TICKETS.md, the sole M11 ticket ledger.
Founder has delegated ticket granularity/dependencies to coordinator; no repeat
granularity approval is required. Root M8 tickets remain preserved.

## Boundaries, files and migrations

Likely source:small actor/access helper in mobile storeContext; existing client
and business-command guards only where verified; owner staff client/screen/route
and More link; new focused tests; additive staff-control contracts if needed;
one additive server migration and authored tests for bounded owner status RPCs.
Inspect actual dependencies before editing. No broad client rewrite.

Existing business facts are the activity source of truth; bounded ordered queries
or reconstructable view, not duplicated business history. Preserve actor/member/
device IDs and historical missing/inactive label fallbacks. No fabricated role-
at-time or globally trustworthy device-time order.

Status controls are restricted to existing non-OWNER memberships and their bound
devices, owner-confirmed suspension/reactivation of membership only and revocation
of device only. Do not reactivate a revoked device (existing reenrollment rule),
change OWNER/ADMIN/STAFF roles, transfer ownership, create Auth accounts or invite
people. No last-owner/self-lockout path. Cross-store/account references rejected.
Requests require current authenticated ACTIVE OWNER, same-store ACTIVE bound
device, idempotent operation/body/version binding and transactional review trail.
Local pending requests/receipts never grant permission; timeout/restart must not
mislabel confirmation. Offline shows saved state plus truthful pending intent.
Return only minimum owner-visible member/device fields; no tokens/contact lists.

SQLite28 only if durable pending/confirmed staff-control state genuinely requires
it; never modify definitions1–27 or add decorative tables. Server schema changes
are migration SOURCE ONLY; no existing persistent DB migration. Prefer private
restricted control/receipt tables to changing immutable business envelopes.
No M7 protocol/envelope change or staff-filtered feed without coordinator review.
Any necessary narrowing of existing server authorization must be explained with
actual path/tests, added via a new migration, and remain undeployed.

## Staff stock checks and remaining M11 scope

PC-03c/PC-04 remain M11 requirements. This slice must expose owner review of
existing check completion, discrepancies, reasoned replacements and attempts,
showing actual recorded actors and no fraud assertion. Existing assignments have
creator/closer IDs, not an approved assignee permission model. Different-staff
assignment and blind staff submission are explicitly OPEN M11 extension gates,
not silently claimed delivered or reassigned to M12. Preserve first count/recount
evidence and OWNER review/reconciliation rules. Do not add assignee fields or
permit STAFF reconciliation while the staff session/data-visibility design is
unresolved. Implementer reports concrete extension needs; no broad HR work.

## Security and verification

Abuse paths: suspended account with ACTIVE membership -> old client -> private
read/write; mismatched actor/device -> false sale attribution; STAFF/ADMIN caller
-> owner status control -> privilege change; delayed status acknowledgement ->
local reactivation; historical restore -> accidental access revival. Test allowed
and denied paths at command/client and authored server boundaries, not just UI.
Local cached revocation cannot instantly learn a remote offline change; state
this limit. Rejected local commands must create no business/outbox side effect.
Authorized historical replay still restores provenance without authorizing new
commands. Keep exact money/package/FEFO/costing/atomicity/idempotence unchanged.

Focused SQLite/client/command/UI and synthetic RPC tests; all workspace types/
zero-warning lint after tickets; final documented validation, Doctor/dependency
and Android export when supported. No packages/native dependencies. Auth/SQL/RLS/
concurrency, true staff visibility, actual accounts/multiple devices, native/
accessibility/offline/second-laptop/release tests stay pending if unrun. Mocks
never pass them. Capture fresh byte baseline before edits and report exact deltas.

Bounded official reference check: Supabase RLS and function docs confirm grants,
row policies and privileged RPC checks require separate review; no runtime proof.
https://supabase.com/docs/guides/database/postgres/row-level-security
https://supabase.com/docs/guides/database/functions
Changelog markdown fetch was rejected by the browser content-type handler; no
version-specific new Supabase feature is assumed. Use installed pinned tooling.

No live changes, Docker/services/phone/Metro, cloud spending/build, Git commits/
reset/stash/rebase/push/merge or new milestone. Stop/report questions if a needed
change exceeds the source ceiling. Coordinator audits only stopped returns.

Planning checks: M11 workflow and index passed Ajv2020+formats; gate dependency
DAG, artifact existence and exact checkout existence verified. git diff --check
exit0 with existing CRLF notices. No implementation tests or feature pass claimed.
