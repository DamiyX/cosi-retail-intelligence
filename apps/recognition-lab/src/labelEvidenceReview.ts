import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { retrievalLab } from './retrievalPaths.ts';
import { config } from './labelEvidenceSchema.ts';
import type { Manifest } from './labelEvidenceSchema.ts';
const hash = (s: string) => createHash('sha256').update(s).digest('base64');
const styles = `:root{font:16px/1.5 system-ui,sans-serif;color:#18222e;background:#f5f6f8}body{max-width:1120px;margin:auto;padding:24px}h1{font-size:1.65rem}button,input,select,textarea{font:inherit}button{min-height:44px;padding:8px 14px}label{display:block;margin:12px 0}textarea{width:100%;box-sizing:border-box;min-height:130px}fieldset{border:1px solid #64748b;padding:16px}.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.toolbar label{margin:0}#status{padding:12px;background:#e5edf8;min-height:24px}#pan{max-height:620px;max-width:100%;overflow:auto;background:#263342;padding:8px}#crop{position:relative;overflow:hidden;background:#263342;flex:none}#image{position:absolute;max-width:none;image-orientation:from-image}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.9rem}.fields{display:flex;flex-wrap:wrap;gap:8px}*:focus-visible{outline:3px solid #235eb3;outline-offset:3px} @media(max-width:600px){body{padding:12px}.toolbar{align-items:stretch}}`;
export function reviewPage(manifest: Manifest, bindingSha256: string, scope: 'references' | 'queries') {
  const cfg = { ...config(manifest, bindingSha256, scope), maxImageBytes: manifest.maxImageBytes };
  // No product IDs, known labels, candidate ranks or reference metadata in query payload.
  cfg.entries = cfg.entries.map(({ productId: _productId, ...e }) => e);
  const json = JSON.stringify(cfg).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  const script = readFileSync(resolve(retrievalLab, 'tools/label-evidence/core.cjs'), 'utf8') + '\nconst LABEL_CONFIG=' + json + ';\n' +
    readFileSync(resolve(retrievalLab, 'tools/label-evidence/review-ui.js'), 'utf8');
  const csp = `default-src 'none';script-src 'sha256-${hash(script)}';style-src 'sha256-${hash(styles)}';img-src blob:;connect-src 'none';object-src 'none';base-uri 'none';form-action 'none'`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Local ${scope} label review</title><style>${styles}</style></head><body>
<h1>${scope === 'queries' ? 'Query' : 'Reference'} text review</h1><p>Use only literal text readable inside the frozen effective crop. Mark missing, unclear or conflicting text honestly. Do not consult another view to fill gaps. No OCR, upload, telemetry or image export. This manual review is non-blinded development evidence.</p>
<div class="toolbar"><label>Select matching local originals <input id="files" type="file" accept=".jpg,image/jpeg" multiple></label><label>Import text progress <input id="import" type="file" accept=".json,application/json"></label><button id="save" type="button">Export partial progress</button></div>
<p id="completion"></p><p id="status" role="status" aria-live="polite"></p><nav class="toolbar" aria-label="Review images"><button id="previous" type="button">Previous</button><label>Image ID <select id="photo"></select></label><button id="next" type="button">Next</button></nav>
<h2 id="title"></h2><p id="geometry"></p><label>Zoom <input id="zoom" type="range" min="0.25" max="3" step="0.25" value="1"><span id="zoom-value"></span></label><div id="pan"><div id="crop" hidden><img id="image" alt="Explicitly selected original shown within its frozen effective crop"></div></div>
<fieldset id="editor" disabled><legend>Observed image text</legend><label>Readability <select id="readability"><option value="not-reviewed">Not reviewed</option><option value="readable">Readable</option><option value="partial">Partially readable</option><option value="unreadable">Unreadable</option><option value="no-text">No visible text</option><option value="conflicting">Conflicting transcription</option></select></label>
<label>Literal readable characters only <textarea id="literal" maxlength="4096" spellcheck="false"></textarea></label><p>Select a literal span, then assign it to a field. Editing text clears field spans. Do not correct guessed characters or copy a known product label.</p>
<div class="fields">${(['brandName', 'variant', 'quantity'] as const).map(k => `<button id="set-${k}" type="button">Use selection as ${k}</button><button id="clear-${k}" type="button">Clear ${k}</button>`).join('')}</div><h3>Observed spans</h3><pre id="fields"></pre><h3>Separate normalization preview</h3><pre id="normalized"></pre></fieldset>
<p>Save partial progress at any time. Complete export requires every image reviewed and selected. These gates cannot certify that text was actually legible.</p><button id="complete" type="button" disabled>Export all reviewed ${scope}</button><script>${script}</script></body></html>`;
}
