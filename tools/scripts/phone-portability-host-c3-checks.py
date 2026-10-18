"""Full published GENERATED preflight in isolated subprocesses; never operational authority."""
import pathlib,json,hashlib,subprocess,datetime,copy,sys,ast
ROOT=pathlib.Path(__file__).resolve().parents[2]
RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-host-c3-20261013-a1'
FIXTURES=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/c3g-20261013-a4')
PYTHON=ROOT/'apps/recognition-lab/runs/exploratory/e01-e03-20261004/venv/Scripts/python.exe'
C2=ROOT/'tools/scripts/phone-portability-host-c2-prepare.py';C3=ROOT/'tools/scripts/phone-portability-host-c3-prepare.py'
sha=lambda b:hashlib.sha256(b).hexdigest()
def packed(value):return json.dumps(value,separators=(',',':'),ensure_ascii=False).encode()
def write(path,raw):
 path.parent.mkdir(parents=True,exist_ok=True)
 with path.open('xb') as f:f.write(raw)
def fixture(name,fault=None):
 base=FIXTURES/name;assert not base.exists()
 repo=base/'repository';controller=base/'GENERATED-ONLY-controller';photos=base/'generated-bytes';frozen=base/'generated-metadata'
 software=repo/'apps/recognition-lab/runs/exploratory/e01-e03-20261004/software.json'
 for filename in ['producer.py','inventory.py','requirements.lock']:
  write(repo/'apps/recognition-lab/tools/exploratory'/filename,(ROOT/'apps/recognition-lab/tools/exploratory'/filename).read_bytes())
 software_raw=(ROOT/'apps/recognition-lab/runs/exploratory/e01-e03-20261004/software.json').read_bytes()
 if fault=='inventory':software_raw=packed(dict(json.loads(software_raw),python='GENERATED_WRONG_VERSION'))
 write(software,software_raw)
 contract=json.loads((ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-c1-20261012-a1/packet-contract-metadata.json').read_bytes())
 entries=[];annotations=[];records=[]
 for i in range(40):
  ident='generated-'+str(i).zfill(2);data=('GENERATED_PREFLIGHT_BYTES_NO_PIXELS_'+ident).encode();path=ident+'.jpg';write(photos/path,data)
  record=copy.deepcopy(contract['records'][i]);record.update(id=ident,productId='generated-product-'+str(i//4),role='reference' if i%4<2 else 'query',jpegBytes=len(data),jpegSha256=sha(data),jpegPath='originals/'+path,tensorPath='controls/'+ident+'.bin',tensorSha256=sha(b'generated-control'),width=32,height=32,orientation=1,effectiveBox=dict(left=0,top=0,right=32,bottom=32))
  records.append(record);entries.append(dict(id=ident,asset=dict(path=('../unsafe.jpg' if fault=='path' and i==0 else path),sha256=sha(data),bytes=len(data))))
  annotations.append(dict(id=ident,assetSha256=sha(data),width=32,height=32,orientation=1,effectiveBox=record['effectiveBox']))
 values={'comparison.json':dict(study=dict(entries=entries)),'annotations.json':dict(entries=annotations),'bundle.json':dict(kind='GENERATED_ONLY_NO_VECTORS',records=[])}
 contract['records']=records;contract['metadata']=[]
 for name,value in values.items():
  raw=packed(value);write(frozen/name,raw);contract['metadata'].append(dict(path=name,bytes=len(raw),sha256=sha(raw)))
 if fault=='metadata':(frozen/'annotations.json').write_bytes(b'{}')
 manifest=packed(contract)
 pin=repo/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilityPins.java'
 write(pin,('GENERATED_FIXTURE_ONLY MANIFEST='+json.dumps(manifest.decode())+';').encode())
 # Both actual entry sources bound in the same fixture for discriminating before/after.
 files=[C2,C3,pin,software,*sorted((repo/'apps/recognition-lab/tools/exploratory').iterdir())]
 index=dict(schemaVersion=1,kind='UNPUBLISHED_PORTABILITY_CONTROLLER_SOURCE',files=[dict(path=str(p),bytes=p.stat().st_size,sha256=sha(p.read_bytes())) for p in files])
 if fault=='duplicate-dependency':index['files'].append(copy.deepcopy(next(r for r in index['files'] if pathlib.Path(r['path']).name=='producer.py')))
 index_raw=packed(index);write(controller/'controller-source-manifest.json',index_raw)
 op='generated-preflight-only-'+name
 authority=dict(status='APPROVED_FOR_ONE_PORTABILITY_PREPARATION',authorThreadId='01a098ef-d830-7531-bca7-2d66b0a5b587',runId=op,runnerSha256=sha(b'GENERATED_NOT_OPERATIONAL_RUNNER'),controllerSourceSha256=sha(index_raw),manifestSha256=sha(manifest),privateModelInferences=0,tensorBudget=40,queryDenominator=20,maxSessionSeconds=1500,perImageSeconds=60,producerSeconds=900)
 if fault in ['authority','diagnostic-write','diagnostic-both']:authority['tensorBudget']=41
 if fault=='draft-authority':authority['status']='DRAFT_NOT_APPROVED'
 auth_raw=packed(authority)
 if fault!='absent-authorization':write(controller/'execution-authorization.json',auth_raw)
 publication=dict(status='PUBLISHED_FOR_ONE_PORTABILITY_PREPARATION',authorThreadId=authority['authorThreadId'],runId=op,runnerSha256=authority['runnerSha256'],controllerSourceSha256=authority['controllerSourceSha256'],authorizationSha256=sha(auth_raw))
 if fault!='unpublished':write(controller/'publication.json',packed(publication))
 now=datetime.datetime.now(datetime.timezone.utc);start=now-datetime.timedelta(seconds=2000) if fault=='expired' else now
 session=dict(RunId=op,MaxSeconds=1500,AuthorizationSha256=sha(auth_raw),RunnerSha256=authority['runnerSha256'],Nonce='f'*64,Started=start.isoformat(),Deadline=(start+datetime.timedelta(seconds=1500)).isoformat())
 session_path=controller/('attempt-'+op)/'session.json';write(session_path,packed(session))
 if fault=='stopped':write(session_path.parent/'cancel.json',b'{}')
 if fault=='recovery':write(session_path.parent/'recovery-phase.json',b'{}')
 if fault=='source':(repo/'apps/recognition-lab/tools/exploratory/producer.py').write_bytes(b'GENERATED_SOURCE_DRIFT')
 if fault=='input':(photos/'generated-00.jpg').write_bytes(b'GENERATED_CHANGED_INPUT')
 if fault=='tampered-authorization':(controller/'execution-authorization.json').write_bytes(auth_raw+b' ')
 if fault=='malformed':(controller/'publication.json').write_bytes(b'{"status":1,"status":2}')
 config=dict(kind='GENERATED_FIXTURE_ONLY',root=str(repo),controller=str(controller),photos=str(photos),frozen=str(frozen),output=str(base/'NEVER_PRIVATE_OUTPUT'),operation=op,session=str(session_path),state=str(base/'bootstrap-state.json'),fault=fault)
 write(base/'fixture-config.json',packed(config));return base
BOOTSTRAP=r'''import importlib.util,pathlib,json,sys,types
config=json.loads(pathlib.Path(sys.argv[1]).read_bytes());entry=pathlib.Path(sys.argv[2]);mode=sys.argv[3]
assert config['kind']=='GENERATED_FIXTURE_ONLY'
spec=importlib.util.spec_from_file_location('actual_preflight_entry',entry);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
module.ROOT=pathlib.Path(config['root']);module.CONTROLLER=pathlib.Path(config['controller']);module.PHOTOS=pathlib.Path(config['photos']);module.FROZEN=pathlib.Path(config['frozen']);module.OUTPUT=pathlib.Path(config['output']);module.RUN_ID=config['operation']
absent=object();collision=config['fault'] in ['collision','import-failure']
if collision:
 sentinel=types.ModuleType('producer');sentinel.LAB='POISON_NOT_USED';sys.modules['producer']=sentinel
prior=sys.modules.get('producer',absent);prior_inventory=sys.modules.get('portability_inventory',absent);paths=list(sys.path)
platform_prior=sys.modules.get('platform',absent)
if config['fault']=='import-failure':sys.modules['platform']=None
calls={};watched={'gate','metadata','load_inventory','inventory','load_crop','worker','preprocess','cpu_interpreter'}
def profile(frame,event,arg):
 if event=='call' and frame.f_code.co_name in watched and pathlib.Path(frame.f_code.co_filename).name in [entry.name,'inventory.py','producer.py','crop_producer.py']:calls[frame.f_code.co_name]=calls.get(frame.f_code.co_name,0)+1
sys.setprofile(profile)
sys.argv=[str(entry),'--preflight','--session',config['session']]
stderr_prior=sys.stderr;stdout_prior=sys.stdout;failed_writes=[]
class FailedDiagnosticStream:
 def write(self,text):failed_writes.append(text);raise OSError('GENERATED_DIAGNOSTIC_STREAM_FAULT')
 def flush(self):pass
if config['fault'] in ['diagnostic-write','diagnostic-both']:sys.stderr=FailedDiagnosticStream()
if config['fault']=='diagnostic-both':sys.stdout=FailedDiagnosticStream()
code=module.main()
sys.stderr=stderr_prior;sys.stdout=stdout_prior
sys.setprofile(None)
state=dict(exit=code,producerStateRestored=sys.modules.get('producer',absent) is prior,inventoryStateUnchanged=sys.modules.get('portability_inventory',absent) is prior_inventory,sysPathUnchanged=sys.path==paths,calls=calls,pixelOrModelModulesLoaded=any(p in sys.modules for p in ['PIL','numpy','tensorflow','tflite_runtime']),privateOutputExists=module.OUTPUT.exists(),actualEntry=str(entry),fixtureConstantOverrides=['ROOT','CONTROLLER','PHOTOS','FROZEN','OUTPUT','RUN_ID'],collisionInjected=collision,importFailureInjection=config['fault']=='import-failure',failedDiagnosticWrites=failed_writes)
if config['fault']=='import-failure':
 if platform_prior is absent:sys.modules.pop('platform',None)
 else:sys.modules['platform']=platform_prior
with pathlib.Path(config['state']).open('x') as f:json.dump(state,f,indent=2)
raise SystemExit(code)
'''
def execute(base,entry,label):
 state=base/'bootstrap-state.json'
 # Same valid before/after fixture: each process gets a separate immutable observation path.
 config=json.loads((base/'fixture-config.json').read_bytes());config['state']=str(base/(label+'-state.json'))
 context=base/(label+'-config.json');write(context,packed(config))
 result=subprocess.run([str(PYTHON),'-B',str(RUN/'generated-entry-bootstrap-a4.py'),str(context),str(entry),'preflight'],cwd=RUN,capture_output=True,text=True,timeout=180)
 write(base/(label+'.stdout.log'),result.stdout.encode());write(base/(label+'.stderr.log'),result.stderr.encode())
 observation=json.loads(pathlib.Path(config['state']).read_bytes())
 assert result.returncode==observation['exit'] and not observation['pixelOrModelModulesLoaded'] and not observation['privateOutputExists']
 assert observation['sysPathUnchanged'] and observation['inventoryStateUnchanged']
 if entry==C3:assert observation['producerStateRestored']
 return dict(label=label,exit=result.returncode,stdout=result.stdout,stderr=result.stderr,state=observation)
def main():
 assert not (RUN/'stopped.json').exists() and not (RUN/'full-preflight-checks-a4.json').exists() and not FIXTURES.exists()
 write(RUN/'generated-entry-bootstrap-a4.py',BOOTSTRAP.encode())
 results=[];positive=fixture('positive')
 before=execute(positive,C2,'before-c2');assert before['exit']==1 and before['stderr'].strip()=='PORTABILITY_PREPARATION_FAILED_PRIVATE_DETAILS_WITHHELD' and not before['stdout'];results.append(before)
 after=execute(positive,C3,'after-c3');assert after['exit']==0 and after['stdout']=='CONNECTED_PREFLIGHT_PASSED\n' and not after['stderr'];results.append(after)
 assert after['state']['calls']['gate']>=1 and after['state']['calls']['metadata']==1 and after['state']['calls']['load_inventory']==1 and after['state']['calls']['inventory']==1
 collision=execute(fixture('collision','collision'),C3,'collision');assert collision['exit']==0 and collision['stdout']=='CONNECTED_PREFLIGHT_PASSED\n' and not collision['stderr'];results.append(collision)
 negatives={
 'unpublished':('AUTHORITY','PORTABILITY_UNPUBLISHED_NO_PRIVATE_AUTHORITY'),
 'absent-authorization':('AUTHORITY','PORTABILITY_UNPUBLISHED_NO_PRIVATE_AUTHORITY'),
 'draft-authority':('AUTHORITY','PORTABILITY_AUTHORIZATION_BINDING'),
 'authority':('AUTHORITY','PORTABILITY_AUTHORIZATION_BINDING'),
 'tampered-authorization':('AUTHORITY','PORTABILITY_AUTHORIZATION_BINDING'),
 'source':('AUTHORITY','PORTABILITY_SOURCE_DRIFT'),
 'expired':('AUTHORITY','PORTABILITY_SESSION_STOPPED_OR_EXPIRED'),
 'stopped':('AUTHORITY','PORTABILITY_SESSION_STOPPED_OR_EXPIRED'),
 'recovery':('AUTHORITY','PORTABILITY_SESSION_STOPPED_OR_EXPIRED'),
 'malformed':('AUTHORITY','PORTABILITY_DUPLICATE_JSON'),
 'metadata':('METADATA','PORTABILITY_FROZEN_METADATA_DRIFT'),
 'inventory':('INVENTORY_COMPARE','PORTABILITY_SOFTWARE_INVENTORY_DRIFT'),
 'path':('INPUT_HASHES','PORTABILITY_PATH_LINK_OR_ROOT'),
 'input':('INPUT_HASHES','PORTABILITY_ORIGINAL_HASH_OR_SIZE'),
 'duplicate-dependency':('INVENTORY_LOAD','PORTABILITY_INVENTORY_DEPENDENCY_PIN'),
 'import-failure':('INVENTORY_LOAD','PORTABILITY_STAGE_FAILED_PRIVATE_DETAILS_WITHHELD'),
 }
 for fault,(stage,code) in negatives.items():
  result=execute(fixture(fault,fault),C3,fault)
  assert result['exit']==1 and not result['stdout'] and result['stderr']=='PORTABILITY_STAGE_'+stage+':'+code+'\n',(fault,result)
  assert 'Traceback' not in result['stderr'] and str(ROOT) not in result['stderr']
  results.append(result);print('PASS generated '+fault,flush=True)
 for fault in ['diagnostic-write','diagnostic-both']:
  result=execute(fixture(fault,fault),C3,fault)
  assert result['exit']==1 and not result['stderr'] and result['state']['failedDiagnosticWrites']
  expected='PORTABILITY_DIAGNOSTIC_WRITE_FAILED:PORTABILITY_STAGE_AUTHORITY:PORTABILITY_AUTHORIZATION_BINDING\n' if fault=='diagnostic-write' else ''
  assert result['stdout']==expected and all(str(ROOT) not in message and 'Traceback' not in message for message in result['state']['failedDiagnosticWrites'])
  results.append(result)
 receipt=dict(count=len(results),beforeFailedAfterPassed=True,fortyGeneratedByteInputs=True,realEntryMainGateMetadataInventory=True,installedInventoryCompared=True,constantsExplicitlyFixtureOnly=True,noGateLoaderInventoryMocks=True,privatePixels=False,modelExecuted=False,realOperationalPublication=False,results=results)
 receipt['fixtureRoot']=str(FIXTURES)
 write(RUN/'full-preflight-checks-a4.json',(json.dumps(receipt,indent=2)+'\n').encode())
 print('PASS full generated published preflight: before C2 fails; after C3 succeeds; '+str(len(results))+' subprocess cases.',flush=True)
if __name__=='__main__':main()
