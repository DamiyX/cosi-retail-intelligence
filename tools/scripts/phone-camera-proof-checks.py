"""Local source checks only; no Gradle, model, device, dependency or network action."""
import hashlib,json,pathlib,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
WRITER=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-source-20261015-a1/writer'
JAVA=pathlib.Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1/jdk17/bin')
CPU=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src'
def exclusive(out):
 assert out.parent==WRITER and not out.exists() and not (WRITER/'writer-stopped.json').exists()
 out.mkdir()
def run(command):
 result=subprocess.run([str(v) for v in command],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
 print(json.dumps(dict(command=[str(v) for v in command],exitCode=result.returncode,stdout=result.stdout,stderr=result.stderr)))
 if result.returncode:raise SystemExit(result.returncode)
def main():
 global WRITER
 args=sys.argv[1:]
 if len(args)==4 and args[2]=='--writer-root':
  candidate=pathlib.Path(args[3]).resolve();allowed=[ROOT/'apps/recognition-lab/runs/phone-experiment'/n/'writer' for n in ['p2-camera-source-20261015-a1','p2-camera-source-c1-20261015-a1']]
  assert candidate in allowed and (candidate.parent/'coordinator-dispatch.json').is_file();WRITER=candidate;args=args[:2]
 mode,name=args;out=WRITER/name;exclusive(out)
 main=CPU/'main/java/expo/modules/recognitioncpu';tests=CPU/'test/java/expo/modules/recognitioncpu'
 if mode=='android-compile':
  cache=pathlib.Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1')
  api=cache/'sdk/platforms/android-36/android.jar'
  jars=[]
  for lib in ['litert-api-2.2.0','litert-2.2.0']:
   matches=list((cache/'gradle/caches/9.3.1/transforms').glob('*/workspace/transformed/'+lib+'/jars/classes.jar'))
   assert len(matches)==1,(lib,len(matches));jars+=matches
  inputs=[api,*jars];(out/'classpath.json').write_text(json.dumps([dict(path=str(p),sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in inputs],indent=2))
  source=list(main.glob('CameraProof*.java'))+[main/n for n in ['PhonePortabilityImage.java','PhonePortabilityJson.java','GeneratedImageGeometry.java']]
  run([JAVA/'javac.exe','-Xlint:all','-classpath',';'.join(str(p) for p in inputs),'-d',out/'classes',*source])
 elif mode in ['jvm','focused']:
  source=[main/n for n in ['CameraProofFrame.java','CameraProofStore.java','CameraProofLifecycle.java','CameraProofFinalizer.java','PhonePortabilityImage.java','PhonePortabilityJson.java','GeneratedImageGeometry.java','GeneratedExportState.java','GeneratedEvidenceStore.java','PhonePortabilityState.java','PhoneOfflineGate.java']]
  source += [tests/n for n in ['CameraProofChecks.java','CameraProofCapacityChecks.java','CameraProofFinalizationChecks.java','GeneratedImageChecks.java','PhonePortabilityStateChecks.java','PhoneOfflineGateChecks.java']]
  run([JAVA/'javac.exe','-Xlint:all','-d',out/'classes',*source])
  jobs=[('CameraProofFinalizationChecks',[out/'finalization'])]
  if mode=='jvm':jobs=[('GeneratedImageChecks',[]),('PhonePortabilityStateChecks',[]),('PhoneOfflineGateChecks',[]),*jobs,('CameraProofChecks',[out/'generated']),('CameraProofCapacityChecks',[out/'capacity'])]
  for check,args in jobs:
   run([JAVA/'java.exe','-cp',out/'classes','expo.modules.recognitioncpu.'+check,*args])
 elif mode=='lab-shadow':
  lab=ROOT/'apps/recognition-lab';index=[]
  files=list((lab/'src').rglob('*.ts'))+list((lab/'fixtures/phone-capture-session').rglob('*.json'))+list((lab/'fixtures/phone-capture-enrollment').rglob('*.json'))+[lab/n for n in ['package.json','jest.config.cjs','__tests__/phoneCaptureSession.test.ts','__tests__/phoneCaptureEnrollment.test.ts']]
  for p in files:
   rel=p.relative_to(lab);dest=pathlib.Path('\\\\?\\'+str(out/rel));dest.parent.mkdir(parents=True,exist_ok=True)
   data=p.read_bytes()
   with dest.open('xb') as f:f.write(data)
   assert hashlib.sha256(dest.read_bytes()).digest()==hashlib.sha256(data).digest()
   index.append(dict(path=rel.as_posix(),bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
  for name in ['p2-generated-01-c1-20261014-a1','p2-generated-02-c1-20261014-a1']:(out/'runs/phone-experiment'/name).mkdir(parents=True)
  (out/'shadow-index.json').write_text(json.dumps(index,indent=2));print(json.dumps(dict(kind='EXACT_LAB_SHADOW',files=len(index),root=str(out),nativeValidated=False)))
 else:raise ValueError('Unknown local check mode')
if __name__=='__main__':main()
