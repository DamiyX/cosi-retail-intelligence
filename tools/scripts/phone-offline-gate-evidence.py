"""Inspect compiled guard bindings and source/build deltas; no device or private processing."""
import pathlib,json,hashlib,subprocess,os
ROOT=pathlib.Path(__file__).resolve().parents[2];RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-audit-offline-gate-c2-20261014-a1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def main():
 assert not (RUN/'stopped.json').exists()
 java=pathlib.Path(r'C:/Users/doyew/.cache/cosi-p1-20261012-a1/jdk17/bin');classes=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/build/tmp/kotlin-classes/release'
 result=subprocess.run([str(java/'javap.exe'),'-p','-c','-classpath',str(classes),'expo.modules.recognitionexperiment.RecognitionExperimentModule'],capture_output=True,text=True);assert result.returncode==0
 (RUN/'compiled-wrapper-javap.log').write_text(result.stdout)
 assert 'PhoneOfflineGate.check:' in result.stdout and 'PhoneOfflineGate.status:' in result.stdout and 'checkPrivateOfflineGate' in result.stdout
 status=result.stdout.split('private final java.util.Map<java.lang.String, java.lang.Object> privateOfflineStatus();',1)[1].split('private final void finishPrivate',1)[0]
 for forbidden in ['getPrivateStore','PhonePortabilityStore','PhonePortabilityReplay','PhonePortabilityState.begin','AtomicBoolean.set']:assert forbidden not in status,forbidden
 native=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/build/intermediates/javac/release/compileReleaseJavaWithJavac/classes'
 helper=subprocess.run([str(java/'javap.exe'),'-p','-c','-classpath',str(native),'expo.modules.recognitioncpu.PhoneOfflineGate'],capture_output=True,text=True);assert helper.returncode==0;(RUN/'compiled-gate-javap.log').write_text(helper.stdout)
 old=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-image-lifecycle-c1-20261012-a1/compiled-helper-final.json'
 rows=json.loads(old.read_bytes());assert len(rows)==17
 for row in rows:
  p=pathlib.Path('//?/'+str(ROOT/row['path']));assert p.stat().st_size==row['bytes'] and sha(p.read_bytes())==row['sha256']
 (RUN/'accepted-compiled-helpers-preserved.json').write_text(json.dumps(dict(records=17,changed=0))+'\n')
 before=json.loads((RUN/'build-before.json').read_bytes());deltas=[]
 for row in before:
  p=pathlib.Path('//?/'+str(ROOT/row['path']))
  if not p.exists():deltas.append(dict(path=row['path'],missing=True))
  elif p.stat().st_size!=row['bytes'] or sha(p.read_bytes())!=row['sha256']:deltas.append(dict(path=row['path'],beforeSha256=row['sha256'],afterSha256=sha(p.read_bytes()),bytes=p.stat().st_size))
 (RUN/'meaningful-build-deltas.json').write_text(json.dumps(deltas,indent=2)+'\n')
 for path in ['apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/gradle.lockfile','apps/mobile/recognition-native/recognition-experiment/android/gradle.lockfile']:assert not (ROOT/path).exists()
 (RUN/'compiled-bindings.json').write_text(json.dumps(dict(actualCompiledGateConsumedByKotlin=True,compiledStatusPrivateStateTouches=0,acceptedGeneratedHelpersUnchanged=17,meaningfulPriorBuildSnapshots=len(before),generatedDeltas=len(deltas),unapprovedNewLockFiles=0,deviceExecuted=False,modelExecuted=False),indent=2)+'\n')
 print('PASS compiled shared gate/status bindings,17 generated helper binaries and bounded build deltas.')
if __name__=='__main__':main()
