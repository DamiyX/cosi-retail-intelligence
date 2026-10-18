import { z } from 'zod';
import type { Dataset } from './schema.ts';
import { LabError, splitSchema } from './schema.ts';
import { adaptPrecomputed } from './precomputed.ts';
import { unitVector } from './ranking.ts';
import { benchmarkSchema, recordHash, recordId, DEVICE_LABEL } from './deviceBenchmark.ts';
import type { DeviceBenchmark } from './deviceBenchmark.ts';
const recordSchema = z.object({
  schemaVersion: z.literal(1), evidenceKind: z.enum(['authored-toy', 'reported-physical-unverified']),
  benchmarkRecordId: recordId, dataset: benchmarkSchema.shape.dataset, candidate: benchmarkSchema.shape.candidate,
  targetDeclarationSha256: recordHash, split: splitSchema, referenceBundleSha256: recordHash,
  experiment: z.object({ id: recordId, maxNormalizedError: z.number().finite().nonnegative(),
    maxCosineDifference: z.number().finite().nonnegative() }).strict(),
  provenance: z.object({ producerId: recordId, evidenceId: recordId }).strict(),
  outputs: z.array(z.object({ entryId: recordId, assetSha256: recordHash,
    output: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('vector'), space: recordId, values: z.array(z.number().finite()).min(1) }).strict(),
      z.object({ kind: z.literal('failure'), code: z.enum(['ADAPTER_ERROR', 'TIMEOUT', 'CRASH', 'UNAVAILABLE']) }).strict(),
    ]),
  }).strict()),
}).strict();

// Caller passes the exact validated benchmark. Reference/native outputs are
// recorded inputs only; neither side is executed. Every inventoried pair must
// exist, including failures. Missing data is invalid, never an intersection.
export function equivalenceReport(dataset: Dataset, manifestHash: string, candidateInput: unknown,
  benchmark: DeviceBenchmark, referenceInput: unknown, input: unknown) {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) throw new LabError('EQUIVALENCE_INVALID', 'Invalid paired record');
  const record = parsed.data;
  const reference = adaptPrecomputed(dataset, manifestHash, candidateInput, referenceInput, record.split);
  if (JSON.stringify(record.dataset) !== JSON.stringify(benchmark.dataset) ||
    JSON.stringify(record.candidate) !== JSON.stringify(benchmark.candidate) ||
    record.candidate.declarationSha256 !== reference.candidateHash || record.evidenceKind !== benchmark.evidenceKind ||
    record.targetDeclarationSha256 !== benchmark.targetDeclarationSha256 || record.benchmarkRecordId !== benchmark.recordId ||
    record.referenceBundleSha256 !== reference.bundleHash)
    throw new LabError('EQUIVALENCE_BINDING_MISMATCH', 'Exact pair provenance changed');
  const refs = new Map(reference.bundle.outputs.map(e => [e.entryId, e]));
  const inventory = new Map(benchmark.inventory.map(e => [e.entryId, e.assetSha256]));
  if (!inventory.size) throw new LabError('EMPTY_PAIR_INVENTORY', 'Explicit pair inventory required');
  const natives = new Map<string, z.infer<typeof recordSchema>['outputs'][number]>();
  const entryMap = new Map(dataset.entries.map(e => [e.id, e]));
  const normalize = (entryId: string, output: { space: string; values: number[] }) =>
    unitVector({ ...entryMap.get(entryId)!, observation: { kind: 'vector', vector: output } }, reference.adapted.adapter);
  for (const native of record.outputs) {
    if (natives.has(native.entryId)) throw new LabError('DUPLICATE_PAIR', 'Duplicate native output');
    if (!inventory.has(native.entryId)) throw new LabError('ORPHAN_PAIR', 'Output outside explicit pair inventory');
    if (inventory.get(native.entryId) !== native.assetSha256) throw new LabError('PAIR_ASSET_MISMATCH', 'Native input changed');
    if (native.output.kind === 'vector') normalize(native.entryId, native.output);
    natives.set(native.entryId, native);
  }
  if (natives.size !== inventory.size) throw new LabError('MISSING_PAIR', 'Missing native output; record an explicit failure');
  const pairs = benchmark.inventory.map(item => {
    const ref = refs.get(item.entryId);
    if (!ref || ref.assetSha256 !== item.assetSha256) throw new LabError('REFERENCE_PAIR_MISMATCH', 'Reference missing or outside selected split');
    const native = natives.get(item.entryId)!;
    const referenceFailure = ref.output.kind === 'failure' ? ref.output.code : null;
    const nativeFailure = native.output.kind === 'failure' ? native.output.code : null;
    if (ref.output.kind === 'failure' || native.output.kind === 'failure')
      return { ...item, status: 'PAIR_FAILURE' as const, referenceFailure, nativeFailure, maxNormalizedError: null, cosineDifference: null };
    const a = normalize(item.entryId, ref.output); const b = normalize(item.entryId, native.output);
    const maxNormalizedError = a.reduce((max, v, i) => Math.max(max, Math.abs(v - b[i])), 0);
    const cosineDifference = 1 - Math.max(-1, Math.min(1, a.reduce((sum, v, i) => sum + v * b[i], 0)));
    return { ...item, status: maxNormalizedError <= record.experiment.maxNormalizedError &&
      cosineDifference <= record.experiment.maxCosineDifference ? 'WITHIN_TOLERANCE' as const : 'DRIFT' as const,
      referenceFailure, nativeFailure, maxNormalizedError, cosineDifference };
  });
  const compared = pairs.filter(p => p.status !== 'PAIR_FAILURE');
  return { schemaVersion: 1, label: (record.evidenceKind === 'authored-toy' ? 'SYNTHETIC TOOLING-ONLY — ' : '') + DEVICE_LABEL,
    evidenceKind: record.evidenceKind, benchmarkRecordId: record.benchmarkRecordId, dataset: record.dataset, candidate: record.candidate,
    target: benchmark.target, targetDeclarationSha256: record.targetDeclarationSha256, referenceBundleSha256: reference.bundleHash,
    split: record.split, experiment: record.experiment, provenance: record.provenance,
    counts: { inventoried: pairs.length, compared: compared.length, withinTolerance: pairs.filter(p => p.status === 'WITHIN_TOLERANCE').length,
      drift: pairs.filter(p => p.status === 'DRIFT').length, failed: pairs.length - compared.length,
      referenceFailures: pairs.filter(p => p.referenceFailure !== null).length, nativeFailures: pairs.filter(p => p.nativeFailure !== null).length },
    maxima: { normalizedError: compared.length ? compared.reduce((max, p) => Math.max(max, p.maxNormalizedError!), 0) : null,
      cosineDifference: compared.length ? compared.reduce((max, p) => Math.max(max, p.cosineDifference!), 0) : null }, pairs,
    independentAcceptance: 'PENDING_NOT_AUTOMATED', realExportCorrectnessAccepted: false,
    limitations: ['Paired recorded outputs only; no inference, export conversion or binary verification occurs.',
      'Tolerances belong to this stated experiment, not universal precision or production guarantees.',
      'Failures remain in the pair inventory. Agreement does not prove recognition quality, ranking or near-threshold behavior.'] };
}
