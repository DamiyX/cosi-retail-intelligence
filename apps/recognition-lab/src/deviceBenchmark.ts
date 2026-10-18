import { z } from 'zod';
import type { Dataset } from './schema.ts';
import { LabError } from './schema.ts';
import { candidateIdentity, validateCandidate } from './precomputed.ts';
import { sha256 } from './provenance.ts';
import { latency } from './metrics.ts';

export const DEVICE_LABEL = 'RECORDED OBSERVATIONS ONLY — NO ANDROID EXECUTION OR NATIVE ACCEPTANCE';
export const recordId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
export const recordHash = z.string().regex(/^[0-9a-f]{64}$/);
const finite = z.number().finite().nonnegative();
const bytes = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
// Identifiers reference separate reviewed evidence; arbitrary text/private paths
// are deliberately absent from reports and this lab-local capture contract.
export const targetSchema = z.object({
  schemaVersion: z.literal(1),
  export: z.object({ id: recordId, version: recordId, sha256: recordHash,
    format: recordId, precision: recordId, conversionMethodId: recordId, reviewReferenceId: recordId }).strict(),
  runtime: z.object({ id: recordId, version: recordId, artifactSha256: recordHash,
    delegate: recordId, configurationSha256: recordHash, reviewReferenceId: recordId }).strict(),
}).strict();
export type DeviceTarget = z.infer<typeof targetSchema>;
export function validateTarget(input: unknown): DeviceTarget {
  const parsed = targetSchema.safeParse(input);
  if (!parsed.success) throw new LabError('TARGET_INVALID', 'Invalid export/runtime declaration');
  return parsed.data;
}
export const targetIdentity = (target: DeviceTarget) => sha256(JSON.stringify(target));
const measured = <T extends z.ZodType>(value: T) => z.object({ value, methodId: recordId, evidenceId: recordId }).strict().nullable();
export const stages = ['startup', 'camera-ready', 'inference', 'capture-to-result', 'stable-result'] as const;
export const phases = ['cold', 'warmup', 'warm'] as const;
const inputIdentity = z.object({ entryId: recordId, assetSha256: recordHash }).strict();
const trialSchema = z.object({ id: recordId, stage: z.enum(stages), phase: z.enum(phases),
  input: inputIdentity.nullable(), methodId: recordId, evidenceId: recordId,
  outcome: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('success'), elapsedMs: finite }).strict(),
    z.object({ kind: z.literal('failure'), code: z.enum(['ADAPTER_ERROR', 'TIMEOUT', 'CRASH', 'UNAVAILABLE']), elapsedMs: finite.nullable() }).strict(),
  ]),
}).strict();
export const benchmarkSchema = z.object({
  schemaVersion: z.literal(1), recordId,
  evidenceKind: z.enum(['authored-toy', 'reported-physical-unverified']),
  dataset: z.object({ datasetId: recordId, version: recordId,
    kind: z.enum(['synthetic-tooling-only', 'real-capture']), manifestSha256: recordHash }).strict(),
  candidate: z.object({ candidateId: recordId, version: recordId, declarationSha256: recordHash,
    artifactSha256: recordHash, preprocessingId: recordId, preprocessingVersion: recordId,
    preprocessingSha256: recordHash, space: recordId, dimension: z.number().int().positive().max(100000) }).strict(),
  target: targetSchema, targetDeclarationSha256: recordHash,
  device: z.object({ pseudonym: recordId, model: recordId, androidVersion: recordId,
    conditionId: recordId }).strict(),
  provenance: z.object({ producerId: recordId, recordedAt: z.string().datetime().nullable(),
    collectionReferenceId: recordId, inventoryClaim: z.literal('supplied-record-only') }).strict(),
  inventory: z.array(inputIdentity), trials: z.array(trialSchema),
  observations: z.object({
    memoryBytes: z.object({ idle: measured(bytes), loaded: measured(bytes), inference: measured(bytes), afterSustained: measured(bytes) }).strict(),
    storageBytes: z.object({ model: measured(bytes), runtimeIncrease: measured(bytes), cache: measured(bytes),
      references: measured(bytes), embeddings: measured(bytes), thumbnails: measured(bytes), ocr: measured(bytes) }).strict(),
    extrapolatedStorageBytes: z.array(z.object({ products: z.number().int().positive(), bytes,
      methodId: recordId, evidenceId: recordId }).strict()),
    sustainedDurationMs: measured(finite),
    thermal: measured(z.enum(['no-change-observed', 'throttling-observed', 'not-observable'])),
    batteryDropPercent: measured(finite.max(100)), droppedFrames: measured(bytes),
    stability: measured(z.enum(['stable-observed', 'instability-observed', 'crash-observed'])),
    offline: z.object({ firstUseAirplane: measured(z.boolean()), restartAirplane: measured(z.boolean()),
      knownVisualAirplane: measured(z.boolean()), assetsAvailableAirplane: measured(z.boolean()) }).strict(),
  }).strict(),
}).strict();
export type DeviceBenchmark = z.infer<typeof benchmarkSchema>;

export function validateBenchmark(dataset: Dataset, manifestHash: string, candidateInput: unknown, targetInput: unknown, input: unknown) {
  const candidate = validateCandidate(candidateInput);
  if (candidate.kind === 'draft-unreviewed') throw new LabError('CANDIDATE_DRAFT', 'Exact candidate required');
  const target = validateTarget(targetInput);
  const parsed = benchmarkSchema.safeParse(input);
  if (!parsed.success) throw new LabError('BENCHMARK_INVALID', 'Invalid device benchmark record');
  const record = parsed.data;
  const expectedDataset = { datasetId: dataset.datasetId, version: dataset.version, kind: dataset.kind, manifestSha256: manifestHash };
  const expectedCandidate = { candidateId: candidate.candidateId, version: candidate.version,
    declarationSha256: candidateIdentity(candidate), artifactSha256: candidate.artifact.sha256,
    preprocessingId: candidate.preprocessing.id, preprocessingVersion: candidate.preprocessing.version,
    preprocessingSha256: candidate.preprocessing.sha256, space: candidate.embedding.space, dimension: candidate.embedding.dimension };
  if (JSON.stringify(record.dataset) !== JSON.stringify(expectedDataset) || JSON.stringify(record.candidate) !== JSON.stringify(expectedCandidate) ||
    JSON.stringify(record.target) !== JSON.stringify(target) || record.targetDeclarationSha256 !== targetIdentity(target))
    throw new LabError('BENCHMARK_BINDING_MISMATCH', 'Exact dataset/candidate/target binding changed');
  const toy = candidate.kind === 'authored-toy';
  if (dataset.kind !== (toy ? 'synthetic-tooling-only' : 'real-capture') ||
    record.evidenceKind !== (toy ? 'authored-toy' : 'reported-physical-unverified') ||
    !toy && (record.provenance.recordedAt === null || dataset.entries.some(e => e.observation !== undefined)))
    throw new LabError('EVIDENCE_KIND_MISMATCH', 'Toy/real provenance mismatch');
  const inventory = new Map<string, string>();
  const entries = new Map(dataset.entries.map(e => [e.id, e.asset.sha256]));
  for (const item of record.inventory) {
    if (inventory.has(item.entryId)) throw new LabError('DUPLICATE_INPUT', 'Duplicate inventory input');
    if (entries.get(item.entryId) !== item.assetSha256) throw new LabError('INPUT_BINDING_MISMATCH', 'Foreign or stale input');
    inventory.set(item.entryId, item.assetSha256);
  }
  const trialIds = new Set<string>();
  for (const trial of record.trials) {
    if (trialIds.has(trial.id)) throw new LabError('DUPLICATE_TRIAL', 'Duplicate trial');
    trialIds.add(trial.id);
    if (trial.input ? inventory.get(trial.input.entryId) !== trial.input.assetSha256 :
      ['inference', 'capture-to-result', 'stable-result'].includes(trial.stage))
      throw new LabError('TRIAL_INPUT_MISMATCH', 'Trial requires an exact inventoried input');
  }
  const extrapolations = record.observations.extrapolatedStorageBytes.map(e => e.products);
  if (new Set(extrapolations).size !== extrapolations.length) throw new LabError('DUPLICATE_EXTRAPOLATION', 'Duplicate storage estimate');
  return record;
}

export function benchmarkReport(record: DeviceBenchmark) {
  const groups = stages.flatMap(stage => phases.map(phase => {
    const trials = record.trials.filter(t => t.stage === stage && t.phase === phase);
    const success = trials.filter(t => t.outcome.kind === 'success');
    const failures = trials.filter(t => t.outcome.kind === 'failure');
    const samples = success.map(t => t.outcome.elapsedMs!).sort((a, b) => a - b);
    const timing = latency(samples);
    // Preserve finite supplied measurements even near Number.MAX_VALUE. The
    // accepted R0 helper's label/behavior remains untouched.
    if (samples.length) timing.median = samples[Math.floor((samples.length - 1) / 2)] / 2 + samples[Math.floor(samples.length / 2)] / 2;
    return { candidate: record.candidate, target: record.target, device: record.device, stage, phase,
      attempted: trials.length, successful: success.length, failed: failures.length,
      warmupAttempts: phase === 'warmup' ? trials.length : 0,
      failureCodes: Object.fromEntries(['ADAPTER_ERROR', 'TIMEOUT', 'CRASH', 'UNAVAILABLE'].map(code =>
        [code, failures.filter(t => t.outcome.kind === 'failure' && t.outcome.code === code).length])),
      failureElapsedMissing: failures.filter(t => t.outcome.elapsedMs === null).length,
      timing: { ...timing, label: 'Supplied/unverified successful-trial milliseconds; NOT measured by this CLI' } };
  }));
  const missing: string[] = groups.filter(g => !g.attempted).map(g => 'trials.' + g.stage + '.' + g.phase);
  if (!record.inventory.length) missing.push('input-inventory');
  for (const item of record.inventory) if (!record.trials.some(t => t.input?.entryId === item.entryId)) missing.push('trials.input.' + item.entryId);
  const observations = record.observations;
  for (const key of ['memoryBytes', 'storageBytes', 'offline'] as const)
    for (const [stage, value] of Object.entries(observations[key])) if (value === null) missing.push(key + '.' + stage);
  for (const key of ['sustainedDurationMs', 'thermal', 'batteryDropPercent', 'droppedFrames', 'stability'] as const)
    if (observations[key] === null) missing.push(key);
  if (observations.sustainedDurationMs !== null && observations.sustainedDurationMs.value < 600000) missing.push('sustained-duration-below-10-minutes');
  const failedOffline = Object.entries(observations.offline).filter(([, value]) => value?.value === false).map(([key]) => key);
  const observedConcerns = [...failedOffline.map(key => 'offline.' + key),
    ...(observations.thermal?.value === 'throttling-observed' ? ['thermal.throttling-observed'] : []),
    ...(observations.stability && observations.stability.value !== 'stable-observed' ? ['stability.' + observations.stability.value] : [])];
  if (observations.thermal?.value === 'not-observable') missing.push('thermal-observability');
  return { schemaVersion: 1, label: (record.evidenceKind === 'authored-toy' ? 'SYNTHETIC TOOLING-ONLY — ' : '') + DEVICE_LABEL,
    recordId: record.recordId, evidenceKind: record.evidenceKind, dataset: record.dataset, candidate: record.candidate,
    target: record.target, targetDeclarationSha256: record.targetDeclarationSha256, device: record.device, provenance: record.provenance,
    inventoryCount: record.inventory.length,
    counts: { attempted: record.trials.length, successful: record.trials.filter(t => t.outcome.kind === 'success').length,
      failed: record.trials.filter(t => t.outcome.kind === 'failure').length, warmupAttempts: record.trials.filter(t => t.phase === 'warmup').length },
    groups, suppliedObservations: observations, missingCoverage: missing, observedConcerns,
    independentAcceptance: 'PENDING_NOT_AUTOMATED', realDeviceBenchmarkAccepted: false,
    limitations: ['Inventory is supplied-record-only; complete collection is not verified.',
      'All timings/observations/provenance are supplied and unverified. No device/encoder executes here.',
      'Small successful samples suppress p90/p95; failure counts remain visible, no failed timing is imputed.',
      'Export/runtime declarations are hash-bound records, not verification of binaries or rights.',
      'No automatic hardware pass, safety cap, model selection or production inference guarantee.'] };
}
