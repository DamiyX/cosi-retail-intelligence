import { z } from 'zod';
import type { Dataset, Config, Split } from './schema.ts';
import { configSchema, LABEL, LabError } from './schema.ts';
import { experiment } from './experiment.ts';
import { metrics } from './metrics.ts';
import { sha256 } from './provenance.ts';

export const frozenSchema = z.object({
  label: z.literal(LABEL), schemaVersion: z.literal(1),
  datasetHash: z.string().regex(/^[0-9a-f]{64}$/),
  sourceSplit: z.literal('calibration'), calibrationQueryIds: z.array(z.string()).min(1),
  config: configSchema, configHash: z.string().regex(/^[0-9a-f]{64}$/),
  selection: z.literal('explicit-curator-choice-not-production-threshold'),
}).strict();
export function freezeConfig(dataset: Dataset, datasetHash: string, config: Config) {
  const queries = dataset.entries.filter(e => e.role === 'query' && e.split === 'calibration');
  if (!queries.length) throw new LabError('EMPTY_CALIBRATION', 'No calibration queries');
  const parsed = configSchema.parse(config);
  return frozenSchema.parse({ label: LABEL, schemaVersion: 1, datasetHash, sourceSplit: 'calibration',
    calibrationQueryIds: queries.map(e => e.id), config: parsed, configHash: sha256(JSON.stringify(parsed)),
    selection: 'explicit-curator-choice-not-production-threshold' });
}
export function holdoutConfig(input: unknown, dataset: Dataset, datasetHash: string): Config {
  const frozen = frozenSchema.parse(input);
  const ids = dataset.entries.filter(e => e.role === 'query' && e.split === 'calibration').map(e => e.id);
  if (frozen.datasetHash !== datasetHash || frozen.configHash !== sha256(JSON.stringify(frozen.config)) ||
    JSON.stringify(frozen.calibrationQueryIds) !== JSON.stringify(ids))
    throw new LabError('FROZEN_CONFIG_MISMATCH', 'Frozen config or dataset changed');
  return frozen.config;
}
export function sweep(dataset: Dataset, configs: unknown, split: Split) {
  if (split !== 'calibration') throw new LabError('CALIBRATION_ONLY', 'Sweeps may only use calibration');
  if (!dataset.entries.some(e => e.role === 'query' && e.split === 'calibration')) throw new LabError('EMPTY_CALIBRATION', 'No calibration queries');
  const parsed = z.array(configSchema).min(1).max(50).parse(configs);
  return parsed.map(config => {
    const results = experiment(dataset, config, 'calibration');
    return { config, configHash: sha256(JSON.stringify(config)), results, metrics: metrics(results) };
  });
}
