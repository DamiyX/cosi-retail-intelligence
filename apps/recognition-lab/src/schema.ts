import { z } from 'zod';

export const LABEL = 'SYNTHETIC TOOLING-ONLY — NOT RECOGNITION ACCURACY';
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/);
export const splitSchema = z.enum(['development', 'calibration', 'holdout']);
export type Split = z.infer<typeof splitSchema>;
const vectorSchema = z.object({ space: id, values: z.array(z.number()) }).strict();
const observationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('vector'), vector: vectorSchema }).strict(),
  z.object({ kind: z.literal('failure'), code: z.enum(['ADAPTER_ERROR', 'TIMEOUT']) }).strict(),
]);
export const datasetSchema = z.object({
  schemaVersion: z.literal(1),
  datasetId: id,
  version: id,
  kind: z.enum(['synthetic-tooling-only', 'real-capture']),
  storeScope: id,
  adapter: z.object({ id, preprocessingId: id, space: id, dimension: z.number().int().positive().max(100000) }).strict(),
  products: z.array(z.object({ id, packages: z.array(id) }).strict()),
  entries: z.array(z.object({
    id, productId: id, packageId: id.nullable(),
    role: z.enum(['reference', 'query']),
    split: splitSchema,
    known: z.boolean(),
    captureSession: id,
    packagingGeneration: id,
    asset: z.object({ path: z.string().min(1), sha256: z.string().regex(/^[0-9a-f]{64}$/) }).strict(),
    capture: z.object({ device: id, lighting: id, view: id, occlusion: id }).strict(),
    rights: z.object({ permissionId: id, provenance: id }).strict(),
    observation: observationSchema.optional(),
  }).strict()),
}).strict();
export type Dataset = z.infer<typeof datasetSchema>;
export type Entry = Dataset['entries'][number];

export const configSchema = z.object({
  version: z.literal('cosine-max-product-package-v1'),
  unknownBelow: z.number().min(-1).max(1),
  strongAt: z.number().min(-1).max(1),
  productMargin: z.number().min(0).max(2),
  packageMargin: z.number().min(0).max(2),
}).strict().refine(c => c.unknownBelow <= c.strongAt, 'unknownBelow must not exceed strongAt');
export type Config = z.infer<typeof configSchema>;
export const defaultConfig: Config = {
  version: 'cosine-max-product-package-v1', unknownBelow: 0.5, strongAt: 0.9,
  productMargin: 0.1, packageMargin: 0.1,
};
export class LabError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
