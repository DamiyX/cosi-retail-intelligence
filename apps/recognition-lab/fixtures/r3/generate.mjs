// Public authored text/vector examples only. No model, native runner or photos.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { importDataset } from '../../src/importer.ts';
import { validateCandidate, candidateIdentity } from '../../src/precomputed.ts';
import { validateTarget, targetIdentity, validateBenchmark } from '../../src/deviceBenchmark.ts';
import { sha256 } from '../../src/provenance.ts';
const here = dirname(fileURLToPath(import.meta.url));
const fixtures = resolve(here, '..');
const load = name => JSON.parse(readFileSync(resolve(fixtures, name), 'utf8'));
const save = (name, value) => writeFileSync(resolve(here, name + '.json'), JSON.stringify(value, null, 2) + '\n');
const { dataset, manifestHash } = importDataset(resolve(fixtures, 'dataset.json'), fixtures);
const candidate = validateCandidate(load('r2/toy-a.json'));
const bundle = load('r2/toy-a-development.json');
const target = validateTarget({ schemaVersion: 1,
  export: { id: 'authored-export', version: 'v1', sha256: sha256('AUTHORED EXPORT IDENTITY ONLY'),
    format: 'toy-json', precision: 'toy-f64', conversionMethodId: 'authored-no-conversion', reviewReferenceId: 'toy-only-no-native-review' },
  runtime: { id: 'authored-runtime-NOT-ANDROID', version: 'v1', artifactSha256: sha256('AUTHORED RUNTIME IDENTITY ONLY'),
    delegate: 'none-authored', configurationSha256: sha256('AUTHORED CONFIG'), reviewReferenceId: 'toy-only-no-runtime-review' } });
save('target', target);
const value = value => ({ value, methodId: 'authored-no-measurement', evidenceId: 'authored-toy' });
const record = { schemaVersion: 1, recordId: 'authored-r3-full', evidenceKind: 'authored-toy',
  dataset: { datasetId: dataset.datasetId, version: dataset.version, kind: dataset.kind, manifestSha256: manifestHash },
  candidate: { candidateId: candidate.candidateId, version: candidate.version, declarationSha256: candidateIdentity(candidate),
    artifactSha256: candidate.artifact.sha256, preprocessingId: candidate.preprocessing.id, preprocessingVersion: candidate.preprocessing.version,
    preprocessingSha256: candidate.preprocessing.sha256, ...candidate.embedding },
  target, targetDeclarationSha256: targetIdentity(target),
  device: { pseudonym: 'authored-device-NOT-A-PHONE', model: 'authored-toy', androidVersion: 'not-android', conditionId: 'authored' },
  provenance: { producerId: 'public-authored-fixture', recordedAt: null, collectionReferenceId: 'authored-no-collection', inventoryClaim: 'supplied-record-only' },
  inventory: bundle.outputs.map(({ entryId, assetSha256 }) => ({ entryId, assetSha256 })), trials: [],
  observations: { memoryBytes: Object.fromEntries(['idle', 'loaded', 'inference', 'afterSustained'].map(k => [k, value(100)])),
    storageBytes: Object.fromEntries(['model', 'runtimeIncrease', 'cache', 'references', 'embeddings', 'thumbnails', 'ocr'].map(k => [k, value(200)])),
    extrapolatedStorageBytes: [], sustainedDurationMs: value(600000), thermal: value('no-change-observed'), batteryDropPercent: value(0),
    droppedFrames: value(0), stability: value('stable-observed'),
    offline: Object.fromEntries(['firstUseAirplane', 'restartAirplane', 'knownVisualAirplane', 'assetsAvailableAirplane'].map(k => [k, value(true)])) } };
for (const stage of ['startup', 'camera-ready', 'inference', 'capture-to-result', 'stable-result']) {
  for (const phase of ['cold', 'warmup', 'warm']) {
    const n = phase === 'warm' ? 20 : 1;
    for (let i = 0; i < n; i++) record.trials.push({ id: stage + '-' + phase + '-' + i, stage, phase,
      input: ['startup', 'camera-ready'].includes(stage) ? null : record.inventory[i % record.inventory.length],
      methodId: 'authored-no-clock', evidenceId: 'authored-toy', outcome: { kind: 'success', elapsedMs: i + 1 } });
  }
}
save('benchmark', validateBenchmark(dataset, manifestHash, candidate, target, record));
const incomplete = structuredClone(record); incomplete.recordId = 'authored-r3-incomplete'; incomplete.trials = [];
for (const key of ['memoryBytes', 'storageBytes', 'offline']) for (const stage of Object.keys(incomplete.observations[key])) incomplete.observations[key][stage] = null;
for (const key of ['sustainedDurationMs', 'thermal', 'batteryDropPercent', 'droppedFrames', 'stability']) incomplete.observations[key] = null;
save('incomplete', incomplete);
const failed = structuredClone(record); failed.recordId = 'authored-r3-failure';
failed.trials.push({ ...failed.trials[0], id: 'authored-timeout', outcome: { kind: 'failure', code: 'TIMEOUT', elapsedMs: null } });
save('failure', failed);
const equivalence = { schemaVersion: 1, evidenceKind: 'authored-toy', benchmarkRecordId: record.recordId,
  dataset: record.dataset, candidate: record.candidate, targetDeclarationSha256: record.targetDeclarationSha256,
  split: 'development', referenceBundleSha256: sha256(JSON.stringify(bundle)),
  experiment: { id: 'authored-unit-agreement', maxNormalizedError: 0.000001, maxCosineDifference: 0.000001 },
  provenance: { producerId: 'authored-no-export-execution', evidenceId: 'authored-toy' },
  outputs: bundle.outputs.map(item => ({ ...item, output: item.output.kind === 'failure' ? { kind: 'vector', space: candidate.embedding.space, values: [1, 0, 0] } : item.output })) };
save('equivalence', equivalence); // reference q-error failure is preserved.
const pass = structuredClone(equivalence);
const subset = structuredClone(record); subset.recordId = 'authored-r3-paired';
subset.inventory = record.inventory.filter(i => i.entryId !== 'q-error'); subset.trials = record.trials.filter(t => !t.input || t.input.entryId !== 'q-error');
save('paired-benchmark', subset);
pass.benchmarkRecordId = subset.recordId; pass.outputs = pass.outputs.filter(i => i.entryId !== 'q-error');
save('paired-equivalence', pass);
const drift = structuredClone(pass); drift.outputs[0].output.values = [0, 1, 0]; save('drift', drift);
