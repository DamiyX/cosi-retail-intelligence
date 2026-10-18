import { z } from 'zod';
import { configSchema, LabError } from './schema.ts';
import type { Config, Dataset } from './schema.ts';
import { candidateIdentity, PRECOMPUTED_LABEL, queryInventory, validateCandidate } from './precomputed.ts';
import { sha256 } from './provenance.ts';

const hash = z.string().regex(/^[0-9a-f]{64}$/);
const inventory = z.array(z.object({ entryId: z.string().min(1), assetSha256: hash }).strict()).min(1);
export const frozenCandidateSchema = z.object({
  schemaVersion: z.literal(1), label: z.literal(PRECOMPUTED_LABEL),
  evidenceKind: z.enum(['authored-toy', 'reported-encoder-output-unverified']), datasetKind: z.enum(['synthetic-tooling-only', 'real-capture']),
  sourceSplit: z.literal('calibration'),
  selection: z.literal('explicit-calibration-choice-not-production-threshold'),
  candidateHash: hash, calibrationBundleHash: hash,
  datasetHash: hash, datasetContentHash: hash,
  calibrationQueries: inventory, holdoutQueries: inventory,
  config: configSchema, configHash: hash, chosenIndex: z.number().int().nonnegative().max(49),
  sealHash: hash,
}).strict();
export function holdoutCandidateConfig(input: unknown, dataset: Dataset, manifestHash: string, candidateInput: unknown): Config {
  const frozen = frozenCandidateSchema.safeParse(input);
  if (!frozen.success) throw new LabError('FROZEN_CANDIDATE_INVALID', 'Invalid candidate-bound freeze');
  const { sealHash, ...binding } = frozen.data;
  const candidate = validateCandidate(candidateInput);
  if (candidate.kind === 'draft-unreviewed' || binding.candidateHash !== candidateIdentity(candidate) ||
    binding.datasetKind !== dataset.kind || binding.evidenceKind !== (candidate.kind === 'authored-toy' ? 'authored-toy' : 'reported-encoder-output-unverified') ||
    binding.datasetHash !== manifestHash || binding.datasetContentHash !== sha256(JSON.stringify(dataset)) ||
    binding.configHash !== sha256(JSON.stringify(binding.config)) || sealHash !== sha256(JSON.stringify(binding)) ||
    JSON.stringify(binding.calibrationQueries) !== JSON.stringify(queryInventory(dataset, 'calibration')) ||
    JSON.stringify(binding.holdoutQueries) !== JSON.stringify(queryInventory(dataset, 'holdout')))
    throw new LabError('FROZEN_CANDIDATE_MISMATCH', 'Candidate/artifact/preprocessing/dataset/config/query freeze changed');
  return binding.config;
}
