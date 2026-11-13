"""Gate A only: immutable reviewed source, fresh shadow, one bounded offline release. No device."""
import datetime, hashlib, json, os, pathlib, queue, re, stat, subprocess, sys, threading, time

ROOT=pathlib.Path(__file__).resolve().parents[2]
W=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-build-20261018-a1/writer'
STAGE=pathlib.Path('C:/Users/doyew/.cache/cosi-p2-camera-c6-build-20261018-a1')
OLD=pathlib.Path('C:/Users/doyew/.cache/cosi-p2-camera-diagnostic-c5-20261018-a1')
APP=STAGE/'app'
C5=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-diagnostic-c5-20261018-a1/writer'
C4=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c4-20261018-a1/writer'
TOOLS=pathlib.Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1')
NODE=pathlib.Path('C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe')

def ex(p):
    s=str(p);return pathlib.Path(s if s.startswith('\\\\?\\') else '\\\\?\\'+s)
def sha(p):
    with ex(p).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def read(p):return json.loads(ex(p).read_bytes())
def put(name,value):
    with (W/name).open('x',encoding='utf-8') as f:json.dump(value,f,indent=2);f.write('\n')
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def live():
    c=read(W/'charter.json');assert read(ROOT/'.agents/workflows/recognition-track-b.json')['lease']==c['lease']
    assert datetime.datetime.now(datetime.timezone.utc)<datetime.datetime.fromisoformat(c['expiresUtc'])
    assert not (W/'writer-stopped.json').exists()
    assert sha(W/'source-index.json')==c['sourceIndexSha256']=='edaab3d41029fb6a72f0fc72f8190633b2b7c17a450545ca49df13f04364335d'
    for row in read(W/'source-index.json'):assert sha(ROOT/row['path'])==row['sha256'],row['path']
    for row in read(C4.parent/'coordinator-native-assets-before.json'):assert sha(ROOT/row['path'])==row['sha256'],row['path']
    return c
def config(writer):
    return "const { getDefaultConfig } = require('expo/metro-config');\nconst { captureGraph } = require("+json.dumps(str(writer/'metro-observer.cjs'))+");\nmodule.exports = getDefaultConfig(__dirname, { unstable_beforeAssetSerializationPlugins: [captureGraph] });\n"
def old_inputs():
    expected={r['path']:dict(r) for r in read(C5/'preserved-c4-stage-source-inputs.json')}
    for r in read(C5/'staged-diagnostic-source.json'):expected['app/'+r['staged']]['sha256']=r['sha256']
    assert ex(OLD/'app/metro.config.js').read_text(encoding='utf-8')==config(C5),'Unexpected old Metro configuration'
    expected['app/metro.config.js']['sha256']=sha(OLD/'app/metro.config.js')
    result=[]
    for name,row in sorted(expected.items()):
        p=OLD/name;assert sha(p)==row['sha256'],name
        result.append(dict(path=name,bytes=ex(p).stat().st_size,sha256=sha(p)))
    return result
def excluded(rel):
    parts=rel.parts
    if parts[0]=='app':return any(x in ['build','.gradle','.cxx','.kotlin','.expo','node_modules'] for x in parts[1:])
    if parts[:3]==('camera-packages','expo-camera','android'):return any(x in ['build','.gradle','.cxx','.kotlin'] for x in parts[3:])
    return False
def source_stage():
    rows=[]
    for top in ['app','camera-packages']:
        for current,dirs,names in os.walk(ex(STAGE/top),followlinks=False):
            parent=pathlib.Path(str(current).removeprefix('\\\\?\\'))
            dirs[:]=[d for d in dirs if not excluded((parent/d).relative_to(STAGE))]
            for d in dirs:assert not os.lstat(ex(parent/d)).st_file_attributes&stat.FILE_ATTRIBUTE_REPARSE_POINT
            for name in names:
                p=parent/name;rel=p.relative_to(STAGE)
                if excluded(rel):continue
                assert not os.lstat(ex(p)).st_file_attributes&stat.FILE_ATTRIBUTE_REPARSE_POINT
                rows.append(dict(path=rel.as_posix(),bytes=ex(p).stat().st_size,sha256=sha(p)))
    return sorted(rows,key=lambda r:r['path'])
def clone():
    live();assert not STAGE.exists();before=old_inputs();STAGE.mkdir()
    put('old-stage-source-before.json',before)
    for row in before:
        dest=ex(STAGE/row['path']);dest.parent.mkdir(parents=True,exist_ok=True)
        with dest.open('xb') as f:f.write(ex(OLD/row['path']).read_bytes())
    refreshed=[]
    for row in read(W/'source-index.json'):
        name=row['path']
        if not name.startswith('apps/mobile/'):continue
        rel=pathlib.Path(name).relative_to('apps/mobile')
        # The staged package has the separately approved camera-derivative source selection.
        if rel.as_posix()=='package.json':continue
        dest=ex(APP/rel);dest.parent.mkdir(parents=True,exist_ok=True);data=(ROOT/name).read_bytes()
        dest.write_bytes(data);assert sha(dest)==row['sha256'];refreshed.append(dict(path=name,staged=rel.as_posix(),sha256=row['sha256']))
    # Original node_modules stays untouched; this junction is excluded from source traversal.
    cmd=['cmd.exe','/d','/c','mklink','/J',str(APP/'node_modules'),str(ROOT/'node_modules')]
    p=subprocess.run(cmd,capture_output=True,text=True);assert p.returncode==0,p.stderr
    put('junction.json',dict(command=cmd,target=os.readlink(APP/'node_modules'),traversed=False))
    observer=(ROOT/'tools/scripts/phone-camera-proof-apk-startup.cjs').read_text()
    observer=observer.replace('p2-camera-build-g3-c4-20261018-a1/writer','p2-camera-storage-c6-build-20261018-a1/writer').replace('C:/Users/doyew/.cache/cosi-p2-camera-g3-c4-20261018-a1',str(STAGE).replace('\\','/'))
    original=re.search(r'function live\(\) \{.*?\n\}',observer,re.S).group(0)
    guard="function live() {\n  const bytes=fs.readFileSync(path.join(writer,'charter.json'));\n  assert.equal(digest(bytes),'"+sha(W/'charter.json')+"');\n  const c=JSON.parse(bytes);\n  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'.agents/workflows/recognition-track-b.json'))).lease,c.lease);\n  assert.ok(Date.now()<Date.parse(c.expiresUtc));\n  assert.ok(!fs.existsSync(path.join(writer,'writer-stopped.json')));\n}"
    observer=observer.replace(original,guard).replace('noNewNativeModule:true','noNewNativeModule:false')
    assert '2026-10-18T08:35:19.472Z' not in observer
    with (W/'metro-observer.cjs').open('x',encoding='utf-8') as f:f.write(observer)
    ex(APP/'metro.config.js').write_text(config(W),encoding='utf-8')
    with (W/'release.init.gradle').open('xb') as f:f.write((C5/'release.init.gradle').read_bytes())
    put('refreshed-reviewed-source.json',refreshed)
    staged=source_stage();put('stage-source-index.json',staged)
    helpers=[pathlib.Path(__file__),ROOT/'tools/scripts/phone-camera-storage-build-static.py',W/'metro-observer.cjs',W/'release.init.gradle',W/'charter.json']
    inputs=dict(reviewedSourceSha256=sha(W/'source-index.json'),stageSourceIndexSha256=sha(W/'stage-source-index.json'),helpers=[dict(path=p.relative_to(ROOT).as_posix(),sha256=sha(p),bytes=p.stat().st_size) for p in helpers],oldStageSourceIndexSha256=sha(W/'old-stage-source-before.json'),oldStageReadOnly=True,stagedPackageAndDerivativeUnchanged=True,metroChanges=['fresh stage/writer/lease guard','honest new-native-module flag; default serializer unchanged'])
    put('build-inputs.json',inputs);live();assert before==old_inputs()
    print(json.dumps(dict(cloned=len(before),reviewedRows=len(refreshed),stagedFiles=len(staged),buildInputSha256=sha(W/'build-inputs.json'))))
def preserve():
    live();inputs=read(W/'build-inputs.json')
    for row in inputs['helpers']:assert sha(ROOT/row['path'])==row['sha256'],row['path']
    assert source_stage()==read(W/'stage-source-index.json'),'Staged source drift'
    assert old_inputs()==read(W/'old-stage-source-before.json'),'Old stage changed'
def build():
    preserve();assert not (W/'gradle-release.json').exists() and not (W/'gradle-live.log').exists()
    env=dict(os.environ,EXPO_OFFLINE='1',EXPO_NO_TELEMETRY='1',CI='1',NODE_ENV='production',EXPO_PUBLIC_APP_ENV='recognition-verification',COSI_RECOGNITION_EXPERIMENT='1',COSI_SCANNER_VERIFICATION='0',EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF='1',JAVA_HOME=str(TOOLS/'jdk17'),ANDROID_HOME=str(TOOLS/'sdk'),ANDROID_SDK_ROOT=str(TOOLS/'sdk'),GRADLE_USER_HOME='C:/p1g-20261012-a1',COSI_P1_CXX_ROOT=str(STAGE/'cxx'),COSI_P1_RUN=str(W),COSI_C1_MAVEN='C:/Users/doyew/.cache/cosi-p2-camera-g3-c1-20261016-a1/maven')
    env['PATH']=str(NODE.parent)+';'+str(TOOLS/'jdk17/bin')+';'+env['PATH']
    password=(TOOLS/'test-signing-password.txt').read_text();assert password
    env.update(COSI_TEST_KEYSTORE=str(TOOLS/'recognition-test.jks'),COSI_TEST_STORE_PASSWORD=password,COSI_TEST_KEY_PASSWORD=password)
    tasks=[':recognition-cpu-runtime:compileReleaseJavaWithJavac',':recognition-experiment:compileReleaseKotlin',':expo-camera:compileReleaseKotlin',':app:p2ResolvedArtifacts',':app:assembleRelease',':app:dependencies','--configuration','releaseRuntimeClasspath']
    cmd=['cmd.exe','/d','/c','gradlew.bat',*tasks,'--init-script',str(W/'release.init.gradle'),'--offline','--no-daemon','--console=plain','--max-workers=2']
    started=now();deadline=time.monotonic()+1200;lines=queue.Queue();timed_out=False
    process=subprocess.Popen(cmd,cwd=APP/'android',env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf-8',errors='replace')
    put('child.json',dict(pid=process.pid,startedUtc=started,deadlineSeconds=1200,command=cmd))
    def reader():
        for line in process.stdout:lines.put(line)
        lines.put(None)
    thread=threading.Thread(target=reader,daemon=True);thread.start()
    try:
        with (W/'gradle-live.log').open('x',encoding='utf-8') as log:
            while True:
                if time.monotonic()>deadline:
                    timed_out=True;subprocess.run(['taskkill.exe','/PID',str(process.pid),'/T','/F'],capture_output=True);break
                try:line=lines.get(timeout=1)
                except queue.Empty:continue
                if line is None:break
                for secret in set([password,password.strip()]):
                    if secret:line=line.replace(secret,'[REDACTED]')
                log.write(line);log.flush()
            result=process.wait(timeout=30)
    finally:
        env.pop('COSI_TEST_STORE_PASSWORD',None);env.pop('COSI_TEST_KEY_PASSWORD',None);password=None
    preserve();put('gradle-release.json',dict(command=cmd,exitCode=result,startedUtc=started,endedUtc=now(),offline=True,deadlineSeconds=1200,timedOut=timed_out,sourceStable=True,oldStageReadOnly=True,secretsRecorded=False))
    if result==0 and not timed_out:
        apk=APP/'android/app/build/outputs/apk/release/app-release.apk'
        with (W/'recognition-camera-storage-release.apk').open('xb') as f:f.write(ex(apk).read_bytes())
        put('built-apk.json',dict(sha256=sha(apk),bytes=ex(apk).stat().st_size,reviewedSourceSha256=sha(W/'source-index.json'),buildInputSha256=sha(W/'build-inputs.json')))
    print(json.dumps(dict(exitCode=result,timedOut=timed_out)))
    raise SystemExit(result if result else int(timed_out))
if __name__=='__main__':
    if sys.argv[1:] == ['clone']:clone()
    elif sys.argv[1:] == ['build']:build()
    else:raise ValueError('Explicit clone/build required')
