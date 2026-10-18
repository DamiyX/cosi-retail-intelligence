/* global FRAMING_CONFIG, FramingAnnotations */
'use strict';
(function () {
  const { comparison: c, comparisonSha256: hash, recipeSha256: recipe } = FRAMING_CONFIG;
  const core = FramingAnnotations, byId = id => document.getElementById(id);
  const files = new Map(), seen = new Set(); let current = 0, imageURL = null, start = null, busy = false;
  let progress = { schemaVersion: 1, comparisonSha256: hash, recipeSha256: recipe,
    entries: c.frames.map(f => ({ ...f, confirmedIdentity: false, issue: 'not-reviewed', markedBox: null, effectiveBox: null })) };
  const message = text => { byId('status').textContent = text; };
  const entry = () => progress.entries.find(e => e.id === c.frames[current].id);
  function check() {
    const done = progress.entries.filter(e => e.confirmedIdentity && e.issue === 'none' && e.markedBox).length;
    byId('complete').textContent = `${done} / 40 confirmed boxes. Selected originals: ${files.size} / 40.`;
    byId('freeze').disabled = busy || done !== 40 || files.size !== 40;
    for (const name of ['photo', 'previous', 'next', 'save', 'import']) byId(name).disabled = busy;
    const list = byId('checklist'); list.replaceChildren();
    for (const e of progress.entries) { const item = document.createElement('li');
      item.textContent = `${e.id}: ${e.confirmedIdentity && e.issue === 'none' && e.markedBox ? 'ready' : e.issue === 'none' ? 'box / identity confirmation needed' : e.issue}`;
      list.append(item); }
  }
  function draw() {
    const e = entry();
    for (const k of ['left', 'top', 'right', 'bottom']) byId(k).value = e.markedBox ? e.markedBox[k] : '';
    byId('identity').checked = e.confirmedIdentity; byId('issue').value = e.issue;
    const overlay = byId('overlay'); overlay.setAttribute('viewBox', `0 0 ${e.width} ${e.height}`);
    for (const [name, b] of [['marked', e.markedBox], ['effective', e.effectiveBox]]) {
      const rect = byId(name); rect.setAttribute('visibility', b ? 'visible' : 'hidden');
      if (b) { rect.setAttribute('x', b.left); rect.setAttribute('y', b.top); rect.setAttribute('width', b.right - b.left); rect.setAttribute('height', b.bottom - b.top); }
    }
    byId('box-text').textContent = e.effectiveBox ? `Effective box with fixed 5% padding: ${JSON.stringify(e.effectiveBox)}` : 'Draw a box or enter full-resolution integer coordinates.';
    check();
  }
  async function show(index) {
    current = index; const e = entry(), original = c.study.entries.find(x => x.id === e.id), product = c.study.products.find(p => p.id === original.productId);
    byId('photo').value = e.id; byId('title').textContent = `${e.id} — ${product.label} (${original.role})`;
    byId('dimensions').textContent = `${e.width} × ${e.height} oriented pixels. EXIF orientation ${e.orientation}. Left/top inclusive; right/bottom exclusive.`;
    byId('editor').disabled = true; byId('canvas').hidden = true; byId('image').removeAttribute('src');
    if (imageURL) URL.revokeObjectURL(imageURL); imageURL = null;
    draw(); const file = files.get(e.id);
    if (!file) { message('Select the matching original file to annotate this photo.'); return; }
    const token = e.id; busy = true; check();
    try {
      imageURL = URL.createObjectURL(file); const image = byId('image');
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(Error('IMAGE_DECODE_REJECTED')); image.src = imageURL; });
      if (entry().id !== token) return;
      if (image.naturalWidth !== e.width || image.naturalHeight !== e.height) throw Error('ORIENTED_DIMENSIONS_MISMATCH');
      byId('canvas').hidden = false; byId('editor').disabled = false;
      message('Box the entire visible intended product. Keep packaging, transparent edges and any hand inside the rectangle.');
    } catch (error) { message(error.message); files.delete(token); seen.delete(token); byId('canvas').hidden = true; }
    finally { busy = false; check(); }
  }
  async function selectFiles(event) {
    busy = true; byId('files').disabled = true; message('Checking original file hashes locally…'); check();
    let rejection = null;
    try {
      const selection = Array.from(event.target.files);
      if (selection.length < 1 || selection.length > 40) throw Error('SELECT_ONE_TO_FORTY_ORIGINALS');
      const pending = new Map();
      for (const file of selection) {
        if (file.size > 41943040 || file.size < 4) throw Error('FILE_SIZE_REJECTED');
        const buffer = await file.arrayBuffer();
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buffer)), b => b.toString(16).padStart(2, '0')).join('');
        const frame = c.frames.find(f => f.assetSha256 === digest);
        if (!frame || pending.has(frame.id) || seen.has(frame.id)) throw Error('UNLISTED_OR_DUPLICATE_ORIGINAL');
        // Only original hashes authorize display. No filename/path discovery.
        pending.set(frame.id, file);
      }
      for (const [id, file] of pending) { files.set(id, file); seen.add(id); }
    } catch (error) { rejection = error.message; }
    finally { busy = false; byId('files').disabled = false; byId('files').value = ''; check(); }
    await show(current);
    if (rejection) message(rejection);
  }
  function setBox(b) {
    const e = entry(); e.effectiveBox = core.effectiveBox(b, e.width, e.height); e.markedBox = b;
    e.confirmedIdentity = false; if (e.issue === 'not-reviewed') e.issue = 'none'; draw();
  }
  byId('files').addEventListener('change', selectFiles);
  byId('photo').addEventListener('change', event => { if (!busy) show(c.frames.findIndex(f => f.id === event.target.value)); });
  byId('previous').addEventListener('click', () => { if (!busy) show(Math.max(0, current - 1)); });
  byId('next').addEventListener('click', () => { if (!busy) show(Math.min(39, current + 1)); });
  for (const k of ['left', 'top', 'right', 'bottom']) byId(k).addEventListener('change', () => {
    try { const b = {}; for (const key of ['left', 'top', 'right', 'bottom']) {
      const text = byId(key).value; if (!/^(0|[1-9][0-9]*)$/.test(text)) throw Error('INTEGER_COORDINATES_REQUIRED'); b[key] = Number(text); }
      setBox(b); message('Box updated. Confirm the intended identity after reviewing the bounds.');
    } catch (error) { message(error.message); draw(); }
  });
  byId('full').addEventListener('click', () => { const e = entry(); setBox({ left: 0, top: 0, right: e.width, bottom: e.height }); });
  byId('identity').addEventListener('change', event => { entry().confirmedIdentity = event.target.checked; check(); });
  byId('issue').addEventListener('change', event => { entry().issue = event.target.value; entry().confirmedIdentity = false; draw(); });
  const overlay = byId('overlay');
  const point = event => core.imagePoint(event.clientX, event.clientY, byId('image').getBoundingClientRect(), entry().width, entry().height);
  overlay.addEventListener('pointerdown', event => { if (busy || byId('editor').disabled) return; start = point(event); overlay.setPointerCapture(event.pointerId); });
  overlay.addEventListener('pointerup', event => {
    if (!start) return; const end = point(event), b = { left: Math.min(start.x, end.x), top: Math.min(start.y, end.y),
      right: Math.max(start.x, end.x), bottom: Math.max(start.y, end.y) }; start = null;
    try { setBox(b); } catch (error) { message(error.message); }
  });
  overlay.addEventListener('pointercancel', () => { start = null; });
  function download(name, value) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  byId('save').addEventListener('click', () => download('framing-progress.json', progress));
  byId('freeze').addEventListener('click', () => { if (!byId('freeze').disabled) {
    download('framing-annotations.json', progress); message('Complete annotation JSON exported. Coordinator must validate and freeze it before any new scores.'); } });
  byId('import').addEventListener('change', async event => {
    try { if (event.target.files.length !== 1 || event.target.files[0].size > 4 * 1024 * 1024) throw Error('PROGRESS_SIZE');
      const next = core.validateProgress(core.strictJson(await event.target.files[0].text()), c, hash, recipe);
      progress = next; await show(current); message('Bound progress imported. Select matching originals again to review them.');
    } catch (error) { message(error.message); } finally { byId('import').value = ''; }
  });
  for (const frame of c.frames) { const option = document.createElement('option'); option.value = frame.id; option.textContent = frame.id; byId('photo').append(option); }
  window.addEventListener('beforeunload', () => { if (imageURL) URL.revokeObjectURL(imageURL); });
  show(0);
})();
