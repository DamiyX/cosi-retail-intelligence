import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { datasetSchema, defaultConfig } from '../src/schema.ts';
import { sweep, freezeConfig, holdoutConfig } from '../src/calibration.ts';
import { sha256 } from '../src/provenance.ts';

const fixture = () => datasetSchema.parse(JSON.parse(readFileSync(resolve(__dirname, '../fixtures/dataset.json'), 'utf8')));
const hash = '1'.repeat(64);
test.each(['development', 'holdout'] as const)('sweep rejects %s before running query observations', split => {
  expect(() => sweep(fixture(), [defaultConfig], split)).toThrow('Sweeps may only use calibration');
});
test('sweeps evaluate calibration only, never an explosive holdout observation', () => {
  const data = fixture();
  const holdout = data.entries.find(e => e.role === 'query' && e.split === 'holdout')!;
  Object.defineProperty(holdout, 'observation', { get() { throw new Error('Holdout read'); } });
  const outputs = sweep(data, [defaultConfig, { ...defaultConfig, productMargin: 0.5 }], 'calibration');
  expect(outputs).toHaveLength(2);
  expect(outputs.every(s => s.results.every(r => r.split === 'calibration'))).toBe(true);
  expect(outputs[0].results).toHaveLength(3);
});
test('holdout accepts frozen config and rejects config, dataset or query-id drift', () => {
  const data = fixture(); const frozen = freezeConfig(data, hash, defaultConfig);
  expect(holdoutConfig(frozen, data, hash)).toEqual(defaultConfig);
  expect(frozen.configHash).toBe(sha256(JSON.stringify(defaultConfig)));
  expect(() => holdoutConfig({ ...frozen, config: { ...defaultConfig, strongAt: 0.99 } }, data, hash)).toThrow('Frozen config or dataset changed');
  expect(() => holdoutConfig(frozen, data, '2'.repeat(64))).toThrow();
  expect(() => holdoutConfig({ ...frozen, calibrationQueryIds: ['hold-a'] }, data, hash)).toThrow();
});
test('freeze and sweep refuse empty calibration and invalid thresholds', () => {
  const data = fixture(); data.entries = data.entries.filter(e => e.split !== 'calibration');
  expect(() => freezeConfig(data, hash, defaultConfig)).toThrow('No calibration queries');
  expect(() => sweep(data, [defaultConfig], 'calibration')).toThrow('No calibration queries');
  expect(() => sweep(fixture(), [{ ...defaultConfig, unknownBelow: 0.95, strongAt: 0.9 }], 'calibration')).toThrow();
});
