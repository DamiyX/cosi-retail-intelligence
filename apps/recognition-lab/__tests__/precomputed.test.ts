import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importDataset } from '../src/importer.ts';
import { adaptPrecomputed, candidateIdentity, validateCandidate } from '../src/precomputed.ts';
import { sha256 } from '../src/provenance.ts';
import { LabError } from '../src/schema.ts';

const fixtures = resolve(__dirname, '../fixtures');
const load = (name: string) => JSON.parse(readFileSync(resolve(fixtures, 'r2', name + '.json'), 'utf8'));
const imported = () => importDataset(resolve(fixtures, 'dataset.json'), fixtures);
function adapt(candidate = load('toy-a'), bundle = load('toy-a-development')) {
  const { dataset, manifestHash } = imported();
  return adaptPrecomputed(dataset, manifestHash, candidate, bundle, 'development');
}
function rejects(action: () => unknown, code: string) {
  try { action(); throw new Error('Unexpected acceptance'); } catch (e) { expect(e).toBeInstanceOf(LabError); expect((e as LabError).code).toBe(code); }
}
test('adapter binds imported assets and retains all queries and injected failures', () => {
  const result = adapt();
  expect(result.adapted.entries).toHaveLength(9);
  expect(result.adapted.entries.filter(e => e.role === 'query')).toHaveLength(3);
  expect(result.adapted.entries.some(e => e.observation?.kind === 'failure')).toBe(true);
  expect(result.bundle.provenance.executionReference).toBeNull();
  expect(result.candidate.artifact.sha256).toBe(sha256(readFileSync(resolve(fixtures, 'r2/toy-a-artifact.json'))));
});
test.each(['candidateId', 'version', 'declarationSha256', 'artifactSha256', 'preprocessingId', 'preprocessingVersion', 'preprocessingSha256', 'space', 'dimension'])('rejects stale candidate %s', field => {
  const bundle = load('toy-a-development');
  bundle.candidate[field] = field === 'dimension' ? 4 : field.endsWith('Sha256') ? '0'.repeat(64) : 'foreign';
  rejects(() => adapt(undefined, bundle), 'BUNDLE_BINDING_MISMATCH');
});
test.each(['datasetId', 'version', 'kind', 'manifestSha256'])('rejects stale dataset %s', field => {
  const bundle = load('toy-a-development');
  bundle.dataset[field] = field === 'kind' ? 'real-capture' : field === 'manifestSha256' ? '0'.repeat(64) : 'foreign';
  rejects(() => adapt(undefined, bundle), 'BUNDLE_BINDING_MISMATCH');
});
test.each(['duplicate', 'orphan', 'missing-reference', 'missing-query', 'asset', 'split', 'vector-space', 'dimension', 'zero', 'infinite', 'nan'])('rejects %s output instead of dropping it', kind => {
  const bundle = load('toy-a-development');
  if (kind === 'duplicate') bundle.outputs.push(bundle.outputs[0]);
  if (kind === 'orphan') bundle.outputs[0].entryId = 'foreign';
  if (kind === 'missing-reference') bundle.outputs.shift();
  if (kind === 'missing-query') bundle.outputs.pop();
  if (kind === 'asset') bundle.outputs[0].assetSha256 = '0'.repeat(64);
  if (kind === 'split') bundle.split = 'holdout';
  if (kind === 'vector-space') bundle.outputs[0].output.space = 'foreign';
  if (kind === 'dimension') bundle.outputs[0].output.values.pop();
  if (kind === 'zero') bundle.outputs[0].output.values = [0, 0, 0];
  if (kind === 'infinite') bundle.outputs[0].output.values[0] = Infinity;
  if (kind === 'nan') bundle.outputs[0].output.values[0] = NaN;
  const codes: Record<string, string> = { duplicate: 'DUPLICATE_OUTPUT', orphan: 'ORPHAN_OUTPUT', 'missing-reference': 'MISSING_OUTPUT',
    'missing-query': 'MISSING_OUTPUT', asset: 'OUTPUT_ASSET_MISMATCH', split: 'BUNDLE_BINDING_MISMATCH',
    'vector-space': 'VECTOR_VERSION', dimension: 'VECTOR_DIMENSION', zero: 'ZERO_VECTOR', infinite: 'BUNDLE_INVALID', nan: 'BUNDLE_INVALID' };
  rejects(() => adapt(undefined, bundle), codes[kind]);
});
test('draft registry contains unknown exact facts and cannot execute', () => {
  for (const candidate of load('draft-registry')) {
    expect(validateCandidate(candidate).artifact.sha256).toBeNull();
    expect(candidate.embedding).toBeNull();
    rejects(() => adapt(candidate), 'CANDIDATE_DRAFT');
    candidate.artifact.sha256 = '1'.repeat(64);
    rejects(() => validateCandidate(candidate), 'CANDIDATE_INVALID');
  }
});
test.each(['artifact', 'preprocessing', 'weights', 'code', 'runtime', 'review', 'boolean'])('missing/inexact %s cannot create reviewed real eligibility', field => {
  const candidate = load('toy-a'); candidate.kind = 'reviewed-real';
  candidate.licences.code.status = candidate.licences.weights.status = 'reviewed-for-proposed-use';
  candidate.runtime.status = 'reviewed-recorded-output';
  if (field === 'artifact') candidate.artifact.sha256 = null;
  if (field === 'preprocessing') candidate.preprocessing.sha256 = '0'.repeat(64);
  if (field === 'weights' || field === 'code') candidate.licences[field].reference = null;
  if (field === 'runtime') candidate.runtime.exportReference = null;
  if (field === 'review') candidate.review.exactBindingReference = null;
  if (field === 'boolean') candidate.approved = true;
  rejects(() => validateCandidate(candidate), 'CANDIDATE_INVALID');
});
test('toy/real and cross-candidate bundles cannot mix', () => {
  const bundle = load('toy-a-development'); bundle.evidenceKind = 'reported-encoder-output-unverified';
  rejects(() => adapt(undefined, bundle), 'EVIDENCE_KIND_MISMATCH');
  rejects(() => adapt(load('toy-b')), 'BUNDLE_BINDING_MISMATCH');
});
test('failed reference is retained by adapter for explicit setup failure', () => {
  const bundle = load('toy-a-development'); bundle.outputs[0].output = { kind: 'failure', code: 'TIMEOUT' };
  expect(adapt(undefined, bundle).adapted.entries[0].observation).toEqual({ kind: 'failure', code: 'TIMEOUT' });
});
test('schema-only simulated real metadata remains unverified recorded output and requires provenance', () => {
  // NOT a model/dataset fixture or actual rights review. Exercises the input
  // contract using explicit test attestations; no inference/decoding occurs.
  const { dataset } = imported(); dataset.kind = 'real-capture';
  for (const entry of dataset.entries) delete entry.observation;
  const manifestHash = sha256(JSON.stringify(dataset));
  const candidate = load('toy-a'); candidate.kind = 'reviewed-real';
  candidate.family = 'TEST-SCHEMA-ONLY-NOT-A-REAL-MODEL';
  candidate.licences.code.status = candidate.licences.weights.status = 'reviewed-for-proposed-use';
  candidate.licences.code.reference = candidate.licences.weights.reference = 'TEST-ATTESTATION-NOT-ACTUAL-RIGHTS-REVIEW';
  candidate.review.exactBindingReference = 'TEST-ATTESTATION-NOT-ACTUAL-ARTIFACT-REVIEW';
  candidate.runtime.status = 'reviewed-recorded-output';
  const bundle = load('toy-a-development'); bundle.evidenceKind = 'reported-encoder-output-unverified';
  bundle.dataset.kind = dataset.kind; bundle.dataset.manifestSha256 = manifestHash;
  bundle.candidate.declarationSha256 = candidateIdentity(validateCandidate(candidate));
  bundle.provenance.executionReference = 'TEST-RECORDED-PROVENANCE-NO-EXECUTION';
  expect(adaptPrecomputed(dataset, manifestHash, candidate, bundle, 'development').bundle.evidenceKind).toBe('reported-encoder-output-unverified');
  bundle.provenance.executionReference = null;
  rejects(() => adaptPrecomputed(dataset, manifestHash, candidate, bundle, 'development'), 'REAL_PROVENANCE_REQUIRED');
});
test.each(['placeholder-hash', 'placeholder-review', 'unknown-field'])('rejects %s as reviewed provenance', kind => {
  const candidate = load('toy-a');
  if (kind === 'placeholder-hash') candidate.artifact.sha256 = '0'.repeat(64);
  if (kind === 'placeholder-review') candidate.review.exactBindingReference = 'pending';
  if (kind === 'unknown-field') candidate.approved = true;
  rejects(() => validateCandidate(candidate), 'CANDIDATE_INVALID');
});
