import { core, config } from './labelEvidenceSchema.ts';
import type { Manifest, Observation, Progress, ReferenceCard } from './labelEvidenceSchema.ts';
import type { loadLabelInputs } from './labelEvidenceInputs.ts';

export interface ReferenceFreeze { schemaVersion: 1; kind: 'LABEL_REFERENCE_FREEZE'; bindingSha256: string; ruleSha256: string;
  sourceSha256: string; referenceEntries: Observation[]; cards: ReferenceCard[]; frozenBeforeAssistedRanks: true }
export function freezeReferences(manifest: Manifest, bindingSha256: string, value: unknown): ReferenceFreeze {
  const progress = core.validateProgress(value, config(manifest, bindingSha256, 'references'));
  if (!core.complete(progress)) throw Error('LABEL_REFERENCES_UNREVIEWED');
  return { schemaVersion: 1, kind: 'LABEL_REFERENCE_FREEZE', bindingSha256, ruleSha256: manifest.ruleSha256,
    sourceSha256: manifest.sourceSha256, referenceEntries: progress.entries,
    cards: core.referenceCards(progress.entries, manifest.entries.filter(e => e.role === 'reference')), frozenBeforeAssistedRanks: true };
}
export function validateReferenceFreeze(manifest: Manifest, bindingSha256: string, value: unknown) {
  if (!core.keys(value, ['schemaVersion', 'kind', 'bindingSha256', 'ruleSha256', 'sourceSha256', 'referenceEntries', 'cards', 'frozenBeforeAssistedRanks'])) throw Error('LABEL_REFERENCE_FREEZE_SCHEMA');
  const v = value as ReferenceFreeze;
  const expected = freezeReferences(manifest, bindingSha256, { schemaVersion: 1, kind: 'LABEL_TEXT_REVIEW', bindingSha256,
    ruleSha256: manifest.ruleSha256, scope: 'references', entries: v.referenceEntries });
  if (core.canonical(value) !== core.canonical(expected)) throw Error('LABEL_REFERENCE_FREEZE_BINDING');
  return expected;
}
export function mergeReviews(manifest: Manifest, bindingSha256: string, references: unknown, queries: unknown): Progress {
  const refs = core.validateProgress(references, config(manifest, bindingSha256, 'references'));
  const query = core.validateProgress(queries, config(manifest, bindingSha256, 'queries'));
  return core.validateProgress({ ...refs, scope: 'all', entries: [...refs.entries, ...query.entries] }, config(manifest, bindingSha256, 'all'));
}
export function analyzeLabels(loaded: ReturnType<typeof loadLabelInputs>, bindingSha256: string, value: unknown, freezeValue: unknown,
  referenceFreezeSha256: string, reviewSha256: string) {
  const { manifest, report } = loaded;
  const progress = core.validateProgress(value, config(manifest, bindingSha256, 'all'));
  const freeze = validateReferenceFreeze(manifest, bindingSha256, freezeValue);
  const refs = progress.entries.filter(e => manifest.entries.find(f => f.id === e.id)?.role === 'reference');
  if (core.canonical(refs) !== core.canonical(freeze.referenceEntries)) throw Error('LABEL_REFERENCE_FREEZE_DRIFT');
  const cc = report.conditions.find(e => e.condition === 'CC')!;
  const rows = cc.rows.map(saved => {
    const e = progress.entries.find(e => e.id === saved.id)!;
    const original = saved.candidates.slice(0, 3);
    const assisted = core.assist(e, original, freeze.cards);
    if (core.canonical(assisted.candidates.slice().sort((a, b) => a.productId.localeCompare(b.productId))) !==
        core.canonical(original.slice().sort((a, b) => a.productId.localeCompare(b.productId)))) throw Error('LABEL_CANDIDATE_OR_SCORE_MUTATION');
    const afterRank = saved.correctRank !== null && saved.correctRank <= 3 ? assisted.candidates.findIndex(c => c.productId === saved.truth) + 1 : saved.correctRank;
    const afterFirst = afterRank === 1;
    return { id: saved.id, truth: saved.truth, failures: saved.failures, readability: e.readability, literal: e.literal,
      observedFields: e.fields, normalized: core.observe(e), visualCorrectRank: saved.correctRank, assistedCorrectRank: afterRank,
      visualFirst: saved.first, assistedFirst: afterFirst, visualFirstThree: saved.firstThree, assistedFirstThree: saved.firstThree,
      savedTop3: original, assistedTop3: assisted.candidates, evidence: assisted.evidence, promoted: assisted.promoted,
      manualConfirmation: assisted.manualConfirmation, reason: assisted.reason,
      firstChoice: saved.correctRank === null ? 'UNSCORED' : !saved.first && afterFirst ? 'GAIN' : saved.first && !afterFirst ? 'LOSS' : 'UNCHANGED' };
  });
  if (rows.length !== 20 || new Set(rows.map(e => e.id)).size !== 20) throw Error('LABEL_QUERY_DENOMINATOR');
  const complete = core.complete(progress) && rows.every(e => e.visualCorrectRank !== null);
  const summary = { denominator: 20, reviewed: rows.filter(e => e.readability !== 'not-reviewed').length,
    scored: rows.filter(e => e.visualCorrectRank !== null).length, visualFirst: rows.filter(e => e.visualFirst).length,
    assistedFirst: rows.filter(e => e.assistedFirst).length, visualFirstThree: rows.filter(e => e.visualFirstThree).length,
    assistedFirstThree: rows.filter(e => e.assistedFirstThree).length, gains: rows.filter(e => e.firstChoice === 'GAIN').length,
    losses: rows.filter(e => e.firstChoice === 'LOSS').length, promotions: rows.filter(e => e.promoted).length,
    manualConfirmation: rows.filter(e => e.manualConfirmation).length,
    readability: Object.fromEntries(core.states.map(s => [s, rows.filter(e => e.readability === s).length])),
    fieldAvailability: Object.fromEntries(core.fields.map(field => [field, rows.filter(e => e.normalized.values[field] !== null).length])) };
  return { schemaVersion: 1, kind: 'LABEL_EVIDENCE_DIAGNOSTIC', formalAdmission: false, complete, denominator: 20,
    bindingSha256, ruleSha256: manifest.ruleSha256, sourceSha256: manifest.sourceSha256, referenceFreezeSha256, reviewSha256,
    inputSha256: manifest.inputSha256, summary, rows,
    engineeringTriagePositive: complete ? summary.gains >= 1 && summary.losses === 0 : null,
    limitations: ['Manual, non-blinded, correlated same-instance exploratory evidence; not OCR extraction performance.',
      'Only the saved visual top3 can be reordered; raw similarity is unchanged and is not probability.',
      'Literal visibility, truthful transcription and freeze-before-viewing cannot be proved by self-certification or hashes.',
      'Wrong transcription can promote a wrong candidate and cause a loss. No recognition-state, sale or stock change.',
      'No independent holdout, unknown calibration, phone/Android, enrollment, automated OCR or production gate passed.'] };
}
export type LabelAnalysis = ReturnType<typeof analyzeLabels>;
