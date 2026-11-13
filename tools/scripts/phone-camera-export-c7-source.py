"""New C7 index plus deterministic derived exporter pin. Legacy owner stays unchanged."""
import datetime,hashlib,json,pathlib,sys
R=pathlib.Path(__file__).resolve().parents[2]
W=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-export-c7-source-20261019-a1/writer'
M=R/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def binding():
 old=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-c1-source-20261018-a1/source-index.json'
 paths={R/x['path'] for x in json.loads(old.read_text())}
 paths.update(M.glob('CameraEvidence*.java'));paths.discard(M/'CameraEvidenceExportSource.java')
 paths.add(R/'apps/mobile/src/recognitionExperiment/cameraEvidenceExport.ts')
 paths.add(M/'CameraProofSource.java')
 paths.add(M.parents[4]/'test/java/expo/modules/recognitioncpu/CameraEvidenceExportChecks.java')
 paths.update(R/'apps/mobile/__tests__'/n for n in ['recognitionExperimentCameraEvidenceExport.test.ts','recognitionExperimentCameraProofUi.test.tsx'])
 paths.update(R/'tools/scripts'/n for n in ['phone-camera-export-c7-source.py','phone-camera-export-c7-checks.py'])
 rows=[dict(path=p.relative_to(R).as_posix(),bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(paths)]
 return (json.dumps(rows,sort_keys=True,separators=(',',':'))+'\n').encode()
def generated(digest):
 return ('package expo.modules.recognitioncpu;\n/** Derived from C7 source-index; its rendering rule is indexed, avoiding a self hash. */\npublic final class CameraEvidenceExportSource { private CameraEvidenceExportSource(){} public static final String SHA256="'+digest+'"; }\n').encode()
def main():
 raw=binding();digest=hashlib.sha256(raw).hexdigest();target=M/'CameraEvidenceExportSource.java'
 if sys.argv[1:]==['bind']:
  s=json.loads((R/'.agents/workflows/recognition-track-b.json').read_text());assert s['lease']==json.loads((W/'charter.json').read_text())['lease'];assert datetime.datetime.fromisoformat(s['lease']['expires_at'])>datetime.datetime.now(datetime.timezone.utc);assert not (W/'writer-stopped.json').exists()
  assert not target.exists() and not (W/'source-index.json').exists()
  with (W/'source-index.json').open('xb') as f:f.write(raw)
  with target.open('xb') as f:f.write(generated(digest))
  (W/'runtime-binding.json').write_text(json.dumps(dict(sourceIndexSha256=digest,derivedSource=dict(path=target.relative_to(R).as_posix(),bytes=target.stat().st_size,sha256=sha(target)),rule='generated(index_sha256) in indexed phone-camera-export-c7-source.py; derived output excluded from its own input index',legacyOwnerUnchanged=True),indent=2)+'\n')
 elif sys.argv[1:]==['check']:
  assert (W/'source-index.json').read_bytes()==raw and target.read_bytes()==generated(digest),'STALE_C7_SOURCE'
 else:raise ValueError('Explicit bind/check')
 print(json.dumps(dict(rows=len(json.loads(raw)),sourceIndexSha256=digest,derivedSourceSha256=sha(target))))
if __name__=='__main__':main()
