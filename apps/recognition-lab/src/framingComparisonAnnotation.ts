import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateComparison } from './framingComparisonSchema.ts';
import { outputTargets, protectInputs, retrievalLab } from './retrievalPaths.ts';
import { LabError } from './schema.ts';

const CSS = `:root{color-scheme:light;font:16px/1.5 "Segoe UI",system-ui,sans-serif;color:#17212b;background:#f4f6f8}body{max-width:1100px;margin:0 auto;padding:24px}h1{font-size:1.6rem;margin:0}h2{font-size:1.1rem}p{max-width:75ch}button,input,select{font:inherit}button{min-height:44px;padding:7px 16px;cursor:pointer;background:#fff;border:1px solid #64748b;border-radius:5px;color:#17212b}button:hover{background:#e9eef4}button:disabled{color:#52606e;cursor:default;background:#e9eef4}input,select{padding:7px;max-width:100%;box-sizing:border-box}input[type=number]{width:125px}input[type=checkbox]{width:20px;height:20px}label{display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap}fieldset{border:1px solid #64748b;border-radius:5px;margin:18px 0;padding:16px}#status{min-height:24px;background:#e9eef4;padding:12px;border-left:4px solid #264f9d}.toolbar,.coordinates{display:flex;gap:12px;flex-wrap:wrap;align-items:center}#canvas{position:relative;max-width:800px;margin:16px 0}#image{display:block;max-width:100%;max-height:600px;width:auto;height:auto;image-orientation:from-image}#overlay{position:absolute;inset:0;width:100%;height:100%;touch-action:none}rect{fill:none;stroke-width:3;vector-effect:non-scaling-stroke}#marked{stroke:#fff}#effective{stroke:#111;stroke-dasharray:8 5}*:focus-visible{outline:3px solid #264f9d;outline-offset:3px}.notice{font-size:.95rem}details{margin:16px 0}#checklist{columns:2} @media(max-width:600px){body{padding:12px}#checklist{columns:1}button{flex-grow:1}}`;
const layout = '#canvas:not([hidden]){display:inline-block;width:fit-content;max-width:min(800px,100%)}';
const hash = (text: string) => createHash('sha256').update(text).digest('base64');
export function annotationPage(value: unknown, comparisonSha256: string): string {
  const c = validateComparison(value);
  if (!/^[0-9a-f]{64}$/.test(comparisonSha256)) throw new LabError('SETUP_BLOCKED', 'Comparison digest required');
  const safeJson = JSON.stringify({ comparison: c, comparisonSha256, recipeSha256: c.cropRecipeSha256 })
    .replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
  const script = readFileSync(resolve(retrievalLab, 'tools/framing-comparison/annotation-core.cjs'), 'utf8') +
    '\nconst FRAMING_CONFIG = ' + safeJson + ';\n' + readFileSync(resolve(retrievalLab, 'tools/framing-comparison/annotation-ui.js'), 'utf8');
  const styles = CSS + layout;
  const csp = `default-src 'none'; script-src 'sha256-${hash(script)}'; style-src 'sha256-${hash(styles)}'; img-src blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Product boxes — local annotation</title><style>${styles}</style></head><body>
<h1>Mark the intended product</h1><p>Use the complete visible product, including its packaging and transparent edges. Do not remove hands, lines or background manually. Every box receives the same 5% padding.</p>
<p class="notice">Local files only. No scores or suggested matches. Save progress as JSON; photos are never included. Founder has seen baseline results, so this is not blinded. An identity or bounds issue blocks the complete comparison.</p>
<div class="toolbar"><label>Select approved originals <input id="files" type="file" accept=".jpg,image/jpeg" multiple></label><label>Import progress JSON <input id="import" type="file" accept=".json,application/json"></label><button id="save" type="button">Export progress</button></div>
<p id="complete"></p><p id="status" role="status" aria-live="polite"></p>
<nav class="toolbar" aria-label="Photograph navigation"><button id="previous" type="button">Previous photo</button><label>Photo <select id="photo"></select></label><button id="next" type="button">Next photo</button></nav>
<h2 id="title"></h2><p id="dimensions"></p><div id="canvas" hidden><img id="image" alt="Selected original product photograph"><svg id="overlay" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect id="effective"></rect><rect id="marked"></rect></svg></div>
<fieldset id="editor" disabled><legend>Product bounds in oriented original pixels</legend><p>Drag across the image, or adjust each coordinate with the keyboard. White solid line: marked box; dark dashed line: padded effective box.</p><div class="coordinates"><label>Left <input id="left" type="number" min="0" step="1"></label><label>Top <input id="top" type="number" min="0" step="1"></label><label>Right <input id="right" type="number" min="1" step="1"></label><label>Bottom <input id="bottom" type="number" min="1" step="1"></label><button id="full" type="button">Use full frame</button></div><p id="box-text"></p><label>Review issue <select id="issue"><option value="not-reviewed">Not reviewed</option><option value="none">No issue</option><option value="identity">Identity is uncertain</option><option value="bounds">Bounds are uncertain</option></select></label><p><label><input id="identity" type="checkbox">I confirm this is the labeled intended product and have reviewed its bounds</label></p></fieldset>
<button id="freeze" type="button" disabled>Export all 40 confirmed annotations</button><details><summary>Completeness checklist</summary><ul id="checklist"></ul></details><script>${script}</script></body></html>`;
}
export function writeAnnotationPage(value: unknown, comparisonSha256: string, out: string, inputs: string[]) {
  const targets = outputTargets(out, ['annotate.html']); protectInputs(targets.paths, inputs);
  if (existsSync(targets.paths[0])) throw new LabError('OUTPUT_EXISTS', 'Annotation page exists');
  const html = annotationPage(value, comparisonSha256); targets.create(); writeFileSync(targets.paths[0], html, { flag: 'wx' });
}
