import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { datasetSchema, defaultConfig } from '../src/schema.ts';
import { experiment } from '../src/experiment.ts';
import { prepareGallery, unitVector } from '../src/ranking.ts';

const fixture = () => datasetSchema.parse(JSON.parse(readFileSync(resolve(__dirname, '../fixtures/dataset.json'), 'utf8')));
const stable = (results: ReturnType<typeof experiment>) => results.map(({ elapsedMs: _elapsed, ...result }) => result);
test('repeats synthetic outcomes exactly with distinct explicit failures', () => {
  const data = fixture();
  const first = experiment(data, defaultConfig, 'development');
  expect(stable(first)).toEqual(stable(experiment(data, defaultConfig, 'development')));
  expect(first.map(r => r.outcome.status)).toEqual(['STRONG', 'UNKNOWN', 'FAILURE']);
  expect(first[2].outcome).toEqual({ status: 'FAILURE', code: 'ADAPTER_ERROR' });
});
test('invalid input and empty gallery stop the experiment', () => {
  expect(() => datasetSchema.parse({})).toThrow();
  const data = fixture(); data.entries = data.entries.filter(e => e.role === 'query');
  expect(() => experiment(data, defaultConfig, 'development')).toThrow('Gallery has no references');
});
test.each([
  ['VECTOR_DIMENSION', { space: 'synthetic-v1', values: [1] }],
  ['VECTOR_VERSION', { space: 'wrong-version', values: [1, 0, 0] }],
  ['INVALID_VECTOR', { space: 'synthetic-v1', values: [NaN, 0, 1] }],
  ['INVALID_VECTOR', { space: 'synthetic-v1', values: [Infinity, 0, 1] }],
  ['ZERO_VECTOR', { space: 'synthetic-v1', values: [0, 0, 0] }],
])('rejects %s without a valid UNKNOWN', (code, vector) => {
  const data = fixture();
  const entry = data.entries[0]; entry.observation = { kind: 'vector', vector };
  try { unitVector(entry, data.adapter); throw new Error('expected failure'); }
  catch (error) { expect(error).toHaveProperty('code', code); }
  expect(() => prepareGallery(data)).toThrow();
});
test('finite extreme vectors normalize safely', () => {
  const data = fixture(); const entry = data.entries[0];
  entry.observation = { kind: 'vector', vector: { space: 'synthetic-v1', values: [Number.MAX_VALUE, Number.MAX_VALUE, 0] } };
  expect(unitVector(entry, data.adapter)[0]).toBeCloseTo(Math.SQRT1_2);
});
test('query version errors and timeouts remain failures with query identity', () => {
  const data = fixture(); const queries = data.entries.filter(e => e.role === 'query' && e.split === 'development');
  queries[0].observation = { kind: 'failure', code: 'TIMEOUT' };
  queries[1].observation = { kind: 'vector', vector: { space: 'other', values: [0, 1, 0] } };
  expect(experiment(data, defaultConfig, 'development').map(r => r.outcome)).toEqual([
    { status: 'FAILURE', code: 'TIMEOUT' }, { status: 'FAILURE', code: 'VECTOR_VERSION' }, { status: 'FAILURE', code: 'ADAPTER_ERROR' },
  ]);
});
test('real data never silently runs synthetic recognition', () => {
  const data = fixture(); data.kind = 'real-capture';
  expect(() => experiment(data, defaultConfig, 'development')).toThrow('R0 has no real encoder');
});
test.each(['id', 'preprocessingId'] as const)('rejects unavailable adapter %s rather than falsely recording its execution', field => {
  const data = fixture(); data.adapter[field] = 'unsupported-v2';
  expect(() => experiment(data, defaultConfig, 'development')).toThrow('R0 only implements the authored-vector-v1');
});
