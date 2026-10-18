import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, symlinkSync, linkSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { generatedLabelFixture, authoredReviews } from './labelEvidenceFixtures.ts';
import { sha256 } from '../src/provenance.ts';
import { core, config } from '../src/labelEvidenceSchema.ts';
import { freezeReferences, mergeReviews, analyzeLabels } from '../src/labelEvidenceAnalysis.ts';
import { validateManifest } from '../src/labelEvidenceInputs.ts';
import { csvCell, escapeHtml } from '../src/labelEvidenceReport.ts';
import { retrievalLab } from '../src/retrievalPaths.ts';

test('generated actual CLI and full denominator evaluation boundaries', async t => {
  const fixture = generatedLabelFixture(), root = fixture.root;
  const receipts: { name: string; argv: string[]; exit: number | null; stdout: string; stderr: string }[] = [];
  const path = (name: string) => resolve(root, name);
  const put = (name: string, value: unknown) => { writeFileSync(path(name), core.canonical(value) + '\n', { flag: 'wx' }); return path(name); };
  function cli(name: string, argv: string[], expected: number) {
    const child = spawnSync(process.execPath, [resolve(retrievalLab, 'src/labelEvidenceCli.ts'), ...argv], { encoding: 'utf8', timeout: 30000 });
    receipts.push({ name, argv, exit: child.status, stdout: child.stdout, stderr: child.stderr });
    assert.equal(child.status, expected, child.stdout + child.stderr); return child;
  }
  const prepared = path('prepared');
  const prepareArgs = ['prepare', ...Object.entries(fixture.paths).flatMap(([name, value]) => ['--' + name, value]),
    '--image-root', fixture.images, '--crop-root', fixture.cropRoot, '--out', prepared];
  await t.test('prepare accepts only generated saved inputs, hides query truth, and binds every entry', () => {
    cli('prepare', prepareArgs, 0);
    const html = readFileSync(resolve(prepared, 'review-queries.html'), 'utf8');
    const payload = JSON.parse(html.split('const LABEL_CONFIG=')[1].split(';\n')[0]);
    assert.equal(payload.entries.length, 20); assert.equal(payload.scope, 'queries');
    assert.ok(payload.entries.every((e: object) => !('productId' in e) && !('truth' in e) && !('candidates' in e) && !('label' in e)));
    assert.ok(!html.includes('invented-') && !html.includes('Juniper') && !html.includes(fixture.images));
    assert.ok(html.includes("connect-src 'none'") && html.includes('img-src blob:'));
  });
  const manifestPath = resolve(prepared, 'manifest.json'), binding = sha256(readFileSync(manifestPath));
  const reviews = authoredReviews(fixture, binding), refs = put('references.json', reviews.references), queries = put('queries.json', reviews.queries);
  const frozen = path('frozen'), merged = path('merged'), analyzed = path('sample');
  await t.test('unreviewed references cannot freeze; literal-backed references freeze before ranks', () => {
    cli('freeze-incomplete', ['freeze', '--manifest', manifestPath, '--references', resolve(prepared, 'references.template.json'), '--out', path('bad-freeze')], 1);
    assert.ok(!existsSync(path('bad-freeze')));
    cli('freeze', ['freeze', '--manifest', manifestPath, '--references', refs, '--out', frozen], 0);
  });
  const freezePath = resolve(frozen, 'reference-freeze.json'), freeze = JSON.parse(readFileSync(freezePath, 'utf8'));
  await t.test('complete merge and actual saved-score analysis have six gains, zero losses, all20 unchanged top3 scores', () => {
    cli('merge', ['merge', '--manifest', manifestPath, '--references', refs, '--queries', queries, '--out', merged], 0);
    cli('analyze', ['analyze', '--manifest', manifestPath, '--review', resolve(merged, 'review.json'), '--freeze', freezePath, '--out', analyzed], 0);
    const report = JSON.parse(readFileSync(resolve(analyzed, 'analysis.json'), 'utf8'));
    assert.equal(report.rows.length, 20); assert.equal(report.summary.denominator, 20); assert.equal(report.summary.gains, 6);
    assert.equal(report.summary.losses, 0); assert.equal(report.summary.visualFirst, 14); assert.equal(report.summary.assistedFirst, 20);
    assert.equal(report.summary.visualFirstThree, report.summary.assistedFirstThree); assert.equal(report.engineeringTriagePositive, true);
    for (const r of report.rows) assert.deepEqual(r.savedTop3.slice().sort((a: {productId: string}, b: {productId: string}) => a.productId.localeCompare(b.productId)),
      r.assistedTop3.slice().sort((a: {productId: string}, b: {productId: string}) => a.productId.localeCompare(b.productId)));
    const html = readFileSync(resolve(analyzed, 'report.html'), 'utf8');
    assert.ok(html.includes('GENERATED SAMPLE') && html.includes('&lt;script&gt;Juniper&lt;/script&gt;'));
    assert.ok(!html.includes('<script>Juniper</script>')); assert.equal((html.match(/class="row"/g) ?? []).length, 20);
  });
  await t.test('partial review persists every row and produces incomplete report, never a positive claim', () => {
    const partial = structuredClone(reviews.queries); partial.entries[0] = core.blank(config(fixture.loaded.manifest, binding, 'queries')).entries[0];
    const partialPath = put('partial.json', partial), partialOut = path('partial-merged');
    cli('merge-partial', ['merge', '--manifest', manifestPath, '--references', refs, '--queries', partialPath, '--out', partialOut], 2);
    cli('analyze-partial', ['analyze', '--manifest', manifestPath, '--review', resolve(partialOut, 'review.json'), '--freeze', freezePath, '--out', path('partial-report')], 2);
    const result = JSON.parse(readFileSync(path('partial-report/analysis.json'), 'utf8'));
    assert.equal(result.rows.length, 20); assert.equal(result.complete, false); assert.equal(result.engineeringTriagePositive, null);
  });
  await t.test('wrong transcription causes measured loss; missing rival metadata blocks promotion', () => {
    const wrong = structuredClone(reviews.queries), row = wrong.entries.find(e => e.id === fixture.frames[14].id)!;
    const saved = fixture.loaded.report.conditions.find(c => c.condition === 'CC')!.rows.find(r => r.id === row.id)!;
    const wrongQuantity = (600 + Number(saved.candidates[1].productId.slice(-2)) * 150) + 'ml';
    row.literal = 'Juniper Meadow ' + wrongQuantity; row.fields.quantity = { start: 15, end: 15 + wrongQuantity.length, text: wrongQuantity };
    const mergedWrong = mergeReviews(fixture.loaded.manifest, binding, reviews.references, wrong);
    const report = analyzeLabels(fixture.loaded, binding, mergedWrong, freeze, sha256(readFileSync(freezePath)), 'a'.repeat(64));
    assert.ok(report.summary.losses >= 1); assert.equal(report.engineeringTriagePositive, false);
    const sparse = structuredClone(reviews.references);
    for (const e of sparse.entries.filter(e => fixture.loaded.manifest.entries.find(m => m.id === e.id)?.productId === 'invented-02')) {
      e.readability = 'unreadable'; e.literal = ''; e.fields = { brandName: null, variant: null, quantity: null };
    }
    const sf = freezeReferences(fixture.loaded.manifest, binding, sparse);
    const sr = analyzeLabels(fixture.loaded, binding, mergeReviews(fixture.loaded.manifest, binding, sparse, reviews.queries), sf, 'a'.repeat(64), 'b'.repeat(64));
    assert.equal(sr.rows.find(r => r.id === fixture.frames[2].id)!.promoted, false);
  });
  await t.test('LE-C1 actual CLI partial queries keep all20 literals/spans/counts and visual candidates', () => {
    const partial = structuredClone(reviews.queries);
    for (const e of partial.entries) {
      e.readability = 'partial'; e.literal = 'Jun Mea 60ml';
      e.fields = { brandName: { start: 0, end: 3, text: 'Jun' }, variant: { start: 4, end: 7, text: 'Mea' }, quantity: { start: 8, end: 12, text: '60ml' } };
    }
    const input = put('partial-text-queries.json', partial), out = path('partial-text-merged');
    cli('merge-partial-text', ['merge', '--manifest', manifestPath, '--references', refs, '--queries', input, '--out', out], 0);
    cli('analyze-partial-text', ['analyze', '--manifest', manifestPath, '--review', resolve(out, 'review.json'), '--freeze', freezePath, '--out', path('partial-text-report')], 0);
    const result = JSON.parse(readFileSync(path('partial-text-report/analysis.json'), 'utf8'));
    assert.equal(result.rows.length, 20); assert.equal(result.summary.readability.partial, 20); assert.equal(result.summary.reviewed, 20);
    assert.equal(result.summary.gains, 0); assert.equal(result.summary.losses, 0); assert.equal(result.summary.promotions, 0);
    assert.equal(result.engineeringTriagePositive, false);
    for (const row of result.rows) {
      assert.deepEqual(row.savedTop3, row.assistedTop3); assert.equal(row.reason, 'PARTIAL'); assert.equal(row.literal, 'Jun Mea 60ml');
      assert.equal(row.observedFields.quantity.text, '60ml'); assert.ok(row.evidence.every((e: { contradicted: boolean }) => !e.contradicted));
    }
  });
  await t.test('LE-C1 partial reference observations freeze as unknown and do not exclude rivals', () => {
    const partial = structuredClone(reviews.references); partial.entries.forEach(e => { e.readability = 'partial'; });
    const input = put('partial-text-references.json', partial), out = path('partial-reference-freeze');
    cli('freeze-partial-text', ['freeze', '--manifest', manifestPath, '--references', input, '--out', out], 0);
    const frozenPath = resolve(out, 'reference-freeze.json'), data = JSON.parse(readFileSync(frozenPath, 'utf8'));
    assert.ok(data.referenceEntries.every((e: {readability: string; literal: string}) => e.readability === 'partial' && e.literal.length > 0));
    assert.ok(data.cards.every((c: {values: Record<string, unknown>; support: Record<string, unknown[]>}) =>
      Object.values(c.values).every(v => v === null) && Object.values(c.support).every(s => s.length === 0)));
    cli('merge-partial-references', ['merge', '--manifest', manifestPath, '--references', input, '--queries', queries, '--out', path('partial-reference-merged')], 0);
    cli('analyze-partial-references', ['analyze', '--manifest', manifestPath, '--review', path('partial-reference-merged/review.json'), '--freeze', frozenPath, '--out', path('partial-reference-report')], 0);
    const result = JSON.parse(readFileSync(path('partial-reference-report/analysis.json'), 'utf8'));
    assert.equal(result.rows.length, 20); assert.equal(result.summary.gains, 0); assert.equal(result.summary.losses, 0);
    for (const row of result.rows) assert.deepEqual(row.savedTop3, row.assistedTop3);
  });
  await t.test('all contradictions, outside-top3 truth and unscored rows retain order, candidate set and denominator', () => {
    const queries = structuredClone(reviews.queries), first = queries.entries[0];
    first.literal = 'Juniper Meadow 120ml'; first.fields.quantity = { start: 15, end: 20, text: '120ml' };
    const reviewed = mergeReviews(fixture.loaded.manifest, binding, reviews.references, queries);
    const outside = structuredClone(fixture.loaded); const cc = outside.report.conditions.find(c => c.condition === 'CC')!;
    const r = cc.rows[1], truth = r.candidates.splice(r.correctRank! - 1, 1)[0]; r.candidates.splice(4, 0, truth); r.correctRank = 5; r.first = false; r.firstThree = false;
    const unscored = cc.rows[2]; unscored.candidates = []; unscored.correctRank = null; unscored.first = false; unscored.firstThree = false;
    const result = analyzeLabels(outside, binding, reviewed, freeze, 'a'.repeat(64), 'b'.repeat(64));
    assert.ok(result.rows[0].manualConfirmation); assert.deepEqual(result.rows[0].savedTop3, result.rows[0].assistedTop3);
    assert.equal(result.rows[1].assistedCorrectRank, 5); assert.equal(result.rows[1].assistedFirstThree, false);
    assert.equal(result.rows.length, 20); assert.equal(result.summary.scored, 19); assert.equal(result.complete, false);
  });
  await t.test('invalid bindings/rows/spans/freeze cards and duplicate JSON fail with no outputs', () => {
    const mutations = [
      { ...reviews.queries, bindingSha256: 'a'.repeat(64) },
      { ...reviews.queries, entries: reviews.queries.entries.slice(1) },
      { ...reviews.queries, entries: [reviews.queries.entries[0], ...reviews.queries.entries.slice(0, 19)] },
      { ...reviews.queries, entries: [{ ...reviews.queries.entries[0], id: 'orphan' }, ...reviews.queries.entries.slice(1)] },
      { ...reviews.queries, entries: [{ ...reviews.queries.entries[0], fields: { ...reviews.queries.entries[0].fields, quantity: { start: 0, end: 5, text: '750ml' } } }, ...reviews.queries.entries.slice(1)] }
    ];
    mutations.forEach((v, i) => {
      const input = put('invalid-' + i + '.json', v), out = path('invalid-out-' + i);
      cli('invalid-review-' + i, ['merge', '--manifest', manifestPath, '--references', refs, '--queries', input, '--out', out], 1); assert.ok(!existsSync(out));
    });
    const badFreeze = structuredClone(freeze); badFreeze.cards[0].values.quantity = null;
    const bf = put('bad-freeze.json', badFreeze), out = path('bad-freeze-report');
    cli('forged-freeze', ['analyze', '--manifest', manifestPath, '--review', resolve(merged, 'review.json'), '--freeze', bf, '--out', out], 1); assert.ok(!existsSync(out));
    const duplicate = path('duplicate.json'); writeFileSync(duplicate, '{"schemaVersion":1,"schemaVersion":1}');
    cli('duplicate-json', ['merge', '--manifest', manifestPath, '--references', refs, '--queries', duplicate, '--out', path('duplicate-out')], 1);
    const stale = { ...fixture.loaded.manifest, ruleSha256: 'a'.repeat(64) }; assert.throws(() => validateManifest(stale), /LABEL_PREPARATION_DRIFT/);
    const missing = structuredClone(fixture.values.report); missing.conditions[1].rows.pop();
    const savedPath = put('missing-denominator.json', missing);
    cli('saved-denominator', prepareArgs.map(value => value === fixture.paths.report ? savedPath : value === prepared ? path('missing-denominator-out') : value), 1);
  });
  await t.test('outputs cannot overwrite, escape runs, follow junctions, or touch hardlinked inputs', () => {
    const before = sha256(readFileSync(manifestPath)); cli('overwrite', prepareArgs, 1); assert.equal(sha256(readFileSync(manifestPath)), before);
    cli('duplicate-flag', [...prepareArgs, '--out', path('dup-args')], 1); assert.ok(!existsSync(path('dup-args')));
    const outside = resolve(retrievalLab, 'label-evidence-forbidden-output');
    cli('outside-output', prepareArgs.map(v => v === prepared ? outside : v), 1); assert.ok(!existsSync(outside));
    const target = path('junction-target'); mkdirSync(target); const linked = path('junction'); symlinkSync(target, linked, 'junction');
    cli('junction-output', prepareArgs.map(v => v === prepared ? linked : v), 1); assert.ok(!existsSync(resolve(target, 'manifest.json')));
    const copied = path('hardlink-base.json'); writeFileSync(copied, readFileSync(fixture.paths.report)); const hard = path('hardlink-report.json'); linkSync(copied, hard);
    const digest = sha256(readFileSync(copied));
    cli('hardlink-input', prepareArgs.map(v => v === fixture.paths.report ? hard : v === prepared ? path('hard-out') : v), 1);
    assert.equal(sha256(readFileSync(copied)), digest); assert.ok(!existsSync(path('hard-out')));
  });
  await t.test('escaping preserves literal strings safely in JSON/HTML/CSV', () => {
    assert.deepEqual(core.strictJson(core.canonical({ text: '</script> & "' })), { text: '</script> & "' });
  });
  // Keep exact commands, exits and generated fixture location for stopped-source audit.
  put('cli-receipts.json', { generatedOnly: true, fixtureRoot: root, receipts });
  console.log('LABEL_GENERATED_FIXTURE=' + root);
});

test('HTML and spreadsheet formula escaping', () => {
  assert.equal(escapeHtml('<script> & "'), '&lt;script&gt; &amp; &quot;');
  assert.equal(csvCell('=SUM(1)'), '"\'=SUM(1)"'); assert.equal(csvCell('"quoted"'), '"""quoted"""');
});
