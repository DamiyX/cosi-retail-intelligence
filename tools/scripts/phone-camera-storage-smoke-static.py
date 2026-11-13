"""Read-only smoke APK closure; explicitly account for AAPT's empty resource table."""
import hashlib, importlib.util, json, pathlib, struct, xml.etree.ElementTree as ET, zipfile

ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('smoke',pathlib.Path(__file__).with_name('phone-camera-storage-smoke.py'))
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
spec=importlib.util.spec_from_file_location('parser',pathlib.Path(__file__).with_name('phone-camera-proof-apk.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)

def main():
    g.live();W=g.W;apk=W/'storage-smoke.apk';assert g.inputs()==(W/'source-index.json').read_bytes()
    assert g.sha(apk)=='6df4ae966f098cd719fa80417b1da7e16232c8a60740040e7ddcc896ce72e118'
    for name in ['javac','jar','dex','manifest-link','align','sign','signature','zipalign','badging','manifest']:
        assert g.read(W/(name+'.json'))['exitCode']==0,name
    signature=g.read(W/'signature.json')['stdout'];assert '48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83' in signature
    badging=g.read(W/'badging.json')['stdout'];p.badging_sdk(badging);assert 'uses-permission' not in badging
    xml=g.read(W/'manifest.json')['stdout'];tree=ET.fromstring(xml);a='{http://schemas.android.com/apk/res/android}'
    assert tree.attrib['package']==g.PACKAGE and a+'sharedUserId' not in tree.attrib
    assert [x.tag for x in tree]==['uses-sdk','application']
    sdk=tree.find('uses-sdk');assert sdk.attrib[a+'minSdkVersion']=='24' and sdk.attrib[a+'targetSdkVersion']=='36'
    app=tree.find('application');assert all(app.attrib[a+n]=='false' for n in ['allowBackup','debuggable','usesCleartextTraffic','extractNativeLibs'])
    assert [x.tag for x in app]==['activity'];activity=app.find('activity')
    assert activity.attrib[a+'name']=='expo.modules.recognitioncpu.StorageSmokeActivity' and activity.attrib[a+'exported']=='true'
    assert [x.tag for x in activity]==['intent-filter']
    assert [(x.tag,x.attrib[a+'name']) for x in activity.find('intent-filter')]==[('action','android.intent.action.MAIN'),('category','android.intent.category.LAUNCHER')]
    inventory=[];raw=apk.read_bytes()
    with zipfile.ZipFile(apk) as z:
        assert set(z.namelist())=={'AndroidManifest.xml','resources.arsc','classes.dex',g.LIB,'assets/storage-smoke-binding.json'}
        table=z.read('resources.arsc');assert len(table)==40 and struct.unpack('<HHIIHHIIIIII',table)==(2,12,40,0,1,28,28,0,0,256,28,0),'Resource table must have zero packages and zero strings/styles'
        assert hashlib.sha256(z.read(g.LIB)).hexdigest()==g.NATIVE and len(z.read(g.LIB))==7656
        assert z.read('assets/storage-smoke-binding.json')==(W/'assets/storage-smoke-binding.json').read_bytes()
        binding=json.loads(z.read('assets/storage-smoke-binding.json'));assert binding['sourceIndexSha256']==g.sha(W/'source-index.json') and binding['nativeSha256']==g.NATIVE
        assert all(x['compatible16KB'] for x in p.elf(z.read(g.LIB)))
        info=z.getinfo(g.LIB);n,e=struct.unpack_from('<HH',raw,info.header_offset+26);offset=info.header_offset+30+n+e;assert info.compress_type==zipfile.ZIP_STORED and offset%16384==0
        parsed=p.dex(z.read('classes.dex'));assert all(x.startswith('Lexpo/modules/recognitioncpu/') for x in parsed['classes'])
        assert 'Lexpo/modules/recognitioncpu/StorageSmokeActivity;' in parsed['classes']
        assert not any(p.forbidden(x) or any(s in x for s in ['CameraProofCpu;','CameraProofAndroid;','org/tensorflow','litert','android/hardware/camera']) for x in parsed['typeReferences'])
        native=[x for x in parsed['nativeMethods'] if x['className']=='Lexpo/modules/recognitioncpu/CameraProofRename;'];assert len(native)==1 and native[0]['method']=='publishNative' and native[0]['static'] and len(parsed['nativeMethods'])==1
        for info in z.infolist():p.safe_name(info.filename);data=z.read(info);inventory.append(dict(path=info.filename,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
    assert apk.stat().st_size<512*1024;g.live();assert g.inputs()==(W/'source-index.json').read_bytes()
    g.put('apk-inventory.json',inventory)
    g.put('static-helper-binding.json',dict(helper=pathlib.Path(__file__).relative_to(ROOT).as_posix(),helperSha256=g.sha(pathlib.Path(__file__)),originalHelperSha256=g.sha(ROOT/'tools/scripts/phone-camera-storage-smoke.py'),apkUnchanged=True,apkRebuilt=False,onlyNewAllowance='40-byte AAPT resource table explicitly parsed: zero packages, strings and styles; all other payload/permission/source/JNI restrictions preserved'))
    result=dict(apkSha256=g.sha(apk),apkBytes=apk.stat().st_size,package=g.PACKAGE,sourceIndexSha256=g.sha(W/'source-index.json'),sourceInputs=len(g.read(W/'source-index.json')),reviewedProductionSourceSha256=g.PRODUCTION,productionSourceCopies=9,manifestSha256=g.sha(W/'AndroidManifest.xml'),nativeSha256=g.NATIVE,nativeBytes=7656,nativeReusedExactNotLinked=True,signatureSameInternalTestCertificate=True,permissions=[],components={'launcherActivities':1,'providers':0,'services':0,'receivers':0},backup=False,cleartext=False,debuggable=False,sharedUid=False,abi='arm64-v8a',minSdk=24,targetSdk=36,zipAndElf16KiB=True,libraryZipDataOffset=offset,emptyAaptResourceTable=True,dexClasses=len(parsed['classes']),nativeMethods=native,camera=False,model=False,network=False,mainPackageDataAccess=False,installed=False,installApproval=False,executed=False,generatedLogicalFixtureCapBytes=262144,resultCapBytes=32768,batchDeadlineBetweenOperationsMs=30000,kernelIoNotForciblyPreempted=True,plannedStarts='one new generated batch; at most one reviewed new-process read-only reopen',staticHelperBindingSha256=g.sha(W/'static-helper-binding.json'))
    g.put('build-result.json',result);print(json.dumps(result))
if __name__=='__main__':main()
