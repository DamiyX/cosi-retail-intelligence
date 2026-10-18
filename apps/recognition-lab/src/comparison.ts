import { performance } from 'node:perf_hooks';
import type { Config, Dataset, Split } from './schema.ts';
import { configSchema, LabError } from './schema.ts';
import type { QueryResult } from './experiment.ts';
import { metrics } from './metrics.ts';
import { prepareGallery, rank, unitVector } from './ranking.ts';
import { adaptPrecomputed, PRECOMPUTED_LABEL, queryInventory } from './precomputed.ts';
import { sha256 } from './provenance.ts';
import { holdoutCandidateConfig } from './candidateFreeze.ts';

export const comparisonLimits = [
  'Precomputed adapter imports recorded outputs; it DOES NOT execute an encoder, decode images or verify reported inference.',
  'Authored toy fixtures cannot establish model, real-data, native accuracy or licence approval.',
  'Recorded review references require independent exact artifact, code/weight rights, export/runtime and preprocessing review.',
  'Real R1 photos/curation, actual R2 encoder execution, R3 device measurements and R4 real calibration/quality gates remain pending, NOT waived.',
  'Reported timestamps/durations are unverified producer provenance; elapsedMs measures Node postprocessing only, never Android inference latency.',
  'No automatic winner, final model, production threshold or adoption decision is made.',
];
export function evaluatePrecomputed(adapted: ReturnType<typeof adaptPrecomputed>, input: Config, split: Split) {
  const config = configSchema.parse(input);
  if (adapted.bundle.split !== split) throw new LabError('SPLIT_MISMATCH', 'Adapter split changed');
  const dataset = adapted.adapted;
  const queries = dataset.entries.filter(e => e.role === 'query');
  const provenance = { label: PRECOMPUTED_LABEL, candidate: adapted.candidate, candidateHash: adapted.candidateHash,
    bundleHash: adapted.bundleHash, evidenceKind: adapted.bundle.evidenceKind,
    reportedProducerProvenance: adapted.bundle.provenance, reportedTimingVerification: 'UNVERIFIED_NOT_DEVICE_MEASUREMENT', config,
    configHash: sha256(JSON.stringify(config)) };
  const referenceFailures = dataset.entries.filter(e => e.role === 'reference' && e.observation?.kind === 'failure').map(e => ({
    entryId: e.id, code: e.observation?.kind === 'failure' ? e.observation.code : 'ADAPTER_ERROR',
  }));
  const reportedQueryFailures = queries.filter(e => e.observation?.kind === 'failure').map(e => ({
    entryId: e.id, code: e.observation?.kind === 'failure' ? e.observation.code : 'ADAPTER_ERROR',
  }));
  let gallery: ReturnType<typeof prepareGallery>;
  try {
    if (referenceFailures.length) throw new LabError('REFERENCE_ENCODING_FAILURE', 'Reference output failed; gallery setup prohibited');
    gallery = prepareGallery(dataset);
  } catch (error) {
    return { status: 'SETUP_FAILURE' as const, provenance, referenceFailures,
      setupCode: error instanceof LabError ? error.code : 'ADAPTER_ERROR',
      queryAccounting: { selected: queries.length, evaluated: 0, blockedBySetup: queries.length, reportedQueryFailures },
      results: null, metrics: null };
  }
  const results: QueryResult[] = queries.map(entry => {
    const start = performance.now();
    let outcome: QueryResult['outcome'];
    try { outcome = rank(unitVector(entry, dataset.adapter), gallery, config); }
    catch (error) { outcome = { status: 'FAILURE', code: error instanceof LabError ? error.code : 'ADAPTER_ERROR' }; }
    return { queryId: entry.id, truth: { productId: entry.productId, packageId: entry.packageId, known: entry.known },
      split, lighting: entry.capture.lighting, view: entry.capture.view, outcome, elapsedMs: performance.now() - start };
  });
  const measured = metrics(results);
  measured.label = PRECOMPUTED_LABEL;
  for (const timing of Object.values(measured.timing)) timing.label = 'Measured Node precomputed postprocessing milliseconds only; NO encoder/Android/camera timing';
  return { status: results.some(r => r.outcome.status === 'FAILURE') ? 'QUERY_FAILURES' as const : 'COMPLETED' as const,
    provenance, referenceFailures, setupCode: null,
    queryAccounting: { selected: queries.length, evaluated: results.length, blockedBySetup: 0, reportedQueryFailures }, results, metrics: measured };
}
export interface ComparisonInput { candidate: unknown; bundle: unknown; config: Config; frozen?: unknown }
export function compareCandidates(dataset: Dataset, manifestHash: string, split: Split, inputs: ComparisonInput[]) {
  if (inputs.length < 1 || inputs.length > 3) throw new LabError('CANDIDATE_COUNT', 'Compare one to three candidates');
  const inventory = queryInventory(dataset, split);
  if (!inventory.length) throw new LabError('EMPTY_QUERY_SPLIT', 'No queries in selected split');
  for (const input of inputs) {
    if (split === 'holdout') {
      if (input.frozen === undefined) throw new LabError('CONFIG_NOT_FROZEN', 'Holdout comparison requires a candidate-bound freeze');
      const config = holdoutCandidateConfig(input.frozen, dataset, manifestHash, input.candidate);
      if (JSON.stringify(configSchema.parse(input.config)) !== JSON.stringify(config))
        throw new LabError('FROZEN_CONFIG_OVERRIDE', 'Holdout configuration cannot be overridden');
    } else if (input.frozen !== undefined) throw new LabError('FROZEN_SPLIT', 'Frozen config is for holdout only');
  }
  const adapted = inputs.map(i => adaptPrecomputed(dataset, manifestHash, i.candidate, i.bundle, split));
  if (new Set(adapted.map(a => a.candidate.candidateId)).size !== inputs.length)
    throw new LabError('DUPLICATE_CANDIDATE', 'Candidate IDs must be distinct');
  return { schemaVersion: 1, label: (dataset.kind === 'synthetic-tooling-only' ? 'SYNTHETIC TOOLING-ONLY — ' : '') + PRECOMPUTED_LABEL,
    dataset: { datasetId: dataset.datasetId, version: dataset.version, kind: dataset.kind, manifestSha256: manifestHash },
    split, queryInventory: inventory, selectedQueryCount: inventory.length,
    candidates: adapted.map((a, i) => evaluatePrecomputed(a, inputs[i].config, split)),
    limitations: comparisonLimits, independentAcceptance: 'PENDING_NOT_AUTOMATED', realBenchmarkAccepted: false, winner: null };
}
export type ComparisonReport = ReturnType<typeof compareCandidates>;
export function comparisonSummary(report: ComparisonReport): string {
  const lines = [report.label, '', 'Encoder execution: NONE. Independent acceptance: PENDING. Winner: NONE.',
    'Dataset: ' + JSON.stringify(report.dataset), 'Split: ' + report.split,
    'Identical query inventory: ' + JSON.stringify(report.queryInventory), '', ...report.limitations.map(l => '- ' + l)];
  for (const candidate of report.candidates) {
    lines.push('', 'Candidate: ' + candidate.provenance.candidate.candidateId + '; status: ' + candidate.status,
      'Exact provenance: ' + JSON.stringify(candidate.provenance), 'Query accounting: ' + JSON.stringify(candidate.queryAccounting));
    if (!candidate.metrics) {
      lines.push('Setup failed; metrics N/A, queries NOT evaluated. Code: ' + candidate.setupCode,
        'Reference failures: ' + JSON.stringify(candidate.referenceFailures));
      continue;
    }
    lines.push('Populations: ' + JSON.stringify(candidate.metrics.populations), 'Package label coverage: ' + JSON.stringify(candidate.metrics.packageLabels),
      'Simulated display policy (no actual UI/user recovery): ' + JSON.stringify(candidate.metrics.simulatedDisplayPolicy),
      '', '| Metric | Rate (count/denominator) |', '| --- | --- |',
      ...Object.entries(candidate.metrics.rates).map(([name, r]) => '| ' + name + ' | ' +
        (r.value === null ? 'N/A' : (r.value * 100).toFixed(2) + '%') + ' (' + r.numerator + '/' + r.denominator + ') |'),
      '', 'Failure codes: ' + JSON.stringify(candidate.metrics.failureCodes), 'Confusion cases: ' + JSON.stringify(candidate.metrics.confusionCases),
      'Timing: ' + JSON.stringify(candidate.metrics.timing));
  }
  return [...lines, ''].join('\n');
}
