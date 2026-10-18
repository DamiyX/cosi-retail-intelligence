import { z } from 'zod';
import { configSchema, LabError, splitSchema } from './schema.ts';
import type { Dataset, Split } from './schema.ts';
import { adaptPrecomputed, PRECOMPUTED_LABEL, queryInventory } from './precomputed.ts';
import { comparisonLimits, evaluatePrecomputed } from './comparison.ts';
import { sha256 } from './provenance.ts';
import { frozenCandidateSchema } from './candidateFreeze.ts';
export function calibrateCandidate(dataset: Dataset, manifestHash: string, candidate: unknown, bundle: unknown,
  configs: unknown, chosenIndex: number, split: Split) {
  if (splitSchema.parse(split) !== 'calibration') throw new LabError('CALIBRATION_ONLY', 'Calibration choice/sweep cannot use another split');
  const parsed = z.array(configSchema).min(1).max(50).parse(configs);
  if (!Number.isInteger(chosenIndex) || chosenIndex < 0 || chosenIndex >= parsed.length)
    throw new LabError('CONFIG_CHOICE', 'Explicit calibration config choice required');
  const adapted = adaptPrecomputed(dataset, manifestHash, candidate, bundle, 'calibration');
  const sweeps = parsed.map(config => evaluatePrecomputed(adapted, config, 'calibration'));
  if (sweeps.some(s => s.status === 'SETUP_FAILURE')) throw new LabError('CALIBRATION_SETUP_FAILURE', 'Cannot freeze a failed gallery');
  const config = parsed[chosenIndex];
  const binding = { schemaVersion: 1 as const, label: PRECOMPUTED_LABEL,
    evidenceKind: adapted.bundle.evidenceKind, datasetKind: dataset.kind, sourceSplit: 'calibration' as const,
    selection: 'explicit-calibration-choice-not-production-threshold' as const,
    candidateHash: adapted.candidateHash, calibrationBundleHash: adapted.bundleHash,
    datasetHash: manifestHash, datasetContentHash: sha256(JSON.stringify(dataset)),
    calibrationQueries: queryInventory(dataset, 'calibration'), holdoutQueries: queryInventory(dataset, 'holdout'),
    config, configHash: sha256(JSON.stringify(config)), chosenIndex };
  if (!binding.holdoutQueries.length) throw new LabError('EMPTY_HOLDOUT', 'Freeze requires a nonempty holdout inventory');
  const frozen = frozenCandidateSchema.parse({ ...binding, sealHash: sha256(JSON.stringify(binding)) });
  return { label: (dataset.kind === 'synthetic-tooling-only' ? 'SYNTHETIC TOOLING-ONLY — ' : '') + PRECOMPUTED_LABEL,
    sourceSplit: 'calibration' as const, sweeps, frozen, limitations: comparisonLimits,
    limitation: 'Checksum detects accidental drift, not signatures, human holdout secrecy or prevention of deliberate retuning. No encoder execution or acceptance.' };
}
