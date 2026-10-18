# Founder guide — local label text, after source acceptance

This preparation is STOPPED for independent coordinator review. Actual private
text review has not occurred. Wait for source acceptance and the coordinator's
review instruction before opening the private review pages. Browser automation
could not open the generated file page; real-browser rendering, EXIF orientation,
zoom and file-dialog behavior still need an ordinary local manual check with
generated images before private review. No server or upload is required.

The current packet is `apps/recognition-lab/runs/label-evidence/preparation-20261011-a3/`.
Its two pages contain frozen image geometry and blank text records, with no embedded
photos. `preparation-20261011-a1` and `preparation-20261011-a2` are retained stale
packets; do not use them. A3 here is a preparation revision, not an inference attempt.

1. After acceptance, open `review-references.html` locally. Select only the20
   approved matching reference JPEGs from the existing `private-data/r1-pilot/`
   originals. Open `review-queries.html` separately and select only the20 matching
   query JPEGs from `private-data/r1-pilot/exploratory-20261004/`. Do not select all40
   in either page: unknown or duplicate files reject the entire new selection.
   Selection binds raw buffers by SHA256, regardless of their filenames.
2. Use Previous/Next or Image ID. The page clips the original to its existing
   effective crop; the zoom control changes display size only. There are no new
   crop boxes. If orientation/dimensions look wrong, or the image cannot display,
   stop and report it rather than editing a box or converting the photo.
3. Record only characters legible inside that crop. Choose readable, partial,
   unreadable, no visible text, or conflicting transcription honestly. Do not
   copy catalogue labels, look at candidate suggestions or fill missing digits
   from memory. For partial text, retain only the readable portion. Select literal
   characters in the textarea and assign brand/name, variant, or quantity spans.
   Editing literal text clears the spans. Normalization is shown separately.
   Every partial observation abstains from candidate decisions, even when one
   field appears readable: this schema cannot certify field completeness.
   Partial reference observations are omitted from decisive reference cards;
   their missing fields remain unknown. Literal text/spans and partial counts
   are retained for review. Do not mark a fragment readable to force a decision.
4. Export partial progress frequently; import it to resume. JSON contains text,
   spans, IDs and hashes only. All20 rows remain even when not reviewed. A reviewed
   export requires matching selected files and valid status/text for every row;
   unreadable/no-text are valid reviewed outcomes. It cannot certify truthful
   visibility. Stale bindings, duplicate/orphan/missing rows and forged spans reject.
5. Give the coordinator the two text JSON files locally. The coordinator freezes
   reference evidence before any assisted ranks, merges the reviews, and reviews
   a separately bound analysis approval. Do not edit reference cards directly.
   There is no approved private analysis in this packet: its approval template
   explicitly says `DRAFT_NOT_APPROVED`.

The fixed rule can reorder only the saved CC visual top3, keeping scores and the
remaining order unchanged. One candidate needs a matching field and no observed
contradiction; every rival needs an explicit contradiction. Missing metadata is
unknown and blocks exclusion. Multipacks, competing quantities, percentages,
unclear digits, partial observations and conflicting transcriptions abstain.
Only fully readable reference observations supply decisive fields.
`600ml=0.6L`; mass, volume
and count are separate. All contradicted candidates retain their order and request
manual confirmation. No recognition state or retail transaction changes.

A complete exploratory diagnostic counts all20 queries. The engineering signal
is at least one first-choice gain and zero losses; an incomplete review cannot
claim it. Wrong transcription can create a loss. This manual, non-blinded,
same-instance diagnostic is not OCR extraction performance, independent holdout
accuracy or Android/production acceptance.

For the future dataset, fill a private copy of
`apps/recognition-lab/templates/next-phase-inventory/availability.csv` with actual
30–50 known identity/package availability and unknown candidates. Record missing
independent samples and rights/condition gaps. This is inventory planning only;
the coordinator freezes any capture order later.
