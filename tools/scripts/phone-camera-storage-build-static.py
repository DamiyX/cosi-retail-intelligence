"""Gate A exact APK closure. No installation, phone, inference or runtime acceptance."""
import hashlib, importlib.util, json, pathlib, re, struct, subprocess, zipfile

ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('storage_build',pathlib.Path(__file__).with_name('phone-camera-storage-build.py'))
g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
spec=importlib.util.spec_from_file_location('apk_parser',pathlib.Path(__file__).with_name('phone-camera-proof-apk.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
W=g.W;APK=W/'recognition-camera-storage-release.apk';OLD=g.C5/'recognition-camera-diagnostic-release.apk'
LIB='lib/arm64-v8a/libcamera_proof_publish.so'
JNI='Java_expo_modules_recognitioncpu_CameraProofRename_publishNative'

def digest(data):return hashlib.sha256(data).hexdigest()
def run(name,args):
    receipt=W/(name+'.json');command=[str(x) for x in args]
    if receipt.exists():
        old=g.read(receipt);assert old['command']==command and old['exitCode']==0;return old['stdout']
    result=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',errors='replace')
    g.put(name+'.json',dict(command=command,exitCode=result.returncode,stdout=result.stdout,stderr=result.stderr))
    assert result.returncode==0,name
    return result.stdout
def section(data,name):
    offset=struct.unpack_from('<Q',data,40)[0];width,count,strings=struct.unpack_from('<HHH',data,58);assert width==64
    rows=[struct.unpack_from('<IIQQQQIIQQ',data,offset+i*width) for i in range(count)]
    names=data[rows[strings][4]:rows[strings][4]+rows[strings][5]]
    matches=[r for r in rows if names[r[0]:].split(b'\0',1)[0]==name.encode()];assert len(matches)==1,name
    r=matches[0];return r[4],r[5]
def note(data,name,vendor,kind):
    pos,length=section(data,name);end=pos+length;found=[]
    while pos<end:
        n,d,t=struct.unpack_from('<III',data,pos);pos+=12;v=data[pos:pos+n];pos+=(n+3)&~3
        if v==vendor and t==kind:found.append((pos,d))
        pos+=(d+3)&~3
    assert len(found)==1;return found[0]
def only_buildid(a,b):
    x,n=note(a,'.note.gnu.build-id',b'GNU\0',3);y,m=note(b,'.note.gnu.build-id',b'GNU\0',3);assert x==y and n==m
    aa=bytearray(a);bb=bytearray(b);aa[x:x+n]=bytes(n);bb[y:y+m]=bytes(m);return aa==bb
def artifacts(path):
    rows={}
    for project,configs in g.read(path).items():
        for scope,value in configs.items():
            for item in value['artifacts']:
                key=(project,scope,item['coordinate']);assert key not in rows or rows[key]==item['sha256'];rows[key]=item['sha256']
    return rows
def prototype(data,parsed,number):
    count,offset=struct.unpack_from('<II',data,72);assert number<count
    _,ret,params=struct.unpack_from('<III',data,offset+12*number);types=parsed['typeReferences'];args=[]
    if params:
        n=struct.unpack_from('<I',data,params)[0]
        args=[types[struct.unpack_from('<H',data,params+4+2*i)[0]] for i in range(n)]
    return '('+''.join(args)+')'+types[ret]
def main():
    g.preserve();assert g.read(W/'gradle-release.json')['exitCode']==0
    assert g.sha(APK)==g.read(W/'built-apk.json')['sha256']
    assert g.sha(OLD)=='d23ce001b944c8a503848b44273dcc246a57db2d0f89fbe99cff94f3f2175a69'
    sdk=g.TOOLS/'sdk/build-tools/36.0.0'
    signature=run('signature',[g.TOOLS/'jdk17/bin/java.exe','-jar',sdk/'lib/apksigner.jar','verify','--verbose','--print-certs',APK])
    assert '48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83' in signature
    run('zipalign',[sdk/'zipalign.exe','-c','-P','16','-v','4',APK])
    badging=run('badging',[sdk/'aapt2.exe','dump','badging',APK]);p.badging_sdk(badging)
    inventory=[];native=[];changed=[];dex=[];new_types=set();all_strings=set();native_method_found=[]
    with zipfile.ZipFile(APK) as current,zipfile.ZipFile(OLD) as old:
        names=current.namelist();assert len(names)==len(set(names));assert set(names)==set(old.namelist())|{LIB},'Unexpected added/removed payload'
        assert current.read('AndroidManifest.xml')==old.read('AndroidManifest.xml'),'Permission/component/SDK/network/backup delta'
        old_libs={n for n in old.namelist() if n.startswith('lib/')};assert len(old_libs)==17 and LIB not in old_libs
        assert {n for n in names if n.startswith('lib/')}==old_libs|{LIB}
        apk_bytes=APK.read_bytes()
        for info in current.infolist():
            p.safe_name(info.filename);data=current.read(info);previous=old.read(info.filename) if info.filename in old.namelist() else None
            inventory.append(dict(path=info.filename,bytes=len(data),sha256=digest(data)))
            if data!=previous:changed.append(info.filename)
            if info.filename.startswith('assets/dexopt/'):
                assert info.filename in ['assets/dexopt/baseline.prof','assets/dexopt/baseline.profm']
                kind='binary_art_profile' if info.filename.endswith('.prof') else 'binary_art_profile_metadata'
                generated=g.APP/'android/app/build/intermediates'/kind/'release/compileReleaseArtProfile'/pathlib.PurePosixPath(info.filename).name
                assert data==g.ex(generated).read_bytes(),'ART output differs from generated artifact'
            elif info.filename.startswith('assets/') and info.filename!='assets/index.android.bundle':assert data==previous,info.filename
            if info.filename.endswith('.dex'):
                parsed=p.dex(data);assert not any(p.forbidden(s) for s in parsed['classes']+parsed['typeReferences'])
                assert not any('CameraProofDurabilityChecks' in s or 'CameraProofRecoveryChecks' in s for s in parsed['classes'])
                new_types.update(parsed['typeReferences']);all_strings.update(parsed['strings'])
                for method in parsed['nativeMethods']:
                    if method['className']=='Lexpo/modules/recognitioncpu/CameraProofRename;':
                        assert method['method']=='publishNative' and method['static'] and prototype(data,parsed,method['prototype'])=='(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;[J)J'
                        native_method_found.append(method)
                dex.append(dict(path=info.filename,sha256=digest(data),classes=len(parsed['classes']),nativeMethods=len(parsed['nativeMethods'])))
            if info.filename.startswith('lib/'):
                assert info.filename.startswith('lib/arm64-v8a/') and info.filename.endswith('.so')
                loads=p.elf(data);assert all(x['compatible16KB'] for x in loads)
                a,b=struct.unpack_from('<HH',apk_bytes,info.header_offset+26);offset=info.header_offset+30+a+b
                assert info.compress_type==zipfile.ZIP_STORED and offset%16384==0
                if info.filename!=LIB and data!=previous:assert only_buildid(data,previous),'Existing library changed beyond GNU build ID: '+info.filename
                native.append(dict(path=info.filename,bytes=len(data),sha256=digest(data),zipDataOffset=offset,new=info.filename==LIB))
                if info.filename==LIB:
                    so=W/'libcamera_proof_publish.so'
                    with so.open('xb') as f:f.write(data)
                    pos,length=note(data,'.note.android.ident',b'Android\0',1);assert length>=4 and struct.unpack_from('<I',data,pos)[0]==24,'Native DSO min SDK differs'
        assert len(native)==18 and len(native_method_found)==1
        bundle=g.APP/'android/app/build/generated/assets/react/release/index.android.bundle';assert digest(current.read('assets/index.android.bundle'))==g.sha(bundle)
        assert all(x.endswith('.dex') or x in ['assets/index.android.bundle','assets/dexopt/baseline.prof','assets/dexopt/baseline.profm'] or x.startswith('lib/') for x in changed)
    assert 'CAMERA_PUBLISH_API_UNSUPPORTED' in all_strings and 'CAMERA_PUBLISH_ADAPTER_UNAVAILABLE' in all_strings
    assert artifacts(W/'resolved-artifacts.json')==artifacts(g.C5/'resolved-artifacts.json'),'External dependency/artifact change'
    llvm=g.TOOLS/'sdk/ndk/27.1.12297006/toolchains/llvm/prebuilt/windows-x86_64/bin/llvm-readelf.exe';so=W/'libcamera_proof_publish.so'
    dynamic=run('new-native-dynamic',[llvm,'--dynamic','--wide',so]);symbols=run('new-native-symbols',[llvm,'--dyn-syms','--wide',so]);versions=run('new-native-versions',[llvm,'--version-info',so])
    needed=re.findall(r'\(NEEDED\).*?\[([^\]]+)\]',dynamic);assert set(needed) in [{'libc.so','libdl.so'},{'libc.so','libdl.so','libm.so'}],needed
    assert 'libc++' not in dynamic and 'renameat2' not in symbols
    assert JNI in symbols and re.search(r'\bUND\b[^\n]*\bdlsym(?:@|\b)',symbols)
    version_names=set(re.findall(r'Name: (LIBC[A-Z_0-9]*)\b',versions));assert version_names<= {'LIBC','LIBC_N'},version_names
    run('startup-closure',[g.NODE,W/'metro-observer.cjs','verify'])
    graphs=list(W.glob('metro-graph-*.json'));assert len(graphs)==1
    graph=g.read(graphs[0]);assert graphs[0].stem=='metro-graph-'+g.sha(graphs[0])
    for row in graph['modules']+graph['premodules']:
        if row['sourceSha256']:assert g.sha(pathlib.Path(row['path']))==row['sourceSha256'],row['path']
    g.put('apk-inventory.json',inventory)
    summary=dict(apkSha256=g.sha(APK),bytes=APK.stat().st_size,reviewedSourceSha256=g.sha(W/'source-index.json'),buildInputSha256=g.sha(W/'build-inputs.json'),manifestByteExactC5=True,signatureSameInternalTestCertificate=True,nativeLibraries=native,exactNewLibrary=LIB,old17LibrariesExactExceptBuildId=True,newLibraryNeeded=needed,newLibraryVersionRequirements=sorted(version_names),nativeDsoMinSdk=24,noDirectRenameat2Import=True,jniExport=JNI,jniMethod=native_method_found,existingAssetsExactExceptBundleAndGeneratedArt=True,externalArtifactsExactC5=True,changedPayloads=changed,zipPayloads=len(inventory),dex=dex,uniqueTypes=len(new_types),metroModules=len(graph['modules']),metroPremodules=len(graph['premodules']),runtimeDlsymAndSdkGuard='reviewed source and compiled packaging, not API24 device proof',actualAndroidStorageOrCamera='UNVERIFIED',legacyOwnerDoesNotCoverRepairedCode=True)
    g.put('static-review.json',summary);g.preserve()
    print(json.dumps({k:summary[k] for k in ['apkSha256','bytes','zipPayloads','changedPayloads','newLibraryNeeded','newLibraryVersionRequirements','metroModules','metroPremodules']}))
if __name__=='__main__':main()
