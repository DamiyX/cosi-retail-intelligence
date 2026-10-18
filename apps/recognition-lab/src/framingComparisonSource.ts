import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { inputPath, retrievalLab } from './retrievalPaths.ts';
import { sha256 } from './provenance.ts';
import { sourceFingerprint } from './exploratoryStudy.ts';
import { LabError } from './schema.ts';

export const FROZEN_MANUAL_ROOT = 'C:/Users/doyew/AppData/Local/Temp/cosi-exploratory-manual-a5-20261010';
export const GUARD_FILES = [
  [FROZEN_MANUAL_ROOT + '/Invoke-ManualExperiment.ps1', 'dbe7abae4f931d7f75890a4b470521aea7dfedd1826cb81064d9223198401a67'],
  [FROZEN_MANUAL_ROOT + '/Support-ReadOnly.ps1', 'e3a2f09fc5dbb542de8c9c95dd11d72e205fa380856930603ba39c25f5108a9c'],
  [FROZEN_MANUAL_ROOT + '/Native.cs', 'd7792ec63f5bb5426a216ac917a614e5080f5986cdaac90cd95f7ecac8315067'],
  ['C:/Users/doyew/AppData/Local/Temp/cosi-exploratory-isolation-ir01-ir02-20261004/Invoke-ExploratoryIsolation.ps1',
    'a3b211813d896c56982756f12a7f88fb17c65828fc55c2253d4be5a5790b523f'],
] as const;
// All local TS imports are walked, including the baseline's transitive imports.
// Python modules are closed over the two reviewed directories; no plugin imports.
export function framingSourceManifest() {
  const files = new Set<string>();
  function visit(path: string) {
    path = inputPath(path); if (files.has(path)) return; files.add(path);
    if (!path.endsWith('.ts')) return;
    const text = readFileSync(path, 'utf8');
    for (const m of text.matchAll(/(?:from\s+|import\s*)['"](\.\.?\/[^'"]+)['"]/g)) visit(resolve(dirname(path), m[1]));
  }
  for (const name of readdirSync(resolve(retrievalLab, 'src')).filter(n => /^framingComparison.*\.ts$/.test(n)))
    visit(resolve(retrievalLab, 'src', name));
  for (const dir of ['tools/exploratory', 'tools/framing-comparison']) {
    for (const name of readdirSync(resolve(retrievalLab, dir))) {
      if (/\.(py|lock|cjs|js|html|ps1|json|cs)$/.test(name)) visit(resolve(retrievalLab, dir, name));
    }
  }
  for (const name of ['exploratoryStudy', 'exploratoryEvaluation', 'exploratoryReport', 'exploratoryCli'])
    visit(resolve(retrievalLab, 'src', name + '.ts'));
  const local = [...files].map(path => [path.slice(retrievalLab.length + 1).replaceAll('\\', '/'), sha256(readFileSync(path))]);
  const guards = GUARD_FILES.map(([path, expected]) => {
    if (sha256(readFileSync(path)) !== expected) throw new LabError('SETUP_BLOCKED', 'Frozen guard drift');
    return ['frozen-guard/' + path.split('/').pop(), expected];
  });
  return [...local, ...guards].sort((a, b) => a[0] < b[0] ? -1 : 1);
}
export function framingSourceFingerprint() { return sha256(JSON.stringify(framingSourceManifest())); }
export function verifyBaselineSource(expected: string) {
  if (sourceFingerprint() !== expected) throw new LabError('SETUP_BLOCKED', 'Historical baseline source drift');
}
