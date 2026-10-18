import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readJson, inputPath, retrievalLab } from './retrievalPaths.ts';
import { sourceFingerprint, validateStudy, boundInput, setupSchema } from './exploratoryStudy.ts';
import { evaluate, validateBundle } from './exploratoryEvaluation.ts';
import { renderReport } from './exploratoryReport.ts';
import { sha256 } from './provenance.ts';
import { LabError } from './schema.ts';
export function exploratoryCli(args: string[]): number {
  try {
    if (args.length === 1 && args[0] === 'fingerprint') { console.log(sourceFingerprint()); return 0; }
    const options: Record<string, string> = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--study', '--root', '--bundle', '--setup', '--out', '--run-id'].includes(args[i]) || !args[i + 1] || options[args[i]])
        throw new LabError('ARGUMENT', 'Exact explicit arguments required');
      options[args[i]] = args[i + 1];
    }
    if (Object.keys(options).length !== 6) throw new LabError('ARGUMENT', 'All six arguments required');
    const s = readJson(options['--study']); const study = validateStudy(s.value);
    const bundlePath = inputPath(options['--bundle']); const setup = readJson(options['--setup']);
    const setupValue = setupSchema.parse(setup.value);
    if (setupValue.modelSha256 !== study.modelSha256 || setupValue.recipeSha256 !== study.recipeSha256 ||
      study.kind === 'private-same-instance' && !setupValue.networkReviewed) throw new LabError('SETUP_BLOCKED', 'Setup review unresolved');
    const b = validateBundle(study, JSON.parse(readFileSync(bundlePath, 'utf8')), { studySha256: s.sha256,
      sourceSha256: sourceFingerprint(), setupSha256: setup.sha256, softwareSha256: setupValue.softwareSha256, runId: options['--run-id'] });
    const root = inputPath(options['--root'], true);
    const approved = resolve(retrievalLab, study.kind === 'generated-fixture' ? 'runs/exploratory' : 'private-data');
    if (!root.startsWith(approved + '/') && !root.startsWith(approved + '\\')) throw new LabError('SETUP_BLOCKED', 'Unapproved image root');
    const assets = study.entries.map(e => resolve(root, e.asset.path));
    assets.forEach((p, i) => boundInput(p, study.entries[i].asset.sha256));
    const report = evaluate(study, b);
    renderReport(study, b, report, resolve(bundlePath, '..'), options['--out'], [options['--study'], options['--setup'], bundlePath, ...assets]);
    // Recheck originals after rendering. No input bytes enter shared stdout.
    if (assets.some((p, i) => sha256(boundInput(p, study.entries[i].asset.sha256)) !== study.entries[i].asset.sha256))
      throw new LabError('INPUT_CHANGED', 'Original changed during report');
    console.log(JSON.stringify({ complete: report.complete, denominator: report.denominator, scored: report.scored, mode: report.mode,
      runFailure: report.runFailure, timings: report.timings }));
    return report.complete ? 0 : 2;
  } catch (error) {
    console.error(error instanceof LabError ? error.code : 'SETUP_BLOCKED'); return 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = exploratoryCli(process.argv.slice(2));
