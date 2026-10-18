'use strict';
// C4 build-time observation only: preserve Expo's serializer and the exact premodules array.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = 'C:/Users/doyew/Documents/DEV 2/COSI-m8-planning';
const writer = path.join(root, 'apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c4-20261018-a1/writer');
const app = 'C:/Users/doyew/.cache/cosi-p2-camera-g3-c4-20261018-a1/app';
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const slash = value => value.replaceAll('\\', '/');
function live() {
  const lease = JSON.parse(fs.readFileSync(path.join(root, '.agents/workflows/recognition-track-b.json'))).lease;
  assert.equal(lease.holder, '01a1051f-0777-7573-ad09-0e550a4bd56a'); assert.equal(lease.expires_at, '2026-10-18T08:35:19.472Z'); assert.ok(Date.now() < Date.parse(lease.expires_at));
  assert.ok(!fs.existsSync(path.join(writer, 'writer-stopped.json')));
}
function moduleRow(module) {
  const outputs = module.output.filter(o => o.type.startsWith('js/')).map(o => ({ type: o.type, code: o.data.code, codeSha256: digest(o.data.code) }));
  return { path: module.path, sourceSha256: fs.existsSync(module.path) && fs.statSync(module.path).isFile() ? digest(fs.readFileSync(module.path)) : null,
    dependencies: [...module.dependencies.values()].map(d => ({ absolutePath: d.absolutePath, name: d.data.name, asyncType: d.data.data?.asyncType ?? null, isESMImport: d.data.data?.isESMImport ?? null })), outputs };
}
function captureGraph({ graph, premodules, debugId }) {
  live();
  const record = { entryPoints: [...graph.entryPoints], platform: graph.transformOptions.platform, dev: graph.transformOptions.dev, debugId,
    premodules: premodules.map(moduleRow), modules: [...graph.dependencies.values()].map(moduleRow).sort((a,b) => a.path.localeCompare(b.path)),
    observer: 'getDefaultConfig unstable_beforeAssetSerializationPlugins; default Expo serializer unchanged', premodulesReturnedUnchanged: true };
  const data = Buffer.from(JSON.stringify(record, null, 2) + '\n'), hash = digest(data), target = path.join(writer, `metro-graph-${hash}.json`);
  if (fs.existsSync(target)) assert.deepEqual(fs.readFileSync(target), data); else fs.writeFileSync(target, data, { flag: 'wx' });
  return premodules;
}
function normalizeSource(source) {
  source = slash(source);
  if (source.startsWith('/src/') || source === '/recognition-entry.js') return slash(app + source);
  const modules = source.indexOf('/node_modules/'); if (modules >= 0) return slash(root + source.slice(modules));
  const workspace = source.indexOf('/COSI-m8-planning/'); if (workspace >= 0) return slash(root + source.slice(workspace + '/COSI-m8-planning'.length));
  return source;
}
function verifyGraph() {
  live();
  const mapPath = path.join(app, 'android/app/build/generated/sourcemaps/react/release/index.android.bundle.map');
  const mapBytes = fs.readFileSync(mapPath), map = JSON.parse(mapBytes);
  const captures = fs.readdirSync(writer).filter(n => /^metro-graph-[a-f0-9]{64}\.json$/.test(n)); assert.ok(captures.length);
  const outcomes = [];
  for (const name of captures) {
    const raw = fs.readFileSync(path.join(writer,name)); assert.equal(digest(raw), name.slice('metro-graph-'.length,-'.json'.length));
    const graph = JSON.parse(raw), all = [...graph.premodules, ...graph.modules], nodes = new Map(all.map(m => [slash(m.path), m]));
    assert.equal(graph.platform, 'android'); assert.equal(graph.dev, false); assert.equal(graph.premodulesReturnedUnchanged, true);
    const forbidden = [...nodes.keys()].filter(p => p.includes('/expo-asset/') || /\/expo\/src\/Expo(?:\.fx)?\.[jt]sx?$/.test(p) || /\/expo-camera\/(?:build|src)\/(?:index|PictureRef|Camera\.types)\.[jt]sx?$/.test(p));
    assert.deepEqual(forbidden, [], 'Forbidden eager bootstrap/barrel/type-value modules remain in the actual release graph');
    const required = ['/src/recognitionExperiment/cameraRuntime.ts','/src/recognitionExperiment/CameraProofPanel.tsx','/node_modules/expo-camera/build/CameraView.js','/node_modules/expo-camera/build/ExpoCameraManager.js','/node_modules/expo-camera/build/ExpoCamera.js','/node_modules/expo-camera/build/utils/props.js','/node_modules/expo-modules-core/src/PermissionsHook.ts'];
    const mapSources = new Set(map.sources.map(normalizeSource));
    const requiredRows = required.map(suffix => { const matches = [...nodes.keys()].filter(p => p.endsWith(suffix)); assert.equal(matches.length,1,suffix); assert.ok(mapSources.has(matches[0]),`Required actual graph node missing from packaged-bundle source map: ${suffix}`); return nodes.get(matches[0]); });
    for (const node of all) if (node.sourceSha256) assert.equal(digest(fs.readFileSync(node.path)),node.sourceSha256,node.path);
    const realMappedSources = [...mapSources].filter(p => p.startsWith(slash(root)+'/') || p.startsWith(slash(app)+'/'));
    const missingMapped = realMappedSources.filter(p => !nodes.has(p)); assert.deepEqual(missingMapped,[],'Source map contains a real module outside captured release graph');
    const winter = [...nodes.keys()].filter(p => p.includes('/expo/src/winter/'));
    const runtime = all.find(m => slash(m.path).endsWith('/expo/src/winter/runtime.native.ts'));
    let lazyFetchReviewed = false;
    if (winter.some(p => p.includes('/fetch/'))) {
      assert.ok(runtime); const original = fs.readFileSync(runtime.path,'utf8'); assert.ok(original.includes("install('fetch', () => require('./fetch').fetch)"));
      for (const node of requiredRows) assert.ok(!/\bfetch\s*\(/.test(fs.readFileSync(node.path,'utf8')),'Camera startup path unexpectedly invokes fetch');
      lazyFetchReviewed = true;
    }
    outcomes.push({ file:name, sha256:digest(raw), modules:graph.modules.length, premodules:graph.premodules.length, graphSourcesBoundToSourceMap:true, realMappedSources:realMappedSources.length, requiredPaths:requiredRows.map(m=>m.path), forbiddenModulePaths:forbidden, winterModules:winter, lazyFetchReviewed,
      lazyFetchScope: 'Expo Metro prelude installs a getter; fetch modules may be statically bundled but the reviewed camera paths do not invoke fetch. Controlled Jest fetch global isolates preset enumeration. No physical startup claim.' });
  }
  const result = { sourceMapSha256:digest(mapBytes), sourceCount:map.sources.length, captures:outcomes, actualReleaseGraph:true, installedCameraModulesReal:true, noNewNativeModule:true, physicalStartupVerified:false };
  fs.writeFileSync(path.join(writer,'startup-closure-result.json'), JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  process.stdout.write(JSON.stringify({startupClosureVerifiedForStaticScope:true,sourceCount:map.sources.length,captures:outcomes.map(o=>({modules:o.modules,premodules:o.premodules,lazyFetchReviewed:o.lazyFetchReviewed}))})+'\n');
}
module.exports = { captureGraph };
if (require.main === module) { assert.equal(process.argv[2],'verify'); verifyGraph(); }
