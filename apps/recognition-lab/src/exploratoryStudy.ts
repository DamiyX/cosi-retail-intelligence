import { z } from 'zod';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { sha256 } from './provenance.ts';
import { inputPath, retrievalLab } from './retrievalPaths.ts';
import { LabError } from './schema.ts';

export const RECIPE = {
  version: 'rgb-letterbox-224-v1', size: 224, resize: 'Pillow-12.3.0-LANCZOS',
  rounding: 'floor(x+0.5)', padding: [128, 128, 128], oddPadding: 'right-bottom',
  orientation: 'EXIF-274-only', colour: 'untagged-or-sRGB; reject-other-profiles',
  layout: 'NHWC', dtype: 'float32-le', mean: 0, std: 255,
  maxBytes: 41943040, maxPixels: 50000000,
} as const;
export const MODEL_SHA = 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40';
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/);
export const digest = z.string().regex(/^[0-9a-f]{64}$/);
const asset = z.object({ path: z.string().min(1).max(256), sha256: digest }).strict();
export const studySchema = z.object({
  schemaVersion: z.literal(1), studyId: z.literal('same-instance-exploration-v1'),
  kind: z.enum(['generated-fixture', 'private-same-instance']),
  formalAdmission: z.literal(false), modelSha256: digest, recipeSha256: digest,
  products: z.array(z.object({ id, label: z.string().min(1).max(120), physicalFamily: id }).strict()).length(10),
  entries: z.array(z.object({ id, productId: id, physicalFamily: id, exposure: id,
    role: z.enum(['reference', 'query']), asset }).strict()).length(40),
}).strict();
export type Study = z.infer<typeof studySchema>;
export const setupSchema = z.object({ schemaVersion: z.literal(1), modelSha256: digest, recipeSha256: digest,
  softwareSha256: digest, rightsReviewed: z.literal(true), preprocessingReviewed: z.literal(true),
  networkReviewed: z.boolean(), reviewer: z.string().min(1).max(120), evidence: z.array(z.string().min(1)).min(1).max(20) }).strict();
export const recipeSha256 = sha256(JSON.stringify(RECIPE));
const json = (value: unknown) => JSON.stringify(value);
export function validateStudy(value: unknown): Study {
  const study = studySchema.parse(value);
  if (study.recipeSha256 !== recipeSha256 || study.modelSha256 !== MODEL_SHA)
    throw new LabError('SETUP_BLOCKED', 'Model or recipe mismatch');
  const unique = (values: string[]) => new Set(values).size === values.length;
  if (!unique(study.products.map(p => p.id)) || !unique(study.products.map(p => p.physicalFamily)) ||
      !unique(study.entries.map(e => e.id)) || !unique(study.entries.map(e => e.asset.path.toLowerCase())) ||
      !unique(study.entries.map(e => e.asset.sha256))) throw new LabError('SETUP_BLOCKED', 'Duplicate binding');
  for (const entry of study.entries) {
    const p = study.products.find(p => p.id === entry.productId);
    if (!p || p.physicalFamily !== entry.physicalFamily) throw new LabError('SETUP_BLOCKED', 'Family or identity mismatch');
    if (!/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.jpg$/.test(entry.asset.path) ||
      entry.asset.path.split('/').some(part => part === '.' || part === '..'))
      throw new LabError('SETUP_BLOCKED', 'Noncanonical JPEG path');
  }
  for (const p of study.products) {
    const entries = study.entries.filter(e => e.productId === p.id);
    const refs = entries.filter(e => e.role === 'reference'); const qs = entries.filter(e => e.role === 'query');
    if (refs.length !== 2 || qs.length !== 2 || refs.some(r => qs.some(q => r.exposure === q.exposure)))
      throw new LabError('SETUP_BLOCKED', 'Require two references and two separate-exposure queries per item');
  }
  return study;
}
export function sourceFingerprint() {
  const root = resolve(retrievalLab, 'tools/exploratory');
  const files = readdirSync(root).filter(p => /\.(py|lock)$/.test(p)).sort().map(p => resolve(root, p));
  files.push(...['exploratoryStudy', 'exploratoryEvaluation', 'exploratoryReport', 'exploratoryCli', 'ranking', 'retrievalPaths', 'schema', 'provenance']
    .map(p => resolve(retrievalLab, 'src', p + '.ts')));
  return sha256(json(files.map(p => [p.slice(retrievalLab.length + 1).replaceAll('\\', '/'), sha256(readFileSync(inputPath(p)))])));
}
export function boundInput(path: string, hash: string, max = 40 * 1024 * 1024) {
  const p = inputPath(path); if (statSync(p).size > max) throw new LabError('SETUP_BLOCKED', 'Input too large');
  const bytes = readFileSync(p); if (bytes.length > max || sha256(bytes) !== hash) throw new LabError('SETUP_BLOCKED', 'Input hash mismatch');
  return bytes;
}
