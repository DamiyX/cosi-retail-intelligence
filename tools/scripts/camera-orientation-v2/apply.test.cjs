const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { apply, digest, transform } = require('./apply.cjs');
const manifest = require('./manifest.json');
const base = 'android/src/main/java/expo/modules/camera';
const workspace = path.resolve(__dirname, '../../..');
const root = process.env.COSI_ORIENTATION_TEST_ROOT;
assert.ok(root && path.isAbsolute(root), 'Use a fresh explicit host-only fixture root.');
fs.mkdirSync(root);
function fixture(name, source) {
  const target = path.join(root, name);fs.mkdirSync(target);
  fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({ name: 'expo-camera', version: '57.0.6' }));
  for (const item of manifest.files) {
    const file = path.join(target, base, item.path);fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, fs.readFileSync(path.join(source, base, item.path)));
  }
  return target;
}
function treeHashes(target) {
  return manifest.files.map(f => digest(fs.readFileSync(path.join(target, base, f.path))));
}
test('exact pristine source amends reproducibly; second invocation has zero writes', () => {
  const target = fixture('pristine', path.join(workspace, 'node_modules/expo-camera'));
  const before = treeHashes(target), result = apply(target);
  assert.equal(result.writes, 8);const after = treeHashes(target);
  assert.notDeepEqual(before, after);assert.equal(apply(target).writes, 0);assert.deepEqual(treeHashes(target), after);
  for (const f of manifest.files) assert.ok(f.variants.some(v => v.after === digest(fs.readFileSync(path.join(target, base, f.path)))));
});
test('accepted barcode-isolated camera derivative is independently pinned and idempotent', () => {
  const source = 'C:/Users/doyew/.cache/cosi-p203-export-recovery-build-c2-20261024-a1/camera-packages/expo-camera';
  const target = fixture('derivative', source);assert.equal(apply(target).writes, 8);assert.equal(apply(target).writes, 0);
});
test('unknown upstream byte refuses the entire amendment before any target is changed', () => {
  const target = fixture('unknown', path.join(workspace, 'node_modules/expo-camera'));
  const file = path.join(target, base, 'Options.kt');fs.appendFileSync(file, '\n// unfamiliar upstream\n');
  const before = treeHashes(target);assert.throws(() => apply(target), /UPSTREAM_HASH/);assert.deepEqual(treeHashes(target), before);
  assert.equal(fs.existsSync(path.join(target, base, 'CosiSameFrame.kt')), false);
});
test('unexpected version and drift of an added native source are refused', () => {
  const target = fixture('version', path.join(workspace, 'node_modules/expo-camera'));
  fs.writeFileSync(path.join(target, 'package.json'), '{"name":"expo-camera","version":"57.0.7"}');assert.throws(() => apply(target), /VERSION/);
  fs.writeFileSync(path.join(target, 'package.json'), '{"name":"expo-camera","version":"57.0.6"}');apply(target);
  fs.appendFileSync(path.join(target, base, 'CosiSameFrame.kt'), '\n// changed\n');assert.throws(() => apply(target), /ADDED_SOURCE_DRIFT/);
});
test('default capture callback body is retained; opt-in excludes physical orientation overwrite', () => {
  const raw = fs.readFileSync(path.join(workspace, 'node_modules/expo-camera', base, 'ExpoCameraView.kt')).toString().replaceAll('\r\n', '\n');
  const amended = transform('ExpoCameraView.kt', Buffer.from(raw)).toString();
  const callback = raw.slice(raw.indexOf('    val audioManager = context.getSystemService'), raw.indexOf('\n  fun setCameraFlashMode'));
  assert.ok(amended.includes(callback), 'Legacy default capture implementation is retained byte-for-byte.');
  assert.ok(amended.includes('if (!cosiSameFrame) imageCaptureUseCase?.targetRotation = rotation'));
  assert.ok(amended.includes('imageCaptureUseCase?.targetRotation = rotation\n      cosiPreviewUseCase?.targetRotation = rotation'));
  assert.ok(amended.includes('cosiGeometry.bind(imageCaptureUseCase, cosiPreviewUseCase, camera)'));
  const tracker = fs.readFileSync(path.join(__dirname, 'CosiSameFrame.kt'), 'utf8');
  for (const event of ['OnGlobalLayoutListener', 'onDisplayChanged', 'onViewDetachedFromWindow', 'previewStreamState.observeForever', 'zoomState?.observeForever']) assert.ok(tracker.includes(event));
});
