import pathlib,json,hashlib,datetime
ROOT=pathlib.Path(__file__).resolve().parents[2];RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-audit-offline-gate-c2-20261014-a1'
def main():
 assert not (RUN/'stopped.json').exists()
 wf=json.loads((ROOT/'.agents/workflows/recognition-track-b.json').read_bytes());assert wf['lease']['holder']=='01a1051f-0777-7573-ad09-0e550a4bd56a' and datetime.datetime.now(datetime.timezone.utc)<datetime.datetime.fromisoformat(wf['lease']['expires_at'])
 java=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu'
 paths=[p for p in java.glob('PhonePortability*.java') if p.name!='PhonePortabilitySource.java']+[java/'PhoneOfflineGate.java']
 paths += [java/n for n in ['GeneratedProbeCpu.java','GeneratedImageGeometry.java','GeneratedImagePipeline.java','GeneratedEvidenceStore.java','GeneratedEvidenceAndroid.java','GeneratedExportState.java']]
 paths += [ROOT/'apps/mobile/recognition-native/recognition-experiment/android/src/main/java/expo/modules/recognitionexperiment/RecognitionExperimentModule.kt']
 paths += list((ROOT/'apps/mobile/src/recognitionExperiment').glob('*.ts'))+list((ROOT/'apps/mobile/src/recognitionExperiment').glob('*.tsx'))
 rows=[dict(path=p.relative_to(ROOT).as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(paths)]
 raw=(json.dumps(rows,sort_keys=True,separators=(',',':'))+'\n').encode();digest=hashlib.sha256(raw).hexdigest()
 (RUN/'replay-source-pin.json').write_bytes(raw)
 (java/'PhonePortabilitySource.java').write_text('package expo.modules.recognitioncpu;\n/** SHA256 of the canonical implementation manifest, excluding this self-referential constant. */\npublic final class PhonePortabilitySource { public static final String SHA256="'+digest+'"; private PhonePortabilitySource(){} }\n')
 old=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-audit-offline-gate-c1-20261014-a1/replay-source-pin.json'
 old_rows={r['path']:r for r in json.loads(old.read_bytes())};new_rows={r['path']:r for r in rows}
 changed=[p for p in old_rows if old_rows[p]!=new_rows[p]];added=sorted(set(new_rows)-set(old_rows))
 assert added==[] and changed==[str((java/'PhoneOfflineGate.java').relative_to(ROOT)).replace('\\','/')]
 (RUN/'source-pin-delta.json').write_text(json.dumps(dict(oldSha256=hashlib.sha256(old.read_bytes()).hexdigest(),newSha256=digest,files=len(rows),changed=changed,added=added,manifestUnchanged=True,numericalRecipesUnchanged=True),indent=2)+'\n')
 print(json.dumps(dict(sourceFiles=len(rows),replaySourceSha256=digest)))
if __name__=='__main__':main()
