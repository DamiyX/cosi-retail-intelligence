"""Exact C4 APK static inspection. No installation, inference or device access."""
import hashlib,importlib.util,json,os,pathlib,re,struct,subprocess,xml.etree.ElementTree as ET,zipfile,zlib
spec=importlib.util.spec_from_file_location('g3',pathlib.Path(__file__).with_name('phone-camera-proof-build.py'));g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)

def safe_name(name):
 assert name and '\\' not in name and not name.startswith('/') and ':' not in name
 assert all(part not in ['.','..'] for part in pathlib.PurePosixPath(name).parts)
 return name

def region(data,offset,count,width):
 assert isinstance(offset,int) and isinstance(count,int) and offset>=0 and count>=0 and width>0
 assert offset<=len(data) and count<=(len(data)-offset)//width,'Out-of-bounds binary section'

def dex(data):
 assert len(data)>=112 and data[:8] in [b'dex\n'+v+b'\0' for v in [b'035',b'037',b'038',b'039',b'040']]
 assert struct.unpack_from('<III',data,32)==(len(data),112,0x12345678)
 assert data[12:32]==hashlib.sha1(data[32:]).digest()
 assert struct.unpack_from('<I',data,8)[0]==zlib.adler32(data[12:])&0xffffffff
 def table(offset,width):
  n,p=struct.unpack_from('<II',data,offset);region(data,p,n,width);return n,p
 ns,ps=table(56,4);nt,pt=table(64,4);np,pp=table(72,12);nf,pf=table(80,8);nm,pm=table(88,8);nc,pc=table(96,32)
 data_size,data_off=struct.unpack_from('<II',data,104);region(data,data_off,data_size,1)
 def uleb(pos):
  value=0
  for shift in range(0,35,7):
   region(data,pos,1,1);b=data[pos];pos+=1
   if shift==28:assert b<16,'Oversized ULEB128'
   value|=(b&127)<<shift
   if not b&128:return value,pos
  raise ValueError('Unterminated ULEB128')
 strings=[]
 for i in range(ns):
  start=struct.unpack_from('<I',data,ps+i*4)[0];assert data_off<=start<len(data)
  _,start=uleb(start);end=data.find(b'\0',start,min(len(data),start+16*1024*1024));assert end>=start
  strings.append(data[start:end].decode('utf-8',errors='replace'))
 types=[]
 for i in range(nt):
  index=struct.unpack_from('<I',data,pt+i*4)[0];assert index<ns;types.append(strings[index])
 methods=[]
 for i in range(nm):
  cls,proto,name=struct.unpack_from('<HHI',data,pm+i*8);assert cls<nt and proto<np and name<ns
  methods.append((cls,proto,name))
 classes=[];native=[]
 for i in range(nc):
  cls=struct.unpack_from('<I',data,pc+i*32)[0];assert cls<nt;classes.append(types[cls])
  pos=struct.unpack_from('<I',data,pc+i*32+24)[0]
  if not pos:continue
  assert data_off<=pos<len(data);counts=[]
  for _ in range(4):n,pos=uleb(pos);counts.append(n)
  for count in counts[:2]:
   assert count<=nf;index=0
   for _ in range(count):delta,pos=uleb(pos);index+=delta;_,pos=uleb(pos);assert index<nf
  for count in counts[2:]:
   assert count<=nm;index=0
   for _ in range(count):
    delta,pos=uleb(pos);index+=delta;flags,pos=uleb(pos);code,pos=uleb(pos);assert index<nm and code<len(data)
    if flags&0x100:
     assert not code;cls,proto,name=methods[index];native.append(dict(className=types[cls],method=strings[name],prototype=proto,static=bool(flags&8)))
 assert len(set(classes))==len(classes)
 return dict(classes=classes,typeReferences=types,strings=strings,nativeMethods=native)

def elf(data):
 assert len(data)>=64 and data[:6]==b'\x7fELF\x02\x01' and struct.unpack_from('<H',data,18)[0]==183
 offset=struct.unpack_from('<Q',data,32)[0];width,count=struct.unpack_from('<HH',data,54);assert width==56;region(data,offset,count,width)
 rows=[]
 for i in range(count):
  kind,flags,pos,virtual,physical,size,memory,align=struct.unpack_from('<IIQQQQQQ',data,offset+i*width)
  if kind==1:
   region(data,pos,size,1);assert memory>=size
   rows.append(dict(offset=pos,virtual=virtual,fileBytes=size,memoryBytes=memory,alignment=align,compatible16KB=align>=16384 and pos%16384==virtual%16384))
 assert rows
 return rows

def run(name,args):
 g.live();env=dict(os.environ,JAVA_HOME=str(g.TOOLS/'jdk17'));env['PATH']=str(g.TOOLS/'jdk17/bin')+';'+env['PATH']
 receipt=g.WRITER/(name+'.json')
 if receipt.is_file():
  old=g.read(receipt);assert old['command']==list(map(str,args)) and old['exitCode']==0
  return old['stdout']
 p=subprocess.run([str(a) for a in args],cwd=g.ROOT,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace')
 g.put(g.WRITER/(name+'.json'),dict(command=list(map(str,args)),exitCode=p.returncode,stdout=p.stdout,stderr=p.stderr,staticOnly=True))
 assert p.returncode==0,(name,p.stderr[-2000:]);return p.stdout

def retain(target,data):
 if target.exists():assert target.read_bytes()==data,'Existing diagnostic input changed'
 else:
  with target.open('xb') as f:f.write(data)

def badging_sdk(text):
 minimum=re.findall(r"^(?:minSdkVersion|sdkVersion):'([0-9]+)'$",text,re.M)
 target=re.findall(r"^targetSdkVersion:'([0-9]+)'$",text,re.M)
 abi=re.findall(r"^native-code:\s*(.*)$",text,re.M)
 assert minimum==['24'] and target==['36'] and abi==["'arm64-v8a'"],(minimum,target,abi)
 return 24,36,'arm64-v8a'

def signature_guard(tree,ns,guard):
 declarations=tree.findall('permission')
 assert len(declarations)==1 and declarations[0].attrib[ns+'name']==guard
 value=declarations[0].attrib[ns+'protectionLevel']
 assert value in ['signature','0x2','2'],'Guard protection must be exactly signature enum 2'
 return dict(name=guard,decodedProtectionLevel=value,protectionEnum=2)

def forbidden(value):
 return any(p in value for p in ['com/google/android/gms/','com/google/android/play/','com/google/mlkit/','com/google/firebase/','com/google/android/datatransport/','com/google/android/odml/','com.google.android.gms.','com.google.android.play.','com.google.mlkit.','com.google.firebase.','com.google.android.datatransport.','com.google.android.odml.','ai-delivery','ai_delivery'])

def main():
 g.verify();success=g.read(g.WRITER/'release-success.json');receipt=g.WRITER/success['receipt']
 assert g.sha(receipt)==success['receiptSha256'] and g.read(receipt)['exitCode']==0
 source=g.APP/'android/app/build/outputs/apk/release/app-release.apk';apk=g.WRITER/'recognition-camera-proof-release.apk'
 if not apk.exists():
  with source.open('rb') as a,apk.open('xb') as b:
   while block:=a.read(1024*1024):b.write(block)
 assert g.sha(source)==success['sourceApkSha256']
 assert g.sha(source)==g.sha(apk)
 sdk=g.TOOLS/'sdk/build-tools/36.0.0'
 signer=run('apk-signature',['cmd.exe','/d','/c',sdk/'apksigner.bat','verify','--verbose','--print-certs',apk])
 cert='48550aec63c2b09f7746775002fbc93c3c2ceb95bc388be59e95bcd26a7e2d83';assert cert in signer
 run('apk-zipalign',[sdk/'zipalign.exe','-c','-P','16','-v','4',apk])
 run('apk-aapt2-xmltree',[sdk/'aapt2.exe','dump','xmltree',apk,'--file','AndroidManifest.xml'])
 badging=run('apk-aapt2-badging',[sdk/'aapt2.exe','dump','badging',apk])
 badging_sdk(badging)
 xml=run('apk-manifest',['cmd.exe','/d','/c',g.TOOLS/'sdk/cmdline-tools/latest/bin/apkanalyzer.bat','manifest','print',apk])
 tree=ET.fromstring(xml)
 overlaySpec=importlib.util.spec_from_file_location('overlay',g.ROOT/'tools/scripts/phone-camera-proof-build-overlay.py');overlay=importlib.util.module_from_spec(overlaySpec);overlaySpec.loader.exec_module(overlay)
 prior=ET.fromstring(g.read(g.ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c2-20261017-a1/writer/apk-manifest.json')['stdout'])
 manifestCorrection=overlay.compare_final(tree,prior)
 ns='{http://schemas.android.com/apk/res/android}';package=tree.attrib['package'];assert package=='com.damiyx.retailintelligence.recognitionverification'
 usesSdk=tree.find('uses-sdk');assert usesSdk.attrib[ns+'minSdkVersion']=='24' and usesSdk.attrib[ns+'targetSdkVersion']=='36'
 guard=package+'.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION';permissions=[e.attrib[ns+'name'] for e in tree.findall('uses-permission')]
 assert len(permissions)==2 and set(permissions)=={'android.permission.CAMERA',guard}
 assert not tree.findall('uses-permission-sdk-23')
 guardDeclaration=signature_guard(tree,ns,guard)
 app=tree.find('application');assert app.attrib[ns+'allowBackup']=='false' and app.attrib[ns+'usesCleartextTraffic']=='false'
 assert not app.findall('uses-native-library') and not any('npu' in e.attrib.get(ns+'name','').lower() for e in tree.findall('uses-feature'))
 assert not any(e.attrib.get(ns+'name')=='com.google.mlkit.vision.DEPENDENCIES' for e in app.findall('meta-data'))
 components=[dict(kind=e.tag,attributes=e.attrib,intents=[ET.tostring(i,encoding='unicode') for i in e.findall('intent-filter')]) for e in app if e.tag in ['activity','activity-alias','service','receiver','provider']]
 assert len(components)==2 and not app.findall('provider') and not app.findall('receiver') and not app.findall('activity-alias')
 activity=app.find('activity');service=app.find('service')
 assert activity.attrib[ns+'name']==package+'.MainActivity' and activity.attrib[ns+'exported']=='true'
 assert service.attrib[ns+'name']=='androidx.camera.core.impl.MetadataHolderService' and service.attrib[ns+'exported']=='false' and service.attrib[ns+'enabled']=='false'
 inventory=[];native=[];classes=[];types=[];strings=[];jni=[];dexRows=[]
 extracted=g.WRITER/'packaged-static-inputs';extracted.mkdir(exist_ok=True);seen=set()
 with apk.open('rb') as raw,zipfile.ZipFile(apk) as z:
  assert sum(e.file_size for e in z.infolist())<=2*1024**3
  for entry in z.infolist():
   safe_name(entry.filename);assert entry.filename not in seen;seen.add(entry.filename);assert entry.file_size<=512*1024**2
   assert (entry.external_attr>>16)&0o170000!=0o120000
   data=z.read(entry);raw.seek(entry.header_offset);header=raw.read(30);assert header[:4]==b'PK\x03\x04';nb,eb=struct.unpack_from('<HH',header,26);offset=entry.header_offset+30+nb+eb
   item=dict(path=entry.filename,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),compressedBytes=entry.compress_size,compression=entry.compress_type,dataOffset=offset);inventory.append(item)
   if re.fullmatch(r'classes[0-9]*\.dex',entry.filename):
    parsed=dex(data);target=extracted/entry.filename
    retain(target,data)
    official=run('dexdump-'+entry.filename,[sdk/'dexdump.exe','-f','-h',target]);officialClasses=re.findall(r"Class descriptor\s*:\s*'([^']+)'",official)
    assert sorted(officialClasses)==sorted(parsed['classes']),'Bounded parser/official dexdump class disagreement'
    classes+=parsed['classes'];types+=parsed['typeReferences'];strings+=parsed['strings'];jni+=parsed['nativeMethods'];dexRows.append(dict(path=entry.filename,sha256=item['sha256'],classCount=len(parsed['classes']),typeCount=len(parsed['typeReferences']),stringCount=len(parsed['strings']),officialClassDefinitionsMatch=True))
   if entry.filename.startswith('lib/') and entry.filename.endswith('.so'):
    assert entry.filename.startswith('lib/arm64-v8a/');loads=elf(data);assert all(x['compatible16KB'] for x in loads) and entry.compress_type==0 and offset%16384==0
    target=extracted/pathlib.PurePosixPath(entry.filename).name
    retain(target,data)
    readelf=g.TOOLS/'sdk/ndk/27.1.12297006/toolchains/llvm/prebuilt/windows-x86_64/bin/llvm-readelf.exe'
    dynamic=run('elf-'+target.name,[readelf,'--dynamic','--program-headers',target]);native.append(dict(**item,loadSegments=loads,allLoadsAndZip16KB=True,needed=[line.strip() for line in dynamic.splitlines() if '(NEEDED)' in line]))
 assert native and classes and len(classes)==len(set(classes))
 assert not any(forbidden(c) for c in classes+types),'Scanner SDK class/type packaged'
 optionalStrings=sorted({s for s in strings if forbidden(s)})
 assert optionalStrings==['com.google.android.gms.org.conscrypt'],'Unexpected optional SDK reflection string'
 origin=g.read(g.WRITER/'optional-reference-origin.json');assert len(origin['origins'])==1
 origin=origin['origins'][0];assert origin['coordinate']=='com.squareup.okhttp3:okhttp:4.9.2' and origin['artifactSha256']=='3b2ee1b768c1df28c30d2fe6b38dda4d2c519210e30ca3d27950618c563c92de' and g.sha(pathlib.Path(origin['artifact']))==origin['artifactSha256']
 assert 'com.google.android.gms.org.conscrypt' in g.read(g.WRITER/'optional-reference-javap.json')['stdout']
 assert not any('expo/modules/camera/analyzers/' in c for c in classes+types)
 entries={i['path']:i for i in inventory};assets=g.read(g.META/'coordinator-native-assets-before.json');expected={}
 for row in assets:
  name='assets/'+row['path'].split('/src/main/assets/',1)[1];expected[name]=row
  assert entries[name]['sha256']==row['sha256'] and entries[name]['bytes']==row['bytes'],name
 extraAssets=[i for i in inventory if i['path'].startswith('assets/') and i['path'] not in expected]
 assert {i['path'] for i in extraAssets}<={'assets/index.android.bundle','assets/dexopt/baseline.prof','assets/dexopt/baseline.profm','assets/app.config'},extraAssets
 with zipfile.ZipFile(apk) as z:configBytes=z.read('assets/app.config')
 assert configBytes==(g.APP/'android/app/build/intermediates/assets/release/mergeReleaseAssets/app.config').read_bytes()
 config=json.loads(configBytes);assert config.pop('sdkVersion')=='57.0.0'
 assert config==json.loads(g.read(g.WRITER/'config-shadow-recognition-verification-1-1.json')['stdout'])
 models=[i for i in inventory if i['path'].endswith('.tflite')];assert len(models)==1 and models[0]['sha256']=='bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40'
 mapping=g.APP/'android/app/build/outputs/mapping/release/mapping.txt';configuration=mapping.with_name('configuration.txt');mappingText=mapping.read_text(encoding='utf-8');assert not any(forbidden(line.split(' -> ')[0]) for line in mappingText.splitlines() if ' -> ' in line)
 for p in [mapping,configuration]:
  retain(g.WRITER/('r8-'+p.name),p.read_bytes())
 retained={}
 for name in ['expo.modules.camera.CameraViewModule','expo.modules.camera.ExpoCameraView','expo.modules.recognitionexperiment.RecognitionExperimentModule','expo.modules.recognitioncpu.CameraProofFrame','expo.modules.recognitioncpu.CameraProofStore','expo.modules.recognitioncpu.CameraProofLifecycle','expo.modules.recognitioncpu.CameraProofFinalizer','org.tensorflow.lite.InterpreterFactoryImpl','org.tensorflow.lite.NativeInterpreterWrapper','org.tensorflow.lite.TensorImpl','org.tensorflow.lite.TensorFlowLite']:
  match=re.search(r'^'+re.escape(name)+r' -> ([^:]+):',mappingText,re.M);assert match,name;target=match[1];assert 'L'+target.replace('.','/')+';' in classes
  if name.startswith('org.tensorflow.lite.'):assert target==name
  retained[name]=target
 scopes=[];resolved=g.read(g.WRITER/'resolved-artifacts.json');accepted={r['sha256'] for r in g.read(g.META/'coordinator-cache-artifacts-before.json')}
 c1=g.read(g.ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-c1-20261016-a1/writer/download-summary.json');accepted|={r['sha256'] for r in c1['artifacts']}
 for module,configs in resolved.items():
  for name,scope in configs.items():
   coords=[]
   for row in scope['artifacts']:
    if row['external']:
     assert row['sha256'] in accepted and g.sha(pathlib.Path(row['path']))==row['sha256'],row
     assert not forbidden(row['coordinate'].replace(':','.')) and 'camera-mlkit-vision' not in row['coordinate'];coords.append(row['coordinate'])
   scopes.append(dict(module=module,scope=name,externalCoordinates=sorted(set(coords)),allHashesAcceptedOrReviewed=True,scannerAbsent=True))
 sourcemap=g.APP/'android/app/build/generated/sourcemaps/react/release/index.android.bundle.map';sm=json.loads(sourcemap.read_bytes());sources=sm['sources'];owned=[s for s in sources if s.startswith('/src/') or s=='/recognition-entry.js'];assert len(owned)==10 and all('recognitionExperiment/' in s or s=='/recognition-entry.js' for s in owned)
 assert not any('supabase' in s.lower() or 'expo-router' in s for s in sources)
 assert '/src/recognitionExperiment/cameraRuntime.ts' in owned
 retain(g.WRITER/'index.android.bundle.map',sourcemap.read_bytes())
 with zipfile.ZipFile(apk) as z:bundle=z.read('assets/index.android.bundle')
 assert bundle==(g.APP/'android/app/build/generated/assets/react/release/index.android.bundle').read_bytes()
 retain(g.WRITER/'index.android.bundle',bundle)
 hermes=g.ROOT/'node_modules/hermes-compiler/hermesc/win64-bin/hermesc.exe';bytecode=run('hermes-bytecode-a2',[hermes,'-b','-dump-bytecode',g.WRITER/'index.android.bundle']);assert 'takePictureAsync' in bytecode and 'CameraProof' in bytecode
 modules=list((g.ROOT/'node_modules/expo/android/build/generated').rglob('ExpoModulesPackageList.kt'));assert len(modules)==1;text=modules[0].read_text(encoding='utf-8');assert 'expo.modules.camera.CameraViewModule' in text and 'expo.modules.recognitionexperiment.RecognitionExperimentModule' in text
 for prefix in ['expo.modules.sqlite.','expo.modules.securestore.','expo.modules.router.','expo.modules.devlauncher.']:assert prefix not in text
 retain(g.WRITER/'ExpoModulesPackageList.kt',modules[0].read_bytes())
 g.put(g.WRITER/'apk-static-result.json',dict(createdUtc=g.now(),apk=str(apk),apkBytes=apk.stat().st_size,apkSha256=g.sha(apk),certificateSha256=cert,permissions=permissions,manifestCorrection=manifestCorrection,internalSignatureGuard=guard,guardDeclaration=guardDeclaration,optionalSharedLibraries=[e.attrib for e in app.findall('uses-library')],features=[e.attrib for e in tree.findall('uses-feature')],components=components,metadata=[e.attrib for e in app.findall('meta-data')],queries=[ET.tostring(e,encoding='unicode') for e in tree.findall('queries')],minSdk=24,targetSdk=36,abi='arm64-v8a',backup=False,cleartext=False,inventory=inventory,native=native,dex=dexRows,classes=sorted(classes),typeReferences=sorted(set(types)),nativeMethods=jni,retainedNames=retained,scannerClassTypeAndReflectionStringsAbsent=True,optionalNonScannerReflectionStrings=optionalStrings,optionalReferenceOrigin=origin,generatedConfigBoundToIsolatedConfig=True,assetRowsVerified=len(assets),extraAssets=extraAssets,model=models[0],scopes=scopes,sourceMapSha256=g.sha(sourcemap),sourceCount=len(sources),appSources=owned,bundleSha256=hashlib.sha256(bundle).hexdigest(),bundleHeaderHex=bundle[:16].hex(),moduleRegistrationSha256=g.sha(modules[0]),hermesCompilerSha256=g.sha(hermes),signatureVerified=True,zipAndAllELFLoads16KB=True,deviceOrModelExecuted=False,staticOnly=True,independentAcceptance=False))
 print(json.dumps(dict(apk=str(apk),bytes=apk.stat().st_size,sha256=g.sha(apk),dexFiles=len(dexRows),classes=len(classes),nativePayloads=len(native),assetsVerified=len(assets),staticChecksPass=True,phoneOrModelExecuted=False)))

if __name__=='__main__':main()
