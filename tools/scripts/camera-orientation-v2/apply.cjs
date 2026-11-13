/* Exact expo-camera57.0.6 amendment. Validates every input before any write; no downloads. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const here = __dirname;
const base = 'android/src/main/java/expo/modules/camera/';
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
function once(text, before, after) {
  if (text.split(before).length !== 2) throw Error(`CAMERA_V2_PINNED_ANCHOR:${before.slice(0,120)}`);
  return text.replace(before, after);
}
function transform(name, raw) {
  let text = raw.toString('utf8').replaceAll('\r\n', '\n');
  if (name === 'ExpoCameraView.kt') {
    text = once(text, '        imageCaptureUseCase?.targetRotation = rotation', '        if (!cosiSameFrame) imageCaptureUseCase?.targetRotation = rotation');
    text = once(text, '  private var imageCaptureUseCase: ImageCapture? = null', '  private var imageCaptureUseCase: ImageCapture? = null\n  private var cosiPreviewUseCase: Preview? = null');
    text = once(text, '  private val scope = CoroutineScope(', fs.readFileSync(path.join(here, 'CosiViewMembers.kt.txt'), 'utf8') + '\n  private val scope = CoroutineScope(');
    for (const [name, type, value] of [['lensFacing', '', 'CameraType.BACK'], ['cameraMode', ': CameraMode', 'CameraMode.PICTURE'], ['zoom', ': Float', '0f'], ['ratio', ': CameraRatio?', 'null'], ['pictureSize', ': String', '""'], ['mirror', ': Boolean', 'false']]) {
      const anchor = `  var ${name}${type} = ${value}\n    set(value) {\n      field = value`;
      text = once(text, anchor, `  var ${name}${type} = ${value}\n    set(value) {\n      if (cosiSameFrame && field != value) cosiGeometry.invalidate()\n      field = value`);
    }
    text = once(text, '    val width = right - left\n    val height = bottom - top', '    if (cosiSameFrame && changed) cosiGeometry.invalidate()\n    val width = right - left\n    val height = bottom - top');
    text = once(text, '      lastHeight = height\n    }\n  }', '      lastHeight = height\n    }\n    if (cosiSameFrame) cosiSynchronizeRotation()\n  }');
    text = once(text, '  fun takePicture(options: PictureOptions, promise: Promise, cacheDirectory: File, runtimeContext: RuntimeContext) {', '  fun takePicture(options: PictureOptions, promise: Promise, cacheDirectory: File, runtimeContext: RuntimeContext) {\n    if (cosiSameFrame) { cosiTakePicture(options, promise, cacheDirectory, runtimeContext); return }\n    if (options.cosiGeometryJob != null) { promise.reject("CAMERA_GEOMETRY_OPT_IN_REQUIRED", "Native orientation option is disabled.", null); return }');
    text = once(text, '  private suspend fun configureAndBindCamera() {\n    val cameraProvider', '  private suspend fun configureAndBindCamera() {\n    if (cosiSameFrame) { cosiGeometry.invalidate(); cosiGeometry.beginReadiness(); cosiPreviewReadiness.begin() }\n    val cosiRequestedGeneration = cosiPreviewGeneration\n    val cosiRequestedSize = pictureSize\n    val cameraProvider');
    text = once(text, '    val cameraProvider = ProcessCameraProvider.awaitInstance(context)', '    val cameraProvider = ProcessCameraProvider.awaitInstance(context)\n    if (cosiSameFrame && (cosiRequestedGeneration != cosiPreviewGeneration || cosiRequestedSize != pictureSize)) return');
    text = once(text, '        it.surfaceProvider = previewView.surfaceProvider', '        cosiPreviewUseCase = it\n        it.surfaceProvider = previewView.surfaceProvider');
    text = once(text, '    this.cameraProvider = cameraProvider', '    this.cameraProvider = cameraProvider\n    if (cosiSameFrame) {\n      cosiGeometry.bind(imageCaptureUseCase, cosiPreviewUseCase, camera)\n      cosiSynchronizeRotation()\n      val cosiBinding = cosiPreviewReadiness.bound(cosiRequestedGeneration, cosiRequestedSize)\n      cosiGeometry.bindReadiness { streaming ->\n        cosiPreviewReadiness.stream(cosiBinding, cosiPreviewGeneration, pictureSize, streaming)?.let { onCosiGeometryReady(it) }\n      }\n    }');
    text = once(text, '  fun pausePreview() {\n    previewPaused = true', '  fun pausePreview() {\n    if (cosiSameFrame) cosiGeometry.invalidate()\n    previewPaused = true');
    text = once(text, '    glSurfaceTexture = surfaceTexture', '    if (cosiSameFrame) cosiGeometry.invalidate()\n    glSurfaceTexture = surfaceTexture');
  } else if (name === 'CameraViewModule.kt') {
    text = once(text, '  "onCameraReady",', '  "onCameraReady",\n  "onCosiGeometryReady",');
    text = once(text, '      Prop("facing") { view, facing: CameraType? ->', '      Prop("cosiSameFrame") { view, enabled: Boolean? -> view.cosiSameFrame = enabled == true }\n\n      Prop("facing") { view, facing: CameraType? ->');
    text = once(text, '      Prop("cosiSameFrame") { view, enabled: Boolean? -> view.cosiSameFrame = enabled == true }', '      Prop("cosiSameFrame") { view, enabled: Boolean? -> view.cosiSameFrame = enabled == true }\n      Prop("cosiPreviewGeneration") { view, generation: Int? -> view.cosiPreviewGeneration = generation ?: 0 }');
  } else if (name === 'Options.kt') {
    text = once(text, '  @Field val pictureRef: Boolean = false', '  @Field val pictureRef: Boolean = false,\n  @Field val cosiGeometryJob: String? = null');
  } else if (name === 'tasks/ResolveTakenPicture.kt') {
    text = once(text, '  private var pictureSavedDelegate: PictureSavedDelegate\n)', '  private val cosiGeometry: expo.modules.camera.CosiCaptured? = null,\n  private var pictureSavedDelegate: PictureSavedDelegate\n)');
    text = once(text, '    val bundle = processImage()\n    if (!options.pictureRef) {', '    val bundle = processImage()\n    if (cosiGeometry != null && bundle != null) {\n      try { cosiGeometry.attach(bundle) } catch (error: Exception) {\n        promise.reject("CAMERA_GEOMETRY_SAVED", "Saved image geometry is unsupported or stale.", error)\n        return@withContext\n      }\n    }\n    if (!options.pictureRef) {');
  } else throw Error('CAMERA_V2_UNKNOWN_TARGET');
  return Buffer.from(text);
}
function apply(root, checkOnly = false) {
  root = fs.realpathSync(root);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  if (pkg.name !== 'expo-camera' || pkg.version !== '57.0.6') throw Error('CAMERA_V2_VERSION');
  const targetPath = relative => {
    let current = root;
    for (const part of relative.split('/')) {
      if (!part || part === '.' || part === '..') throw Error('CAMERA_V2_PATH');
      current = path.join(current, part);
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw Error('CAMERA_V2_TARGET_LINK');
    }
    return current;
  };
  const manifest = JSON.parse(fs.readFileSync(path.join(here, 'manifest.json')));
  for (const item of manifest.templates) if (digest(fs.readFileSync(path.join(here, item.path))) !== item.sha256) throw Error('CAMERA_V2_TEMPLATE_DRIFT');
  const writes = [], receipts = [];
  for (const item of manifest.files) {
    const target = targetPath(base + item.path);
    if (fs.lstatSync(target).isSymbolicLink()) throw Error('CAMERA_V2_TARGET_LINK');
    const raw = fs.readFileSync(target), hash = digest(raw);
    if (item.variants.some(v => v.after === hash)) { receipts.push({ path: item.path, status: 'already-patched', sha256: hash }); continue; }
    const variant = item.variants.find(v => v.before === hash);
    if (!variant) throw Error(`CAMERA_V2_UPSTREAM_HASH:${item.path}`);
    const data = transform(item.path, raw);
    if (digest(data) !== variant.after) throw Error('CAMERA_V2_OUTPUT_HASH');
    writes.push([target, data]);receipts.push({ path: item.path, status: 'amendment', before: hash, sha256: digest(data) });
  }
  for (const name of ['CosiSameFrame.kt', 'CosiImageOwnership.kt', 'CosiGeometryRegistry.kt', 'CosiPreviewReadiness.kt']) {
    const target = targetPath(base + name), data = fs.readFileSync(path.join(here, name));
    if (fs.existsSync(target)) {
      if (fs.lstatSync(target).isSymbolicLink() || digest(fs.readFileSync(target)) !== digest(data)) throw Error('CAMERA_V2_ADDED_SOURCE_DRIFT');
    } else writes.push([target, data]);
    receipts.push({ path: name, status: 'bound-source', sha256: digest(data) });
  }
  if (!checkOnly) for (const [file, data] of writes) fs.writeFileSync(file, data);
  return { package: 'expo-camera@57.0.6', amendment: 'native-same-frame-v2', checkOnly, writes: checkOnly ? 0 : writes.length, receipts };
}
module.exports = { apply, transform, digest };
if (require.main === module) {
  if (!['--apply', '--check'].includes(process.argv[2]) || !process.argv[3]) throw Error('Usage: apply.cjs --apply|--check exact-package-root');
  console.log(JSON.stringify(apply(process.argv[3], process.argv[2] === '--check')));
}
