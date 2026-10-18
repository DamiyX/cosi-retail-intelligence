import { createRequire } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { inputPath, outputTargets, retrievalLab } from './retrievalPaths.ts';
import { boundInput, digest, MODEL_SHA, recipeSha256, setupSchema, validateStudy } from './exploratoryStudy.ts';
import { cropRecipeSha256, validateAnnotations, validateBaseline, validateComparison, validateCropBundle } from './framingComparisonSchema.ts';
import { framingSourceFingerprint, framingSourceManifest, verifyBaselineSource } from './framingComparisonSource.ts';
import { pairedEvaluation } from './framingComparisonEvaluation.ts';
import { renderFramingReport } from './framingComparisonReport.ts';
import { writeAnnotationPage } from './framingComparisonAnnotation.ts';
import { sha256 } from './provenance.ts';
import { LabError } from './schema.ts';

const require = createRequire(import.meta.url);
const { strictJson } = require(resolve(retrievalLab, 'tools/framing-comparison/annotation-core.cjs')) as { strictJson: (s: string) => unknown };
export function readFramingJson(path: string) {
  const bytes = readFileSync(inputPath(path));
  if (bytes.length > 4 * 1024 * 1024) throw new LabError('SETUP_BLOCKED', 'JSON too large');
  return { value: strictJson(bytes.toString('utf8')), sha256: sha256(bytes), bytes };
}
const framingSetupSchema = z.object({ schemaVersion: z.literal(1), kind: z.literal('FRAMING_SETUP'),
  modelSha256: digest, recipeSha256: digest, softwareSha256: digest, sourceSha256: digest, comparisonSha256: digest,
  annotationSha256: digest, baselineBundleSha256: digest, rightsReviewed: z.literal(true), preprocessingReviewed: z.literal(true),
  networkReviewed: z.boolean(), reviewer: z.string().min(1).max(120), evidence: z.array(z.string().min(1)).min(1).max(20) }).strict();
function exactBinding(actual: unknown, expected: Record<string, string>) {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
  const values = actual as Record<string, unknown>;
  return Object.keys(values).length === Object.keys(expected).length && Object.entries(expected).every(([k, v]) => values[k] === v);
}
function options(args: string[], required: string[], optional: string[] = []) {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (![...required, ...optional].includes(args[i]) || !args[i + 1] || out[args[i]]) throw new LabError('ARGUMENT', 'Exact arguments required');
    out[args[i]] = args[i + 1];
  }
  if (required.some(k => !out[k])) throw new LabError('ARGUMENT', 'Required arguments absent');
  return out;
}
export function framingComparisonCli(args: string[]): number {
  try {
    const [command, ...rest] = args;
    if (command === 'fingerprint' && rest.length === 0) { console.log(framingSourceFingerprint()); return 0; }
    if (command === 'source-manifest') {
      const o = options(rest, ['--out']), dest = resolve(o['--out']);
      const targets = outputTargets(dirname(dest), [basename(dest)]); if (existsSync(dest)) throw new LabError('OUTPUT_EXISTS', 'Manifest exists');
      const bytes = JSON.stringify(framingSourceManifest()); targets.create(); writeFileSync(dest, bytes, { flag: 'wx' });
      console.log(sha256(bytes)); return 0;
    }
    const required = command === 'annotate' ? ['--comparison', '--baseline', '--full-root', '--out'] :
      ['--comparison', '--annotations', '--baseline', '--crop', '--setup', '--source-manifest', '--original-root', '--full-root', '--crop-root', '--out', '--run-id'];
    if (command !== 'annotate' && command !== 'evaluate') throw new LabError('ARGUMENT', 'Use annotate, evaluate, source-manifest or fingerprint');
    const o = options(rest, required, command === 'annotate' ? ['--display-approval'] : ['--approval']);
    const comparison = readFramingJson(o['--comparison']), c = validateComparison(comparison.value);
    verifyBaselineSource(c.baseline.sourceSha256);
    const baseline = readFramingJson(o['--baseline']), b = validateBaseline(c, baseline.value, baseline.sha256);
    const fullRoot = inputPath(o['--full-root'], true);
    if (resolve(inputPath(o['--baseline'])) !== resolve(fullRoot, 'bundle.json')) throw new LabError('SETUP_BLOCKED', 'Baseline root mismatch');
    const originalStudy = readFramingJson(resolve(fullRoot, 'study.json'));
    const oldSetup = readFramingJson(resolve(fullRoot, 'setup.json'));
    const oldGate = setupSchema.parse(oldSetup.value);
    if (originalStudy.sha256 !== c.baseline.studySha256 || oldSetup.sha256 !== c.baseline.setupSha256 ||
        JSON.stringify(validateStudy(originalStudy.value)) !== JSON.stringify(c.study) || oldGate.modelSha256 !== MODEL_SHA ||
        oldGate.recipeSha256 !== recipeSha256 || oldGate.softwareSha256 !== c.baseline.softwareSha256 ||
        c.study.kind === 'private-same-instance' && !oldGate.networkReviewed)
      throw new LabError('SETUP_BLOCKED', 'Historical baseline study/setup mismatch');
    boundInput(resolve(fullRoot, 'software.json'), c.baseline.softwareSha256, 4 * 1024 * 1024);
    const source = framingSourceFingerprint();
    if (command === 'annotate') {
      if (c.study.kind === 'private-same-instance') {
        if (!o['--display-approval']) throw new LabError('SETUP_BLOCKED', 'Separate local display approval required');
        const approval = readFramingJson(o['--display-approval']).value;
        const expected = { status: 'APPROVED_FOR_LOCAL_FRAMING_ANNOTATION', authorThreadId: '01a098ef-d830-7531-bca7-2d66b0a5b587',
          comparisonSha256: comparison.sha256, baselineBundleSha256: baseline.sha256, sourceSha256: source,
          recipeSha256: cropRecipeSha256, out: resolve(o['--out']) };
        if (!exactBinding(approval, expected)) throw new LabError('SETUP_BLOCKED', 'Local display approval mismatch');
      }
      writeAnnotationPage(c, comparison.sha256, o['--out'], [o['--comparison'], o['--baseline']]); return 0;
    }
    const annotations = readFramingJson(o['--annotations']), a = validateAnnotations(c, annotations.value, comparison.sha256);
    const gateInput = readFramingJson(o['--setup']), gate = framingSetupSchema.parse(gateInput.value);
    const manifest = readFramingJson(o['--source-manifest']);
    if (manifest.bytes.toString('utf8') !== JSON.stringify(framingSourceManifest()) || manifest.sha256 !== source ||
        gate.modelSha256 !== MODEL_SHA || gate.recipeSha256 !== cropRecipeSha256 || gate.softwareSha256 !== c.baseline.softwareSha256 ||
        gate.sourceSha256 !== source || gate.comparisonSha256 !== comparison.sha256 || gate.annotationSha256 !== annotations.sha256 ||
        gate.baselineBundleSha256 !== baseline.sha256 || c.study.kind === 'private-same-instance' && !gate.networkReviewed)
      throw new LabError('SETUP_BLOCKED', 'Crop setup/source mismatch');
    const expected = { comparisonSha256: comparison.sha256, annotationSha256: annotations.sha256, sourceSha256: source,
      setupSha256: gateInput.sha256, softwareSha256: gate.softwareSha256, runId: o['--run-id'] };
    const cropInput = readFramingJson(o['--crop']), cr = validateCropBundle(c, cropInput.value, expected);
    const cropRoot = inputPath(o['--crop-root'], true);
    if (resolve(inputPath(o['--crop'])) !== resolve(cropRoot, 'bundle.json')) throw new LabError('SETUP_BLOCKED', 'Crop root mismatch');
    const originalRoot = inputPath(o['--original-root'], true), ceiling = resolve(retrievalLab, c.study.kind === 'generated-fixture' ? 'runs' : 'private-data');
    if (!originalRoot.startsWith(ceiling + sep)) throw new LabError('SETUP_BLOCKED', 'Original root outside approved ceiling');
    if (!/^framing-[a-zA-Z0-9_-]{1,48}$/.test(o['--run-id'])) throw new LabError('SETUP_BLOCKED', 'Fresh framing run ID required');
    if (c.study.kind === 'private-same-instance') {
      if (!o['--approval']) throw new LabError('SETUP_BLOCKED', 'New E04 required');
      const approval = readFramingJson(o['--approval']).value;
      const wanted = { status: 'APPROVED_FOR_FRAMING_COMPARISON_RUN', authorThreadId: '01a098ef-d830-7531-bca7-2d66b0a5b587', runId: o['--run-id'],
        comparisonSha256: comparison.sha256, annotationSha256: annotations.sha256, baselineBundleSha256: baseline.sha256,
        baselineSourceSha256: c.baseline.sourceSha256, sourceSha256: source, setupSha256: gateInput.sha256,
        softwareSha256: gate.softwareSha256, modelSha256: MODEL_SHA, recipeSha256: cropRecipeSha256, root: originalRoot, out: cropRoot };
      if (!exactBinding(approval, wanted)) throw new LabError('SETUP_BLOCKED', 'New E04 binding mismatch');
    }
    const assets = c.study.entries.map(e => resolve(originalRoot, e.asset.path));
    assets.forEach((path, i) => boundInput(path, c.study.entries[i].asset.sha256));
    const report = pairedEvaluation(c, b, baseline.sha256, cr, expected);
    renderFramingReport(c, a, b, cr, report, fullRoot, cropRoot, o['--out'], [o['--comparison'],o['--annotations'],o['--baseline'],o['--crop'],o['--setup'],o['--source-manifest'],...assets]);
    assets.forEach((path, i) => boundInput(path, c.study.entries[i].asset.sha256));
    if (framingSourceFingerprint() !== source) throw new LabError('SETUP_BLOCKED', 'Source changed during analysis');
    console.log(JSON.stringify({ complete: report.complete, denominator: 20, conditions: report.conditions.map(c => ({ condition:c.condition,scored:c.scored,first:c.first,firstThree:c.firstThree })), primary: 'FF->CC' }));
    return report.complete ? 0 : 2;
  } catch (error) { console.error(error instanceof LabError ? error.code : 'SETUP_BLOCKED'); return 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = framingComparisonCli(process.argv.slice(2));
