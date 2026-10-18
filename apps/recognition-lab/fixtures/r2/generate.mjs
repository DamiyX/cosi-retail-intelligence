// Authored public text/vector tooling fixtures ONLY. This never loads a model.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../../src/provenance.ts';
import { candidateIdentity, validateCandidate } from '../../src/precomputed.ts';
import { defaultConfig } from '../../src/schema.ts';

const here = dirname(fileURLToPath(import.meta.url));
const bytes = readFileSync(resolve(here, '../dataset.json'));
const dataset = JSON.parse(bytes);
const write = (name, value) => writeFileSync(resolve(here, name), JSON.stringify(value, null, 2) + '\n');
write('config.json', defaultConfig);
for (const split of ['development', 'calibration', 'holdout']) {
  const prefix = 'apps/recognition-lab/fixtures/r2/';
  write('inputs-' + split + '.json', ['a', 'b'].map(letter => ({ candidate: prefix + 'toy-' + letter + '.json',
    bundle: prefix + 'toy-' + letter + '-' + split + '.json', ...(split === 'holdout' ?
      { frozen: 'apps/recognition-lab/runs/r2-calibration-' + letter + '/frozen-candidate.json' } : { config: prefix + 'config.json' }) })));
}
for (const letter of ['a', 'b']) {
  const space = 'toy-' + letter + '-v1';
  const descriptor = letter === 'a' ? 'Authored R0 vectors unchanged; no pixels or encoder.' : 'Authored R0 vectors plus trailing zero; no pixels or encoder.';
  const dimension = dataset.adapter.dimension + (letter === 'b' ? 1 : 0);
  const artifact = { description: 'Authored toy vector recipe, not model weights', sourceManifestSha256: sha256(bytes), recipe: descriptor };
  write('toy-' + letter + '-artifact.json', artifact);
  const artifactBytes = readFileSync(resolve(here, 'toy-' + letter + '-artifact.json'));
  const candidate = validateCandidate({ schemaVersion: 1, candidateId: 'authored-toy-' + letter, version: 'v1', kind: 'authored-toy',
    family: 'Authored mathematical fixture; no real model family',
    artifact: { revision: 'authored-recipe-v1', sha256: sha256(artifactBytes), storageBytes: artifactBytes.length },
    preprocessing: { id: 'toy-' + letter, version: 'v1', descriptor, sha256: sha256(descriptor) },
    embedding: { space, dimension }, licences: { code: { status: 'toy-only', reference: 'Repository-authored fixture' }, weights: { status: 'toy-only', reference: 'No weights; authored mathematical values' } },
    runtime: { status: 'toy-only', exportReference: 'No export; authored output', runtimeReference: 'No encoder; Node postprocessing only' },
    review: { reviewerId: 'fixture-author', exactBindingReference: 'Public synthetic tooling-only fixture; no rights/model approval' } });
  write('toy-' + letter + '.json', candidate);
  for (const split of ['development', 'calibration', 'holdout']) {
    write('toy-' + letter + '-' + split + '.json', {
      schemaVersion: 1, adapter: 'precomputed-output-v1', evidenceKind: 'authored-toy',
      dataset: { datasetId: dataset.datasetId, version: dataset.version, kind: dataset.kind, manifestSha256: sha256(bytes) },
      candidate: { candidateId: candidate.candidateId, version: candidate.version, declarationSha256: candidateIdentity(candidate), artifactSha256: candidate.artifact.sha256,
        preprocessingId: candidate.preprocessing.id, preprocessingVersion: candidate.preprocessing.version, preprocessingSha256: candidate.preprocessing.sha256, space, dimension },
      split, provenance: { producer: 'authored-fixture-generator-no-encoder', executionReference: null, recordedAt: null, reportedDurationMs: null },
      outputs: dataset.entries.filter(e => e.role === 'reference' || e.role === 'query' && e.split === split).map(e => ({
        entryId: e.id, assetSha256: e.asset.sha256, output: e.observation.kind === 'failure' ? e.observation :
          { kind: 'vector', space, values: [...e.observation.vector.values, ...(letter === 'b' ? [0] : [])] },
      })),
    });
  }
}
write('draft-registry.json', ['MobileNetV3-small family hypothesis', 'MobileCLIP image-text family hypothesis'].map((family, i) => {
  return { schemaVersion: 1, candidateId: 'draft-family-' + (i + 1), version: 'draft-v1', kind: 'draft-unreviewed', family,
    artifact: { revision: null, sha256: null, storageBytes: null },
    preprocessing: null, embedding: null,
    licences: { code: { status: 'unreviewed', reference: null }, weights: { status: 'unreviewed', reference: null } },
    runtime: { status: 'unreviewed', exportReference: null, runtimeReference: null },
    review: { reviewerId: null, exactBindingReference: null },
  };
}));
