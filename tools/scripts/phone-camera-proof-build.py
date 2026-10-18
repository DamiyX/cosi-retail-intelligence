"""P2 G3 exact offline shadow build support; no installed/source repair or download."""
import datetime, hashlib, io, json, os, pathlib, stat, subprocess, sys, zipfile
ROOT=pathlib.Path('C:/Users/doyew/Documents/DEV 2/COSI-m8-planning')
META=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c4-20261018-a1'
WRITER=META/'writer'
STAGE=pathlib.Path('C:/Users/doyew/.cache/cosi-p2-camera-g3-c4-20261018-a1')
APP=STAGE/'app'
TOOLS=pathlib.Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1')
NODE=pathlib.Path('C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe')
LEASE={'holder':'01a1051f-0777-7573-ad09-0e550a4bd56a','expires_at':'2026-10-18T08:35:19.472Z'}
def ext(p):return pathlib.Path('\\\\?\\'+str(p))
def read(p):return json.loads(ext(p).read_text(encoding='utf-8'))
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p):
 with ext(p).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def put(p,value):
 with ext(p).open('x',encoding='utf-8') as f:json.dump(value,f,indent=2);f.write('\n')
def live():
 assert not (WRITER/'writer-stopped.json').exists(),'STOP is immutable'
 assert read(ROOT/'.agents/workflows/recognition-track-b.json')['lease']==LEASE
 assert datetime.datetime.now(datetime.timezone.utc)<datetime.datetime.fromisoformat(LEASE['expires_at'])
def dispatch_bindings():
 path=WRITER/'coordinator-dispatch-bindings.json'
 assert sha(path)=='b50f406e4b1daa149ff21e6f3ac1f324a92ea376d3d5c526ba409a55c6ad7461'
 data=read(path);assert data['lease']==LEASE
 for authority in data['authority']:assert sha(pathlib.Path(authority['path']))==authority['sha256']
 rows=data['coordinatorDeltas'];assert len(rows)==2 and {r['path'] for r in rows}=={'.agents/workflows/recognition-track-b.json','docs/engineering/PROJECT_STATE.md'}
 baseline={r['path']:r for r in read(META/'coordinator-source-before.json')}
 for row in rows:
  assert baseline[row['path']]['sha256']==row['originalSha256']
  assert sha(ROOT/row['path'])==row['dispatchSha256']==sha(pathlib.Path(row['snapshot']))
  assert ext(ROOT/row['path']).stat().st_size==row['bytes']
 return {r['path']:r['dispatchSha256'] for r in rows}

def verify():
 live();dispatched=dispatch_bindings();counts={}
 allowed={r['path'] for r in read(META/'coordinator-writable-before.json')}
 for name,n in [('source',972),('installed-inputs',2995),('native-assets',104),('frozen-evidence',6874)]:
  rows=read(META/f'coordinator-{name}-before.json') if name!='frozen-evidence' else read(META/'coordinator-frozen-evidence.json')
  assert len(rows)==n,(name,len(rows))
  for row in rows:
   if name=='source' and row['path'] in allowed:continue
   p=ROOT/row['path']
   if row.get('kind')=='reparse':
    target=os.readlink(ext(p));assert target==row['target'] and hashlib.sha256(target.encode()).hexdigest()==row['sha256'],row['path']
   else:
    assert sha(p)==(dispatched[row['path']] if name=='source' and row['path'] in dispatched else row['sha256']),row['path']
    if 'bytes' in row and not (name=='source' and row['path'] in dispatched):assert ext(p).stat().st_size==row['bytes'],row['path']
  counts[name]=len(rows)
 return counts
def files(root):
 for current,dirs,names in os.walk(ext(root),followlinks=False):
  dirs[:]=[d for d in dirs if d not in ['build','.gradle','.cxx','.kotlin']]
  for d in list(dirs):
   assert not os.lstat(pathlib.Path(current)/d).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT, 'Unexpected input reparse'
  for name in names:
   p=pathlib.Path(current)/name
   assert not os.lstat(p).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT
   yield pathlib.Path(str(p).removeprefix('\\\\?\\'))
def generated_paths():
 paths=[]
 modules=['expo/android','expo-constants/android','expo-modules-core/android','expo-camera/android']
 plugins=['@react-native/gradle-plugin','@react-native/gradle-plugin/react-native-gradle-plugin','@react-native/gradle-plugin/settings-plugin','@react-native/gradle-plugin/shared','@react-native/gradle-plugin/shared-testutil','expo-modules-core/expo-module-gradle-plugin','expo-modules-autolinking/android/expo-gradle-plugin']
 plugins += ['expo-modules-autolinking/android/expo-gradle-plugin/'+n for n in ['expo-autolinking-plugin','expo-autolinking-settings-plugin','expo-autolinking-plugin-shared','expo-max-sdk-override-plugin']]
 for rel in modules:
  paths += ['node_modules/'+rel+'/'+n for n in ['build','.gradle','.cxx']]
 for rel in plugins:
  paths += ['node_modules/'+rel+'/'+n for n in ['build','.gradle','.kotlin']]
 return sorted(set(paths))
def installed_tree():
 roots=['@react-native/gradle-plugin','expo-camera','expo-constants','expo-modules-core','expo','react-native','expo-modules-autolinking']
 ignored=set(generated_paths());rows=[]
 def row(p,rel):
  info=os.lstat(ext(p))
  if info.st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT:
   target=os.readlink(ext(p));return dict(path=rel,kind='reparse',target=target,sha256=hashlib.sha256(target.encode()).hexdigest())
  return dict(path=rel,bytes=info.st_size,sha256=sha(p))
 for name in roots:
  for current,dirs,names in os.walk(ext(ROOT/'node_modules'/name),followlinks=False):
   parent=pathlib.Path(str(current).removeprefix('\\\\?\\'))
   for d in list(dirs):
    p=parent/d;rel=p.relative_to(ROOT).as_posix()
    if rel in ignored:dirs.remove(d)
    elif os.lstat(ext(p)).st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT:rows.append(row(p,rel));dirs.remove(d)
   for name in names:
    p=parent/name;rows.append(row(p,p.relative_to(ROOT).as_posix()))
 return sorted(rows,key=lambda r:r['path'])
def initialize():
 baseline=verify();assert not STAGE.exists(),'Fresh exact task stage required';STAGE.mkdir();APP.mkdir()
 assert (WRITER/'helpers-before-index.json').is_file(),'Original writable helper bytes must be captured first'
 put(WRITER/'staging-baseline-verification.json',dict(createdUtc=now(),counts=baseline,lease=LEASE,sourceReadOnly=True,routerGap='No adjacent GLOBAL_MEMORY.md or .agents/GLOBAL_MEMORY.md; explicit dispatch used.'))
 put(WRITER/'generated-output-ceiling.json',dict(createdUtc=now(),paths=[dict(path=p,existed=(ROOT/p).exists()) for p in generated_paths()],cacheGenerated=str(TOOLS/'gradle/caches'),staging=str(STAGE),oldAndroidReadOnly=True,sourceWritesAllowed=False))
 inputs=[ROOT/'apps/mobile'/n for n in ['app.config.ts','package.json','recognition-entry.js','tsconfig.json']]
 for rel in ['plugins','src/recognitionExperiment','recognition-native']:
  for p in files(ROOT/'apps/mobile'/rel):
   relative=p.relative_to(ROOT/'apps/mobile').as_posix()
   if any(n in p.relative_to(ROOT/'apps/mobile'/rel).parts for n in ['build','.gradle','.cxx','.kotlin']):continue
   inputs.append(p)
 index=[]
 for p in sorted(inputs):
  rel=p.relative_to(ROOT/'apps/mobile');dest=APP/rel;ext(dest.parent).mkdir(parents=True,exist_ok=True)
  with ext(dest).open('xb') as f:f.write(ext(p).read_bytes())
  assert sha(p)==sha(dest)
  index.append(dict(source=p.relative_to(ROOT).as_posix(),staged=dest.relative_to(STAGE).as_posix(),bytes=ext(p).stat().st_size,sha256=sha(p)))
 put(WRITER/'staged-input-index.json',index)
 original=read(APP/'package.json');selected=json.loads(json.dumps(original))
 selected.setdefault('expo',{}).setdefault('autolinking',{}).setdefault('android',{})['buildFromSource']=['^expo-camera$']
 selected['expo']['autolinking']['android']['searchPaths']=['../camera-packages']
 for field in ['dependencies','devDependencies','peerDependencies','version']:assert selected.get(field)==original.get(field)
 before=ext(APP/'package.json').read_bytes();after=(json.dumps(selected,indent=2)+'\n').encode()
 ext(APP/'package.json').write_bytes(after)
 put(WRITER/'staged-source-selection-delta.json',dict(approvedPaths=['expo.autolinking.android.buildFromSource','expo.autolinking.android.searchPaths'],value=['^expo-camera$'],searchPaths=['../camera-packages'],beforeSha256=hashlib.sha256(before).hexdigest(),afterSha256=hashlib.sha256(after).hexdigest(),dependencyVersionFieldsExact=True,original=original,staged=selected,repositoryPackageUnchanged=True))
 command=['cmd.exe','/d','/c','mklink','/J',str(APP/'node_modules'),str(ROOT/'node_modules')]
 result=subprocess.run(command,capture_output=True,text=True,cwd=ROOT)
 assert result.returncode==0,result.stderr
 target=os.readlink(APP/'node_modules');assert pathlib.Path(target.removeprefix('\\\\?\\')).resolve()==(ROOT/'node_modules').resolve()
 put(WRITER/'node-modules-junction.json',dict(command=command,exitCode=result.returncode,target=target,sha256=hashlib.sha256(target.encode()).hexdigest(),traverseDuringFreeze=False))
 print(json.dumps(dict(stagedFiles=len(index),stagedBytes=sum(r['bytes'] for r in index),baseline=baseline)))
def environment():
 e=os.environ.copy()
 e.update(EXPO_OFFLINE='1',EXPO_NO_TELEMETRY='1',CI='1',NODE_ENV='production',EXPO_PUBLIC_APP_ENV='recognition-verification',COSI_RECOGNITION_EXPERIMENT='1',COSI_SCANNER_VERIFICATION='0',EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF='1',JAVA_HOME=str(TOOLS/'jdk17'),ANDROID_HOME=str(TOOLS/'sdk'),ANDROID_SDK_ROOT=str(TOOLS/'sdk'),GRADLE_USER_HOME='C:/p1g-20261012-a1',COSI_P1_CXX_ROOT=str(STAGE/'cxx'),COSI_P1_RUN=str(WRITER))
 e['PATH']=str(NODE.parent)+';'+str(TOOLS/'jdk17/bin')+';'+e['PATH']
 return e
def command(name,command,cwd,env=None):
 live();assert not (WRITER/(name+'.json')).exists()
 start=now();r=subprocess.run([str(v) for v in command],cwd=cwd,env=env or environment(),capture_output=True,text=True,encoding='utf-8',errors='replace')
 put(WRITER/(name+'.json'),dict(command=[str(v) for v in command],cwd=str(cwd),started=start,ended=now(),exitCode=r.returncode,stdout=r.stdout,stderr=r.stderr,phoneModelExecuted=False))
 print(json.dumps(dict(name=name,exitCode=r.returncode,stdout=r.stdout[-2500:],stderr=r.stderr[-2500:])))
 return r
def prebuild():
 verify();r=command('prebuild-a1',[NODE,ROOT/'node_modules/expo/bin/cli','prebuild','--platform','android','--no-install'],APP)
 assert r.returncode==0,'Prebuild blocker retained'
 original=read(WRITER/'staged-source-selection-delta.json')['staged'];current=read(APP/'package.json')
 for key in set(original)|set(current):
  if key!='scripts':assert original.get(key)==current.get(key),('Unexpected shadow package change',key)
 put(WRITER/'generated-package-delta.json',dict(before=original['scripts'],after=current['scripts'],dependencyAndVersionFieldsExact=True))
 before=ext(APP/'android/gradle/wrapper/gradle-wrapper.properties').read_bytes();accepted=ext(ROOT/'apps/mobile/android/gradle/wrapper/gradle-wrapper.properties').read_bytes()
 assert b'gradle-9.3.1-bin.zip' in before and b'b266d5ff6b90eada6dc3b20cb090e3731302e553a27c5d3e4df1f0d76beaff06' in accepted
 put(WRITER/'generated-wrapper-delta.json',dict(before=before.decode(),accepted=accepted.decode(),reason='Bind fresh generated wrapper to accepted exact distribution checksum',acceptedSource='apps/mobile/android/gradle/wrapper/gradle-wrapper.properties',sha256=hashlib.sha256(accepted).hexdigest()))
 ext(APP/'android/gradle/wrapper/gradle-wrapper.properties').write_bytes(accepted)
 print('PASS fresh generated package/dependency equivalence and checksum-bound wrapper')
def toolchain():
 live();prior=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-native-build-20261012-a1';verified=[]
 selected={
 'OpenJDK17U-jdk_x64_windows_hotspot_17.0.20.1_1.zip':(TOOLS/'jdk17',['bin/java.exe','bin/javac.exe','bin/keytool.exe','release']),
 'build-tools_r36_windows.zip':(TOOLS/'sdk/build-tools/36.0.0',['aapt2.exe','zipalign.exe','apksigner.bat','lib/apksigner.jar','source.properties']),
 'platform-36_r02.zip':(TOOLS/'sdk/platforms/android-36',['android.jar','source.properties']),
 'cmake-3.22.1-windows.zip':(TOOLS/'sdk/cmake/3.22.1',['bin/cmake.exe','bin/ninja.exe','source.properties']),
 'android-ndk-r27b-windows.zip':(TOOLS/'sdk/ndk/27.1.12297006',['source.properties','toolchains/llvm/prebuilt/windows-x86_64/bin/clang.exe']),
 }
 for name,(installed,needed) in selected.items():
  receipt=read(prior/'metadata'/(name+'.receipt.json'));archive=prior/'downloads'/name
  assert sha(archive)==receipt['sha256']
  rows=[]
  with zipfile.ZipFile(archive) as z:
   for rel in needed:
    matches=[n for n in z.namelist() if n.endswith('/'+rel) or n==rel];assert len(matches)==1,(name,rel,matches)
    expected=hashlib.sha256(z.read(matches[0])).hexdigest();assert sha(installed/rel)==expected,(name,rel)
    rows.append(dict(path=str(installed/rel),archiveMember=matches[0],sha256=expected))
  verified.append(dict(archive=str(archive),bytes=archive.stat().st_size,sha256=receipt['sha256'],receipt=str(prior/'metadata'/(name+'.receipt.json')),selectedInstalledBytesExact=rows))
 gradleArchive=prior/'downloads/gradle-9.3.1-bin.zip';assert sha(gradleArchive)=='b266d5ff6b90eada6dc3b20cb090e3731302e553a27c5d3e4df1f0d76beaff06'
 gradle=list((TOOLS/'gradle/wrapper/dists/gradle-9.3.1-bin').glob('*/gradle-9.3.1'));assert len(gradle)==1
 gradleRows=[]
 with zipfile.ZipFile(gradleArchive) as z:
  for item in z.infolist():
   if item.is_dir():continue
   rel=pathlib.PurePosixPath(item.filename).relative_to('gradle-9.3.1');p=gradle[0]/rel
   expected=hashlib.sha256(z.read(item)).hexdigest();assert sha(p)==expected,str(rel)
   gradleRows.append(dict(path=str(p),bytes=ext(p).stat().st_size,sha256=expected))
 cache=[]
 for directory,dirs,names in os.walk(ext(TOOLS/'gradle/caches/modules-2/files-2.1'),followlinks=False):
  for name in names:
   p=pathlib.Path(str(pathlib.Path(directory)/name).removeprefix('\\\\?\\'))
   if p.suffix in ['.jar','.aar','.pom','.module']:cache.append(dict(path=str(p),bytes=ext(p).stat().st_size,sha256=sha(p)))
 put(WRITER/'cache-artifacts-before.json',cache)
 put(WRITER/'toolchain-verification.json',dict(createdUtc=now(),acceptedArchiveBindings=verified,gradleDistributionSha256=sha(gradleArchive),gradleInstalled=gradleRows,node=dict(path=str(NODE),bytes=NODE.stat().st_size,sha256=sha(NODE)),signer=dict(path=str(TOOLS/'recognition-test.jks'),exists=(TOOLS/'recognition-test.jks').is_file(),credentialContentRecorded=False),cacheArtifactCount=len(cache),cachedArtifactsMutable=False))
 print(json.dumps(dict(archiveBindings=len(verified),gradleInstalledFiles=len(gradleRows),cacheArtifactCount=len(cache))))
def toolchain_reuse():
 live();prior=ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c1-20261016-a1/writer/toolchain-verification.json';data=read(prior)
 rows=[r for archive in data['acceptedArchiveBindings'] for r in archive['selectedInstalledBytesExact']]+data['gradleInstalled']+[data['node']]
 for row in rows:assert sha(pathlib.Path(row['path']))==row['sha256'],row['path']
 assert data['gradleDistributionSha256']=='b266d5ff6b90eada6dc3b20cb090e3731302e553a27c5d3e4df1f0d76beaff06'
 data['reverifiedUtc']=now();data['priorEvidence']=dict(path=str(prior),sha256=sha(prior),inputByteRowsReverified=len(rows),archivesNotRehashed=True)
 put(WRITER/'toolchain-verification.json',data)
 cache=read(META/'coordinator-cache-artifacts-before.json')
 for row in cache:assert sha(pathlib.Path(row['path']))==row['sha256']
 put(WRITER/'cache-artifacts-before.json',cache)
 print(json.dumps(dict(currentToolchainInputRows=len(rows),oldCacheArtifacts=len(cache))))
def gradle(selection=False,attempt='a1'):
 assert attempt in ['a1','a2'],'C2 initial attempt or preserved understood inspection-helper correction only'
 verify();assert (WRITER/'toolchain-verification.json').is_file()
 assert sha(APP/'android/app/src/main/AndroidManifest.xml')==read(WRITER/'manifest-overlay.json')['afterSha256']
 if not selection:assert read(WRITER/'startup-import-counterfactual.json')['importCounterfactualVerified'] and read(WRITER/'focused-existing-source-checks.json')['exitCode']==0 and read(WRITER/'types-a1.json')['exitCode']==0 and read(WRITER/'lint-a1.json')['exitCode']==0
 if not selection:assert all((WRITER/name).is_file() for name in ['camera-derivative-index.json','c1-cache-reuse.json','source-selection-proof.json','derivative-helper-checks-a3.json','jvm-negative-a2/execution.json']),'Verified derivative, focused checks, actual source exclusion and exact cache reuse required'
 init=WRITER/(('inspect.init.gradle' if attempt=='a1' else 'inspect-'+attempt+'.init.gradle') if selection else 'release-'+attempt+'.init.gradle')
 text='''import groovy.json.JsonOutput
allprojects { p ->
  if (p.name == 'app') {
    p.tasks.register('p2BuildInputs') {
      doLast {
        def rows=p.rootProject.allprojects.collect { q ->
          [name:q.path,projectDir:q.projectDir.absolutePath,buildDir:q.layout.buildDirectory.get().asFile.absolutePath,
           kotlinReleaseSources:q.tasks.findByName('compileReleaseKotlin')?.sources?.files?.collect { it.absolutePath },
           configurations:q.configurations.collect { c -> [name:c.name,canBeResolved:c.canBeResolved,dependencies:c.allDependencies.collect { d -> [group:d.group,name:d.name,version:d.version] }] }]
        }
        new File(System.getenv('COSI_P1_RUN'),System.getenv('COSI_SELECTION_OUTPUT')).text=JsonOutput.prettyPrint(JsonOutput.toJson(rows))+'\\n'
      }
    }
    p.tasks.register('p2ResolvedArtifacts') {
      doLast {
        def rows=['app','recognition-experiment','recognition-cpu-runtime','expo-camera'].collectEntries { name ->
          def subject=p.rootProject.project(':'+name)
          [(name):['releaseCompileClasspath','releaseRuntimeClasspath'].collectEntries { config ->
            def scope=subject.configurations.getByName(config)
            def result=scope.incoming.resolutionResult
            def view=scope.incoming.artifactView { componentFilter { it instanceof org.gradle.api.artifacts.component.ModuleComponentIdentifier } }.artifacts
            [(config):[graph:result.allDependencies.collect { d -> d.toString() },components:result.allComponents.collect { c -> [coordinate:c.moduleVersion?.toString(),id:c.id.displayName,variants:c.variants.collect { v -> [name:v.displayName,attributes:v.attributes.keySet().collectEntries { k -> [(k.name):v.attributes.getAttribute(k).toString()] }] }] },artifacts:view.artifacts.collect { a ->
              def external=true
              def file=a.file
              def digest=null
              if(external) { assert file.isFile(); def hash=java.security.MessageDigest.getInstance('SHA-256'); file.withInputStream { stream -> byte[] b=new byte[1048576]; int n; while((n=stream.read(b))!=-1) hash.update(b,0,n) }; digest=hash.digest().encodeHex().toString() }
              [coordinate:a.id.componentIdentifier.displayName,path:file.absolutePath,external:external,exists:file.isFile(),bytes:file.isFile()?file.length():null,sha256:digest]
            }]]
          }]
        }
        new File(System.getenv('COSI_P1_RUN'),'resolved-artifacts.json').text=JsonOutput.prettyPrint(JsonOutput.toJson(rows))+'\\n'
      }
    }
  }
}
'''
 text="allprojects { p -> def fixed=p.repositories.maven { name='C1ReviewedFixedCache'; url=uri(System.getenv('COSI_C1_MAVEN')) }; p.repositories.remove(fixed);p.repositories.addFirst(fixed) }\n"+text
 with ext(init).open('x',encoding='utf-8') as f:f.write(text)
 e=environment()
 e['COSI_SELECTION_OUTPUT']='gradle-project-inputs'+('-a2' if selection and attempt=='a2' else '')+'.json'
 password=ext(TOOLS/'test-signing-password.txt').read_text(encoding='utf-8')
 assert password and (TOOLS/'recognition-test.jks').is_file()
 e.update(COSI_TEST_KEYSTORE=str(TOOLS/'recognition-test.jks'),COSI_TEST_STORE_PASSWORD=password,COSI_TEST_KEY_PASSWORD=password)
 e['COSI_C1_MAVEN']='C:/Users/doyew/.cache/cosi-p2-camera-g3-c1-20261016-a1/maven'
 tasks=[':app:p2BuildInputs',':app:processReleaseMainManifest'] if selection else [':recognition-cpu-runtime:compileReleaseJavaWithJavac',':recognition-experiment:compileReleaseKotlin',':expo-camera:compileReleaseKotlin',':app:p2ResolvedArtifacts',':app:assembleRelease',':app:dependencies','--configuration','releaseRuntimeClasspath']
 args=['cmd.exe','/d','/c','gradlew.bat',*tasks,'--init-script',str(init),'--offline','--no-daemon','--console=plain','--max-workers=2']
 receipt='gradle-selection-'+attempt+'.json' if selection else 'gradle-release-'+attempt+'.json'
 live();assert not (WRITER/receipt).exists();start=now()
 try:
  r=subprocess.run(args,cwd=APP/'android',env=e,capture_output=True,text=True,encoding='utf-8',errors='replace')
  stdout,stderr=r.stdout,r.stderr
  for secret in set([password,password.strip()]):
   if secret:stdout=stdout.replace(secret,'[REDACTED]');stderr=stderr.replace(secret,'[REDACTED]')
 finally:
  e.pop('COSI_TEST_STORE_PASSWORD',None);e.pop('COSI_TEST_KEY_PASSWORD',None);password=None
 sourceStable=False;preservationError=None
 try:verify();sourceStable=True
 except BaseException as error:preservationError=str(error)
 put(WRITER/receipt,dict(command=args,cwd=str(APP/'android'),gradleCache=e['GRADLE_USER_HOME'],cxxRoot=e['COSI_P1_CXX_ROOT'],started=start,ended=now(),exitCode=r.returncode,stdout=stdout,stderr=stderr,offline=True,downloadFallback=False,ordinaryProductionSourceRepairs=False,approvedExperimentJavascriptRepair=True,acceptedNativeDerivativeUnchanged=True,derivativeIndexSha256=sha(WRITER/'camera-derivative-index.json'),secretsRecorded=False,sourceStable=sourceStable,preservationError=preservationError))
 print(json.dumps(dict(exitCode=r.returncode,stdout=stdout[-5000:],stderr=stderr[-8000:])))
 return r.returncode if sourceStable else 4
def blocker():
 live();assert not (WRITER/'source-selection-proof.json').exists(),'Prebuilt-publication blocker inspection is invalid after actual C1 source selection'
 base=ROOT/'node_modules/expo-camera/local-maven-repo/host/exp/exponent/expo.modules.camera/57.0.6'
 module=read(base/'expo.modules.camera-57.0.6.module');rows=[];variants=[]
 for variant in module['variants']:
  variants.append(dict(name=variant['name'],attributes=variant['attributes'],dependencies=variant.get('dependencies',[]),files=variant.get('files',[])))
  for d in variant.get('dependencies',[]):
   coordinate=f"{d['group']}:{d['module']}:{d['version']['requires']}"
   cache=TOOLS/'gradle/caches/modules-2/files-2.1'/d['group']/d['module']/d['version']['requires'];found=[]
   if ext(cache).exists():
    for parent,dirs,names in os.walk(ext(cache)):
     for name in names:
      p=pathlib.Path(str(pathlib.Path(parent)/name).removeprefix('\\\\?\\'));found.append(dict(name=name,bytes=ext(p).stat().st_size,sha256=sha(p)))
   rows.append(dict(variant=variant['name'],coordinate=coordinate,cached=bool(found),cachedFiles=found,neededDownloadBytes=None,sizeStatus='Unavailable from local installed metadata; no network request authorized',forbiddenRuntime=d['group'] in ['com.google.android.gms','com.google.mlkit'] or d['module']=='camera-mlkit-vision'))
 aar=base/'expo.modules.camera-57.0.6.aar';aarHash=sha(aar)
 for variant in module['variants'][:2]:assert variant['files'][0]['sha256']==aarHash and variant['files'][0]['size']==ext(aar).stat().st_size
 with zipfile.ZipFile(aar) as z:
  inventory=[dict(path=n.filename,bytes=n.file_size,sha256=hashlib.sha256(z.read(n)).hexdigest()) for n in z.infolist() if not n.is_dir()]
  manifest=z.read('AndroidManifest.xml').decode('utf-8');classes=z.read('classes.jar')
 with zipfile.ZipFile(io.BytesIO(classes)) as z:
  classNames=[n.filename for n in z.infolist() if n.filename.endswith('.class')]
 put(WRITER/'camera-publication-inspection.json',dict(createdUtc=now(),publication='host.exp.exponent:expo.modules.camera:57.0.6',moduleMetadata=dict(path=str(base/'expo.modules.camera-57.0.6.module'),sha256=sha(base/'expo.modules.camera-57.0.6.module')),pom=dict(path=str(base/'expo.modules.camera-57.0.6.pom'),sha256=sha(base/'expo.modules.camera-57.0.6.pom')),variants=variants,dependencies=rows,aar=dict(path=str(aar),bytes=ext(aar).stat().st_size,sha256=aarHash,files=inventory,manifest=manifest,classDefinitions=classNames,barcodeClassDefinitions=[n for n in classNames if 'barcode' in n.lower()]),resolvedTransitiveGraph=False,finalApkInspected=False,networkUsed=False,sourceFlag='expo.camera.barcode-scanner-enabled=false',sourceProjectSelected=False,blocker='Actual autolinking chooses prebuilt publication with forbidden runtime dependency declarations; requested source project task does not exist. No source-switch/runtime dependency change authorized.'))
 print(json.dumps(dict(publication=aarHash,aarBytes=ext(aar).stat().st_size,forbiddenRuntimeCoordinates=sorted(set(r['coordinate'] for r in rows if r['forbiddenRuntime'])),uncachedDeclaredCoordinates=sorted(set(r['coordinate'] for r in rows if not r['cached'])),transitiveClosureUnknown=True)))
def preserve():
 counts=verify();before=read(WRITER/'installed-tree-before.json');after=installed_tree();assert before==after,'Unexpected installed input tree mutation'
 cached=read(WRITER/'cache-artifacts-before.json')
 for row in cached:assert sha(pathlib.Path(row['path']))==row['sha256'],row['path']
 stageRows=read(WRITER/'staged-input-index.json');deltas=[]
 for row in stageRows:
  p=STAGE/row['staged']
  expected=read(WRITER/'staged-source-selection-delta.json')['afterSha256'] if row['staged']=='app/package.json' else row['sha256']
  if sha(p)!=expected:deltas.append(row['staged'])
 assert not deltas,('Staged accepted inputs changed',deltas)
 put(WRITER/'preservation-after.json',dict(createdUtc=now(),coordinatorCounts=counts,installedTreeRows=len(after),installedTreeExact=True,cachedArtifacts=len(cached),cachedArtifactBytesExact=True,stagedInputRows=len(stageRows),stagedAcceptedInputsExact=True,ordinaryProductionSourceReadOnly=True,authorizedExperimentSourceChanges=True,modelExecuted=False,privateImagesRead=False))
 print(json.dumps(dict(coordinatorCounts=counts,installedTreeRows=len(after),cachedArtifacts=len(cached),stagedRows=len(stageRows),allExact=True)))
def overlay():
 verify()
 import importlib.util
 source=ROOT/'tools/scripts/phone-camera-proof-build-overlay.py'
 spec=importlib.util.spec_from_file_location('overlay',source);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 manifest=APP/'android/app/src/main/AndroidManifest.xml';before=ext(manifest).read_bytes();after=module.generate(before)
 original=pathlib.Path('C:/Users/doyew/.cache/cosi-p2-camera-g3-c2-20261017-a1/app/android/app/src/main/AndroidManifest.xml')
 assert before==ext(original).read_bytes() and sha(original)==module.GENERATED_BASE_SHA256
 for name,data in [('manifest-before-overlay.xml',before),('manifest-after-overlay.xml',after)]:
  with (WRITER/name).open('xb') as f:f.write(data)
 ext(manifest).write_bytes(after);assert ext(manifest).read_bytes()==after
 put(WRITER/'manifest-overlay.json',dict(createdUtc=now(),source=str(source),helperSha256=sha(source),generatedManifest=str(manifest),beforeSha256=hashlib.sha256(before).hexdigest(),afterSha256=hashlib.sha256(after).hexdigest(),removals=list(module.LIBRARIES)+[module.VENDOR],allOtherGeneratedSemanticsExact=True,sourceOrDependencyModified=False))
 print('PASS exact four generated manifest removal directives')

def metro_observer():
 live()
 helper=ROOT/'tools/scripts/phone-camera-proof-apk-startup.cjs';target=APP/'metro.config.js'
 assert not target.exists()
 data=("const { getDefaultConfig } = require('expo/metro-config');\nconst { captureGraph } = require("+json.dumps(str(helper))+" );\nmodule.exports = getDefaultConfig(__dirname, { unstable_beforeAssetSerializationPlugins: [captureGraph] });\n").encode()
 with target.open('xb') as f:f.write(data)
 put(WRITER/'metro-observer-config.json',dict(createdUtc=now(),path=str(target),sha256=sha(target),helper=str(helper),helperSha256=sha(helper),supportedPinnedOption='unstable_beforeAssetSerializationPlugins',customSerializerReplaced=False,premodulesReturnedByIdentity=True,graphMutated=False,scope='Fresh shadow build-time observation only'))
 print('PASS generated observer uses pinned default Expo serializer with unchanged premodules')

if __name__=='__main__':
 mode=sys.argv[1]
 if mode=='initialize':initialize()
 elif mode=='overlay':overlay()
 elif mode=='metro-observer':metro_observer()
 elif mode=='verify':print(json.dumps(verify()))
 elif mode=='prebuild':prebuild()
 elif mode=='toolchain':toolchain()
 elif mode=='toolchain-reuse':toolchain_reuse()
 elif mode=='gradle':sys.exit(gradle())
 elif mode=='gradle2':sys.exit(gradle(False,'a2'))
 elif mode=='gradle3':sys.exit(gradle(False,'a3'))
 elif mode=='gradle4':sys.exit(gradle(False,'a4'))
 elif mode=='gradle5':sys.exit(gradle(False,'a5'))
 elif mode=='selection':sys.exit(gradle(True))
 elif mode=='selection2':sys.exit(gradle(True,'a2'))
 elif mode=='blocker':blocker()
 elif mode=='preserve':preserve()
 elif mode=='source-check':sys.exit(command('source-binding-a1',[sys.executable,'-B',ROOT/'tools/scripts/phone-camera-proof-build-provenance.py','check'],ROOT).returncode)
 elif mode=='installed-before':
  verify();rows=installed_tree();put(WRITER/'installed-tree-before.json',rows);print(json.dumps(dict(installedInputRows=len(rows),generatedExclusions=generated_paths(),reparseTraversal=False)))
 elif mode=='check':
  name=sys.argv[2];commands={'types':[NODE,ROOT/'node_modules/typescript/bin/tsc','--noEmit'],'lint':[NODE,ROOT/'node_modules/eslint/bin/eslint.js','.','--max-warnings=0'],'isolation':[NODE,ROOT/'node_modules/jest/bin/jest.js','--runInBand','--runTestsByPath','__tests__/recognitionExperimentCameraProofConfig.test.ts','__tests__/recognitionExperimentCameraProofIsolation.test.tsx']}
  assert name in commands;sys.exit(command(name+'-a1',commands[name],ROOT/'apps/mobile').returncode)
 elif mode=='isolation-clean':
  e=environment();e['NODE_ENV']='test'
  for key in ['EXPO_PUBLIC_APP_ENV','COSI_RECOGNITION_EXPERIMENT','COSI_SCANNER_VERIFICATION','EXPO_PUBLIC_RECOGNITION_CAMERA_PROOF']:e.pop(key,None)
  args=[NODE,ROOT/'node_modules/jest/bin/jest.js','--runInBand','--cacheDirectory',WRITER/'jest-cache-a2','--runTestsByPath','__tests__/recognitionExperimentCameraProofConfig.test.ts','__tests__/recognitionExperimentCameraProofIsolation.test.tsx']
  sys.exit(command('isolation-clean-a2',args,ROOT/'apps/mobile',e).returncode)
 else:raise ValueError('Unknown explicit G3 mode')
