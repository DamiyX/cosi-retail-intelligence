import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inputPath, outputTargets, protectInputs } from './retrievalPaths.ts';
import { sha256 } from './phoneExperimentSchema.ts';
import { fixtureNames, generatedExperiment } from './phoneExperimentGenerated.ts';
import { phoneSourceSha256, phoneSourceManifest } from './phoneExperimentSource.ts';
import { evaluatePhoneExperiment } from './phoneExperimentEvaluation.ts';
function options(rest: string[], keys: string[]) {
  if (rest.length !== keys.length * 2) throw Error('PHONE_ARGUMENTS'); const args: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) { if (!keys.includes(rest[i]) || rest[i] in args || !rest[i + 1]) throw Error('PHONE_ARGUMENTS'); args[rest[i]] = rest[i + 1]; }
  if (keys.some(k => !args[k])) throw Error('PHONE_ARGUMENTS'); return args;
}
function writeNew(directory: string, values: Record<string, string>, inputs: string[] = []) {
  const target = outputTargets(directory, Object.keys(values)); protectInputs(target.paths, inputs);
  if (target.paths.some(p => existsSync(p))) throw Error('PHONE_OUTPUT_EXISTS');
  target.create(); Object.values(values).forEach((value, i) => writeFileSync(target.paths[i], value, { flag: 'wx' }));
}
export function phoneExperimentCli(argv: string[]) {
  try {
    const [command, ...rest] = argv;
    if (command === 'fingerprint') { if (rest.length) throw Error('PHONE_ARGUMENTS'); console.log(phoneSourceSha256()); return 0; }
    if (command === 'sample') {
      const o = options(rest, ['--scenario', '--out']); if (!fixtureNames.includes(o['--scenario'] as typeof fixtureNames[number])) throw Error('PHONE_SCENARIO');
      const fixture = generatedExperiment(phoneSourceSha256(), o['--scenario'] as typeof fixtureNames[number]);
      const report = evaluatePhoneExperiment(fixture.manifest, fixture.manifestHash, fixture.bundle);
      writeNew(o['--out'], { 'manifest.json': fixture.manifestRaw, 'bundle.json': fixture.bundleRaw, 'comparison.json': JSON.stringify(report, null, 2) + '\n',
        'source-manifest.json': JSON.stringify(phoneSourceManifest(), null, 2) + '\n' });
      console.log(JSON.stringify({ generatedOnly: true, nativeValidated: false, complete: report.complete, trials: report.denominator, armRows: report.rows.length })); return report.complete ? 0 : 2;
    }
    if (command !== 'evaluate') throw Error('PHONE_ARGUMENTS');
    const o = options(rest, ['--manifest', '--bundle', '--out']), manifestPath = inputPath(o['--manifest']), bundlePath = inputPath(o['--bundle']);
    const read = (p: string) => { const raw = readFileSync(p); if (raw.length > 32 * 1024 * 1024) throw Error('PHONE_INPUT_SIZE'); return raw; };
    const manifestRaw = read(manifestPath), manifest = JSON.parse(manifestRaw.toString('utf8'));
    if (manifest.sourceSha256 !== phoneSourceSha256()) throw Error('PHONE_SOURCE_DRIFT');
    const report = evaluatePhoneExperiment(manifest, sha256(manifestRaw), JSON.parse(read(bundlePath).toString('utf8')));
    writeNew(o['--out'], { 'comparison.json': JSON.stringify(report, null, 2) + '\n' }, [manifestPath, bundlePath]);
    console.log(JSON.stringify({ generatedOnly: true, nativeValidated: false, complete: report.complete, trials: report.denominator, armRows: report.rows.length })); return report.complete ? 0 : 2;
  } catch (error) { console.error(error instanceof Error && /^PHONE_[A-Z0-9_]+$/.test(error.message) ? error.message : 'PHONE_INPUT_INVALID'); return 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = phoneExperimentCli(process.argv.slice(2));
