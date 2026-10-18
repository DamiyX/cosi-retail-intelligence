import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { datasetSchema, LabError } from './schema.ts';
import type { Dataset } from './schema.ts';
import { sha256 } from './provenance.ts';

export interface IntegrityIssue { code: string; entryId?: string; field?: string }
export class IntegrityError extends LabError {
  readonly issues: IntegrityIssue[];
  constructor(issues: IntegrityIssue[]) { super('DATASET_INTEGRITY', 'Dataset rejected'); this.issues = issues; }
}
function within(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === '' || !isAbsolute(rel) && rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\');
}
function confinedAsset(root: string, locator: string): string {
  // Portable forward-slash locators only; no URLs, drive names, UNC or traversal.
  if (isAbsolute(locator) || !/^[a-zA-Z0-9._/-]+$/.test(locator) ||
    locator.split('/').some(part => !part || part === '.' || part === '..'))
    throw new LabError('ASSET_PATH', 'Invalid relative locator');
  const lexical = resolve(root, locator);
  if (!within(root, lexical)) throw new LabError('ASSET_PATH', 'Asset escapes root');
  const canonical = realpathSync(lexical);
  if (!within(root, canonical)) throw new LabError('ASSET_PATH', 'Asset symlink escapes root');
  if (!statSync(canonical).isFile()) throw new LabError('ASSET_UNAVAILABLE', 'Asset is not a file');
  return canonical;
}
export function validateDataset(input: unknown, approvedRoot: string): Dataset {
  const parsed = datasetSchema.safeParse(input);
  if (!parsed.success) throw new IntegrityError(parsed.error.issues.map(issue => ({ code: 'MANIFEST_SCHEMA', field: issue.path.join('.') })));
  const data = parsed.data;
  const issues: IntegrityIssue[] = [];
  let root: string;
  try { root = realpathSync(approvedRoot); if (!statSync(root).isDirectory()) throw new Error(); }
  catch { throw new IntegrityError([{ code: 'DATASET_ROOT_UNAVAILABLE' }]); }
  const products = new Map<string, Set<string>>();
  const packages = new Set<string>();
  for (const product of data.products) {
    if (products.has(product.id)) issues.push({ code: 'DUPLICATE_PRODUCT', field: product.id });
    products.set(product.id, new Set(product.packages));
    for (const id of product.packages) {
      if (packages.has(id)) issues.push({ code: 'DUPLICATE_PACKAGE', field: id });
      packages.add(id);
    }
  }
  const enrolled = new Set(data.entries.filter(e => e.role === 'reference').map(e => e.productId));
  const ids = new Set<string>();
  const hashes = new Map<string, { role: string; split: string }[]>();
  const sessions = new Map<string, { role: string; split: string }[]>();
  for (const entry of data.entries) {
    const issue = (code: string) => issues.push({ code, entryId: entry.id });
    if (ids.has(entry.id)) issue('DUPLICATE_ENTRY');
    ids.add(entry.id);
    const packageIds = products.get(entry.productId);
    if (!packageIds || entry.packageId !== null && !packageIds.has(entry.packageId)) issue('PRODUCT_PACKAGE_RELATION');
    if (entry.role === 'reference' && (!entry.known || entry.split !== 'development')) issue('REFERENCE_ROLE');
    if (entry.role === 'query' && !entry.known && enrolled.has(entry.productId)) issue('UNKNOWN_ENROLLED');
    if (entry.role === 'query' && entry.known && !enrolled.has(entry.productId)) issue('KNOWN_NOT_ENROLLED');
    try {
      if (sha256(readFileSync(confinedAsset(root, entry.asset.path))) !== entry.asset.sha256) issue('ASSET_HASH');
    } catch (error) { issue(error instanceof LabError ? error.code : 'ASSET_UNAVAILABLE'); }
    for (const [map, key] of [[hashes, entry.asset.sha256], [sessions, entry.captureSession]] as const) {
      const group = map.get(key) ?? []; group.push(entry); map.set(key, group);
    }
  }
  for (const [groups, code] of [[hashes, 'EXACT_DUPLICATE_LEAKAGE'], [sessions, 'CAPTURE_SESSION_LEAKAGE']] as const) {
    for (const group of groups.values()) {
      if (new Set(group.map(e => e.role)).size > 1 || new Set(group.map(e => e.split)).size > 1)
        issues.push({ code });
    }
  }
  if (issues.length) throw new IntegrityError(issues);
  return data;
}
export function importDataset(manifest: string, approvedRoot: string) {
  let bytes: Buffer;
  try {
    const root = realpathSync(approvedRoot);
    const location = realpathSync(manifest);
    if (!within(root, location)) throw new IntegrityError([{ code: 'MANIFEST_OUTSIDE_ROOT' }]);
    bytes = readFileSync(location);
  } catch (error) {
    if (error instanceof IntegrityError) throw error;
    throw new IntegrityError([{ code: 'MANIFEST_UNAVAILABLE' }]);
  }
  let input: unknown;
  try { input = JSON.parse(bytes.toString('utf8')); }
  catch { throw new IntegrityError([{ code: 'MANIFEST_JSON' }]); }
  const dataset = validateDataset(input, approvedRoot);
  return { dataset, manifestHash: sha256(bytes), integrity: {
    label: dataset.kind === 'synthetic-tooling-only' ? 'SYNTHETIC TOOLING-ONLY — NOT RECOGNITION ACCURACY' : 'DATASET INTEGRITY ONLY — NO ENCODER OR RECOGNITION RESULTS',
    status: 'VALID', datasetId: dataset.datasetId, version: dataset.version, kind: dataset.kind,
    assetCount: dataset.entries.length,
    roles: Object.fromEntries(['reference', 'query'].map(role => [role, dataset.entries.filter(e => e.role === role).length])),
    querySplits: Object.fromEntries(['development', 'calibration', 'holdout'].map(split => [split, dataset.entries.filter(e => e.role === 'query' && e.split === split).length])),
    curatorReviewRequired: 'Hashes cannot detect transformed duplicates or prove independent physical captures.',
  } };
}
