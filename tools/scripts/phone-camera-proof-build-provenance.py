"""Fresh C4 source provenance and pinned deep-import validation; no native pin rewrite."""
import hashlib,importlib.util,json,pathlib,sys
s=importlib.util.spec_from_file_location('g',pathlib.Path(__file__).with_name('phone-camera-proof-build.py'));g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
JS_SHA='407bfc3655e322d6e63c40c06202f97c38b0af5474fbb095fb74a2ff60c62d35'
METRO_SHA='89bd466a52f1e7b5d741bd4dd79b581aa9508196e9c2cbaa7b86616fd44638c3'
LEGACY_NATIVE_SOURCE='360042746d54c6c05cf2ed0e253e87709d05f5bf60357951daee56df7b5b9d0e'
def inputs():
 rows=[]
 for name,digest in [('installed-camera-js-inputs.json',JS_SHA),('installed-metro-inputs.json',METRO_SHA)]:
  assert g.sha(g.WRITER/name)==digest,'Pinned input index changed'
  for row in g.read(g.WRITER/name):assert g.sha(g.ROOT/row['path'])==row['sha256'],row['path'];rows.append(row)
 assert g.read(g.ROOT/'node_modules/expo-camera/package.json')['version']=='57.0.6'
 assert g.read(g.ROOT/'node_modules/expo-modules-core/package.json')['version']=='57.0.18'
 prior=g.ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c3-20261018-a1/writer/helper-source-index.json'
 for row in g.read(prior):
  if row['path'] not in {r['path'] for r in g.read(g.META/'coordinator-writable-helpers-before.json')}:assert g.sha(g.ROOT/row['path'])==row['sha256'],'Readonly C3 helper changed'
 return rows

def binding():
 sdk=inputs();s=importlib.util.spec_from_file_location('legacy_source',pathlib.Path(__file__).with_name('phone-camera-proof-source.py'));legacy=importlib.util.module_from_spec(s);s.loader.exec_module(legacy);raw,_=legacy.binding();rows={r['path']:r for r in json.loads(raw)}
 paths=['apps/mobile/src/recognitionExperiment/cameraRuntime.ts','tools/scripts/phone-camera-proof-build-provenance.py','tools/scripts/phone-camera-proof-apk-startup.cjs']
 for row in sdk:rows[row['path']]=row
 for name in paths:
  p=g.ROOT/name;rows[name]=dict(path=name,bytes=p.stat().st_size,sha256=g.sha(p))
 rows=[rows[k] for k in sorted(rows)];raw=(json.dumps(rows,sort_keys=True,separators=(',',':'))+'\n').encode();return raw,hashlib.sha256(raw).hexdigest(),rows

def main():
 g.live();raw,digest,rows=binding();native=g.ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/CameraProofSource.java';assert ('SHA256="'+LEGACY_NATIVE_SOURCE+'"') in native.read_text(),'Legacy native runtime ID changed'
 if sys.argv[1]=='write':
  with (g.WRITER/'source-index.json').open('xb') as f:f.write(raw)
  g.put(g.WRITER/'source-index-binding.json',dict(createdUtc=g.now(),freshSourceSha256=digest,rows=len(rows),sourceIndexSha256=g.sha(g.WRITER/'source-index.json'),legacyNativeRuntimeSourceId=LEGACY_NATIVE_SOURCE,legacyNativeIdDoesNotCoverRepairedJavaScript=True,nativeJavaUnchanged=True,sourcePinIsExternalBuildProvenance=True,noModelExecution=True))
 elif sys.argv[1]=='check':assert raw==(g.WRITER/'source-index.json').read_bytes() and digest==g.read(g.WRITER/'source-index-binding.json')['freshSourceSha256']
 else:raise ValueError('Explicit write/check required')
 print(json.dumps(dict(freshSourceSha256=digest,rows=len(rows),legacyNativeRuntimeIdUnchanged=True,installedDeepImportsPinned=True)))
if __name__=='__main__':main()
