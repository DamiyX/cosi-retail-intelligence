"""C8 complete source/target index and deterministic derived runtime pin; no historical repin."""
import pathlib,json,hashlib,datetime,sys
R=pathlib.Path(__file__).resolve().parents[2]
W=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-source-20261022-a1/writer'
M=R/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def binding():
 paths={R/x['path'] for x in json.loads((R/'apps/recognition-lab/runs/phone-experiment/p2-camera-export-c7-source-20261019-a1/writer/source-index.json').read_text())}
 paths.update(M.glob('CameraStationary*.java'));paths.discard(M/'CameraStationarySource.java');paths.add(M/'CameraEvidenceExportSource.java')
 paths.update([R/'apps/mobile/src/recognitionExperiment/cameraStationary.ts',R/'apps/mobile/__tests__/recognitionExperimentCameraStationary.test.ts',M.parents[4]/'test/java/expo/modules/recognitioncpu/CameraStationaryChecks.java'])
 paths.update(R/'tools/scripts'/n for n in ['phone-camera-geometry-c8-source.py','phone-camera-geometry-c8-checks.py','phone-camera-geometry-c8-target.py'])
 paths.update((W/'target-a2').glob('*'))
 return (json.dumps([dict(path=p.relative_to(R).as_posix(),bytes=p.stat().st_size,sha256=sha(p)) for p in sorted(paths)],sort_keys=True,separators=(',',':'))+'\n').encode()
def generated(h):return ('package expo.modules.recognitioncpu;\n/** Derived C8 index; indexed renderer and separate output hash avoid a self hash. */\npublic final class CameraStationarySource { private CameraStationarySource(){} public static final String SHA256="'+h+'"; }\n').encode()
def main():
 raw=binding();h=hashlib.sha256(raw).hexdigest();p=M/'CameraStationarySource.java'
 if sys.argv[1:]==['bind']:
  state=json.loads((R/'.agents/workflows/recognition-track-b.json').read_text());assert state['lease']==json.loads((W/'charter.json').read_text())['lease'] and datetime.datetime.fromisoformat(state['lease']['expires_at'])>datetime.datetime.now(datetime.timezone.utc);assert not (W/'writer-stopped.json').exists() and not p.exists() and not (W/'source-index.json').exists()
  assert sha(W/'target-a2/stationary-chart.png')=='7ffd7f6fbd778405497bbfc0d2f4649281e19c33c8d8af5c626c87d71f02ef6a'
  (W/'source-index.json').write_bytes(raw);p.write_bytes(generated(h));(W/'runtime-binding.json').write_text(json.dumps(dict(sourceIndexSha256=h,derived=dict(path=p.relative_to(R).as_posix(),bytes=p.stat().st_size,sha256=sha(p)),renderRule='generated(index digest) in indexed C8 renderer; derivative excluded from own input digest',historicalC7AndLegacyOwnerUnchanged=True),indent=2)+'\n')
 elif sys.argv[1:]==['corrected']:
  state=json.loads((R/'.agents/workflows/recognition-track-b.json').read_text());assert state['lease']==json.loads((W/'charter.json').read_text())['lease'] and datetime.datetime.fromisoformat(state['lease']['expires_at'])>datetime.datetime.now(datetime.timezone.utc);assert not (W/'writer-stopped.json').exists() and not (W/'source-index-a2.json').exists()
  original=hashlib.sha256((W/'source-index.json').read_bytes()).hexdigest();assert p.read_bytes()==generated(original)
  (W/'derived-source-a1.java').write_bytes(p.read_bytes());(W/'source-index-a2.json').write_bytes(raw);p.write_bytes(generated(h))
  (W/'runtime-binding-a2.json').write_text(json.dumps(dict(sourceIndexSha256=h,sourceIndex='source-index-a2.json',derived=dict(path=p.relative_to(R).as_posix(),bytes=p.stat().st_size,sha256=sha(p)),originalCandidateIndexSha256=original,reason='New UI mock type correction; original candidate index/runtime binding/derived bytes and first failed check retained',historicalC7AndLegacyOwnerUnchanged=True),indent=2)+'\n')
 elif sys.argv[1:]==['final']:
  state=json.loads((R/'.agents/workflows/recognition-track-b.json').read_text());assert state['lease']==json.loads((W/'charter.json').read_text())['lease'] and datetime.datetime.fromisoformat(state['lease']['expires_at'])>datetime.datetime.now(datetime.timezone.utc);assert not (W/'writer-stopped.json').exists() and not (W/'source-index-final.json').exists()
  prior=hashlib.sha256((W/'source-index-a2.json').read_bytes()).hexdigest();assert p.read_bytes()==generated(prior)
  (W/'source-index-final.json').write_bytes(raw);p.write_bytes(generated(h));(W/'runtime-binding-final.json').write_text(json.dumps(dict(sourceIndexSha256=h,sourceIndex='source-index-final.json',derived=dict(path=p.relative_to(R).as_posix(),bytes=p.stat().st_size,sha256=sha(p)),priorCandidateIndexSha256=prior,reason='Self-review missing-intent existing-job refusal; all72 preceding input bytes and derived output preserved under candidate-a2-inputs/derived-source-a2.java',historicalC7AndLegacyOwnerUnchanged=True),indent=2)+'\n')
 elif sys.argv[1:]==['ready']:
  state=json.loads((R/'.agents/workflows/recognition-track-b.json').read_text());assert state['lease']==json.loads((W/'charter.json').read_text())['lease'] and datetime.datetime.fromisoformat(state['lease']['expires_at'])>datetime.datetime.now(datetime.timezone.utc);assert not (W/'writer-stopped.json').exists() and not (W/'source-index-ready.json').exists()
  prior=hashlib.sha256((W/'source-index-final.json').read_bytes()).hexdigest();assert p.read_bytes()==generated(prior)
  (W/'source-index-ready.json').write_bytes(raw);p.write_bytes(generated(h));(W/'runtime-binding-ready.json').write_text(json.dumps(dict(sourceIndexSha256=h,sourceIndex='source-index-ready.json',derived=dict(path=p.relative_to(R).as_posix(),bytes=p.stat().st_size,sha256=sha(p)),priorCandidateIndexSha256=prior,reason='Correct typed test assignment to plain native interface; preceding72 input bytes and derived output retained in candidate-final-inputs/derived-source-pre-ready.java; Kotlin helper uses final ready Java classes',historicalC7AndLegacyOwnerUnchanged=True),indent=2)+'\n')
 elif sys.argv[1:]==['check']:
  name='source-index-ready.json' if (W/'source-index-ready.json').exists() else 'source-index-final.json' if (W/'source-index-final.json').exists() else 'source-index-a2.json' if (W/'source-index-a2.json').exists() else 'source-index.json';assert (W/name).read_bytes()==raw and p.read_bytes()==generated(h),'STALE_C8_SOURCE'
 else:raise ValueError('bind/check required')
 print(json.dumps(dict(sourceRows=len(json.loads(raw)),sourceIndexSha256=h,derivedSourceSha256=sha(p))))
if __name__=='__main__':main()
