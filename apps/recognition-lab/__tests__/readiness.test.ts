import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { curationSchema, CurationError, validateCuration, challengeTags } from '../src/curation.ts';
import type { Curation } from '../src/curation.ts';
import { datasetSchema } from '../src/schema.ts';
import type { Dataset, Entry, Split } from '../src/schema.ts';
import { importDataset } from '../src/importer.ts';
import { assessReadiness, coveragePolicy, readinessSummary } from '../src/readiness.ts';
import { sha256 } from '../src/provenance.ts';

const repo = resolve(__dirname, '../../..');
const lab = resolve(repo, 'apps/recognition-lab');
const templates = resolve(lab, 'templates/r1-v1');
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const outRoot = resolve(lab, 'runs/r1-tests');
mkdirSync(outRoot, { recursive: true });
const root = mkdtempSync(resolve(outRoot, 'authored-'));
let serial = 0;

// All bytes are authored text, all evidence remains synthetic. No photo/consent
// or physical independence is established by these structural test decisions.
function authoredSet() {
  const data: Dataset = datasetSchema.parse(json(resolve(templates, 'dataset.json')));
  data.datasetId = 'authored-r1-test'; data.version = 'authored-v1';
  data.storeScope = 'synthetic-test';
  let index = 0;
  const add = (productId: string, packageId: string, role: Entry['role'], split: Split, known: boolean, view?: string) => {
    const id = 'test-e-' + index;
    const bytes = 'AUTHORED SYNTHETIC TEST TEXT ONLY ' + id;
    const entry: Entry = {
      id, productId, packageId, role, split, known, captureSession: 'test-session-' + index,
      packagingGeneration: index % 2 ? 'old' : 'new',
      asset: { path: id + '.txt', sha256: sha256(bytes) },
      capture: { device: 'authored-device', lighting: coveragePolicy.lighting[index % coveragePolicy.lighting.length],
        view: view ?? coveragePolicy.views[index % coveragePolicy.views.length], occlusion: index % 2 ? 'partial' : 'none' },
      rights: { permissionId: 'synthetic-permission', provenance: 'synthetic-provenance' },
    };
    writeFileSync(resolve(root, entry.asset.path), bytes);
    data.entries.push(entry); index++;
  };
  for (let p = 0; p < 30; p++) {
    const product = 'test-p-' + p, pkg = 'test-single-' + p;
    data.products.push({ id: product, packages: [pkg, 'test-unseen-' + p] });
    add(product, pkg, 'reference', 'development', true, 'front');
    add(product, pkg, 'reference', 'development', true, 'side');
    for (const split of ['development', 'calibration', 'holdout'] as const) {
      add(product, pkg, 'query', split, true);
      add(product, p === 0 ? 'test-unseen-' + p : pkg, 'query', split, true);
    }
  }
  for (let p = 0; p < 15; p++) {
    const product = 'test-unknown-' + p, pkg = 'test-unknown-unit-' + p;
    data.products.push({ id: product, packages: [pkg] });
    for (const split of ['development', 'calibration', 'holdout'] as const) add(product, pkg, 'query', split, false);
  }
  const curation: Curation = {
    schemaVersion: 1, datasetId: data.datasetId, datasetVersion: data.version, manifestSha256: null,
    evidenceKind: 'synthetic-tooling-only',
    entries: data.entries.map(e => ({ entryId: e.id, assetSha256: e.asset.sha256, decision: 'accepted', reviewerId: 'authored-reviewer',
      sourceFamily: 'source-' + e.id, physicalFamily: 'physical-' + e.id,
      usability: 'accepted', permission: 'accepted', permissionId: e.rights.permissionId, provenanceId: e.rights.provenance,
      challengeTags: e.role === 'reference' ? [] : e.known ?
        [...challengeTags.filter(t => !t.startsWith('unknown-') && t !== 'unseen-package' && t !== 'manual-choice-required'),
          ...(e.packageId?.startsWith('test-unseen-') ? ['unseen-package' as const] : [])] :
        ['unknown-lookalike', 'unknown-unrelated', 'unknown-unregistered-size'],
    })),
    review: { reviewerId: 'authored-reviewer', decision: 'accepted', imageUsabilityInspected: true,
      rightsRecordsInspected: true, physicalIndependenceInspected: true },
    holdoutSeal: { reviewerId: 'authored-reviewer', decision: 'sealed-before-tuning', manifestSha256: '0'.repeat(64),
      inventory: data.entries.filter(e => e.role === 'query' && e.split === 'holdout').map(e => ({ entryId: e.id, assetSha256: e.asset.sha256 })) },
  };
  return { data, curation };
}
const base = authoredSet();
function sample() { return structuredClone(base); }
function files(data: Dataset, curation: Curation, bind = true) {
  const manifest = resolve(root, 'manifest-' + serial + '.json');
  const sidecar = resolve(root, 'curation-' + serial++ + '.json');
  const bytes = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(manifest, bytes);
  const manifestHash = sha256(bytes);
  if (bind) {
    curation.manifestSha256 = manifestHash;
    if (curation.holdoutSeal) curation.holdoutSeal.manifestSha256 = manifestHash;
  }
  writeFileSync(sidecar, JSON.stringify(curation, null, 2) + '\n');
  return { manifest, sidecar, manifestHash };
}
function report(data: Dataset, curation: Curation) {
  const paths = files(data, curation);
  return assessReadiness(paths.manifest, root, paths.sidecar);
}
function issueCodes(result: ReturnType<typeof assessReadiness>) {
  return 'issues' in result ? result.issues.map(i => i.code) : result.gaps.map(g => g.code);
}

test('empty versioned templates strictly round-trip and report incomplete, never consent or real evidence', () => {
  const data = datasetSchema.parse(json(resolve(templates, 'dataset.json')));
  const curation = curationSchema.parse(json(resolve(templates, 'curation.json')));
  expect(curation.entries).toEqual([]); expect(curation.review.rightsRecordsInspected).toBe(false);
  expect(data.entries).toEqual([]); expect(data.kind).toBe('synthetic-tooling-only');
  const result = assessReadiness(resolve(templates, 'dataset.json'), templates, resolve(templates, 'curation.json'));
  expect(result.status).toBe('INCOMPLETE'); expect(result.states.integrityValidity).toBe('VALID');
  expect(result.realDatasetReady).toBe(false);
  expect(issueCodes(result)).toEqual(expect.arrayContaining(['CURATION_BINDING_MISSING', 'QUERY_SPLIT_EMPTY', 'HOLDOUT_SEAL_MISSING', 'SYNTHETIC_DATASET_INELIGIBLE']));
});
test('complete authored set tests real importer, counts, split coverage and seal without passing real readiness', () => {
  const { data, curation } = sample(); const paths = files(data, curation);
  const imported = importDataset(paths.manifest, root);
  expect(validateCuration(curation, imported.dataset, imported.manifestHash)).toEqual(curation);
  const result = assessReadiness(paths.manifest, root, paths.sidecar);
  expect(result.status).toBe('INCOMPLETE'); expect(result.realDatasetReady).toBe(false);
  expect(result.states).toEqual({ integrityValidity: 'VALID', curatorReviewCompleteness: 'COMPLETE_RECORDED_ATTESTATIONS',
    captureCoverage: 'TARGETS_MET', holdoutSeal: 'RECORDED_HASH_BOUND', realDatasetReadiness: 'NOT_READY' });
  if (!('coverage' in result)) throw new Error('expected valid report');
  expect(result.coverage.enrolledProducts).toBe(30); expect(result.coverage.declaredProducts).toBe(45);
  expect(result.coverage.referenceEntries).toBe(60); expect(result.coverage.queryEntries).toBe(225);
  expect(result.coverage.distinctPackages).toBe(46); expect(result.coverage.packagingGenerations).toEqual({ new: 143, old: 142 });
  expect(result.coverage.overall.unknownRatio).toEqual({ numerator: 45, denominator: 225, value: 0.2 });
  expect(result.coverage.perSplit.holdout).toMatchObject({ total: 75, known: 60, unknown: 15, packageMissing: 0 });
  expect(result.coverage.perProduct[0].knownQueries.holdout).toEqual({ count: 2, declaredFamilies: { source: 2, physical: 2 } });
  expect(result.coverage.unseenPackageQueries).toHaveLength(3);
  expect(result.gaps.every(g => g.stage === 'realData')).toBe(true);
  const output = JSON.stringify(result) + readinessSummary(result);
  expect(output).not.toContain(root); expect(output).not.toContain('.txt'); expect(output).not.toContain('AUTHORED SYNTHETIC TEST TEXT');
  expect(output).toContain('recorded human attestations');
  expect(assessReadiness(paths.manifest, root, paths.sidecar)).toEqual(result);
});
test('authored test bytes labelled real still fail when their curation is explicitly synthetic', () => {
  const { data, curation } = sample(); data.kind = 'real-capture';
  const result = report(data, curation);
  expect(result.realDatasetReady).toBe(false); expect(result.label).toContain('SYNTHETIC');
  expect(issueCodes(result)).toContain('REAL_CAPTURE_ATTESTATION_MISSING');
});
test('authored observations cannot become real readiness by changing manifest kind or declaring attestations', () => {
  const { data, curation } = sample(); data.kind = 'real-capture';
  data.entries[0].observation = { kind: 'vector', vector: { space: 'unselected', values: [1] } };
  curation.evidenceKind = 'real-capture-attested';
  const result = report(data, curation); expect(result.realDatasetReady).toBe(false);
  expect(issueCodes(result)).toContain('AUTHORED_OBSERVATIONS_INELIGIBLE');
});
test.each(['datasetId', 'datasetVersion', 'manifestSha256'] as const)('rejects non-null stale %s binding', field => {
  const { data, curation } = sample(); const paths = files(data, curation);
  curation[field] = field === 'manifestSha256' ? '0'.repeat(64) : 'stale';
  expect(() => validateCuration(curation, data, paths.manifestHash)).toThrow(CurationError);
  writeFileSync(paths.sidecar, JSON.stringify(curation));
  expect(issueCodes(assessReadiness(paths.manifest, root, paths.sidecar))).toContain('CURATION_BINDING_MISMATCH');
});
test.each(['orphan', 'duplicate', 'asset', 'rights', 'unknown-tag', 'duplicate-tag', 'unknown-field', 'missing-field'])('rejects %s entry review instead of silently fixing it', kind => {
  const { data, curation } = sample();
  if (kind === 'orphan') curation.entries[0].entryId = 'absent';
  if (kind === 'duplicate') curation.entries.push({ ...curation.entries[0] });
  if (kind === 'asset') curation.entries[0].assetSha256 = '0'.repeat(64);
  if (kind === 'rights') curation.entries[0].permissionId = 'wrong';
  if (kind === 'unknown-tag') curation.entries[0].challengeTags = ['unknown-lookalike'];
  if (kind === 'duplicate-tag') curation.entries[0].challengeTags = ['pack', 'pack'];
  if (kind === 'unknown-field') Object.assign(curation.entries[0], { privateNotes: 'must-not-be-emitted' });
  if (kind === 'missing-field') delete (curation.entries[0] as unknown as Record<string, unknown>).usability;
  const result = report(data, curation); expect(result.status).toBe('INVALID'); expect(result.realDatasetReady).toBe(false);
  expect(JSON.stringify(result)).not.toContain('must-not-be-emitted');
});
test.each(['sourceFamily', 'physicalFamily'] as const)('rejects %s reference/query and query/query cross-boundary leakage despite independent hashes/sessions', field => {
  const { data, curation } = sample();
  curation.entries[2][field] = curation.entries[0][field];
  const code = field === 'sourceFamily' ? 'SOURCE_FAMILY_LEAKAGE' : 'PHYSICAL_FAMILY_LEAKAGE';
  expect(issueCodes(report(data, curation))).toContain(code);
  curation.entries[2][field] = 'query-shared'; curation.entries[4][field] = 'query-shared';
  expect(issueCodes(report(data, curation))).toContain(code);
});
test('source family cannot be relabelled as two different physical samples within one boundary', () => {
  const { data, curation } = sample(); curation.entries[3].sourceFamily = curation.entries[2].sourceFamily;
  expect(issueCodes(report(data, curation))).toContain('PHYSICAL_FAMILY_CONFLICT');
});
test('multiple captures of one physical query sample do not count as multiple independent queries', () => {
  const { data, curation } = sample(); curation.entries[3].physicalFamily = curation.entries[2].physicalFamily;
  expect(issueCodes(report(data, curation))).toContain('INDEPENDENT_QUERY_FAMILIES_MISSING');
});
test('one session may contain different physical samples in the same boundary', () => {
  const { data, curation } = sample(); data.entries[3].captureSession = data.entries[2].captureSession;
  expect(report(data, curation).states.integrityValidity).toBe('VALID');
  expect(issueCodes(report(data, curation))).not.toContain('PHYSICAL_FAMILY_CONFLICT');
});
test.each(['missing', 'rejected', 'permission', 'usability', 'attestations'])('reports %s decisions incomplete and keeps every manifest entry', kind => {
  const { data, curation } = sample();
  if (kind === 'missing') curation.entries.shift();
  if (kind === 'rejected') curation.entries[0].decision = 'rejected';
  if (kind === 'permission') { curation.entries[0].permission = 'pending'; curation.entries[0].permissionId = null; }
  if (kind === 'usability') curation.entries[0].usability = 'rejected';
  if (kind === 'attestations') curation.review.physicalIndependenceInspected = false;
  const result = report(data, curation); expect(result.status).toBe('INCOMPLETE');
  expect(result.states.curatorReviewCompleteness).toBe('INCOMPLETE');
  if (!('coverage' in result)) throw new Error('expected valid report');
  expect(result.coverage.referenceEntries + result.coverage.queryEntries).toBe(data.entries.length);
  if (kind === 'rejected') expect(issueCodes(result)).toContain('ENTRY_REJECTED_REVISE_MANIFEST');
});
test('missing label and absent strata/split/reference views remain visible', () => {
  const { data, curation } = sample();
  data.entries = data.entries.filter(e => e.split !== 'calibration');
  const ids = new Set(data.entries.map(e => e.id)); curation.entries = curation.entries.filter(r => ids.has(r.entryId));
  data.entries[0].packageId = null;
  data.entries.forEach(e => { e.capture.lighting = 'bright'; e.capture.view = 'front'; });
  const result = report(data, curation);
  expect(issueCodes(result)).toEqual(expect.arrayContaining(['PACKAGE_LABEL_MISSING', 'QUERY_SPLIT_EMPTY', 'REFERENCE_VIEWS_MISSING', 'STRATUM_MISSING']));
});
test('unseen package of enrolled product stays known and requires correct package-challenge tag', () => {
  const { data, curation } = sample();
  curation.entries[3].challengeTags = curation.entries[3].challengeTags.filter(t => t !== 'unseen-package');
  expect(issueCodes(report(data, curation))).toContain('UNSEEN_PACKAGE_TAG_MISSING');
  data.entries[3].known = false;
  expect(issueCodes(report(data, curation))).toContain('UNKNOWN_ENROLLED');
});
test.each(['missing', 'wrong-hash', 'missing-entry', 'duplicate-entry', 'wrong-entry-hash', 'orphan'])('missing/drifting seal %s never passes', kind => {
  const { data, curation } = sample(); const paths = files(data, curation);
  if (!curation.holdoutSeal) throw new Error('expected seal');
  if (kind === 'wrong-hash') curation.holdoutSeal.manifestSha256 = '0'.repeat(64);
  if (kind === 'missing-entry') curation.holdoutSeal.inventory.pop();
  if (kind === 'duplicate-entry') curation.holdoutSeal.inventory.push({ ...curation.holdoutSeal.inventory[0] });
  if (kind === 'wrong-entry-hash') curation.holdoutSeal.inventory[0].assetSha256 = '0'.repeat(64);
  if (kind === 'orphan') curation.holdoutSeal.inventory[0].entryId = data.entries[0].id;
  if (kind === 'missing') curation.holdoutSeal = null;
  writeFileSync(paths.sidecar, JSON.stringify(curation));
  const result = assessReadiness(paths.manifest, root, paths.sidecar);
  expect(result.status).toBe(kind === 'missing' ? 'INCOMPLETE' : 'INVALID'); expect(result.realDatasetReady).toBe(false);
});
test('manifest whitespace drift invalidates unchanged curation and seal before any capture assessment', () => {
  const { data, curation } = sample(); const paths = files(data, curation);
  writeFileSync(paths.manifest, readFileSync(paths.manifest, 'utf8') + '\n');
  expect(issueCodes(assessReadiness(paths.manifest, root, paths.sidecar))).toEqual(expect.arrayContaining(['CURATION_BINDING_MISMATCH', 'SEAL_BINDING_MISMATCH']));
});
test('readiness reuses importer hash/path safeguards and sanitizes invalid output', () => {
  const { data, curation } = sample(); data.entries[0].asset.path = '../private.jpg';
  const result = report(data, curation); expect(result.status).toBe('INVALID');
  expect(result.states.integrityValidity).toBe('INVALID'); expect(issueCodes(result)).toContain('ASSET_PATH');
  expect(readinessSummary(result)).not.toContain('../private.jpg');
});
test('curation must be confined to the explicitly supplied root', () => {
  const result = assessReadiness(resolve(templates, 'dataset.json'), templates, resolve(root, 'absent.json'));
  expect(issueCodes(result)).toContain('CURATION_UNAVAILABLE');
  const { data, curation } = sample(); const paths = files(data, curation);
  expect(issueCodes(assessReadiness(paths.manifest, root, resolve(templates, 'curation.json')))).toContain('CURATION_OUTSIDE_ROOT');
});
test('actual Node readiness CLI writes matching repeatable JSON/readable incomplete and invalid reports', () => {
  const { data, curation } = sample(); const paths = files(data, curation);
  const out = resolve(root, 'cli-output');
  const invoke = (extra: string[] = []) => spawnSync(process.execPath, [resolve(lab, 'src/cli.ts'), 'readiness',
    '--manifest', paths.manifest, '--dataset-root', root, '--curation', paths.sidecar, '--out', out, ...extra], { cwd: repo, encoding: 'utf8' });
  const first = invoke(); expect(first.status).toBe(2);
  const machine = json(resolve(out, 'readiness.json'));
  expect(first.stdout).toBe(readFileSync(resolve(out, 'readiness.md'), 'utf8') + '\n');
  expect(machine.realDatasetReady).toBe(false); expect(machine.coverage.overall.unknown).toBe(45);
  expect(invoke().status).toBe(2); expect(json(resolve(out, 'readiness.json'))).toEqual(machine);
  expect(invoke(['--split', 'holdout']).status).toBe(1);
  curation.manifestSha256 = '0'.repeat(64); writeFileSync(paths.sidecar, JSON.stringify(curation));
  expect(invoke().status).toBe(1); expect(json(resolve(out, 'readiness.json')).status).toBe('INVALID');
  expect(readFileSync(resolve(out, 'readiness.md'), 'utf8')).toContain('CURATION_BINDING_MISMATCH');
  expect(readFileSync(resolve(out, 'readiness.json'), 'utf8')).not.toContain(root);
}, 30000);
