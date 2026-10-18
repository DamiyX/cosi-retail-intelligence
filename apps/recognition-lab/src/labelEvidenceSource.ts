import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { inputPath, retrievalLab } from './retrievalPaths.ts';
import { sha256 } from './provenance.ts';
import { core } from './labelEvidenceSchema.ts';

export function labelSourceManifest(): [string, string][] {
  const files = new Set<string>();
  function visit(path: string) {
    path = inputPath(path); if (files.has(path)) return; files.add(path);
    if (path.endsWith('.ts')) for (const m of readFileSync(path, 'utf8').matchAll(/(?:from\s+|import\s*)['"](\.\.?\/[^'"]+)['"]/g)) visit(resolve(dirname(path), m[1]));
  }
  for (const name of readdirSync(resolve(retrievalLab, 'src')).filter(n => /^labelEvidence.*\.ts$/.test(n))) visit(resolve(retrievalLab, 'src', name));
  for (const name of readdirSync(resolve(retrievalLab, 'tools/label-evidence')).filter(n => /\.(cjs|js)$/.test(n))) visit(resolve(retrievalLab, 'tools/label-evidence', name));
  return [...files].map(path => [relative(retrievalLab, path).replaceAll('\\', '/'), sha256(readFileSync(path))] as [string, string])
    .sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
}
export const ruleVersion = 'unique-support-all-rivals-contradicted-v1' as const;
export function ruleSha256() { return sha256(core.canonical(core.rule) + '\n' + readFileSync(resolve(retrievalLab, 'tools/label-evidence/core.cjs'), 'utf8')); }
export function labelSourceSha256() { return sha256(core.canonical(labelSourceManifest())); }
