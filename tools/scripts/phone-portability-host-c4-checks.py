"""Complete generated Windows byte-archive durability and real entry/gate tests only."""
import pathlib,hashlib,json,zipfile,importlib.util,subprocess,datetime,sys,struct,copy,os
ROOT=pathlib.Path(__file__).resolve().parents[2]
RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-host-c4-20261013-a1'
FIX=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/c4g-20261013-a2')
PYTHON=ROOT/'apps/recognition-lab/runs/exploratory/e01-e03-20261004/venv/Scripts/python.exe'
LIB=ROOT/'tools/scripts/phone-portability-host-c4-archive.py';ENTRY=ROOT/'tools/scripts/phone-portability-host-c4-recover.py'
sha=lambda b:hashlib.sha256(b).hexdigest()
def packed(x):return json.dumps(x,separators=(',',':')).encode()
def write(p,b):
 p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('xb') as f:f.write(b)
def load(p):
 s=importlib.util.spec_from_file_location('actual_archive',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def archive(base,fault=None):
 values={};records=[]
 for i in range(40):
  ident='g'+str(i).zfill(2);jpeg=('GENERATED_JPEG_BYTES_ONLY_'+ident).encode();tensor=bytes([i])*602112
  record=dict(id=ident,role='reference' if i%4<2 else 'query',productId='g'+str(i//4),jpegPath='originals/'+ident+'.jpg',jpegBytes=len(jpeg),jpegSha256=sha(jpeg),tensorPath='controls/'+ident+'.bin',tensorBytes=602112,tensorSha256=sha(tensor),width=32,height=32,orientation=1,effectiveBox=dict(left=0,top=0,right=32,bottom=32))
  records.append(record);values[record['jpegPath']]=jpeg;values[record['tensorPath']]=tensor
 metadata=[]
 for name in ['comparison.json','annotations.json','bundle.json']:
  raw=packed(dict(kind='GENERATED_ONLY',name=name));values[name]=raw;metadata.append(dict(path=name,bytes=len(raw),sha256=sha(raw)))
 contract=dict(schemaVersion=1,kind='PRIVATE_PORTABILITY_INPUT',records=records,metadata=metadata)
 manifest=packed(contract);values['manifest.json']=manifest
 if fault in ['jpeg','tensor','metadata','manifest']:
  name={'jpeg':'originals/g00.jpg','tensor':'controls/g00.bin','metadata':'bundle.json','manifest':'manifest.json'}[fault]
  values[name]=b'X'+values[name][1:]
 if fault=='size':values['originals/g00.jpg']+=b'X'
 if fault=='traversal':values['../unsafe']=values.pop('originals/g00.jpg')
 donor=base/'donor.zip';donor.parent.mkdir(parents=True,exist_ok=True)
 with zipfile.ZipFile(donor,'x',compression=zipfile.ZIP_DEFLATED if fault=='compressed' else zipfile.ZIP_STORED) as z:
  for name,value in values.items():z.writestr(name,value)
  if fault=='duplicate':z.writestr('manifest.json',manifest)
 if fault=='truncated':donor.write_bytes(donor.read_bytes()[:-20])
 if fault=='encrypted':
  raw=bytearray(donor.read_bytes());start=raw.index(b'PK\x01\x02');flag=struct.unpack_from('<H',raw,start+8)[0];struct.pack_into('<H',raw,start+8,flag|1);donor.write_bytes(raw)
 return donor,contract,manifest
def old_proof(base):
 attempt=base/'original-failed-attempt';op='GENERATED_C3_FAILED';now=datetime.datetime.now(datetime.timezone.utc);start=now-datetime.timedelta(seconds=1800);end=start+datetime.timedelta(seconds=1500)
 session=dict(RunId=op,MaxSeconds=1500,Nonce='d'*64,Started=start.isoformat(),Deadline=end.isoformat());write(attempt/'session.json',packed(session))
 identity=dict(RunId=op,Nonce=session['Nonce'],SessionSha256=sha(packed(session)),HelperId=123,HelperStartTicks=456)
 phase=dict(identity,Kind='STOPPED_RECOVERY_PHASE',At=end.isoformat(),WorkStopped=True,MaxRecoverySeconds=240,RecoveryDeadline=(end+datetime.timedelta(seconds=240)).isoformat());write(attempt/'recovery-phase.json',packed(phase));ph=sha(packed(phase))
 stop=dict(identity,Kind='OWNED_JOBS_CONFIRMED_EMPTY',At=(end+datetime.timedelta(seconds=1)).isoformat(),JobsCreated=2,JobsDrained=2,ActiveChildren=0,ChildrenStopped=True,RecoveryPhaseSha256=ph);write(attempt/'stop-receipt.json',packed(stop))
 result=dict(identity,Kind='MANUAL_ATTEMPT_RESULT',At=(end+datetime.timedelta(seconds=2)).isoformat(),Failure='PORTABILITY_PREPARATION_FAILED_NO_PARTIAL_PACKET',PrivateExitCode=None,QueryDenominator=20,Restoration='ORIGINAL_WLAN_AND_ROUTE_PRESENT',StopReceiptSha256=sha(packed(stop)),RecoveryPhaseSha256=ph);write(attempt/'result.json',packed(result))
 offline=dict(identity,Kind='ACTUAL_NATIVE_OFFLINE_OBSERVED',At=(start+datetime.timedelta(seconds=1)).isoformat());write(attempt/'offline-observed.json',packed(offline))
 return attempt,op
def entry_fixture(name,fault=None):
 base=FIX/'entries'/name;donor,contract,manifest=archive(base)
 repo=base/'r';controller=base/'GENERATED_ONLY_CONTROLLER';attempt,op=old_proof(base)
 write(repo/'tools/scripts/phone-portability-host-c4-archive.py',LIB.read_bytes())
 pin=repo/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilityPins.java';write(pin,('MANIFEST='+json.dumps(manifest.decode())+';').encode())
 proof=dict(kind='PINNED_FAILED_C3_DONOR_PROVENANCE',donorOperation=op,donorSha256=sha(donor.read_bytes()),donorBytes=donor.stat().st_size,donorPath=str(donor),originalAttempt=str(attempt),files=[dict(path=str(p),bytes=p.stat().st_size,sha256=sha(p.read_bytes())) for p in sorted(attempt.iterdir())])
 if fault=='provenance':proof['donorOperation']='WRONG'
 write(controller/'donor-provenance.json',packed(proof))
 files=[ENTRY,repo/'tools/scripts/phone-portability-host-c4-archive.py',pin,controller/'donor-provenance.json']
 index=dict(files=[dict(path=str(p),bytes=p.stat().st_size,sha256=sha(p.read_bytes())) for p in files]);write(controller/'controller-source-manifest.json',packed(index))
 run_id='GENERATED_RECOVERY_'+name
 auth=dict(status='APPROVED_FOR_ONE_PORTABILITY_RECOVERY',authorThreadId='01a098ef-d830-7531-bca7-2d66b0a5b587',runId=run_id,runnerSha256='a'*64,controllerSourceSha256=sha(packed(index)),manifestSha256=sha(manifest),tensorBudget=0,privateModelInferences=0,queryDenominator=20,maxSessionSeconds=1500,perImageSeconds=60,producerSeconds=900,operationKind='RECOVER_FROM_C3_FINALIZATION_FAILURE',recordCount=40,newControlTensors=0,donorSha256=proof['donorSha256'],donorBytes=proof['donorBytes'],donorOperation=op,donorProvenanceSha256=sha(packed(proof)))
 if fault=='authority':auth['tensorBudget']=40
 if fault=='boolean-budget':auth['tensorBudget']=False
 write(controller/'execution-authorization.json',packed(auth))
 pub=dict(status='PUBLISHED_FOR_ONE_PORTABILITY_RECOVERY',authorThreadId=auth['authorThreadId'],runId=run_id,runnerSha256=auth['runnerSha256'],controllerSourceSha256=auth['controllerSourceSha256'],authorizationSha256=sha(packed(auth)))
 if fault!='unpublished':write(controller/'publication.json',packed(pub))
 now=datetime.datetime.now(datetime.timezone.utc);start=now-datetime.timedelta(seconds=1800) if fault=='expired' else now
 session=dict(RunId=run_id,MaxSeconds=1500,AuthorizationSha256=sha(packed(auth)),RunnerSha256=auth['runnerSha256'],Nonce='e'*64,Started=start.isoformat(),Deadline=(start+datetime.timedelta(seconds=1500)).isoformat());session_path=controller/('attempt-'+run_id)/'session.json';write(session_path,packed(session))
 offline=dict(Kind='ACTUAL_NATIVE_OFFLINE_OBSERVED',RunId=run_id,Nonce=session['Nonce'],SessionSha256=sha(packed(session)),HelperId=1)
 if fault!='offline':write(session_path.parent/'offline-observed.json',packed(offline))
 for name2 in ['ready.json','arm.json']:write(session_path.parent/name2,b'{}')
 if fault=='cancel':write(session_path.parent/'cancel.json',b'{}')
 if fault=='closed':write(session_path.parent/'recovery-phase.json',b'{}')
 if fault=='source':(repo/'tools/scripts/phone-portability-host-c4-archive.py').write_bytes(b'CHANGED')
 if fault=='donor':donor.write_bytes(donor.read_bytes()+b'CHANGED')
 output=base/'owned-output';output.mkdir()
 claim=dict(RunId=run_id,RecoverySha256=sha(packed(session)),TensorBudget=0,PrivateModelInferences=0,QueryDenominator=20,DonorSha256=proof['donorSha256']);write(output/'attempt-claim.json',packed(claim))
 if fault=='existing':write(output/'private-portability-input.zip',b'KEEP_EXISTING')
 config=dict(kind='GENERATED_ONLY',root=str(repo),controller=str(controller),output=str(output),runId=run_id,donor=str(donor),donorSha=proof['donorSha256'],donorBytes=proof['donorBytes'],donorOperation=op,originalAttempt=str(attempt),session=str(session_path));write(base/'config.json',packed(config));return base
BOOT=r'''import pathlib,sys,json,importlib.util
c=json.loads(pathlib.Path(sys.argv[1]).read_bytes());assert c['kind']=='GENERATED_ONLY'
s=importlib.util.spec_from_file_location('real_entry',sys.argv[2]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
for key,value in [('ROOT',c['root']),('CONTROLLER',c['controller']),('OUTPUT',c['output']),('DONOR',c['donor']),('ORIGINAL_ATTEMPT',c['originalAttempt'])]:setattr(m,key,pathlib.Path(value))
m.RUN_ID=c['runId'];m.DONOR_SHA=c['donorSha'];m.DONOR_BYTES=c['donorBytes'];m.DONOR_OPERATION=c['donorOperation']
calls={}
def observe(frame,event,arg):
 if event=='call' and frame.f_code.co_name in ['gate','provenance','validate','recover','load_crop','worker','preprocess','cpu_interpreter'] and pathlib.Path(frame.f_code.co_filename).name in ['phone-portability-host-c4-recover.py','phone-portability-host-c4-archive.py']:calls[frame.f_code.co_name]=calls.get(frame.f_code.co_name,0)+1
sys.setprofile(observe);sys.argv=[sys.argv[2],'--session',c['session']]+(['--preflight'] if sys.argv[3]=='preflight' else [])
code=m.main();sys.setprofile(None)
with open(c['state'],'x') as f:json.dump(dict(exit=code,calls=calls,pixelOrModelLoaded=any(n in sys.modules for n in ['PIL','numpy','tensorflow','tflite_runtime']),constantOverrides=['ROOT','CONTROLLER','OUTPUT','DONOR','ORIGINAL_ATTEMPT','RUN_ID','DONOR_SHA','DONOR_BYTES','DONOR_OPERATION']),f)
raise SystemExit(code)
'''
def main():
 assert not FIX.exists() and not (RUN/'stopped.json').exists();FIX.mkdir();library=load(LIB);results=[]
 base=FIX/'complete';donor,contract,manifest=archive(base);digest=sha(donor.read_bytes());size=donor.stat().st_size
 try:
  with donor.open('rb') as f:os.fsync(f.fileno())
  raise AssertionError('Windows read-only fsync unexpectedly passed')
 except OSError as error:assert error.errno==9;results.append(dict(case='old-rb-fsync',exit='expected failure',errno=9))
 output=base/'new-output';output.mkdir();receipt=dict(runId='GENERATED_C4',donorOperation='GENERATED_C3_FAILED',originalFailedResultSha256='a'*64,sessionSha256='b'*64,offlineReceiptSha256='c'*64)
 after=library.recover(donor,output,contract,manifest,digest,size,receipt)
 assert after['validation']['payloadsChecked']==84 and donor.read_bytes()==(output/'private-portability-input.zip').read_bytes()
 saved=json.loads((output/'packet-receipt.json').read_bytes());assert saved['kind']=='RECOVERED_FROM_C3_FINALIZATION_FAILURE' and saved['newControlTensors']==0 and saved['newClosureRequired'];results.append(dict(case='complete-real-Windows',passed=True,bytesIdentical=True,receipt=after))
 for fault in ['compressed','encrypted','duplicate','traversal','truncated','size','manifest','metadata','jpeg','tensor']:
  donor2,c,m=archive(FIX/'invalid'/fault,fault)
  try:library.validate(donor2,c,m,True);raise AssertionError('bad donor accepted '+fault)
  except (ValueError,zipfile.BadZipFile,RuntimeError):results.append(dict(case=fault,rejected=True))
 for fault in ['donor-hash','existing','COPY','FLUSH','PROMOTION','RECEIPT','racing','changed','cancel','unsafe','link','copy-partial']:
  dst=FIX/'faults'/fault;dst.mkdir(parents=True);output2=dst/'output';output2.mkdir();hash2=digest
  if fault=='donor-hash':hash2='f'*64
  if fault=='existing':write(output2/'private-portability-input.zip',b'EXISTING_MUST_REMAIN')
  path=output2/'..'/'output' if fault=='unsafe' else output2
  if fault=='link':
   alias=dst/'alias';subprocess.run(['cmd','/c','mklink','/J',str(alias),str(output2)],capture_output=True,check=True);path=alias
  progress={'copy':False,'calls':0}
  def hook(stage):
   if stage=='COPY':progress['copy']=True
   if stage==fault:raise OSError('GENERATED_'+fault+'_FAULT')
   if fault=='racing' and stage=='PROMOTION':write(output2/'private-portability-input.zip',b'RACING_MUST_REMAIN')
   if fault=='changed' and stage=='READBACK':
    with changed_donor.open('ab') as f:f.write(b'CHANGED')
  def guard():
   if fault=='cancel':raise ValueError('PORTABILITY_RECOVERY_STOPPED_OR_EXPIRED')
   if fault=='copy-partial' and progress['copy']:
    progress['calls']+=1
    if progress['calls']>=3:raise OSError('GENERATED_COPY_INTERRUPTED')
  source=donor
  if fault=='changed':changed_donor=dst/'changed-donor.zip';write(changed_donor,donor.read_bytes());source=changed_donor
  try:library.recover(source,path,contract,manifest,hash2,size,receipt,guard,hook);raise AssertionError('fault accepted '+fault)
  except (library.ArchiveFailure,ValueError):results.append(dict(case=fault,rejected=True,artifactsPreserved=True))
  assert not (output2/'packet-receipt.json').exists()
  if fault=='copy-partial':assert (output2/'packet.pending.zip').exists() and 0<(output2/'packet.pending.zip').stat().st_size<size
  if fault in ['existing','racing']:assert (output2/'private-portability-input.zip').read_bytes() in [b'EXISTING_MUST_REMAIN',b'RACING_MUST_REMAIN']
 write(RUN/'generated-entry-bootstrap-a2.py',BOOT.encode());entries=[]
 for name,fault,mode,ok in [('preflight',None,'preflight',True),('recovery',None,'recovery',True),('unpublished','unpublished','preflight',False),('authority','authority','preflight',False),('boolean-budget','boolean-budget','preflight',False),('source','source','preflight',False),('offline','offline','recovery',False),('closed','closed','recovery',False),('cancel','cancel','recovery',False),('expired','expired','recovery',False),('provenance','provenance','preflight',False),('donor','donor','preflight',False),('existing-entry','existing','recovery',False)]:
  b=entry_fixture(name,fault);config=json.loads((b/'config.json').read_bytes());config['state']=str(b/'entry-state.json');(b/'config.json').write_bytes(packed(config))
  r=subprocess.run([str(PYTHON),'-B',str(RUN/'generated-entry-bootstrap-a2.py'),str(b/'config.json'),str(ENTRY),mode],capture_output=True,text=True,timeout=180)
  write(b/'stdout.log',r.stdout.encode());write(b/'stderr.log',r.stderr.encode());state=json.loads((b/'entry-state.json').read_bytes())
  assert r.returncode==(0 if ok else 1) and not state['pixelOrModelLoaded'] and not any(state['calls'].get(x,0) for x in ['load_crop','worker','preprocess','cpu_interpreter']),(name,r.stdout,r.stderr)
  if ok:assert not r.stderr and r.stdout==('CONNECTED_PREFLIGHT_PASSED\n' if mode=='preflight' else 'PRIVATE_PORTABILITY_ARCHIVE_RECOVERED_NEW_CLOSURE_REQUIRED_NO_NEW_TENSORS\n')
  else:assert not r.stdout and r.stderr.startswith('PORTABILITY_STAGE_') and 'Traceback' not in r.stderr and str(ROOT) not in r.stderr
  entries.append(dict(case=name,exit=r.returncode,stdout=r.stdout,stderr=r.stderr,state=state));print('PASS generated entry '+name,flush=True)
 write(RUN/'complete-archive-checks-a2.json',(json.dumps(dict(utilityCases=len(results),entryCases=len(entries),results=results,entryResults=entries,fixtureRoot=str(FIX),successFilesystemValidatorMocks=False,generatedOnly=True,actualDonorPayloadsRead=False),indent=2)+'\n').encode())
 print('PASS complete generated Windows durability/recovery '+str(len(results))+' utility / '+str(len(entries))+' real entry cases.',flush=True)
if __name__=='__main__':main()
