import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { boundInput } from './exploratoryStudy.ts';
import { outputTargets, protectInputs } from './retrievalPaths.ts';
import { LabError } from './schema.ts';
import type { Comparison, CropBundle, Annotations } from './framingComparisonSchema.ts';
import type { Bundle } from './exploratoryEvaluation.ts';
import type { FramingEvaluation } from './framingComparisonEvaluation.ts';

export const escapeHtml = (value: unknown) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export function csvCell(value: unknown) {
  let text = value === null ? '' : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
function picture(path: string, expected: string) {
  const data = boundInput(path, expected, 200000);
  if (!data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new LabError('SETUP_BLOCKED', 'Expected bound PNG derivative');
  return '<img width="112" height="112" alt="Bound local derivative" src="data:image/png;base64,' + data.toString('base64') + '">';
}
export function renderFramingReport(c: Comparison, annotations: Annotations, full: Bundle, crop: CropBundle,
  report: FramingEvaluation, fullRoot: string, cropRoot: string, out: string, inputs: string[]) {
  const targets = outputTargets(out, ['comparison.json', 'queries.csv', 'pairs.csv', 'report.html']);
  protectInputs(targets.paths, inputs); if (targets.paths.some(existsSync)) throw new LabError('OUTPUT_EXISTS', 'Report files already exist');
  const derivatives: string[] = [];
  const sheets = c.study.entries.map(e => {
    const f = full.records.find(r => r.id === e.id)!, cr = crop.records.find(r => r.id === e.id)!;
    const label = c.study.products.find(p => p.id === e.productId)!.label;
    const boundPicture = (root: string, prefix: string, hash: string) => { const path = resolve(root, prefix + e.id + '.png'); derivatives.push(path); return picture(path, hash); };
    const original = cr.kind === 'vector' ? boundPicture(cropRoot, 'context-', cr.contextThumbnailSha256) :
      f.kind === 'vector' ? boundPicture(fullRoot, 'thumb-', f.thumbnailSha256) : '<span>Original derivative unavailable</span>';
    const cropped = cr.kind === 'vector' ? boundPicture(cropRoot, 'thumb-', cr.thumbnailSha256) : '<span>Crop failure: ' + escapeHtml(cr.code) + '</span>';
    const a = annotations.entries.find(a => a.id === e.id)!;
    return `<article><h3>${escapeHtml(e.id)} — ${escapeHtml(label)} (${e.role})</h3><div class="photos"><figure>${original}<figcaption>Full original context</figcaption></figure><figure>${cropped}<figcaption>Product box + fixed5% padding</figcaption></figure></div><p>Marked: ${escapeHtml(JSON.stringify(a.markedBox))}; effective: ${escapeHtml(JSON.stringify(a.effectiveBox))}; original ${a.width}×${a.height}</p></article>`;
  }).join('');
  protectInputs(targets.paths, [...inputs, ...derivatives]);
  const summary = report.conditions.map(c => `<tr><th>${c.condition}</th><td>${c.first}/20</td><td>${c.firstThree}/20</td><td>${c.scored}/20</td><td>${c.complete ? 'Complete' : 'INCOMPLETE'}</td><td>${escapeHtml(JSON.stringify(c.failedReferences))}</td></tr>`).join('');
  const rows = report.conditions.flatMap(c => c.rows.map(r => [c.condition, r.id, r.truth, r.correctRank, r.first, r.firstThree,
    r.candidates[0]?.productId ?? '', r.candidates[0]?.score ?? '', r.margin, r.failures.join('|'), JSON.stringify(r.candidates)]));
  const pairRows = report.pairs.map(p => [p.id, p.truth, p.fullRank, p.cropRank, p.outcome, p.firstChoice, p.fullFailures.join('|'), p.cropFailures.join('|')]);
  const htmlRows = report.conditions.map(c => `<h2>${c.condition} query results</h2><p>Reference recipe ${escapeHtml(c.referenceRecipeSha256)}; query recipe ${escapeHtml(c.queryRecipeSha256)}</p><table><thead><tr><th>Query</th><th>Truth</th><th>Correct rank</th><th>Failures</th><th>All candidates / raw cosine</th></tr></thead><tbody>${c.rows.map(r => `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.truth)}</td><td>${r.correctRank ?? 'Unscored'}</td><td>${escapeHtml(r.failures.join('|'))}</td><td>${escapeHtml(JSON.stringify(r.candidates))}</td></tr>`).join('')}</tbody></table><details><summary>Per-product, confusion and wrong-identity attraction</summary><pre>${escapeHtml(JSON.stringify({ perProduct:c.perProduct, confusion:c.confusion, wrongIdentityAttraction:c.wrongIdentityAttraction },null,2))}</pre></details>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paired framing comparison</title><style>body{font:16px/1.5 system-ui,sans-serif;color:#17212b;margin:24px;max-width:1200px}table{border-collapse:collapse;display:block;overflow:auto}td,th{border:1px solid #64748b;padding:8px;text-align:left;vertical-align:top}td{max-width:40ch;overflow-wrap:anywhere}.photos{display:flex;flex-wrap:wrap}figure{margin:8px}article{border-top:1px solid #64748b;padding:16px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style></head><body><h1>Full-image → product-box comparison</h1><p>${escapeHtml(report.limitation)}</p><p>${report.complete ? 'All four conditions complete' : 'INCOMPLETE: recognition-quality conclusion withheld'}</p><table><thead><tr><th>Condition</th><th>First</th><th>First3</th><th>Scored</th><th>State</th><th>Reference failures</th></tr></thead><tbody>${summary}</tbody></table><h2>Primary FF→CC wins and losses</h2><pre>${escapeHtml(JSON.stringify({ summary:report.primarySummary,pairs:report.pairs },null,2))}</pre><h2>Resources</h2><pre>${escapeHtml(JSON.stringify(report.resources,null,2))}</pre>${htmlRows}<h2>All40 reference and query contact sheets</h2><p>Display derivatives are112 pixels; crops were selected in full-resolution oriented originals. These previews are insufficient to settle every fine packaging/identity detail. Preserve originals and annotation page for human review.</p>${sheets}<h2>Exact provenance</h2><pre>${escapeHtml(JSON.stringify(report.provenance,null,2))}</pre></body></html>`;
  const csv = (headers: string[], rows: unknown[][]) => [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  const contents = [JSON.stringify(report, null, 2) + '\n', csv(['condition','query','truth','correctRank','first','firstThree','topIdentity','rawScore','margin','failures','allCandidates'], rows),
    csv(['query','truth','fullRank','cropRank','rankOutcome','firstChoice','fullFailures','cropFailures'], pairRows), html];
  targets.create(); targets.paths.forEach((path, i) => writeFileSync(path, contents[i], { flag: 'wx' }));
}
