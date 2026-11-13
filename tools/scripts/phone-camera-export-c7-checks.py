"""C7 source/generated checks only. No Gradle/native/APK/phone/export effects."""
import datetime,hashlib,json,os,pathlib,subprocess,sys,zipfile
R=pathlib.Path(__file__).resolve().parents[2]
W=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-export-c7-source-20261019-a1/writer'
CPU=R/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src'
M=CPU/'main/java/expo/modules/recognitioncpu';T=CPU/'test/java/expo/modules/recognitioncpu'
C=pathlib.Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1');J=C/'jdk17/bin'
N=pathlib.Path('C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def live():
 s=json.loads((R/'.agents/workflows/recognition-track-b.json').read_text());assert s['lease']==json.loads((W/'charter.json').read_text())['lease'];assert datetime.datetime.fromisoformat(s['lease']['expires_at'])>datetime.datetime.now(datetime.timezone.utc);assert not (W/'writer-stopped.json').exists()
def main():
 live();mode,name=sys.argv[1:];assert name.replace('-','').isalnum();out=W/name;out.mkdir();receipts=[]
 def run(args,cwd=R):
  live();p=subprocess.run([str(a) for a in args],cwd=cwd,env=dict(os.environ,CI='1',EXPO_NO_TELEMETRY='1',EXPO_NO_DOTENV='1'),capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=240)
  receipts.append(dict(command=[str(a) for a in args],cwd=str(cwd),exitCode=p.returncode,stdout=p.stdout,stderr=p.stderr));(out/'result.json').write_text(json.dumps(receipts,indent=2)+'\n');print(json.dumps(dict(mode=mode,exitCode=p.returncode,stdout=p.stdout[-1200:],stderr=p.stderr[-2200:])),flush=True)
  if p.returncode:raise SystemExit(p.returncode)
 if mode=='host':
  names=['CameraProofFrame','CameraProofStore','CameraProofLifecycle','CameraProofFinalizer','PhonePortabilityImage','PhonePortabilityJson','GeneratedImageGeometry','CameraEvidenceExport','CameraEvidenceJournal','CameraEvidenceSession']
  tests=['CameraProofChecks','CameraProofRecoveryChecks','CameraProofFinalizationChecks','CameraProofDurabilityChecks','CameraEvidenceExportChecks']
  src=[M/(x+'.java') for x in names]+[T/(x+'.java') for x in tests];(out/'sources.json').write_text(json.dumps([dict(path=p.relative_to(R).as_posix(),sha256=sha(p)) for p in src],indent=2))
  run([J/'javac.exe','-Xlint:all','-d',out/'classes',*src])
  for t in ['CameraEvidenceExportChecks','CameraProofDurabilityChecks','CameraProofRecoveryChecks','CameraProofFinalizationChecks']:
   run([J/'java.exe','-cp',out/'classes','expo.modules.recognitioncpu.'+t,out/t])
 elif mode=='android':
  jars=[C/'sdk/platforms/android-36/android.jar']
  for lib in ['litert-api-2.2.0','litert-2.2.0']:
   found=list((C/'gradle/caches/9.3.1/transforms').glob('*/workspace/transformed/'+lib+'/jars/classes.jar'));assert len(found)==1;jars+=found
  source=M/'CameraEvidenceExportSource.java';extra=[]
  if not source.exists():
   source=out/'CameraEvidenceExportSource.java';source.write_text('package expo.modules.recognitioncpu; public final class CameraEvidenceExportSource { public static final String SHA256="'+'a'*64+'"; }');extra=[source]
  src=list(M.glob('CameraProof*.java'))+list(M.glob('CameraEvidence*.java'))+[M/(x+'.java') for x in ['PhonePortabilityImage','PhonePortabilityJson','GeneratedImageGeometry']]+extra
  run([J/'javac.exe','-Xlint:all','-classpath',os.pathsep.join(str(p) for p in jars),'-d',out/'classes',*src])
 elif mode=='kotlin':
  artifacts=json.loads((R/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-build-20261018-a1/writer/resolved-artifacts.json').read_text())['recognition-experiment']['releaseCompileClasspath']['artifacts']
  jars=[C/'sdk/platforms/android-36/android.jar',W/'android-a2/classes'];inputs=[]
  assert jars[1].is_dir()
  for i,row in enumerate(artifacts):
   if not row.get('external'):continue
   p=pathlib.Path(row['path']);assert sha(p)==row['sha256'];inputs.append(row)
   if p.suffix=='.aar':
    with zipfile.ZipFile(p) as z:
     if 'classes.jar' in z.namelist():q=out/(str(i)+'.jar');q.write_bytes(z.read('classes.jar'));jars.append(q)
   elif p.suffix=='.jar':jars.append(p)
  stage=pathlib.Path('C:/Users/doyew/.cache/cosi-p2-camera-c6-build-20261018-a1/app')
  for p in [stage/'node_modules/expo-modules-core/android/build/intermediates/compile_library_classes_jar/release/bundleLibCompileToJarRelease/classes.jar',stage/'recognition-native/recognition-experiment/android/cpu-runtime/build/intermediates/aar_main_jar/release/syncReleaseLibJars/classes.jar']:
   assert p.is_file();jars.append(p);inputs.append(dict(path=str(p),sha256=sha(p)))
  compiler=json.loads((R/'apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c2-20261017-a1/writer/jvm-negative-a2/compiler.json').read_text())['command'][2]
  for p in compiler.split(';'):assert pathlib.Path(p).is_file()
  module=R/'apps/mobile/recognition-native/recognition-experiment/android/src/main/java/expo/modules/recognitionexperiment/RecognitionExperimentModule.kt'
  args=['-cp',compiler,'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-jvm-target','17','-classpath',';'.join(str(p) for p in jars),'-d',str(out/'classes'),str(module)]
  argfile=out/'compiler.args';argfile.write_text('\n'.join('"'+str(x).replace('\\','/')+'"' for x in args),encoding='utf-8')
  (out/'inputs.json').write_text(json.dumps(dict(artifacts=inputs,moduleSha256=sha(module)),indent=2))
  run([J/'java.exe','@'+str(argfile)])
 elif mode=='ui':
  run([N,R/'node_modules/jest/bin/jest.js','--runInBand','--cacheDirectory',out/'jest-cache','--runTestsByPath','__tests__/recognitionExperimentCameraEvidenceExport.test.ts','__tests__/recognitionExperimentCameraProof.test.ts','__tests__/recognitionExperimentCameraProofUi.test.tsx','__tests__/recognitionExperimentCameraProofConfig.test.ts','__tests__/recognitionExperimentCameraProofIsolation.test.tsx'],R/'apps/mobile')
 elif mode=='types':run([N,R/'node_modules/typescript/bin/tsc','--noEmit'],R/'apps/mobile')
 elif mode=='lint':run([N,R/'node_modules/eslint/bin/eslint.js','.', '--max-warnings=0'],R/'apps/mobile')
 else:raise ValueError(mode)
if __name__=='__main__':main()
