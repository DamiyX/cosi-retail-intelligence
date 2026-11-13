"""Source-only javac/clang checks. No Gradle assembly, network, device or app execution."""
from pathlib import Path
import subprocess,zipfile,json,sys
root=Path(__file__).resolve().parent
out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
tools=Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1')
javac=tools/'jdk17/bin/javac.exe';java=tools/'jdk17/bin/java.exe'
src=root/'camera-component/src/main/java/local/cameracomponent'
results=[]
def run(name,cmd):
 p=subprocess.run([str(x) for x in cmd],capture_output=True,text=True)
 (out/(name+'.log')).write_text(p.stdout+p.stderr,encoding='utf-8')
 results.append({'check':name,'command':[str(x) for x in cmd],'exit':p.returncode})
 (out/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
 print(name,p.returncode,(p.stdout+p.stderr)[-1800:]);return p.returncode
pure=[src/(n+'.java') for n in ['Failure','Session','Geometry','Delivery','Evidence','RecordOwner','FixedSlots','CropGeometry']]
classes=out/'pure';classes.mkdir(exist_ok=True)
if run('pure-compile',[javac,'-d',classes,*pure,root/'tests/MechanismChecks.java',root/'tests/ReviewRegressions.java',root/'tests/CorrectionChecks.java',root/'tests/DiagnosticChecks.java',root/'tests/SlotChecks.java',root/'tests/CropChecks.java'])==0:run('mechanisms',[java,'-cp',classes,'MechanismChecks']);run('review-regressions',[java,'-cp',classes,'ReviewRegressions']);run('correction-checks',[java,'-cp',classes,'CorrectionChecks']);run('diagnostic-checks',[java,'-cp',classes,'DiagnosticChecks']);run('slot-checks',[java,'-cp',classes,'SlotChecks']);run('crop-checks',[java,'-cp',classes,'CropChecks'])
cache=tools/'gradle/caches/modules-2/files-2.1'
cp=[tools/'sdk/platforms/android-36/android.jar']; jars=out/'cached-jars';jars.mkdir(exist_ok=True)
# Source compatibility classpath only: not a resolved or release runtime graph.
for group in cache.iterdir():
 if not (group.name.startswith('androidx.') or group.name.startswith('com.google.') or group.name.startswith('org.jetbrains.')):continue
 for f in sorted(group.rglob('*')):
  if f.suffix=='.aar':
   with zipfile.ZipFile(f) as z:
    if 'classes.jar' in z.namelist():
     import hashlib
     dest=jars/(hashlib.sha256(str(f).encode()).hexdigest()+'.jar');dest.write_bytes(z.read('classes.jar'));cp.append(dest)
  elif f.suffix=='.jar' and not f.name.endswith(('-sources.jar','-javadoc.jar')):cp.append(f)
maven=Path('C:/Users/doyew/.cache/cosi-p2-camera-g3-c1-20261016-a1/maven')
for f in sorted(maven.rglob('*.aar')):
 with zipfile.ZipFile(f) as z:
  if 'classes.jar' in z.namelist():
   import hashlib
   dest=jars/(hashlib.sha256(str(f).encode()).hexdigest()+'.jar');dest.write_bytes(z.read('classes.jar'));cp.insert(1,dest)
cp.extend(maven.rglob('*.jar'))
android=out/'android';android.mkdir(exist_ok=True)
stub=out/'BuildConfig.java';stub.write_text('package local.cameraprobe; public final class BuildConfig { public static final String SOURCE_SHA="0000000000000000000000000000000000000000000000000000000000000000"; public static final String SIGNER_SHA="0000000000000000000000000000000000000000000000000000000000000000"; }')
args=['-d',str(android),'-classpath',';'.join(map(str,cp)),*[str(f) for f in src.glob('*.java')],*[str(f) for f in (root/'app/src/main/java').rglob('*.java')],str(stub)]
argfile=out/'javac.args';argfile.write_text('\n'.join('"'+a.replace('\\','/')+'"' for a in args),encoding='utf-8')
run('android-source-compile',[javac,'@'+str(argfile)])
ndk=tools/'sdk/ndk/27.1.12297006/toolchains/llvm/prebuilt/windows-x86_64'
clang=ndk/'bin/clang.exe'
run('native-source-compile',[clang,'--target=aarch64-linux-android30','--sysroot='+str(ndk/'sysroot'),'-Wall','-Wextra','-Werror','-c',root/'camera-component/src/main/cpp/publish.c','-o',out/'publish.o'])
sys.exit(0 if all(r['exit']==0 for r in results) else 1)
