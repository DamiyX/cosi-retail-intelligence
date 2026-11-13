from pathlib import Path
import ctypes,json,subprocess,sys,re,hashlib
R=Path.cwd();W=Path(sys.argv[1]);W.mkdir();C=R/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/cpp/camera_proof_publish.c';source=C.read_text();old=Path(sys.argv[2]).read_text();shim=old[:old.index('static int leaf(')]+"const char*strstr(const char*a,const char*b){for(;*a;a++){size_t n=strlen(b);if(strncmp(a,b,n)==0)return a;}return NULL;}\n";functions=source[source.index('static int leaf('):source.index('static int regular(')];guard=source[source.index('  if((recovery_root',source.index('static jlong publish_at')):];guard=guard[:guard.index('return failure(3,EINVAL);')].strip()[3:-1]
probe=shim+functions+'\n__declspec(dllexport) int refused(const char*directory,const char*from,const char*to){return '+guard+';}\n';(W/'probe.c').write_text(probe);T=Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1/sdk/ndk/27.1.12297006/toolchains/llvm/prebuilt/windows-x86_64/bin')
for name,cmd in [('compile',[T/'clang.exe','--target=x86_64-pc-windows-msvc','-ffreestanding','-fno-builtin','-fno-stack-protector','-c',W/'probe.c','-o',W/'probe.obj']),('link',[T/'ld.lld.exe','-flavor','link','/dll','/noentry','/out:'+str(W/'probe.dll'),W/'probe.obj'])]:
 p=subprocess.run(list(map(str,cmd)),capture_output=True,text=True);(W/(name+'.json')).write_text(json.dumps({'command':list(map(str,cmd)),'exit':p.returncode,'output':p.stdout+p.stderr},indent=2));assert p.returncode==0,p.stdout+p.stderr
lib=ctypes.CDLL(str((W/'probe.dll').resolve()));baseline=ctypes.CDLL(str(Path(sys.argv[2]).with_suffix('.dll').resolve()));f=lib.refused;g=baseline.refused
for fn in [f,g]:fn.argtypes=[ctypes.c_char_p]*3;fn.restype=ctypes.c_int
checks=[]
def check(root,stage,leaf,expected):
 actual=f(root.encode(),stage.encode(),leaf.encode());assert bool(actual)==expected,(root,stage,leaf,actual,expected);checks.append((root,stage,leaf,expected))
leaves=Path(sys.argv[3]).read_text().splitlines();assert len(leaves)==31
for leaf in leaves:
 check('/private/observed-enrollment-evidence-v1',leaf+'.new',leaf,False)
 for bad in [leaf,leaf+'.new.new','../'+leaf+'.new',leaf+'.NEW',leaf+'.new/'] :check('/private/observed-enrollment-evidence-v1',bad,leaf,True)
 for root in ['/private/other','/private/observed-enrollment-evidence-v10','/private/./observed-enrollment-evidence-v1','/private/../observed-enrollment-evidence-v1','/private//observed-enrollment-evidence-v1']:check(root,leaf+'.new',leaf,True)
for leaf in ['R00.bin','R06.bin','R1.bin','R001.bin','r01.bin','R01.arbitrary','R01.bin.new','session.new','session2','../session','session/','R01/bin'] :check('/private/observed-enrollment-evidence-v1',leaf+'.new',leaf,True)
# Execute predecessor predicates and entry stages against their exact unchanged original oracle.
roots=set(re.findall(r'"((?:camera|observed)-[^" ]+)"',functions));names=set(re.findall(r'"([^" ]+)"',functions));names.update(['event-0001','event-4096','event-0000','event-4097','receipt','../receipt','unknown','00000000-0000-0000-0000-000000000000.raw.jpg'])
for root in roots:
 if root=='observed-enrollment-evidence-v1':continue
 for leaf in names:
  for stage in [leaf+'.new',leaf+'.new.new']:
   oldResult=bool(g(('/private/'+root).encode(),stage.encode(),leaf.encode()));check('/private/'+root,stage,leaf,oldResult)
(W/'results.json').write_text(json.dumps({'checks':len(checks),'javaAdmittedControlLeaves':leaves,'sourceSha256':hashlib.sha256(C.read_bytes()).hexdigest(),'baselineProbeSha256':hashlib.sha256(Path(sys.argv[2]).read_bytes()).hexdigest(),'scope':'Actual C predicates and entry guard on Windows, not Android syscall execution'},indent=2));print('PASS native guard',len(checks),'checks;31 Java writer leaves')
