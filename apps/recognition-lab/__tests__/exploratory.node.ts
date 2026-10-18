import { test } from 'node:test';
import { expect } from 'expect';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, linkSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateStudy, MODEL_SHA, recipeSha256, type Study, sourceFingerprint } from '../src/exploratoryStudy.ts';
import { evaluate, validateBundle, type Bundle } from '../src/exploratoryEvaluation.ts';
import { csvCell, escapeHtml, renderReport } from '../src/exploratoryReport.ts';
import { retrievalLab, inputPath } from '../src/retrievalPaths.ts';
import { sha256 } from '../src/provenance.ts';
import { defaultConfig } from '../src/schema.ts';

const hash = (x: string) => sha256(x);
function fixture() {
  const study: Study = { schemaVersion: 1, studyId: 'same-instance-exploration-v1', kind: 'generated-fixture', formalAdmission: false,
    modelSha256: MODEL_SHA, recipeSha256, products: [], entries: [] };
  for (let i = 0; i < 10; i++) {
    const p = 'p' + String(i).padStart(2, '0'); study.products.push({ id: p, label: p, physicalFamily: p + '-family' });
    for (const role of ['reference', 'query'] as const) for (let v = 0; v < 2; v++) {
      const id = p + '-' + role + v;
      study.entries.push({ id, productId: p, physicalFamily: p + '-family', exposure: role + '-capture', role,
        asset: { path: id + '.jpg', sha256: hash(id) } });
    }
  }
  const source = hash('source'); const setup = hash('setup'); const software = hash('software');
  const bundle: Bundle = { schemaVersion: 1, runId: 'fixture-raw-v1', mode: 'GENERATED_FIXTURE',
    studySha256: hash(JSON.stringify(study)), modelSha256: MODEL_SHA, recipeSha256, sourceSha256: source,
    setupSha256: setup, softwareSha256: software, loadMs: 0, encodingMs: 0,
    environment: { python: 'fixture', os: 'fixture', cpu: 'fixture', threads: 1, memory: 'not-measured' },
    preservation: study.entries.map(e => ({ id: e.id, before: e.asset.sha256, after: e.asset.sha256 })),
    records: study.entries.map(e => ({ id: e.id, assetSha256: e.asset.sha256, kind: 'vector' as const,
      values: Array.from({ length: 1024 }, (_, i) => i === Number(e.productId.slice(1)) ? 1 : 0),
      pixelSha256: hash('pixels'), tensorSha256: hash('tensor'), thumbnailSha256: hash('thumb'),
      timings: { readMs: 0, decodeMs: 0, preprocessMs: 0, inferenceMs: 0 } })),
  };
  const expected = { studySha256: bundle.studySha256, sourceSha256: source, setupSha256: setup, softwareSha256: software, runId: bundle.runId };
  return { study, bundle, expected };
}
function vector(bundle: Bundle, id: string, values: number[]) {
  const record = bundle.records.find(r => r.id === id)!;
  if (record.kind !== 'vector') throw Error('Test vector unavailable');
  record.values = [...values, ...Array(1024 - values.length).fill(0)];
}
function failure(bundle: Bundle, id: string, code: 'DECODE_ERROR' | 'NOT_RUN' = 'DECODE_ERROR') {
  const i = bundle.records.findIndex(r => r.id === id); const r = bundle.records[i];
  bundle.records[i] = { id: r.id, assetSha256: r.assetSha256, kind: 'failure', code };
}
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const withoutTiming = (report: ReturnType<typeof evaluate>) => report.rows.map(({ rankingMs: _ms, ...r }) => r);

test('strict separate same-instance schema positive, wrong cardinality, formal and fake independence rejected', () => {
  const { study } = fixture(); expect(validateStudy(study)).toEqual(study);
  for (const mutate of [(s: Study) => { s.formalAdmission = true as false; }, (s: Study) => { s.entries.pop(); },
    (s: Study) => { s.entries[0].physicalFamily = 'fabricated-independent'; },
    (s: Study) => { s.entries[0].exposure = 'query-capture'; },
    (s: Study) => { s.entries[0].asset.path = '../escape.jpg'; },
    (s: Study) => { s.entries[0].asset.path = 'C:ads.jpg'; },
    (s: Study) => { s.entries[0].asset.sha256 = s.entries[1].asset.sha256; },
    (s: Study) => { s.modelSha256 = hash('different'); }]) {
    const s = clone(study); mutate(s); expect(() => validateStudy(s)).toThrow();
  }
});
test('exact bundle/study/source/run/setup/software bindings and preservation', () => {
  const { study, bundle, expected } = fixture(); expect(validateBundle(study, bundle, expected)).toEqual(bundle);
  for (const key of ['studySha256', 'sourceSha256', 'setupSha256', 'softwareSha256', 'recipeSha256', 'modelSha256'] as const) {
    const b = clone(bundle); b[key] = hash('stale'); expect(() => validateBundle(study, b, expected)).toThrow();
  }
  for (const mutate of [(b: Bundle) => { b.records[0].id = 'orphan'; }, (b: Bundle) => { b.records[0] = b.records[1]; },
    (b: Bundle) => { b.preservation[0].after = hash('changed'); }, (b: Bundle) => { b.preservation[0] = b.preservation[1]; },
    (b: Bundle) => { b.runId = 'old'; }, (b: Bundle) => { b.records.pop(); },
    (b: Bundle) => { vector(b, b.records[0].id, []); },
    (b: Bundle) => { const r = b.records[0]; if (r.kind === 'vector') r.values[0] = Infinity; },
    (b: Bundle) => { const r = b.records[0]; if (r.kind === 'vector') r.values.pop(); }]) {
    const b = clone(bundle); mutate(b); expect(() => validateBundle(study, b, expected)).toThrow();
  }
});
test('hand computed max aggregation, normalized cosine, distinct top3 and nearest reference', () => {
  const { study, bundle } = fixture();
  for (const r of bundle.records) vector(bundle, r.id, [0, -1]);
  vector(bundle, 'p00-query0', [3, 4]);
  vector(bundle, 'p00-reference0', [1, 0]); vector(bundle, 'p00-reference1', [0, 1]);
  vector(bundle, 'p01-reference0', [1, 0]); vector(bundle, 'p01-reference1', [-1, 0]);
  vector(bundle, 'p02-reference0', [0, -1]);
  const row = evaluate(study, bundle).rows.find(r => r.id === 'p00-query0')!;
  expect(row.primary!.candidates.map(c => c.productId)).toEqual(['p00', 'p01', 'p02']);
  expect(row.primary!.candidates[0].score).toBeCloseTo(.8, 14);
  expect(row.primary!.candidates[1].score).toBeCloseTo(.6, 14);
  expect(row.primary!.candidates[2].score).toBeCloseTo(-.8, 14);
  expect(row.primary!.margin).toBeCloseTo(.2, 14);
  expect(row.primary!.candidates[0].nearestReferenceId).toBe('p00-reference1');
});
test('ties include identities outside top3 with deterministic ordering', () => {
  const { study, bundle } = fixture(); for (const r of bundle.records) vector(bundle, r.id, [1, 0]);
  const row = evaluate(study, bundle).rows[0];
  expect(row.primary!.candidates.map(c => c.productId)).toEqual(['p00', 'p01', 'p02']);
  expect(row.primary!.topTie).toHaveLength(10); expect(row.primary!.margin).toBe(0);
  expect(row.primary!.candidates[0].tiedWith).toHaveLength(9);
});
test('raw rankings are invariant to thresholds, labels, filenames and query truth', () => {
  const { study, bundle } = fixture(); const original = evaluate(study, bundle);
  expect(withoutTiming(evaluate(study, bundle, { ...defaultConfig, unknownBelow: -1, strongAt: -1, productMargin: 0, packageMargin: 0 })))
    .toEqual(withoutTiming(evaluate(study, bundle, { ...defaultConfig, unknownBelow: 1, strongAt: 1, productMargin: 2, packageMargin: 2 })));
  const s = clone(study); s.products.forEach(p => { p.label = '<script>label</script>'; });
  s.entries.forEach(e => { e.asset.path = 'uninformative-' + e.id + '.jpg'; });
  const firstQueries = s.entries.filter(e => e.role === 'query' && ['p00', 'p01'].includes(e.productId));
  firstQueries.forEach(e => { e.productId = e.productId === 'p00' ? 'p01' : 'p00'; e.physicalFamily = e.productId + '-family'; });
  expect(evaluate(s, bundle).rows.map(r => r.primary)).toEqual(original.rows.map(r => r.primary));
  expect(JSON.stringify(original)).not.toMatch(/STRONG|AMBIGUOUS|UNKNOWN|packageCertain|packageCandidates/);
});
test('withheld proxy excludes both references for target identity', () => {
  const { study, bundle } = fixture(); const report = evaluate(study, bundle);
  expect(report.first).toBe(20); expect(report.firstThree).toBe(20);
  for (const r of report.rows) {
    expect(r.withheldIdentityProxy!.candidates).toHaveLength(3);
    expect(r.withheldIdentityProxy!.candidates.some(c => c.productId === r.truth)).toBe(false);
    expect(r.withheldIdentityProxy!.candidates[0].score).toBe(0);
  }
});
test('query failure and NOT_RUN preserve denominator, per-product and confusion counts', () => {
  const { study, bundle } = fixture(); failure(bundle, 'p00-query0'); failure(bundle, 'p00-query1', 'NOT_RUN');
  const report = evaluate(study, bundle);
  expect(report).toMatchObject({ denominator: 20, scored: 18, first: 18, firstThree: 18, complete: false });
  expect(report.rows).toHaveLength(20); expect(report.perProduct[0].first).toBe(0); expect(report.confusion[0].unscored).toBe(2);
});
test('failed reference blocks all gallery scoring rather than using nineteen', () => {
  const { study, bundle } = fixture(); failure(bundle, 'p00-reference0');
  const report = evaluate(study, bundle); expect(report).toMatchObject({ denominator: 20, scored: 0, first: 0, incompleteGallery: true });
  expect(report.rows.every(r => r.failure === 'INCOMPLETE_GALLERY' && !r.primary && !r.withheldIdentityProxy)).toBe(true);
});

test('bounded load failures and truthful attempt timings retain all denominators', () => {
  const { study, bundle, expected } = fixture();
  for (const reason of ['TIMEOUT', 'WORKER_FATAL', 'DISCONNECTED', 'OS_ERROR', 'INVALID_READY'] as const) {
    const b = clone(bundle); b.records.forEach(r => failure(b, r.id, 'NOT_RUN'));
    b.runFailure = { stage: 'load', reason }; b.loadMs = 100; b.attemptMs = 105;
    expect(validateBundle(study, b, expected)).toEqual(b);
    const report = evaluate(study, b);
    expect(report).toMatchObject({ complete: false, denominator: 20, scored: 0, first: 0, firstThree: 0,
      runFailure: b.runFailure, timings: { loadMs: 100, encodingMs: 0, attemptMs: 105 } });
    expect(report.rows).toHaveLength(20);
    expect(report.rows.every(r => r.failure === 'NOT_RUN' && !r.primary && !r.withheldIdentityProxy)).toBe(true);
    expect(report.confusion.every(c => c.unscored === 2)).toBe(true);
    const mutations: ((v: Record<string, unknown>) => void)[] = [
      v => { v.runFailure = { stage: 'image', reason }; },
      v => { v.runFailure = { stage: 'load', reason: 'PRIVATE_PATH' }; },
      v => { v.runFailure = { stage: 'load', reason, error: 'PRIVATE_PATH' }; },
      v => { v.loadMs = 0; }, v => { v.loadMs = Infinity; }, v => { v.encodingMs = 1; },
      v => { delete v.attemptMs; }, v => { v.attemptMs = 99; }, v => { v.attemptMs = Infinity; },
      v => { (v.records as Bundle['records'])[0] = bundle.records[0]; },
      v => { (v.records as Bundle['records'])[0] = { ...b.records[0], kind: 'failure', code: 'DECODE_ERROR' }; },
    ];
    for (const mutate of mutations) {
      const bad = clone(b); mutate(bad); expect(() => validateBundle(study, bad, expected)).toThrow();
    }
  }
  // Both legacy absence and explicit null remain valid success controls.
  expect(evaluate(study, bundle)).toMatchObject({ complete: true, runFailure: null, timings: { attemptMs: null } });
  bundle.runFailure = null; bundle.loadMs = 3; bundle.encodingMs = 5; bundle.attemptMs = 9;
  expect(validateBundle(study, bundle, expected)).toEqual(bundle);
  expect(evaluate(study, bundle).complete).toBe(true);
});

test('load cause and timings propagate into fresh JSON HTML and shared summary', () => {
  const root = resolve(retrievalLab, 'runs/exploratory'); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, 'ts-load-report-')); const { study, bundle } = fixture();
  bundle.records.forEach(r => failure(bundle, r.id, 'NOT_RUN'));
  bundle.runFailure = { stage: 'load', reason: 'WORKER_FATAL' }; bundle.loadMs = 123.5; bundle.attemptMs = 130;
  const report = evaluate(study, bundle); const out = resolve(dir, 'report');
  renderReport(study, bundle, report, dir, out, []);
  expect(JSON.parse(readFileSync(resolve(out, 'results.json'), 'utf8'))).toMatchObject({
    complete: false, denominator: 20, scored: 0, runFailure: bundle.runFailure, timings: report.timings });
  for (const name of ['report.html', 'summary.txt']) {
    const text = readFileSync(resolve(out, name), 'utf8');
    expect(text).toContain('Run failed during load: WORKER_FATAL.');
    expect(text).toContain('Load 123.500 ms; image encoding 0.000 ms; total attempt 130.000 ms.');
    expect(text).toContain('0/20 scored'); expect(text).not.toContain(dir);
  }
  expect(readFileSync(resolve(out, 'results.csv'), 'utf8').split('\n').filter(Boolean)).toHaveLength(21);
  expect(() => renderReport(study, bundle, report, dir, out, [])).toThrow();
});
test('escaping and CSV formula injection protection', () => {
  expect(escapeHtml('<script>"&\'')).toBe('&lt;script&gt;&quot;&amp;&#39;');
  for (const s of ['=HYPERLINK("remote")', '+cmd', '-cmd', '@cmd', '  =cmd', '\tcmd', '\ncmd']) expect(csvCell(s).startsWith('"\'')).toBe(true);
  expect(csvCell('ordinary"label')).toBe('"ordinary""label"');
});
test('fresh outputs, wrong/missing derivative, hardlink and junction refusal have positive control', () => {
  const root = resolve(retrievalLab, 'runs/exploratory'); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, 'ts-path-')); const { study, bundle } = fixture(); const report = evaluate(study, bundle);
  expect(() => renderReport(study, bundle, report, dir, resolve(dir, 'out'), [])).toThrow();
  expect(existsSync(resolve(dir, 'out'))).toBe(false);
  const file = resolve(dir, 'source.json'); writeFileSync(file, '{}'); expect(inputPath(file)).toBe(file);
  linkSync(file, resolve(dir, 'hard.json')); expect(() => inputPath(file)).toThrow();
  const target = resolve(dir, 'target'); mkdirSync(target); const junction = resolve(dir, 'junction'); symlinkSync(target, junction, 'junction');
  expect(() => inputPath(junction, true)).toThrow();
});
test('producer/evaluator source fingerprint is stable and includes new source', () => {
  expect(sourceFingerprint()).toMatch(/^[a-f0-9]{64}$/); expect(sourceFingerprint()).toBe(sourceFingerprint());
  expect(readFileSync(resolve(retrievalLab, 'tools/exploratory/producer.py'), 'utf8')).toContain('E04_AND_NETWORK_REQUIRED');
});
