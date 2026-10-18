import { LABEL } from './schema.ts';
import type { QueryResult } from './experiment.ts';

export interface Rate { numerator: number; denominator: number; value: number | null }
const rate = (numerator: number, denominator: number): Rate => ({ numerator, denominator, value: denominator ? numerator / denominator : null });
export function latency(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  return {
    label: 'Synthetic Node tooling-only milliseconds; no Android/camera/encoder claim',
    samples: n, method: 'median; nearest-rank p90 with n>=10, p95 with n>=20',
    median: n ? (sorted[Math.floor((n - 1) / 2)] + sorted[Math.floor(n / 2)]) / 2 : null,
    p90: n >= 10 ? sorted[Math.ceil(0.9 * n) - 1] : null,
    p95: n >= 20 ? sorted[Math.ceil(0.95 * n) - 1] : null,
    min: n ? sorted[0] : null, max: n ? sorted[n - 1] : null,
  };
}
export function metrics(results: QueryResult[]) {
  const known = results.filter(r => r.truth.known);
  const unknown = results.filter(r => !r.truth.known);
  const successes = results.filter(r => r.outcome.status !== 'FAILURE');
  const failures = results.filter(r => r.outcome.status === 'FAILURE');
  const strong = results.filter(r => r.outcome.status === 'STRONG');
  const refused = results.filter(r => r.outcome.status === 'UNKNOWN');
  const ambiguous = results.filter(r => r.outcome.status === 'AMBIGUOUS');
  const top = (r: QueryResult) => r.outcome.status === 'FAILURE' ? undefined : r.outcome.candidates[0];
  const productCorrect = (r: QueryResult) => r.truth.known && top(r)?.productId === r.truth.productId;
  const jointCorrect = (r: QueryResult) => r.truth.packageId !== null && productCorrect(r) && top(r)?.packageId === r.truth.packageId;
  const top3 = (r: QueryResult) => r.outcome.status !== 'FAILURE' && r.outcome.candidates.some(c => c.productId === r.truth.productId);
  const packageKnown = known.filter(r => r.truth.packageId !== null);
  const labelledPackages = results.filter(r => r.truth.packageId !== null);
  const labelledStrong = strong.filter(r => r.truth.packageId !== null);
  const simulatedDisplayPolicy = {
    version: 'strong-primary-ambiguous-top3-v1',
    STRONG: 'primary-only', AMBIGUOUS: 'top-three-products', UNKNOWN: 'none', FAILURE: 'none',
    limitation: 'Simulated lab policy only; no rendered UI or actual user recovery measured.',
  };
  // Automatic package claims are STRONG only. Ambiguous recommendations require confirmation.
  const packageClaims = strong.filter(r => r.truth.packageId !== null && top(r)?.packageId !== null);
  return {
    label: LABEL, populations: { total: results.length, known: known.length, unknown: unknown.length,
      successful: successes.length, failed: failures.length, strong: strong.length, ambiguous: ambiguous.length, refused: refused.length },
    packageLabels: { labelled: labelledPackages.length, missing: results.length - labelledPackages.length,
      knownLabelled: packageKnown.length, knownMissing: known.length - packageKnown.length,
      strongLabelled: labelledStrong.length, strongMissing: strong.length - labelledStrong.length },
    simulatedDisplayPolicy,
    rates: {
      knownProductTop1Retrieval: rate(known.filter(productCorrect).length, known.length),
      knownProductTop3Retrieval: rate(known.filter(top3).length, known.length),
      knownSimulatedDisplayRecovery: rate(known.filter(r => r.outcome.status === 'STRONG' ? productCorrect(r) :
        r.outcome.status === 'AMBIGUOUS' && top3(r)).length, known.length),
      knownPackageTop1JointRetrieval: rate(packageKnown.filter(jointCorrect).length, packageKnown.length),
      knownPackageTop3JointRetrieval: rate(packageKnown.filter(r => r.outcome.status !== 'FAILURE' &&
        r.outcome.packageCandidates.some(c => c.productId === r.truth.productId && c.packageId === r.truth.packageId)).length, packageKnown.length),
      unknownFalseStrong: rate(unknown.filter(r => r.outcome.status === 'STRONG').length, unknown.length),
      strongProductPrecision: rate(strong.filter(productCorrect).length, strong.length),
      strongJointPrecision: rate(labelledStrong.filter(jointCorrect).length, labelledStrong.length),
      packageLabelCoverage: rate(labelledPackages.length, results.length),
      strongJointLabelCoverage: rate(labelledStrong.length, strong.length),
      strongCoverage: rate(strong.length, results.length),
      unknownRecall: rate(unknown.filter(r => r.outcome.status === 'UNKNOWN').length, unknown.length),
      unknownPrecision: rate(refused.filter(r => !r.truth.known).length, refused.length),
      claimedPackageAccuracy: rate(packageClaims.filter(jointCorrect).length, packageClaims.length),
      packageClaimCoverage: rate(packageClaims.length, labelledPackages.length),
      ambiguousTop3Recovery: rate(ambiguous.filter(r => r.truth.known && top3(r)).length, ambiguous.filter(r => r.truth.known).length),
      failureRate: rate(failures.length, results.length),
    },
    failureCodes: Object.fromEntries([...new Set(failures.map(r => r.outcome.status === 'FAILURE' ? r.outcome.code : ''))].sort()
      .map(code => [code, failures.filter(r => r.outcome.status === 'FAILURE' && r.outcome.code === code).length])),
    confusionCases: results.filter(r => r.outcome.status === 'FAILURE' || (r.truth.known ?
      !productCorrect(r) || (r.truth.packageId !== null && !jointCorrect(r)) || r.outcome.status === 'UNKNOWN' : r.outcome.status !== 'UNKNOWN')).map(r => ({
      queryId: r.queryId, truth: r.truth, predicted: top(r) ?? null, status: r.outcome.status,
      reason: r.outcome.status === 'FAILURE' ? 'RUNTIME_FAILURE' : !r.truth.known ?
        (r.outcome.status === 'STRONG' ? 'FALSE_STRONG_UNKNOWN' : 'UNRESOLVED_UNKNOWN') :
        !productCorrect(r) ? 'WRONG_PRODUCT' : r.truth.packageId !== null && !jointCorrect(r) ? 'WRONG_OR_UNCERTAIN_PACKAGE' : 'REFUSED_KNOWN',
      lighting: r.lighting, view: r.view,
    })),
    timing: { all: latency(results.map(r => r.elapsedMs)), successful: latency(successes.map(r => r.elapsedMs)),
      failed: latency(failures.map(r => r.elapsedMs)) },
  };
}
export function metricSummary(results: QueryResult[]): string {
  const report = metrics(results);
  const format = (r: Rate) => r.value === null ? 'N/A (0/0)' : (100 * r.value).toFixed(2) + '% (' + r.numerator + '/' + r.denominator + ')';
  return [LABEL, '', 'Cosine scores are similarities, not probabilities. No recognition accuracy gate is passed.',
    'Known retrieval denominators and coverage include failures. Top3 contains distinct products.',
    'Joint precision evaluates STRONG results with package ground truth, including wrong products and unknown false positives. Missing package labels are excluded.',
    'Package label counts: ' + JSON.stringify(report.packageLabels),
    'Simulated display policy: ' + JSON.stringify(report.simulatedDisplayPolicy),
    '', '| Metric | Rate (count/denominator) |', '| --- | --- |',
    ...Object.entries(report.rates).map(([name, value]) => '| ' + name + ' | ' + format(value) + ' |'),
    '', 'Populations: ' + JSON.stringify(report.populations), 'Failure codes: ' + JSON.stringify(report.failureCodes),
    'Timing (synthetic Node tooling only): ' + JSON.stringify(report.timing),
    'Confusion cases: ' + JSON.stringify(report.confusionCases), ''].join('\n');
}
