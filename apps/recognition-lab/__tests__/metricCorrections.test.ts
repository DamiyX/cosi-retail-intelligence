import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateDataset } from '../src/importer.ts';
import { datasetSchema, defaultConfig } from '../src/schema.ts';
import type { Entry } from '../src/schema.ts';
import { experiment } from '../src/experiment.ts';
import type { QueryResult } from '../src/experiment.ts';
import { metrics, metricSummary } from '../src/metrics.ts';

const root = resolve(__dirname, '../fixtures');
function queries(cases: [string, (entry: Entry) => void][]): QueryResult[] {
  const data = datasetSchema.parse(JSON.parse(readFileSync(resolve(root, 'dataset.json'), 'utf8')));
  data.entries = data.entries.filter(e => e.role === 'reference' || cases.some(([id]) => id === e.id));
  for (const [id, change] of cases) {
    const entry = data.entries.find(e => e.id === id)!;
    entry.split = 'development'; change(entry);
  }
  return experiment(validateDataset(data, root), defaultConfig, 'development');
}
const unlabelled = (e: Entry) => { e.packageId = null; };
const vectorA = (e: Entry) => { e.observation = { kind: 'vector', vector: { space: 'synthetic-v1', values: [1, 0, 0] } }; };
const wrongPackage = (e: Entry) => { vectorA(e); e.packageId = 'pack'; };
const wrongProduct = (e: Entry) => { e.productId = 'b'; e.packageId = 'single-b'; };
const rate = (numerator: number, denominator: number) => ({ numerator, denominator, value: denominator ? numerator / denominator : null });

test('A2-01: all-unlabelled STRONG outcomes have joint N/A with visible missing labels', () => {
  const results = queries([['q-a', unlabelled], ['cal-a', unlabelled]]);
  expect(results.every(r => r.outcome.status === 'STRONG')).toBe(true);
  const report = metrics(results);
  expect(report.rates.strongProductPrecision).toEqual(rate(2, 2));
  expect(report.rates.strongJointPrecision).toEqual(rate(0, 0));
  expect(report.rates.claimedPackageAccuracy.value).toBeNull();
  expect(report.packageLabels).toEqual({ labelled: 0, missing: 2, knownLabelled: 0, knownMissing: 2, strongLabelled: 0, strongMissing: 2 });
  expect(report.rates.strongJointLabelCoverage).toEqual(rate(0, 2));
  expect(report.rates.packageLabelCoverage).toEqual(rate(0, 2));
  expect(report.confusionCases).toEqual([]); // Missing truth is neither package-correct nor package-wrong.
  expect(metricSummary(results)).toContain('| strongJointPrecision | N/A (0/0) |');
  expect(metricSummary(results)).toContain('"strongMissing":2');
});
test('A2-01: unlabelled correct products cannot dilute a labelled wrong package', () => {
  const alone = metrics(queries([['q-error', wrongPackage]]));
  const mixed = metrics(queries([['q-a', unlabelled], ['cal-a', unlabelled], ['q-error', wrongPackage]]));
  expect(alone.rates.strongJointPrecision).toEqual(rate(0, 1));
  expect(mixed.rates.strongJointPrecision).toEqual(alone.rates.strongJointPrecision);
  expect(mixed.rates.strongProductPrecision).toEqual(rate(3, 3));
  expect(mixed.rates.strongJointLabelCoverage).toEqual(rate(1, 3));
  expect(mixed.packageLabels.strongMissing).toBe(2);
  expect(mixed.confusionCases).toHaveLength(1);
  expect(mixed.confusionCases[0].reason).toBe('WRONG_OR_UNCERTAIN_PACKAGE');
});
test('A2-01: hand-count labelled correct/wrong-package/wrong-product/unknown STRONG cases', () => {
  const results = queries([
    ['q-a', unlabelled], ['cal-a', unlabelled], ['q-error', wrongPackage],
    ['hold-a', wrongProduct], ['q-u', vectorA], ['hold-wrong-package', e => { e.packageId = 'single'; }],
  ]);
  expect(results.every(r => r.outcome.status === 'STRONG')).toBe(true);
  const report = metrics(results);
  expect(report.rates.strongJointPrecision).toEqual(rate(1, 4));
  expect(report.rates.strongProductPrecision).toEqual(rate(4, 6));
  expect(report.rates.claimedPackageAccuracy).toEqual(rate(1, 4));
  expect(report.rates.unknownFalseStrong).toEqual(rate(1, 1));
  expect(report.packageLabels).toEqual({ labelled: 4, missing: 2, knownLabelled: 3, knownMissing: 2, strongLabelled: 4, strongMissing: 2 });
  expect(report.rates.strongJointLabelCoverage).toEqual(rate(4, 6));
  expect(report.rates.packageLabelCoverage).toEqual(rate(4, 6));
});
test('A2-01: unlabelled wrong products remain product errors without inventing package errors', () => {
  const report = metrics(queries([['q-a', e => { wrongProduct(e); unlabelled(e); }]]));
  expect(report.rates.strongProductPrecision.value).toBe(0);
  expect(report.rates.strongJointPrecision.value).toBeNull();
  expect(report.packageLabels.strongMissing).toBe(1);
  expect(report.confusionCases[0].reason).toBe('WRONG_PRODUCT');
});
test('A2-01: empty/non-STRONG populations have honest N/A joint and label coverage', () => {
  const empty = metrics([]);
  expect(empty.rates.strongJointPrecision.value).toBeNull();
  expect(empty.rates.strongJointLabelCoverage.value).toBeNull();
  expect(empty.rates.packageLabelCoverage.value).toBeNull();
  expect(empty.packageLabels).toEqual({ labelled: 0, missing: 0, knownLabelled: 0, knownMissing: 0, strongLabelled: 0, strongMissing: 0 });
  const report = metrics(queries([['q-u', unlabelled], ['hold-timeout', () => {}]]));
  expect(report.rates.strongJointPrecision.denominator).toBe(0);
  expect(report.rates.packageLabelCoverage).toEqual(rate(1, 2));
  expect(report.packageLabels).toEqual({ labelled: 1, missing: 1, knownLabelled: 1, knownMissing: 0, strongLabelled: 0, strongMissing: 0 });
  expect(report.rates.failureRate.value).toBe(0.5);
});
test.each([['third', 'b', 'single-b', 2], ['second', 'c', 'single-c', 1]] as const)(
  'A2-02: wrong STRONG truth ranked %s is raw retrieval, not simulated primary recovery',
  (_rank, productId, packageId, index) => {
    const result = queries([['q-a', e => { e.productId = productId; e.packageId = packageId; }]])[0];
    expect(result.outcome.status).toBe('STRONG');
    if (result.outcome.status === 'FAILURE') throw new Error('fixture failed');
    expect(result.outcome.candidates[index].productId).toBe(productId);
    const strong = metrics([result]);
    expect(strong.rates.knownProductTop3Retrieval).toEqual(rate(1, 1));
    expect(strong.rates.strongProductPrecision.value).toBe(0);
    expect(strong.rates.knownSimulatedDisplayRecovery).toEqual(rate(0, 1));
    expect(strong.rates).not.toHaveProperty('knownTop3ShownRecovery');
    const ambiguous = metrics([{ ...result, outcome: { ...result.outcome, status: 'AMBIGUOUS' } }]);
    expect(ambiguous.rates.knownSimulatedDisplayRecovery).toEqual(rate(1, 1));
    expect(ambiguous.rates.knownProductTop3Retrieval.value).toBe(1);
  });
test('A2-02: hand-count simulated primary/top3/none/none policy, including failures', () => {
  const correct = queries([['q-a', () => {}]])[0];
  const wrong = queries([['q-a', wrongProduct]])[0];
  if (wrong.outcome.status === 'FAILURE') throw new Error('fixture failed');
  const ambiguous: QueryResult = { ...wrong, queryId: 'ambiguous', outcome: { ...wrong.outcome, status: 'AMBIGUOUS' } };
  const refused: QueryResult = { ...wrong, queryId: 'refused', outcome: { ...wrong.outcome, status: 'UNKNOWN' } };
  const failed: QueryResult = { ...wrong, queryId: 'failed', outcome: { status: 'FAILURE', code: 'TIMEOUT' } };
  const results = [correct, wrong, ambiguous, refused, failed];
  const report = metrics(results);
  expect(report.rates.knownProductTop3Retrieval).toEqual(rate(4, 5));
  expect(report.rates.knownSimulatedDisplayRecovery).toEqual(rate(2, 5));
  expect(report.rates.failureRate).toEqual(rate(1, 5));
  expect(report.simulatedDisplayPolicy).toEqual({
    version: 'strong-primary-ambiguous-top3-v1', STRONG: 'primary-only',
    AMBIGUOUS: 'top-three-products', UNKNOWN: 'none', FAILURE: 'none',
    limitation: 'Simulated lab policy only; no rendered UI or actual user recovery measured.',
  });
  expect(metricSummary(results)).toContain('Simulated lab policy only');
});
