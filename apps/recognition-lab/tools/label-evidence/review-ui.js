/* global LABEL_CONFIG, LabelEvidence */
'use strict';
(function () {
  const core = LabelEvidence, config = LABEL_CONFIG, get = id => document.getElementById(id);
  let progress = core.blank(config), current = 0, busy = false, generation = 0, url = null;
  const selected = new Map();
  const entry = () => progress.entries.find(e => e.id === config.entries[current].id);
  const message = text => { get('status').textContent = text; };
  function check() {
    let valid = false;
    try { core.validateProgress(progress, config); valid = true; } catch { /* Keep partial editing available. */ }
    const done = progress.entries.filter(e => e.readability !== 'not-reviewed').length;
    get('completion').textContent = `${done} / ${config.entries.length} reviewed; ${selected.size} matching selected files. Self-recorded text visibility is not independently certified.`;
    get('complete').disabled = busy || !valid || !core.complete(progress) || selected.size !== config.entries.length;
    for (const id of ['save', 'import', 'photo', 'previous', 'next', 'files']) get(id).disabled = busy;
  }
  function updateFields() {
    const e = entry(); get('fields').textContent = JSON.stringify(e.fields, null, 2);
    get('normalized').textContent = JSON.stringify(core.observe(e), null, 2); check();
  }
  function crop() {
    const f = config.entries[current], b = f.effectiveBox, zoom = Number(get('zoom').value);
    get('zoom-value').textContent = `${Math.round(zoom * 100)}% of oriented original resolution`;
    const frame = get('crop'); frame.style.width = (b.right - b.left) * zoom + 'px'; frame.style.height = (b.bottom - b.top) * zoom + 'px';
    const image = get('image'); image.style.width = f.width * zoom + 'px'; image.style.height = f.height * zoom + 'px';
    image.style.left = -b.left * zoom + 'px'; image.style.top = -b.top * zoom + 'px';
  }
  function show(index) {
    generation++; current = index; const f = config.entries[current], e = entry();
    get('photo').value = f.id; get('title').textContent = `${f.id} — ${config.scope === 'queries' ? 'query text only' : 'reference image text only'}`;
    get('geometry').textContent = `${f.width} × ${f.height} oriented pixels. Frozen effective crop ${JSON.stringify(f.effectiveBox)}; orientation ${f.orientation}. No box edits.`;
    get('readability').value = e.readability; get('literal').value = e.literal;
    get('editor').disabled = true; get('crop').hidden = true; get('image').removeAttribute('src');
    if (url) URL.revokeObjectURL(url); url = null; updateFields();
    const file = selected.get(f.id); if (!file) { message('Select the explicitly approved matching original before transcribing.'); return; }
    const token = generation; url = URL.createObjectURL(file); get('image').src = url;
    get('image').onload = () => {
      if (token !== generation) return;
      const image = get('image');
      if (image.naturalWidth !== f.width || image.naturalHeight !== f.height) { message('Oriented dimensions differ. Stop and ask the coordinator; do not edit the crop.'); return; }
      get('crop').hidden = false; get('editor').disabled = false; crop(); message('Transcribe only text legible inside this frozen crop. Do not infer missing characters.');
    };
    get('image').onerror = () => { if (token === generation) message('Local image could not be displayed. Stop; no alternate upload is available.'); };
  }
  get('files').onchange = async event => {
    busy = true; generation++; const token = generation; check();
    const staged = new Map();
    let failure = null;
    try {
      for (const file of event.target.files) {
        if (file.size > config.maxImageBytes) throw Error('LABEL_IMAGE_SIZE');
        const bytes = await file.arrayBuffer();
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
        const f = config.entries.find(e => e.assetSha256 === digest);
        if (!f || staged.has(f.id)) throw Error('LABEL_UNKNOWN_OR_DUPLICATE_FILE'); staged.set(f.id, file);
      }
      if (token !== generation) return;
      selected.clear(); for (const [id, file] of staged) selected.set(id, file);
    } catch (error) { failure = error.message + '. Selected files were not changed.'; }
    finally { busy = false; check(); show(current); if (failure) message(failure); }
  };
  get('readability').onchange = () => {
    const e = entry(); e.readability = get('readability').value;
    if (['not-reviewed', 'unreadable', 'no-text'].includes(e.readability)) { e.literal = ''; e.fields = { brandName: null, variant: null, quantity: null }; get('literal').value = ''; }
    updateFields();
  };
  get('literal').oninput = () => { const e = entry(); e.literal = get('literal').value; e.fields = { brandName: null, variant: null, quantity: null }; updateFields(); };
  for (const field of core.fields) {
    get('set-' + field).onclick = () => {
      const editor = get('literal'), start = editor.selectionStart, end = editor.selectionEnd;
      if (start === end) { message('Select the literal characters that support this field.'); return; }
      entry().fields[field] = { start, end, text: entry().literal.slice(start, end) }; updateFields();
    };
    get('clear-' + field).onclick = () => { entry().fields[field] = null; updateFields(); };
  }
  get('zoom').oninput = crop;
  get('photo').onchange = event => show(config.entries.findIndex(e => e.id === event.target.value));
  get('previous').onclick = () => show((current + config.entries.length - 1) % config.entries.length);
  get('next').onclick = () => show((current + 1) % config.entries.length);
  function download(complete) {
    try {
      const validated = core.validateProgress(progress, config);
      if (complete && (!core.complete(validated) || selected.size !== config.entries.length)) throw Error('LABEL_REVIEW_INCOMPLETE');
      const blob = new Blob([JSON.stringify(validated, null, 2) + '\n'], { type: 'application/json' });
      const href = URL.createObjectURL(blob), link = document.createElement('a'); link.href = href;
      link.download = `label-${config.scope}-${complete ? 'reviewed' : 'progress'}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
      message('Text-only JSON exported. Keep its bindings; no photos are included.');
    } catch (error) { message(error.message); }
  }
  get('save').onclick = () => download(false); get('complete').onclick = () => download(true);
  get('import').onchange = async event => {
    const file = event.target.files[0]; if (!file) return; busy = true; check();
    try { if (file.size > 4 * 1024 * 1024) throw Error('LABEL_JSON_SIZE'); progress = core.validateProgress(core.strictJson(await file.text()), config); show(current); }
    catch (error) { message('Import rejected: ' + error.message); }
    finally { busy = false; check(); }
  };
  for (const f of config.entries) { const option = document.createElement('option'); option.value = f.id; option.textContent = f.id; get('photo').append(option); }
  show(0);
})();
