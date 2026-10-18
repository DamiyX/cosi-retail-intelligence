// Audit evidence only. Demonstrates current defects; not a production fix.
// From repository root: node docs/recognition/reports/R0_REAUDIT_REPRO.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateDataset } from '../../../apps/recognition-lab/src/importer.ts';
import { experiment } from '../../../apps/recognition-lab/src/experiment.ts';
import { defaultConfig } from '../../../apps/recognition-lab/src/schema.ts';
import { metrics } from '../../../apps/recognition-lab/src/metrics.ts';

const root = fileURLToPath(new URL('../../../apps/recognition-lab/fixtures/', import.meta.url));
const fixture = JSON.parse(readFileSync(new URL('../../../apps/recognition-lab/fixtures/dataset.json', import.meta.url), 'utf8'));
function check(change) {
  const data = structuredClone(fixture);
  data.entries = data.entries.filter(e => e.role === 'reference' || e.id === 'q-a');
  change(data.entries.find(e => e.id === 'q-a'));
  const accepted = validateDataset(data, root);
  const results = experiment(accepted, defaultConfig, 'development');
  return { result: results[0], rates: metrics(results).rates };
}
const unlabelled = check(q => { q.packageId = null; });
assert.equal(unlabelled.result.outcome.status, 'STRONG');
assert.equal(unlabelled.rates.strongProductPrecision.value, 1);
assert.equal(unlabelled.rates.strongJointPrecision.value, 1);
assert.equal(unlabelled.rates.claimedPackageAccuracy.value, null);
console.log('R0-A2-01 reproduced: no package ground truth, but joint precision is 1/1 (100%).');

const wrongStrong = check(q => { q.productId = 'b'; q.packageId = 'single-b'; });
assert.equal(wrongStrong.result.outcome.status, 'STRONG');
assert.equal(wrongStrong.result.outcome.candidates[0].productId, 'a');
assert.equal(wrongStrong.result.outcome.candidates[2].productId, 'b');
assert.equal(wrongStrong.rates.strongProductPrecision.value, 0);
assert.equal(wrongStrong.rates.knownProductTop3Retrieval.value, 1);
assert.equal(wrongStrong.rates.knownTop3ShownRecovery.value, 1);
console.log('R0-A2-02 reproduced: wrong STRONG A, true B ranked third, shown recovery is 1/1 (100%).');
console.log('Both manifests pass the actual importer. This script asserts current defects; after repair replace with regression tests, do not alter evidence to suggest the old code passed.');
