"""Gate B local artifact only. Exact production sources/native bytes; no device or native link."""
import datetime, hashlib, importlib.util, json, os, pathlib, shutil, struct, subprocess, sys, time, xml.etree.ElementTree as ET, zipfile

ROOT=pathlib.Path(__file__).resolve().parents[2]
W=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-smoke-c6-20261018-a1/writer'
MAIN=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu'
GATE=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-build-20261018-a1/writer'
TOOLS=pathlib.Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1')
SDK=TOOLS/'sdk/build-tools/36.0.0';J=TOOLS/'jdk17/bin';API=TOOLS/'sdk/platforms/android-36/android.jar'
NATIVE='c354955263c1d84280ace86bdec8aac8f30f0fbd12630611a7226a875d493e63'
PRODUCTION='edaab3d41029fb6a72f0fc72f8190633b2b7c17a450545ca49df13f04364335d'
PACKAGE='com.damiyx.retailintelligence.storagesmoke'
LIB='lib/arm64-v8a/libcamera_proof_publish.so'

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def put(name,value):
    with (W/name).open('x',encoding='utf-8') as f:json.dump(value,f,indent=2);f.write('\n')
def live():
    c=read(W/'charter.json');assert c['lease']==read(ROOT/'.agents/workflows/recognition-track-b.json')['lease']
    assert datetime.datetime.now(datetime.timezone.utc)<datetime.datetime.fromisoformat(c['lease']['expires_at'])
    assert not (W/'writer-stopped.json').exists()
    assert sha(W/'source-index-reviewed.json')==PRODUCTION
    for row in read(W/'source-index-reviewed.json'):assert sha(ROOT/row['path'])==row['sha256'],row['path']
    assert sha(GATE/'recognition-camera-storage-release.apk')=='80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713'
    assert sha(GATE/'libcamera_proof_publish.so')==NATIVE
def inputs():
    rows=[]
    for p in sorted((W/'source').glob('*.java')):
        rows.append(dict(path=p.relative_to(ROOT).as_posix(),bytes=p.stat().st_size,sha256=sha(p)))
    for p in [W/'AndroidManifest.xml',W/'native/libcamera_proof_publish.so',W/'charter.json',pathlib.Path(__file__)]:
        rows.append(dict(path=p.relative_to(ROOT).as_posix(),bytes=p.stat().st_size,sha256=sha(p)))
    return (json.dumps(sorted(rows,key=lambda r:r['path']),sort_keys=True,separators=(',',':'))+'\n').encode()
def prepare():
    live();names=['CameraProofFrame','CameraProofStore','CameraProofLifecycle','CameraProofFinalizer','CameraProofFiles','CameraProofRename','PhonePortabilityImage','PhonePortabilityJson','GeneratedImageGeometry'];expected={r['path']:r for r in read(W/'source-index-reviewed.json')};copied=[]
    for name in names:
        source=MAIN/(name+'.java');row=expected[source.relative_to(ROOT).as_posix()];assert sha(source)==row['sha256'];target=W/'source'/(name+'.java')
        with target.open('xb') as f:f.write(source.read_bytes())
        copied.append(dict(production=source.relative_to(ROOT).as_posix(),copy=target.relative_to(W).as_posix(),sha256=sha(target)))
    (W/'native').mkdir();shutil.copyfile(GATE/'libcamera_proof_publish.so',W/'native/libcamera_proof_publish.so');assert sha(W/'native/libcamera_proof_publish.so')==NATIVE
    put('production-copies.json',copied);raw=inputs()
    with (W/'source-index.json').open('xb') as f:f.write(raw)
    (W/'assets').mkdir();binding=dict(kind='GENERATED_STORAGE_SMOKE_BINDING',reviewedProductionSourceSha256=PRODUCTION,gateAApkSha256='80e717888f26091b9bd45a101b9dc548c05259238fdd4e6f18e1f9b1c2d86713',sourceIndexSha256=sha(W/'source-index.json'),nativeSha256=NATIVE,nativeBytes=7656,package=PACKAGE,javaSourcesExactButSdkPackagingNotR8BinaryEquivalent=True,camera=False,model=False,network=False,oldPackageData=False)
    with (W/'assets/storage-smoke-binding.json').open('x',encoding='utf-8') as f:json.dump(binding,f,separators=(',',':'));f.write('\n')
    put('preparation.json',dict(atUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceIndexSha256=sha(W/'source-index.json'),productionSourcesCopied=len(copied),harnessSources=1,nativeReusedByteExact=True,newNativeLink=False,bindingAssetSha256=sha(W/'assets/storage-smoke-binding.json'),apkBuilt=False,phoneInstallAuthorized=False))
    print(json.dumps(dict(sourceInputs=len(json.loads(raw)),sourceIndexSha256=sha(W/'source-index.json'),productionCopies=len(copied))))
def build():
    live();assert inputs()==(W/'source-index.json').read_bytes();assert not (W/'build-result.json').exists()
    env=dict(os.environ,JAVA_HOME=str(TOOLS/'jdk17'));env['PATH']=str(J)+';'+env['PATH'];deadline=time.monotonic()+180;secrets=set()
    def run(name,args):
        live();assert inputs()==(W/'source-index.json').read_bytes();timeout=min(120,max(1,deadline-time.monotonic()));command=[str(x) for x in args]
        try:result=subprocess.run(command,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=timeout)
        except subprocess.TimeoutExpired:
            put(name+'.json',dict(command=command,timedOut=True,overallDeadlineSeconds=180));raise
        stdout,stderr=result.stdout,result.stderr
        for secret in secrets:
            if secret:stdout=stdout.replace(secret,'[REDACTED]');stderr=stderr.replace(secret,'[REDACTED]')
        put(name+'.json',dict(command=command,exitCode=result.returncode,stdout=stdout,stderr=stderr));assert result.returncode==0,(name,result.returncode);return stdout
    classes=W/'classes';classes.mkdir();dex=W/'dex';dex.mkdir();sources=sorted((W/'source').glob('*.java'))
    run('javac',[J/'javac.exe','--release','17','-Xlint:all','-classpath',API,'-d',classes,*sources])
    run('jar',[J/'jar.exe','cf',W/'compiled-input.jar','-C',classes,'.'])
    run('dex',['cmd.exe','/d','/c',SDK/'d8.bat','--release','--lib',API,'--min-api','24','--output',dex,W/'compiled-input.jar'])
    unsigned=W/'unsigned.apk';run('manifest-link',[SDK/'aapt2.exe','link','--manifest',W/'AndroidManifest.xml','-I',API,'--min-sdk-version','24','--target-sdk-version','36','--version-code','1','--version-name','1','-o',unsigned])
    with zipfile.ZipFile(unsigned,'a',compression=zipfile.ZIP_DEFLATED) as z:
        z.write(dex/'classes.dex','classes.dex');z.write(W/'assets/storage-smoke-binding.json','assets/storage-smoke-binding.json');z.write(W/'native/libcamera_proof_publish.so',LIB,compress_type=zipfile.ZIP_STORED)
    run('align',[SDK/'zipalign.exe','-P','16','4',unsigned,W/'aligned.apk'])
    password=(TOOLS/'test-signing-password.txt').read_text();assert password
    secrets.update([password,password.strip()])
    env.update(COSI_TEST_STORE_PASSWORD=password,COSI_TEST_KEY_PASSWORD=password)
    try:
        run('sign',[J/'java.exe','-jar',SDK/'lib/apksigner.jar','sign','--ks',TOOLS/'recognition-test.jks','--ks-key-alias','recognition-test','--ks-pass','env:COSI_TEST_STORE_PASSWORD','--key-pass','env:COSI_TEST_KEY_PASSWORD','--v1-signing-enabled','false','--v2-signing-enabled','true','--v3-signing-enabled','true','--v4-signing-enabled','false','--out',W/'storage-smoke.apk',W/'aligned.apk'])
    finally:env.pop('COSI_TEST_STORE_PASSWORD',None);env.pop('COSI_TEST_KEY_PASSWORD',None);password=None;secrets.clear()
    apk=W/'storage-smoke.apk';signature=run('signature',[J/'java.exe','-jar',SDK/'lib/apksigner.jar','verify','--verbose','--print-certs',apk]);assert '48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83' in signature
    run('zipalign',[SDK/'zipalign.exe','-c','-P','16','-v','4',apk]);badging=run('badging',[SDK/'aapt2.exe','dump','badging',apk]);assert "package: name='"+PACKAGE+"'" in badging and 'uses-permission' not in badging
    xml=run('manifest',['cmd.exe','/d','/c',TOOLS/'sdk/cmdline-tools/latest/bin/apkanalyzer.bat','manifest','print',apk]);tree=ET.fromstring(xml);a='{http://schemas.android.com/apk/res/android}'
    assert tree.attrib['package']==PACKAGE and a+'sharedUserId' not in tree.attrib
    assert tree.find('uses-sdk').attrib[a+'minSdkVersion']=='24' and tree.find('uses-sdk').attrib[a+'targetSdkVersion']=='36'
    assert not tree.findall('uses-permission') and not tree.findall('permission') and not tree.findall('uses-permission-sdk-23')
    app=tree.find('application');assert all(app.attrib[a+n]=='false' for n in ['allowBackup','debuggable','usesCleartextTraffic','extractNativeLibs'])
    assert len(app.findall('activity'))==1 and not any(app.findall(n) for n in ['provider','service','receiver','activity-alias'])
    activity=app.find('activity');assert activity.attrib[a+'name']=='expo.modules.recognitioncpu.StorageSmokeActivity' and activity.attrib[a+'exported']=='true'
    assert len(activity.findall('intent-filter'))==1
    assert [(x.tag,x.attrib[a+'name']) for x in activity.find('intent-filter')]==[('action','android.intent.action.MAIN'),('category','android.intent.category.LAUNCHER')]
    spec=importlib.util.spec_from_file_location('parser',ROOT/'tools/scripts/phone-camera-proof-apk.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
    inventory=[]
    with zipfile.ZipFile(apk) as z:
        assert set(z.namelist())=={'AndroidManifest.xml','classes.dex',LIB,'assets/storage-smoke-binding.json'}
        assert hashlib.sha256(z.read(LIB)).hexdigest()==NATIVE and z.read('assets/storage-smoke-binding.json')==(W/'assets/storage-smoke-binding.json').read_bytes()
        assert all(x['compatible16KB'] for x in p.elf(z.read(LIB)))
        parsed=p.dex(z.read('classes.dex'));assert all(x.startswith('Lexpo/modules/recognitioncpu/') for x in parsed['classes'])
        assert not any(p.forbidden(x) or any(s in x for s in ['CameraProofCpu;','CameraProofAndroid;','org/tensorflow','litert']) for x in parsed['typeReferences'])
        native=[x for x in parsed['nativeMethods'] if x['className']=='Lexpo/modules/recognitioncpu/CameraProofRename;'];assert len(native)==1 and native[0]['method']=='publishNative' and native[0]['static']
        assert not any(x.endswith('.tflite') or x.startswith('lib/') and x!=LIB for x in z.namelist())
        for name in z.namelist():p.safe_name(name);data=z.read(name);inventory.append(dict(path=name,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
    assert apk.stat().st_size<512*1024
    live();assert inputs()==(W/'source-index.json').read_bytes()
    put('apk-inventory.json',inventory)
    result=dict(atUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(),apkSha256=sha(apk),apkBytes=apk.stat().st_size,package=PACKAGE,sourceIndexSha256=sha(W/'source-index.json'),reviewedProductionSourceSha256=PRODUCTION,productionSourceCopies=9,manifestSha256=sha(W/'AndroidManifest.xml'),nativeSha256=NATIVE,nativeBytes=7656,nativeReusedExactNotLinked=True,signatureSameInternalTestCertificate=True,permissions=[],components={'launcherActivities':1,'providers':0,'services':0,'receivers':0},backup=False,cleartext=False,debuggable=False,sharedUid=False,abi='arm64-v8a',minSdk=24,targetSdk=36,zipAndElf16KiB=True,dexClasses=len(parsed['classes']),nativeMethods=native,camera=False,model=False,network=False,mainPackageDataAccess=False,installed=False,installApproval=False,executed=False,generatedLogicalFixtureCapBytes=262144,resultCapBytes=32768,batchDeadlineBetweenOperationsMs=30000,kernelIoNotForciblyPreempted=True,plannedStarts='one new generated batch; at most one reviewed new-process read-only reopen',overallBuildDeadlineSeconds=180)
    put('build-result.json',result);print(json.dumps(result))
if __name__=='__main__':
    if sys.argv[1:] == ['prepare']:prepare()
    elif sys.argv[1:] == ['build']:build()
    else:raise ValueError('Explicit prepare/build required')
