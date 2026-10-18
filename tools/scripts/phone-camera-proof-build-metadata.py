"""C1 fixed Maven metadata cache and offline graph inspection. No binary acquisition."""
import hashlib,importlib.util,json,pathlib,re,subprocess,sys,urllib.error,urllib.parse,urllib.request,xml.etree.ElementTree as ET
spec=importlib.util.spec_from_file_location('g3',pathlib.Path(__file__).with_name('phone-camera-proof-build.py'));g3=importlib.util.module_from_spec(spec);spec.loader.exec_module(g3)
W=g3.WRITER;MAVEN=g3.STAGE/'maven';BUDGET=250*1024*1024
HOSTS=['https://dl.google.com/dl/android/maven2/','https://repo.maven.apache.org/maven2/']
NS={'m':'http://maven.apache.org/POM/4.0.0'}
def coordinate(s):
 parts=s.split(':');assert len(parts)==3,s
 group,name,version=parts
 if version.startswith('[') and version.endswith(']') and ',' not in version:version=version[1:-1]
 assert all(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*',x) for x in [group,name,version]) and all(group.split('.')),('Nonfixed coordinate requires review',s)
 assert version not in ['LATEST','RELEASE'] and not version.endswith('-SNAPSHOT'),s
 return group,name,version
def location(s):
 group,name,version=coordinate(s);return '/'.join([group.replace('.','/'),name,version,name+'-'+version])
def cached(s):
 group,name,version=coordinate(s);p=g3.TOOLS/'gradle/caches/modules-2/files-2.1'/group/name/version
 return g3.ext(p).is_dir() and any(g3.ext(p).rglob('*.pom'))
def fetch(url,method='GET'):
 assert any(url.startswith(h) for h in HOSTS),url
 request=urllib.request.Request(url,method=method,headers={'User-Agent':'COSI-reviewed-fixed-build-metadata','Accept-Encoding':'identity'})
 class Redirect(urllib.request.HTTPRedirectHandler):
  def redirect_request(self,req,fp,code,msg,headers,newurl):
   assert any(newurl.startswith(h) for h in HOSTS),('Unapproved redirect',newurl)
   return super().redirect_request(req,fp,code,msg,headers,newurl)
 try:
  with urllib.request.build_opener(Redirect()).open(request,timeout=30) as r:
   data=r.read(2*1024*1024+1) if method=='GET' else b'';assert len(data)<=2*1024*1024,'Metadata bound'
   return dict(url=url,finalUrl=r.url,status=r.status,headers={k:v for k,v in r.headers.items() if k.lower() in ['content-length','content-type','last-modified','etag']},data=data)
 except urllib.error.HTTPError as e:
  if e.code in [404,410]:return dict(url=url,status=e.code,data=b'',headers={})
  raise
def acquire(s):
 g3.live();group,name,version=coordinate(s);s=':'.join([group,name,version]);dest=W/'metadata'/s.replace(':','--');dest.mkdir(parents=True)
 assert not (dest/'record.json').exists(),'Metadata receipt already exists; reuse it'
 attempts=[];base=None;pom=None
 reviewed=g3.ROOT/'apps/recognition-lab/runs/phone-experiment/p2-camera-build-g3-review-20261016-a1'
 approved=next((r for r in g3.read(reviewed/'official-metadata-review.json')['records'] if r['coordinate']==s),None)
 if approved:
  source=reviewed/'official-metadata'/(s.replace(':','--')+'.pom');assert g3.sha(source)==approved['pomSha256'];pom=source.read_bytes();base=approved['pomUrl'][:-4];attempts.append(dict(url=approved['pomUrl'],status=200,reusedEvidence=str(source),sha256=approved['pomSha256']))
 else:
  for host in (HOSTS if group.startswith(('androidx.','com.google.android.','com.google.mlkit','com.google.firebase')) else HOSTS[::-1]):
   result=fetch(host+location(s)+'.pom');attempts.append({k:v for k,v in result.items() if k!='data'})
   if result['status']==200:base=host+location(s);pom=result['data'];break
 assert pom is not None,('No official fixed POM',s,attempts)
 root=ET.fromstring(pom);licenses=[{c.tag.split('}')[-1]:c.text for c in lic} for lic in root.findall('m:licenses/m:license',NS)]
 parent=root.find('m:parent',NS);parentCoord=None
 if parent is not None:parentCoord=':'.join(parent.findtext('m:'+key,default='',namespaces=NS) for key in ['groupId','artifactId','version'])
 moduleResult=fetch(base+'.module');attempts.append({k:v for k,v in moduleResult.items() if k!='data'});module=moduleResult['data'] if moduleResult['status']==200 else None
 path=location(s);local=MAVEN/pathlib.PurePosixPath(path)
 for suffix,data in [('.pom',pom),('.module',module)]:
  if data is None:continue
  file=dest/('input'+suffix)
  with file.open('xb') as f:f.write(data)
  target=pathlib.Path(str(local)+suffix);g3.ext(target.parent).mkdir(parents=True,exist_ok=True)
  with g3.ext(target).open('xb') as f:f.write(data)
  assert g3.sha(target)==hashlib.sha256(data).hexdigest()
 record=dict(coordinate=s,pomUrl=base+'.pom',pomSha256=hashlib.sha256(pom).hexdigest(),pomBytes=len(pom),moduleSha256=hashlib.sha256(module).hexdigest() if module else None,moduleBytes=len(module) if module else None,licenses=licenses,parent=parentCoord,packaging=root.findtext('m:packaging',default='jar',namespaces=NS),base=base,attempts=attempts,binaryDownloaded=False)
 g3.put(dest/'record.json',record);print(json.dumps(dict(metadata=s,licenses=licenses,parent=parentCoord)),flush=True)
 return record
def graphs(attempt):
 g3.live();selection=g3.read(W/'gradle-project-inputs.json');camera=next(p for p in selection if p['name']==':expo-camera');assert pathlib.Path(camera['projectDir'])==g3.ROOT/'node_modules/expo-camera/android'
 init=W/'graphs-pinned.init.gradle'
 text='''import groovy.json.JsonOutput
allprojects { p ->
  def fixed=p.repositories.maven { name='C1ReviewedFixedMetadata'; url=uri(System.getenv('COSI_C1_MAVEN')) }
  p.repositories.remove(fixed);p.repositories.addFirst(fixed)
  if (p.name=='app') p.tasks.register('p2GraphMetadata') {
    doLast {
      def rows=['app','recognition-experiment','recognition-cpu-runtime','expo-camera'].collectEntries { name ->
        def q=p.rootProject.project(':'+name)
        def configs=q.configurations.findAll { c -> c.canBeResolved && (c.name in ['releaseCompileClasspath','releaseRuntimeClasspath','releaseAnnotationProcessor'] || c.name.toLowerCase().contains('processorclasspath')) }
        [(name):configs.collectEntries { c ->
          def result=c.incoming.resolutionResult
          [(c.name):[components:result.allComponents.findAll { it.moduleVersion!=null }.collect { a -> [coordinate:a.moduleVersion.toString(),variants:a.variants.collect { v -> [name:v.displayName,attributes:v.attributes.keySet().collectEntries { k -> [(k.name):v.attributes.getAttribute(k).toString()] }] }] },unresolved:result.allDependencies.findAll { it instanceof org.gradle.api.artifacts.result.UnresolvedDependencyResult }.collect { d -> def chain=[]; def t=d.failure; while(t!=null && chain.size()<10) { chain.add(t.message); t=t.cause }; [attempted:d.attempted.displayName,error:d.failure.message,causes:chain] }]]
        }]
      }
      new File(System.getenv('COSI_P1_RUN'),'graph-'+System.getenv('COSI_C1_ATTEMPT')+'.json').text=JsonOutput.prettyPrint(JsonOutput.toJson(rows))+'\\n'
    }
  }
}
'''
 if not init.exists():
  with init.open('x',encoding='utf-8') as f:f.write(text)
 else:assert init.read_text()==text
 e=g3.environment();e['COSI_C1_MAVEN']=str(MAVEN);e['COSI_C1_ATTEMPT']=attempt
 password=g3.ext(g3.TOOLS/'test-signing-password.txt').read_text(encoding='utf-8');e.update(COSI_TEST_KEYSTORE=str(g3.TOOLS/'recognition-test.jks'),COSI_TEST_STORE_PASSWORD=password,COSI_TEST_KEY_PASSWORD=password)
 args=['cmd.exe','/d','/c','gradlew.bat',':app:p2GraphMetadata','--init-script',str(init),'--offline','--no-daemon','--console=plain','--max-workers=2'];start=g3.now()
 try:
  r=subprocess.run(args,cwd=g3.APP/'android',env=e,capture_output=True,text=True,encoding='utf-8',errors='replace');stdout,stderr=r.stdout,r.stderr
  for secret in set([password,password.strip()]):
   if secret:stdout=stdout.replace(secret,'[REDACTED]');stderr=stderr.replace(secret,'[REDACTED]')
 finally:e.pop('COSI_TEST_STORE_PASSWORD',None);e.pop('COSI_TEST_KEY_PASSWORD',None);password=None
 g3.put(W/('graph-command-'+attempt+'.json'),dict(command=args,cwd=str(g3.APP/'android'),started=start,ended=g3.now(),exitCode=r.returncode,stdout=stdout,stderr=stderr,offline=True,binariesRequested=False,localMetadataCache=str(MAVEN)))
 print(json.dumps(dict(exitCode=r.returncode,stdout=stdout[-1200:],stderr=stderr[-1800:])));assert r.returncode==0
 data=g3.read(W/('graph-'+attempt+'.json'));missing={u['attempted'] for scopes in data.values() for scope in scopes.values() for u in scope['unresolved']};g3.put(W/('missing-'+attempt+'.json'),sorted(missing));print(json.dumps(dict(missing=sorted(missing))))
def batch(attempt):
 missing=g3.read(W/('missing-'+attempt+'.json'));queue=[]
 for s in missing:
  try:group,name,version=coordinate(s);queue.append(':'.join([group,name,version]))
  except AssertionError:raise
 seen=set()
 while queue:
  s=queue.pop(0)
  if s in seen:continue
  seen.add(s);p=W/'metadata'/s.replace(':','--')/'record.json'
  record=g3.read(p) if p.exists() else acquire(s)
  if record['parent'] and not cached(record['parent']):queue.append(record['parent'])
 g3.put(W/('metadata-batch-'+attempt+'.json'),dict(coordinates=sorted(seen),binaryArtifactsDownloaded=0))
def inherited_licenses(record,seen=None):
 if record['licenses']:return record['licenses']
 seen=set() if seen is None else seen;parent=record.get('parent');assert parent and parent not in seen,('Unestablished license',record['coordinate']);seen.add(parent)
 p=W/'metadata'/parent.replace(':','--')/'record.json'
 if p.exists():return inherited_licenses(g3.read(p),seen)
 group,name,version=coordinate(parent);cache=g3.TOOLS/'gradle/caches/modules-2/files-2.1'/group/name/version;files=list(g3.ext(cache).rglob(name+'-'+version+'.pom'));assert len(files)==1,('No accepted parent POM',parent)
 root=ET.fromstring(files[0].read_bytes());licenses=[{c.tag.split('}')[-1]:c.text for c in lic} for lic in root.findall('m:licenses/m:license',NS)];assert licenses,('Parent license needs review',parent)
 return licenses
def plan(attempt):
 g3.live();data=g3.read(W/('graph-'+attempt+'.json'));assert not any(v['unresolved'] for scopes in data.values() for v in scopes.values()),'Complete graph required before binary planning'
 selected={}
 for project,scopes in data.items():
  for scope,v in scopes.items():
   for c in v['components']:
    s=c['coordinate']
    if s.startswith(('host.exp.exponent:expo','local.recognitionexperiment:','Recognition Generated Probe:')):continue
    item=selected.setdefault(s,dict(variants=set(),scopes=set()));item['variants'].update(x['name'] for x in c['variants']);item['scopes'].add(project+'/'+scope)
 rows=[];reuse=[];noBinary=[]
 for s,usage in sorted(selected.items()):
  group,name,version=coordinate(s);cache=g3.TOOLS/'gradle/caches/modules-2/files-2.1'/group/name/version
  old=[p for p in g3.ext(cache).rglob('*') if p.is_file() and p.suffix in ['.jar','.aar'] and not p.name.endswith(('-sources.jar','-javadoc.jar'))] if g3.ext(cache).exists() else []
  if old:reuse.append(dict(coordinate=s,files=[str(p) for p in old]));continue
  p=W/'metadata'/s.replace(':','--')/'record.json';assert p.exists(),('Need exact metadata before planning',s)
  record=g3.read(p);directory=p.parent;module=directory/'input.module';entries=[]
  if module.exists():
   md=g3.read(module);variants=[v for v in md['variants'] if v['name'] in usage['variants']];assert variants,('Selected metadata variant needs review',s,sorted(usage['variants']))
   for variant in variants:entries.extend(variant.get('files',[]))
   if not entries:noBinary.append(dict(coordinate=s,variants=sorted(usage['variants']),redirectOrPlatform=True));continue
  elif record['packaging']=='pom':noBinary.append(dict(coordinate=s,pomOnly=True));continue
  else:entries=[dict(name=name+'-'+version+'.'+record['packaging'],url=name+'-'+version+'.'+record['packaging'])]
  licenses=inherited_licenses(record);names=[x.get('name','') for x in licenses]
  assert all(any(t in name.lower() for t in ['apache','bsd','mit','android software development kit license','ml kit terms']) for name in names),('Unreviewed license family',s,names)
  scanner=group.startswith(('com.google.android.gms','com.google.mlkit','com.google.firebase','com.google.android.datatransport','com.google.android.odml')) or s.startswith('androidx.camera:camera-mlkit-vision:')
  if scanner:assert not any(scope.endswith('/releaseRuntimeClasspath') for scope in usage['scopes']),('Prohibited scanner transitive at runtime',s)
  for entry in {e['url']:e for e in entries}.values():
   assert re.fullmatch(r'[A-Za-z0-9_.-]+',entry['url']) and entry['url'].endswith(('.jar','.aar')),entry
   url=record['base'].rsplit('/',1)[0]+'/'+entry['url'];head=fetch(url,'HEAD');assert head['status']==200,head
   size=int(next(v for k,v in head['headers'].items() if k.lower()=='content-length'));assert size>0 and size<=BUDGET,('Unknown/oversized payload',s,size)
   if 'size' in entry:assert size==entry['size'],('Metadata/HEAD size mismatch',s)
   hashes={k:entry[k] for k in ['sha256','sha512','sha1'] if k in entry};checksumReceipts=[]
   if not hashes:
    for kind,length in [('sha256',64),('sha1',40)]:
     checksum=fetch(url+'.'+kind);checksumReceipts.append({k:v for k,v in checksum.items() if k!='data'})
     if checksum['status']==200:
      text=checksum['data'].decode().strip().split()[0];assert re.fullmatch('[0-9a-fA-F]{'+str(length)+'}',text);hashes[kind]=text.lower();break
   assert hashes,('No official checksum available',s)
   rows.append(dict(coordinate=s,url=url,bytes=size,hashes=hashes,head={k:v for k,v in head.items() if k!='data'},checksumRequests=checksumReceipts,licenses=licenses,compileOnlyScannerInput=scanner,scopes=sorted(usage['scopes']),variants=sorted(usage['variants']),target=(pathlib.PurePosixPath(location(s)).parent/entry['url']).as_posix(),metadataSha256=g3.sha(p)))
 binaryBytes=sum(r['bytes'] for r in rows);metadataBytes=sum(p.stat().st_size for p in (W/'metadata').rglob('input.*'));assert binaryBytes+metadataBytes<=BUDGET,('Planned payload exceeds approved budget',binaryBytes,metadataBytes)
 g3.put(W/'binary-plan-a1.json',dict(createdUtc=g3.now(),graph='graph-'+attempt+'.json',graphSha256=g3.sha(W/('graph-'+attempt+'.json')),artifacts=rows,reusedCoordinates=reuse,metadataOnlyComponents=noBinary,advertisedNewBinaryBytes=binaryBytes,retainedMetadataBytes=metadataBytes,plannedPayloadBytes=binaryBytes+metadataBytes,budgetBytes=BUDGET,hardNetworkCap=False,binariesDownloaded=False))
 print(json.dumps(dict(newArtifacts=len(rows),reusedCoordinates=len(reuse),newBinaryBytes=binaryBytes,metadataBytes=metadataBytes,plannedPayloadBytes=binaryBytes+metadataBytes,compileOnlyScannerArtifacts=sum(r['compileOnlyScannerInput'] for r in rows),licenses=sorted(set(x['name'] for r in rows for x in r['licenses'])))))
def binaries():
 g3.live();g3.verify();planPath=W/'binary-plan-a1.json';p=g3.read(planPath);review=g3.read(W/'binary-plan-review.json');assert review['planSha256']==g3.sha(planPath) and review['withinAuthorizedFixedInputScope']
 assert p['plannedPayloadBytes']<=BUDGET;out=W/'downloads';out.mkdir();records=[];total=0
 class Redirect(urllib.request.HTTPRedirectHandler):
  def redirect_request(self,req,fp,code,msg,headers,newurl):
   assert any(newurl.startswith(h) for h in HOSTS),('Unapproved redirect',newurl)
   return super().redirect_request(req,fp,code,msg,headers,newurl)
 for index,item in enumerate(p['artifacts']):
  g3.live();url=item['url'];assert any(url.startswith(h) for h in HOSTS)
  target=MAVEN/pathlib.PurePosixPath(item['target']);assert target.resolve().is_relative_to(MAVEN.resolve());partial=pathlib.Path(str(target)+'.partial');assert not g3.ext(target).exists() and not g3.ext(partial).exists(),'No overwrite or silent partial retry'
  hashes={kind:hashlib.new(kind) for kind in set(item['hashes'])|{'sha256'}};count=0;started=g3.now()
  try:
   request=urllib.request.Request(url,headers={'User-Agent':'COSI-reviewed-fixed-compiler-input','Accept-Encoding':'identity'})
   with urllib.request.build_opener(Redirect()).open(request,timeout=60) as response:
    assert int(response.headers['Content-Length'])==item['bytes'],'Binary size changed after plan'
    with g3.ext(partial).open('xb') as dest:
     while data:=response.read(1024*1024):
      count+=len(data);assert count<=item['bytes'] and total+count+p['retainedMetadataBytes']<=BUDGET,'Payload budget/size refusal'
      for h in hashes.values():h.update(data)
      dest.write(data)
   assert count==item['bytes'],'Truncated artifact retained as partial'
   actual={kind:h.hexdigest() for kind,h in hashes.items()}
   for kind,expected in item['hashes'].items():assert actual[kind]==expected,('Published checksum mismatch',item['coordinate'],kind)
   g3.ext(partial).rename(g3.ext(target));total+=count
   record=dict(coordinate=item['coordinate'],url=url,started=started,ended=g3.now(),bytes=count,sha256=actual['sha256'],publishedHashesVerified=item['hashes'],path=str(target),compileOnlyScannerInput=item['compileOnlyScannerInput'],licenses=item['licenses'],modelOrApiExecuted=False)
   g3.put(out/(f'{index:03d}-'+item['coordinate'].replace(':','--')+'.json'),record);records.append(record)
   print(json.dumps(dict(downloaded=item['coordinate'],bytes=count,totalBinaryBytes=total)),flush=True)
  except BaseException as error:
   g3.put(out/(f'{index:03d}-failure.json'),dict(coordinate=item['coordinate'],url=url,bytesObserved=count,partialRetained=g3.ext(partial).exists(),errorType=type(error).__name__,error=str(error),furtherAcquisitionStopped=True));raise
 g3.put(W/'download-summary.json',dict(createdUtc=g3.now(),planSha256=g3.sha(planPath),artifacts=records,artifactCount=len(records),actualNewBinaryBytes=total,retainedMetadataBytes=p['retainedMetadataBytes'],budgetBytes=BUDGET,hardNetworkCap=False,sourceHosts=HOSTS,apiModelExecuted=False,interactiveAgreementAccepted=False))
 print(json.dumps(dict(downloadedArtifacts=len(records),newBinaryBytes=total,allPublishedHashesVerified=True)))
def materialize_cache():
 g3.live();accepted={r['path']:r for r in g3.read(g3.META/'coordinator-cache-artifacts-before.json')};plan=g3.read(W/'binary-plan-a1.json');rows=[]
 for item in plan['reusedCoordinates']:
  group,name,version=coordinate(item['coordinate']);base=g3.TOOLS/'gradle/caches/modules-2/files-2.1'/group/name/version
  for parent,dirs,names in __import__('os').walk(g3.ext(base)):
   for filename in names:
    if not filename.endswith(('.pom','.module','.jar','.aar')) or filename.endswith(('-sources.jar','-javadoc.jar')):continue
    source=pathlib.Path(str(pathlib.Path(parent)/filename).removeprefix('\\\\?\\'));key=str(source);assert key in accepted,('Unreviewed cached input',key)
    expected=accepted[key];assert g3.sha(source)==expected['sha256'],key
    target=MAVEN/group.replace('.','/')/name/version/filename;g3.ext(target.parent).mkdir(parents=True,exist_ok=True)
    reused=target.exists()
    if reused:assert g3.sha(target)==expected['sha256'],('Existing task cache differs',str(target))
    else:
     with g3.ext(source).open('rb') as original,g3.ext(target).open('xb') as dest:
      while data:=original.read(1024*1024):dest.write(data)
     assert g3.sha(target)==expected['sha256']
    rows.append(dict(coordinate=item['coordinate'],source=key,target=str(target),bytes=expected['bytes'],sha256=expected['sha256'],alreadyPresent=reused))
 g3.put(W/'materialized-accepted-cache.json',dict(createdUtc=g3.now(),files=rows,oldArtifactBytesUnchanged=True,newNetworkBytes=0,reason='Release a1 showed physical cached lifecycle AAR existed but was not retrievable through Gradle repository cache index; expose accepted immutable bytes through the same task-owned pinned Maven cache.'))
 print(json.dumps(dict(verifiedCachedFiles=len(rows),materializedFiles=sum(not r['alreadyPresent'] for r in rows),newNetworkBytes=0)))
def materialize_aliases():
 g3.live();prior=g3.read(W/'materialized-accepted-cache.json');rows=[]
 graph=g3.read(W/'graph-a8.json');selected={}
 for scopes in graph.values():
  for scope in scopes.values():
   for c in scope['components']:selected.setdefault(c['coordinate'],set()).update(v['name'] for v in c['variants'])
 for item in g3.read(W/'binary-plan-a1.json')['reusedCoordinates']:
  group,name,version=coordinate(item['coordinate']);directory=MAVEN/group.replace('.','/')/name/version;module=directory/(name+'-'+version+'.module')
  if not module.exists():continue
  md=g3.read(module)
  for variant in md['variants']:
   if variant['name'] not in selected.get(item['coordinate'],set()):continue
   for entry in variant.get('files',[]):
    if not entry['url'].endswith(('.jar','.aar')):continue
    assert re.fullmatch(r'[A-Za-z0-9_.-]+',entry['url'])
    source=next((p for p in prior['files'] if p['coordinate']==item['coordinate'] and pathlib.Path(p['target']).name==entry['name']),None)
    if source is None:continue
    expected=source['sha256']
    if entry.get('sha256'):assert entry['sha256']==expected,('Alias provenance mismatch',item['coordinate'],entry['name'])
    target=directory/entry['url'];original=pathlib.Path(source['target'])
    already=target.exists()
    if already:assert g3.sha(target)==expected
    else:
     with g3.ext(original).open('rb') as src,g3.ext(target).open('xb') as dst:
      while data:=src.read(1024*1024):dst.write(data)
     assert g3.sha(target)==expected
    if target!=original:rows.append(dict(coordinate=item['coordinate'],source=str(original),target=str(target),bytes=source['bytes'],sha256=expected,alreadyPresent=already,publishedHashChecked=bool(entry.get('sha256')),reason='Published module file URL differs from cached artifact display name; source hash is from immutable coordinator-accepted cache inventory'))
 g3.put(W/'materialized-accepted-cache-aliases.json',dict(createdUtc=g3.now(),files=rows,newNetworkBytes=0,oldCacheUnchanged=True));print(json.dumps(dict(publishedAliases=len(rows),newNetworkBytes=0)))
def artifact_files():
 g3.live();init=W/'artifact-files.init.gradle'
 text='''import groovy.json.JsonOutput
allprojects { p ->
  def fixed=p.repositories.maven { name='C1ReviewedFixedCache'; url=uri(System.getenv('COSI_C1_MAVEN')) }
  p.repositories.remove(fixed);p.repositories.addFirst(fixed)
  if(p.name=='app') p.tasks.register('p2VerifyExternalArtifacts') {
    doLast {
      def hashes=[:]
      def rows=['app','recognition-experiment','recognition-cpu-runtime','expo-camera'].collectEntries { name ->
        def q=p.rootProject.project(':'+name)
        [(name):q.configurations.findAll { c -> c.canBeResolved && (c.name in ['releaseCompileClasspath','releaseRuntimeClasspath','releaseAnnotationProcessor'] || c.name.toLowerCase().contains('processorclasspath')) }.collectEntries { c ->
          def view=c.incoming.artifactView { lenient=true; componentFilter { it instanceof org.gradle.api.artifacts.component.ModuleComponentIdentifier } }.artifacts
          [(c.name):[files:view.artifacts.collect { a ->
            def f=a.file
            if(!hashes.containsKey(f.absolutePath)) { def h=java.security.MessageDigest.getInstance('SHA-256');f.withInputStream { stream -> byte[] b=new byte[1048576];int n;while((n=stream.read(b))!=-1) h.update(b,0,n) };hashes[f.absolutePath]=h.digest().encodeHex().toString() }
            [coordinate:a.id.componentIdentifier.displayName,path:f.absolutePath,bytes:f.length(),sha256:hashes[f.absolutePath]]
          },failures:view.failures.collect { e -> e.message }]]
        }]
      }
      new File(System.getenv('COSI_P1_RUN'),'external-artifact-files.json').text=JsonOutput.prettyPrint(JsonOutput.toJson(rows))+'\\n'
    }
  }
}
'''
 with init.open('x',encoding='utf-8') as f:f.write(text)
 e=g3.environment();e['COSI_C1_MAVEN']=str(MAVEN);password=g3.ext(g3.TOOLS/'test-signing-password.txt').read_text();e.update(COSI_TEST_KEYSTORE=str(g3.TOOLS/'recognition-test.jks'),COSI_TEST_STORE_PASSWORD=password,COSI_TEST_KEY_PASSWORD=password)
 args=['cmd.exe','/d','/c','gradlew.bat',':app:p2VerifyExternalArtifacts','--init-script',str(init),'--offline','--no-daemon','--console=plain','--max-workers=2'];start=g3.now()
 try:
  r=subprocess.run(args,cwd=g3.APP/'android',env=e,capture_output=True,text=True,encoding='utf-8',errors='replace');stdout,stderr=r.stdout,r.stderr
  for secret in set([password,password.strip()]):
   if secret:stdout=stdout.replace(secret,'[REDACTED]');stderr=stderr.replace(secret,'[REDACTED]')
 finally:e.pop('COSI_TEST_STORE_PASSWORD',None);e.pop('COSI_TEST_KEY_PASSWORD',None);password=None
 g3.put(W/'external-artifact-command.json',dict(command=args,started=start,ended=g3.now(),exitCode=r.returncode,stdout=stdout,stderr=stderr,offline=True));assert r.returncode==0,(stdout[-1000:],stderr[-3000:])
 data=g3.read(W/'external-artifact-files.json');failures=[dict(project=p,scope=c,error=e) for p,scopes in data.items() for c,s in scopes.items() for e in s['failures']];g3.put(W/'external-artifact-availability.json',dict(createdUtc=g3.now(),failures=failures,allRequiredFilesAvailable=not failures,configurationCount=sum(len(s) for s in data.values())))
 print(json.dumps(dict(failures=failures,uniqueFiles=len({f['path'] for scopes in data.values() for s in scopes.values() for f in s['files']}))));assert not failures
if __name__=='__main__':
 mode=sys.argv[1]
 if mode=='graph':graphs(sys.argv[2])
 elif mode=='metadata':batch(sys.argv[2])
 elif mode=='metadata-one':acquire(sys.argv[2])
 elif mode=='plan':plan(sys.argv[2])
 elif mode=='binaries':binaries()
 elif mode=='materialize-cache':materialize_cache()
 elif mode=='materialize-aliases':materialize_aliases()
 elif mode=='artifact-files':artifact_files()
 else:raise ValueError('graph or metadata only; binary acquisition needs a reviewed plan')
