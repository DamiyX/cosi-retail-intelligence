"""Inspect the actual new signed APK, preserving original C1 source/artifacts."""
import pathlib,json,hashlib,subprocess,zipfile,re,shutil,os,sys
ROOT=pathlib.Path(__file__).resolve().parents[2];RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-audit-offline-gate-c2-20261014-a1';OLD=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-native-build-c1-20261012-a1'
TOOL=pathlib.Path(r'C:/Users/doyew/.cache/cosi-p1-20261012-a1');sha=lambda b:hashlib.sha256(b).hexdigest()
def main():
 global RUN
 if len(sys.argv)>1:RUN=pathlib.Path(sys.argv[1]).resolve()
 assert RUN.parent==ROOT/'apps/recognition-lab/runs/phone-experiment' and (RUN.name in ('p1-portability-preparation-20261012-a1','p1-portability-audit-offline-gate-c2-20261014-a1') or re.fullmatch(r'p1-portability-audit-[a-zA-Z0-9-]{1,64}',RUN.name))
 assert RUN.is_dir() and not (RUN/'stopped.json').exists(),'Frozen writer artifacts cannot be overwritten.'
 source=ROOT/'apps/mobile/android/app/build/outputs/apk/release/app-release.apk';apk=RUN/'recognition-portability-release.apk'
 if not apk.exists():shutil.copyfile(source,apk)
 assert apk.read_bytes()==source.read_bytes()
 tools=TOOL/'sdk/build-tools/36.0.0';exits={}
 for name,cmd in [('apksigner',['cmd.exe','/c',str(tools/'apksigner.bat'),'verify','--verbose','--print-certs',str(apk)]),('zipalign',[str(tools/'zipalign.exe'),'-c','-P','16','-v','4',str(apk)]),('aapt2',[str(tools/'aapt2.exe'),'dump','xmltree',str(apk),'--file','AndroidManifest.xml'])]:
  done=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,env=dict(os.environ,JAVA_HOME=str(TOOL/'jdk17')));(RUN/(name+'.log')).write_text(done.stdout);exits[name]=done.returncode;assert done.returncode==0,(name,done.stdout[-1000:])
 assert '48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83' in (RUN/'apksigner.log').read_text()
 (RUN/'apk-check-exits.json').write_text(json.dumps(exits,indent=2)+'\n')
 subprocess.run([str(ROOT/'apps/recognition-lab/runs/exploratory/e01-e03-20261004/venv/Scripts/python.exe'),'-B',str(ROOT/'tools/scripts/phone-native-build-apk.py'),str(apk),str(RUN/'apk-inventory.json')],check=True)
 inventory=json.loads((RUN/'apk-inventory.json').read_bytes());entries={r['path']:r for r in inventory['inventory']}
 accepted_image=json.loads((ROOT/'apps/recognition-lab/runs/phone-experiment/p1-image-lifecycle-c1-20261012-a1/apk-inventory.json').read_bytes())
 accepted_assets={r['path']:r for r in accepted_image['inventory'] if r['path'].startswith('assets/')}
 current_assets={p:r for p,r in entries.items() if p.startswith('assets/')}
 assert set(current_assets)==set(accepted_assets),'No additional APK asset may contain private inputs or outputs.'
 for name,r in current_assets.items():
  # These exact three files encode this build's code and therefore change with the new classes/UI.
  if name not in {'assets/index.android.bundle','assets/dexopt/baseline.prof','assets/dexopt/baseline.profm'}:assert (r['bytes'],r['sha256'])==(accepted_assets[name]['bytes'],accepted_assets[name]['sha256']),name
 old=json.loads((OLD/'apk-inventory-final.json').read_bytes());assert [(r['path'],r['sha256']) for r in inventory['native']]==[(r['path'],r['sha256']) for r in old['native']]
 orig=json.loads((ROOT/'apps/recognition-lab/runs/phone-experiment/p1-native-build-20261012-a1/asset-copies.json').read_bytes())
 for r in orig:
  name='assets/recognition-experiment/'+pathlib.Path(r['target']).name;assert entries[name]['bytes']==r['bytes'] and entries[name]['sha256']==r['sha256']
 generated=json.loads((ROOT/'apps/recognition-lab/runs/phone-experiment/p1-image-pipeline-20261012-a1/generated-assets.json').read_bytes())
 for r in generated:
  name='assets/recognition-image-experiment/'+r['path'];assert entries[name]['bytes']==r['bytes'] and entries[name]['sha256']==r['sha256']
 actual=json.loads((RUN/'resolved-artifacts.json').read_bytes());baseline=json.loads((OLD/'resolved-artifacts.json').read_bytes());scopes=[]
 for module,groups in actual.items():
  for scope,rows in groups.items():
   coords={r['coordinate'] for r in rows};expected={r['coordinate'] for r in baseline[module][scope]};assert coords==expected
   assert {(r['coordinate'],pathlib.Path(r['file']).name,r['bytes'],r['sha256']) for r in rows}=={(r['coordinate'],pathlib.Path(r['file']).name,r['bytes'],r['sha256']) for r in baseline[module][scope]},'All cached graph artifact hashes must match.'
   assert not any(c.startswith(('com.google.android.play:','com.google.android.gms:')) for c in coords)
   for r in rows:
    if r['file'].endswith('.aar') and r['coordinate'].startswith('com.google.ai.edge.litert:'):
     expectedRow=next(a for a in baseline[module][scope] if a['file'].endswith('.aar') and a['coordinate']==r['coordinate']);assert r['bytes']==expectedRow['bytes'] and r['sha256']==expectedRow['sha256'] and sha(pathlib.Path(r['file']).read_bytes())==r['sha256']
   scopes.append(dict(module=module,scope=scope,coordinates=len(coords),sameAcceptedGraph=True))
 mapping=ROOT/'apps/mobile/android/app/build/outputs/mapping/release/mapping.txt';configuration=mapping.with_name('configuration.txt');shutil.copyfile(mapping,RUN/'r8-mapping.txt');shutil.copyfile(configuration,RUN/'r8-configuration.txt');text=mapping.read_text();retained={}
 for original in ['expo.modules.recognitioncpu.PhoneOfflineGate','expo.modules.recognitioncpu.PhonePortabilityState','expo.modules.recognitioncpu.PhonePortabilityReplay','expo.modules.recognitioncpu.PhonePortabilityStore','expo.modules.recognitioncpu.PhonePortabilityPacket','expo.modules.recognitioncpu.PhonePortabilityResult','expo.modules.recognitioncpu.PhonePortabilityImage','expo.modules.recognitioncpu.PhonePortabilityRank','expo.modules.recognitioncpu.PhonePortabilityJson','expo.modules.recognitioncpu.PhonePortabilityZip','expo.modules.recognitioncpu.GeneratedEvidenceStore','expo.modules.recognitioncpu.GeneratedEvidenceAndroid','expo.modules.recognitioncpu.GeneratedImageGeometry','expo.modules.recognitioncpu.GeneratedImagePipeline','expo.modules.recognitioncpu.GeneratedExportState','expo.modules.recognitioncpu.GeneratedProbeCpu','expo.modules.recognitionexperiment.RecognitionExperimentModule','org.tensorflow.lite.InterpreterFactoryImpl','org.tensorflow.lite.NativeInterpreterWrapper','org.tensorflow.lite.TensorImpl','org.tensorflow.lite.TensorFlowLite']:
  match=re.search(r'^'+re.escape(original)+r' -> ([^:]+):',text,re.M);assert match,original;target=match[1];assert 'L'+target.replace('.','/')+';' in inventory['classes'];retained[original]=target
  if original.startswith('org.tensorflow.lite.'):assert target==original
 factory=[]
 for line in text[text.index('org.tensorflow.lite.InterpreterFactoryImpl ->'):].splitlines()[1:]:
  if line and not line.startswith((' ','#')):break
  factory.append(line)
 assert any('void <init>()' in line for line in factory)
 oldjni={(r['className'],r['method'],r['static']) for r in old['nativeMethods'] if r['className'].startswith('Lorg/tensorflow/lite/')}
 newjni={(r['className'],r['method'],r['static']) for r in inventory['nativeMethods'] if r['className'].startswith('Lorg/tensorflow/lite/')};assert newjni==oldjni
 for prefix in ['expo.modules.sqlite.','expo.modules.camera.','expo.modules.securestore.','expo.modules.router.','expo.modules.filesystem.','expo.modules.devlauncher.']:assert not any(line.startswith(prefix) and ' -> ' in line for line in text.splitlines())
 manifest=(RUN/'aapt2.log').read_text();assert 'com.damiyx.retailintelligence.recognitionverification' in manifest
 for term in ['android.permission.','E: provider','E: receiver','E: service','E: uses-feature','E: uses-native-library']:assert term not in manifest,term
 assert 'android:allowBackup' in manifest and 'android:usesCleartextTraffic' in manifest
 native=RUN/'packaged-native';native.mkdir(exist_ok=True);elf=[]
 readelf=TOOL/'sdk/ndk/27.1.12297006/toolchains/llvm/prebuilt/windows-x86_64/bin/llvm-readelf.exe'
 with zipfile.ZipFile(apk) as z:
  replay_source=(ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilitySource.java').read_text().split('SHA256="')[1].split('"')[0]
  manifest_source=(ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilityPins.java').read_text().split('MANIFEST_SHA="')[1].split('"')[0]
  dex=b''.join(z.read(n) for n in z.namelist() if re.fullmatch(r'classes[0-9]*\.dex',n));assert replay_source.encode() in dex and manifest_source.encode() in dex
  for r in inventory['native']:
   f=native/pathlib.Path(r['path']).name;f.write_bytes(z.read(r['path']));out=subprocess.check_output([str(readelf),'--dynamic',str(f)],text=True);(native/(f.name+'.dynamic.txt')).write_text(out);elf.append(dict(path=r['path'],needed=[line.strip() for line in out.splitlines() if '(NEEDED)' in line]))
  bundle=z.read('assets/index.android.bundle');(RUN/'index.android.bundle').write_bytes(bundle)
 sourcemap=ROOT/'apps/mobile/android/app/build/generated/sourcemaps/react/release/index.android.bundle.map';shutil.copyfile(sourcemap,RUN/'index.android.bundle.map');sm=json.loads(sourcemap.read_bytes());appSources=[s for s in sm['sources'] if '/apps/mobile/' in s.replace('\\','/') or s.replace('\\','/').startswith('apps/mobile/')]
 assert len(appSources)==7 and all('recognitionExperiment/' in s or 'recognition-entry.js' in s for s in appSources),appSources
 assert not any('supabase' in s.lower() or 'expo-router' in s for s in sm['sources'])
 modules=list((ROOT/'node_modules/expo/android/build/generated').rglob('ExpoModulesPackageList.kt'));assert len(modules)==1;shutil.copyfile(modules[0],RUN/'ExpoModulesPackageList.kt')
 receipt=dict(apk=str(apk),apkBytes=apk.stat().st_size,apkSha256=sha(apk.read_bytes()),certificateSha256='48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83',originalAssetsVerified=len(orig),newAssetsVerified=len(generated),specSha256=entries['assets/recognition-image-experiment/image-stage-spec.json']['sha256'],bundleSha256=sha(bundle),sourceMapSha256=sha(sourcemap.read_bytes()),sourceCount=len(sm['sources']),appSources=appSources,scopes=scopes,nativePayloads=len(inventory['native']),nativeByteIdenticalToAcceptedC1=True,retainedNames=retained,retainedTFLiteNativeMethods=len(newjni),elfNeeded=elf,deviceExecuted=False,modelExecuted=False)
 (RUN/'apk-bindings.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:receipt[k] for k in ['apkBytes','apkSha256','originalAssetsVerified','newAssetsVerified','sourceCount','nativePayloads','retainedTFLiteNativeMethods','deviceExecuted']}))
if __name__=='__main__':main()
