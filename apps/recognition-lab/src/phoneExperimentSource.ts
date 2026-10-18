import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { retrievalLab } from './retrievalPaths.ts';
import { sha256 } from './phoneExperimentSchema.ts';
export function phoneSourceManifest() {
  const paths = readdirSync(resolve(retrievalLab, 'src')).filter(n => /^phoneExperiment.*\.ts$/.test(n)).map(n => 'src/' + n);
  for (const name of ['retrievalPaths.ts', 'schema.ts', 'provenance.ts']) paths.push('src/' + name);
  const fixtures = resolve(retrievalLab, 'fixtures/phone-experiment');
  paths.push(...readdirSync(fixtures).map(n => 'fixtures/phone-experiment/' + n));
  return paths.sort().map(path => [path, sha256(readFileSync(resolve(retrievalLab, path)))]);
}
export const phoneSourceSha256 = () => sha256(JSON.stringify(phoneSourceManifest()));
