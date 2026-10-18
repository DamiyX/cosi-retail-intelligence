import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inputPath, outputTargets, protectInputs } from './retrievalPaths.ts';
import { sha256 } from './provenance.ts';
import { core, config, inputNames, manifestSchema } from './labelEvidenceSchema.ts';
import type { InputName } from './labelEvidenceSchema.ts';
import { readLabelJson, loadLabelInputs, validateManifest } from './labelEvidenceInputs.ts';
import type { InputPaths } from './labelEvidenceInputs.ts';
import { labelSourceSha256 } from './labelEvidenceSource.ts';
import { reviewPage } from './labelEvidenceReview.ts';
import { freezeReferences, mergeReviews, analyzeLabels } from './labelEvidenceAnalysis.ts';
import { labelCsv, labelHtml } from './labelEvidenceReport.ts';

const packed = (v: unknown) => core.canonical(v) + '\n';
function args(values: string[], required: string[], optional: string[] = []) {
  if (values.length % 2 !== 0) throw Error('LABEL_ARGUMENTS');
  const result: Record<string, string> = {};
  for (let i = 0; i < values.length; i += 2) {
    const key = values[i]; if (![...required, ...optional].includes(key) || key in result || !values[i + 1]) throw Error('LABEL_ARGUMENTS'); result[key] = values[i + 1];
  }
  if (required.some(k => !result[k])) throw Error('LABEL_ARGUMENTS'); return result;
}
function writeNew(out: string, files: Record<string, string>, inputs: string[]) {
  const names = Object.keys(files), targets = outputTargets(out, names); protectInputs(targets.paths, inputs);
  if (targets.paths.some(path => existsSync(path))) throw Error('LABEL_OUTPUT_EXISTS');
  targets.create(); names.forEach((name, i) => writeFileSync(targets.paths[i], files[name], { flag: 'wx' }));
}
export function labelEvidenceCli(argv: string[]): number {
  try {
    const [command, ...rest] = argv;
    if (command === 'fingerprint') { if (rest.length) throw Error('LABEL_ARGUMENTS'); console.log(labelSourceSha256()); return 0; }
    if (command === 'prepare') {
      const required = [...inputNames.map(k => '--' + k), '--image-root', '--crop-root', '--out']; const o = args(rest, required);
      const paths = Object.fromEntries(inputNames.map(k => [k, o['--' + k]])) as InputPaths;
      const loaded = loadLabelInputs(paths, o['--image-root'], o['--crop-root']), manifest = loaded.manifest;
      const raw = packed(manifest), binding = sha256(raw);
      writeNew(o['--out'], { 'manifest.json': raw,
        'review-queries.html': reviewPage(manifest, binding, 'queries'), 'review-references.html': reviewPage(manifest, binding, 'references'),
        'queries.template.json': packed(core.blank(config(manifest, binding, 'queries'))),
        'references.template.json': packed(core.blank(config(manifest, binding, 'references'))),
        'analysis-approval.template.json': packed({ status: 'DRAFT_NOT_APPROVED', authorThreadId: 'PENDING_COORDINATOR',
          bindingSha256: binding, ruleSha256: manifest.ruleSha256, sourceSha256: manifest.sourceSha256,
          referenceFreezeSha256: 'PENDING_FROZEN_REFERENCES', reviewSha256: 'PENDING_REVIEW', out: 'PENDING_NEW_OUTPUT' }) }, Object.values(paths));
      console.log(JSON.stringify({ prepared: true, entries: 40, queries: 20, bindingSha256: binding, sourceSha256: manifest.sourceSha256,
        privatePixelsDecoded: false, assistedRanksCreated: false, founderReview: 'AFTER_INDEPENDENT_SOURCE_ACCEPTANCE' })); return 0;
    }
    const required = command === 'freeze' ? ['--manifest', '--references', '--out'] : command === 'merge' ?
      ['--manifest', '--references', '--queries', '--out'] : command === 'analyze' ? ['--manifest', '--review', '--freeze', '--out'] : null;
    if (!required) throw Error('LABEL_ARGUMENTS');
    const o = args(rest, required, command === 'analyze' ? ['--approval'] : []);
    const raw = readLabelJson(o['--manifest']), manifest = manifestSchema.parse(raw.value), binding = raw.sha256;
    // Fail before loading originals or running the rule on actual private text.
    if (command === 'analyze' && manifest.evidenceKind === 'private-same-instance' && !o['--approval']) throw Error('LABEL_PRIVATE_ANALYSIS_NOT_AUTHORIZED');
    const loaded = validateManifest(manifest); const inputs = [raw.path, ...Object.values(manifest.inputPaths)];
    if (command === 'freeze') {
      const refs = readLabelJson(o['--references']), freeze = freezeReferences(manifest, binding, refs.value);
      writeNew(o['--out'], { 'reference-freeze.json': packed(freeze) }, [...inputs, refs.path]);
      console.log(JSON.stringify({ referencesFrozen: 20, ruleSha256: manifest.ruleSha256, assistedRanksCreated: false })); return 0;
    }
    if (command === 'merge') {
      const refs = readLabelJson(o['--references']), queries = readLabelJson(o['--queries']);
      const review = mergeReviews(manifest, binding, refs.value, queries.value);
      writeNew(o['--out'], { 'review.json': packed(review) }, [...inputs, refs.path, queries.path]);
      console.log(JSON.stringify({ entries: 40, complete: core.complete(review) })); return core.complete(review) ? 0 : 2;
    }
    const review = readLabelJson(o['--review']), freeze = readLabelJson(o['--freeze']);
    if (manifest.evidenceKind === 'private-same-instance') {
      const approval = readLabelJson(o['--approval']).value;
      const expected = { status: 'APPROVED_FOR_LOCAL_LABEL_EVIDENCE_ANALYSIS', authorThreadId: '01a098ef-d830-7531-bca7-2d66b0a5b587',
        bindingSha256: binding, ruleSha256: manifest.ruleSha256, sourceSha256: manifest.sourceSha256,
        referenceFreezeSha256: freeze.sha256, reviewSha256: review.sha256, out: resolve(o['--out']) };
      if (core.canonical(approval) !== core.canonical(expected)) throw Error('LABEL_PRIVATE_ANALYSIS_NOT_AUTHORIZED'); inputs.push(inputPath(o['--approval']));
    }
    const report = analyzeLabels(loaded, binding, review.value, freeze.value, freeze.sha256, review.sha256);
    writeNew(o['--out'], { 'analysis.json': packed(report), 'queries.csv': labelCsv(report), 'report.html': labelHtml(loaded, report) }, [...inputs, review.path, freeze.path]);
    console.log(JSON.stringify({ complete: report.complete, ...report.summary, engineeringTriagePositive: report.engineeringTriagePositive }));
    return report.complete ? 0 : 2;
  } catch (error) {
    const code = error instanceof Error && /^LABEL_[A-Z0-9_]+$/.test(error.message) ? error.message : 'LABEL_INPUT_INVALID';
    console.error(code); return 1;
  }
}
export const optionNames: InputName[] = [...inputNames];
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) process.exitCode = labelEvidenceCli(process.argv.slice(2));
