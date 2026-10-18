import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { datasetSchema, defaultConfig } from '../src/schema.ts';
import { experiment } from '../src/experiment.ts';
import type { QueryResult } from '../src/experiment.ts';
import { metrics, latency, metricSummary } from '../src/metrics.ts';
import { prepareGallery, rank } from '../src/ranking.ts';

const fixture = () => datasetSchema.parse(JSON.parse(readFileSync(resolve(__dirname, '../fixtures/dataset.json'), 'utf8')));
const holdout = () => experiment(fixture(), defaultConfig, 'holdout');
test('hand-counted unsafe fixture reports correct denominators including timeout', () => {
  const report = metrics(holdout());
  expect(report.populations).toEqual({ total: 8, known: 6, unknown: 2, successful: 7, failed: 1, strong: 4, ambiguous: 2, refused: 1 });
  const expected = {
    knownProductTop1Retrieval: [4, 6], knownProductTop3Retrieval: [5, 6], knownSimulatedDisplayRecovery: [5, 6],
    knownPackageTop1JointRetrieval: [2, 6], knownPackageTop3JointRetrieval: [5, 6], unknownFalseStrong: [1, 2], strongProductPrecision: [3, 4],
    strongJointPrecision: [2, 4], packageLabelCoverage: [8, 8], strongJointLabelCoverage: [4, 4],
    strongCoverage: [4, 8], unknownRecall: [1, 2], unknownPrecision: [1, 1],
    claimedPackageAccuracy: [2, 4], packageClaimCoverage: [4, 8], ambiguousTop3Recovery: [2, 2], failureRate: [1, 8],
  };
  for (const [name, [numerator, denominator]] of Object.entries(expected)) {
    expect(report.rates[name as keyof typeof report.rates]).toEqual({ numerator, denominator, value: numerator / denominator });
  }
  expect(report.failureCodes).toEqual({ TIMEOUT: 1 });
  expect(report.confusionCases.map(c => [c.queryId, c.reason])).toContainEqual(['hold-wrong-package', 'WRONG_OR_UNCERTAIN_PACKAGE']);
  expect(report.confusionCases.map(c => [c.queryId, c.reason])).toContainEqual(['hold-lookalike', 'FALSE_STRONG_UNKNOWN']);
  expect(report.timing.all.samples).toBe(8);
  expect(report.timing.successful.samples).toBe(7);
  expect(report.timing.failed.samples).toBe(1);
});
test('all UNKNOWN exposes zero strong coverage and N/A precision', () => {
  const refused: QueryResult[] = holdout().map(r => ({ ...r, outcome: { status: 'UNKNOWN', candidates: [], packageCandidates: [], margin: null } }));
  const report = metrics(refused);
  expect(report.rates.strongJointPrecision).toEqual({ numerator: 0, denominator: 0, value: null });
  expect(report.rates.strongCoverage.value).toBe(0);
  expect(report.rates.knownProductTop3Retrieval.value).toBe(0);
  expect(report.rates.unknownRecall.value).toBe(1);
  expect(metricSummary(refused)).toContain('N/A (0/0)');
});
test('empty populations are N/A and unknown failures never count as correct refusals', () => {
  const empty = metrics([]);
  expect(Object.values(empty.rates).every(r => r.value === null)).toBe(true);
  const unknownFailure: QueryResult = { queryId: 'u-error', truth: { productId: 'unknown', packageId: 'single-u', known: false },
    split: 'holdout', lighting: 'synthetic', view: 'synthetic', elapsedMs: 2, outcome: { status: 'FAILURE', code: 'TIMEOUT' } };
  const report = metrics([unknownFailure]);
  expect(report.rates.unknownRecall).toEqual({ numerator: 0, denominator: 1, value: 0 });
  expect(report.rates.unknownFalseStrong.denominator).toBe(1);
  expect(report.rates.failureRate.value).toBe(1);
  expect(report.rates.strongCoverage.denominator).toBe(1);
});
test('several reference views cannot consume three product alternatives', () => {
  const result = experiment(fixture(), defaultConfig, 'development')[0];
  if (result.outcome.status === 'FAILURE') throw new Error('fixture failure');
  expect(result.outcome.candidates.map(c => c.productId)).toEqual(['a', 'c', 'b']);
});
test('product ties do not force STRONG even when margin config is zero', () => {
  const result = rank([Math.SQRT1_2, Math.SQRT1_2, 0], [
    { entry: fixture().entries[0], vector: [1, 0, 0] },
    { entry: fixture().entries[1], vector: [0, 1, 0] },
  ], { ...defaultConfig, strongAt: 0.5, productMargin: 0, packageMargin: 0 });
  expect(result.status).toBe('AMBIGUOUS');
  expect(result.margin).toBe(0);
});
test('package ties require confirmation even when product identity is certain', () => {
  const data = fixture(); data.entries = data.entries.filter(e => e.productId === 'a' && e.role === 'reference');
  const result = rank([Math.SQRT1_2, 0, Math.SQRT1_2], prepareGallery(data), { ...defaultConfig, strongAt: 0.5, packageMargin: 0 });
  expect(result.status).toBe('AMBIGUOUS');
  expect(result.candidates[0].packageId).toBeNull();
  expect(result.candidates[0].packageCertain).toBe(false);
});
test('rankings retain candidates on refusal, while simulated display recovery stays separate', () => {
  const results = experiment(fixture(), { ...defaultConfig, unknownBelow: 0.8 }, 'holdout');
  const report = metrics(results);
  expect(report.rates.knownProductTop3Retrieval.numerator).toBe(5);
  expect(report.rates.knownSimulatedDisplayRecovery.numerator).toBe(4);
});
test('latency reports sample-size limits and nearest-rank percentiles', () => {
  expect(latency([]).median).toBeNull();
  expect(latency([2, 4]).median).toBe(3);
  expect(latency([2, 4]).p90).toBeNull();
  expect(latency(Array.from({ length: 10 }, (_, i) => i + 1))).toMatchObject({ median: 5.5, p90: 9, p95: null });
  expect(latency(Array.from({ length: 20 }, (_, i) => i + 1))).toMatchObject({ median: 10.5, p90: 18, p95: 19, samples: 20 });
});
