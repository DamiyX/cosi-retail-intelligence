import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inputPath } from './retrievalPaths.ts';
import { sha256 } from './provenance.ts';
import type { loadLabelInputs } from './labelEvidenceInputs.ts';
import type { LabelAnalysis } from './labelEvidenceAnalysis.ts';

export const escapeHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export const csvCell = (s: string | number | boolean | null) => '"' + (typeof s === 'string' && /^[\s]*[=+\-@]/.test(s) ? "'" + s : String(s ?? '')).replaceAll('"', '""') + '"';
export function labelCsv(report: LabelAnalysis) {
  const names = ['id', 'truth', 'readability', 'visualCorrectRank', 'assistedCorrectRank', 'visualFirst', 'assistedFirst', 'visualFirstThree',
    'assistedFirstThree', 'firstChoice', 'promoted', 'manualConfirmation', 'reason'] as const;
  return names.map(csvCell).join(',') + '\n' + report.rows.map(row => names.map(k => csvCell(row[k])).join(',')).join('\n') + '\n';
}
export function labelHtml(loaded: ReturnType<typeof loadLabelInputs>, report: LabelAnalysis) {
  const { c, crop, manifest } = loaded;
  function image(id: string) {
    const record = crop.records.find(r => r.id === id);
    if (!record || record.kind !== 'vector') return '<p>Saved image preview unavailable</p>';
    const path = inputPath(resolve(manifest.cropRoot, 'thumb-' + id + '.png'));
    if (sha256(readFileSync(path)) !== record.thumbnailSha256) throw Error('LABEL_DERIVATIVE_HASH');
    return `<img src="${escapeHtml(pathToFileURL(path).href)}" alt="Saved crop preview for ${escapeHtml(id)}">`;
  }
  const label = (id: string) => escapeHtml(c.study.products.find(p => p.id === id)?.label ?? id);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none';img-src file:;style-src 'unsafe-inline';connect-src 'none';object-src 'none';base-uri 'none';form-action 'none'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Generated or manual label-evidence diagnostic</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:1200px;margin:auto;padding:24px;color:#18222e}h1{font-size:1.7rem}.row{border-top:1px solid #8593a4;padding:20px 0}.pictures{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:16px}img{max-width:112px;height:auto}p{overflow-wrap:anywhere}.notice{background:#eef3f9;padding:12px}pre{white-space:pre-wrap} @media(max-width:620px){.pictures{grid-template-columns:repeat(2,1fr)}body{padding:12px}}</style></head><body>
<h1>Label-evidence diagnostic — ${manifest.evidenceKind === 'generated-fixture' ? 'GENERATED SAMPLE' : 'manual exploratory review'}</h1><p class="notice">${report.complete ? 'Complete review' : 'INCOMPLETE review — no positive diagnostic claim'}. All 20 query IDs retained. This is experimental advice; manual transcription is not OCR performance.</p><pre>${escapeHtml(JSON.stringify(report.summary, null, 2))}</pre>
${report.limitations.map(s => '<p>' + escapeHtml(s) + '</p>').join('')}
${report.rows.map(row => `<section class="row"><h2>${escapeHtml(row.id)} — ${label(row.truth)}</h2><p>Visual rank ${row.visualCorrectRank ?? 'unscored'} → assisted rank ${row.assistedCorrectRank ?? 'unscored'}; ${escapeHtml(row.reason)}${row.manualConfirmation ? ' — TEXT CONFLICT: MANUAL CONFIRMATION NEEDED' : ''}</p>
<div class="pictures"><article><h3>Query / truth</h3>${image(row.id)}<p>${label(row.truth)}</p><p>${escapeHtml(row.readability)}: ${escapeHtml(row.literal)}</p></article>
${row.savedTop3.map((candidate, i) => `<article><h3>Visual suggestion ${i + 1}</h3>${image(candidate.nearestReferenceId)}<p>${label(candidate.productId)}</p><p>Unchanged raw similarity: ${candidate.score}<br>Assisted position: ${row.assistedTop3.findIndex(v => v.productId === candidate.productId) + 1}</p><p>${escapeHtml(JSON.stringify(row.evidence.find(e => e.productId === candidate.productId)?.perField ?? {}))}</p></article>`).join('')}</div></section>`).join('')}
</body></html>`;
}
