"""Future guarded forty-tensor assembly, reusing the frozen crop preprocess, never its model worker.
Entry refuses unpublished operation before importing any image library or decoding pixels.
"""
import contextlib
import argparse,datetime,hashlib,importlib.util,json,multiprocessing,os,pathlib,sys,time,zipfile,math
ROOT=pathlib.Path(__file__).resolve().parents[2]
CONTROLLER=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/cosi-phone-portability-host-c3-20261013-a1')
OUTPUT=ROOT/'apps/recognition-lab/runs/phone-experiment/private-portability-host-c3-20261013-a1'
FROZEN=ROOT/'apps/recognition-lab/runs/framing-comparison/private-framing-manual-20261011-a1/producer'
PHOTOS=ROOT/'apps/recognition-lab/private-data/r1-pilot'
RUN_ID='portability-host-c3-20261013-a1'
def hashfile(path):
 with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def strict(raw):
 if len(raw)>2*1024*1024:raise ValueError('PORTABILITY_METADATA_BOUND')
 def pairs(items):
  out={}
  for k,v in items:
   if k in out:raise ValueError('PORTABILITY_DUPLICATE_JSON')
   out[k]=v
  return out
 def finite(token):
  value=float(token)
  if not math.isfinite(value):raise ValueError('PORTABILITY_NONFINITE_JSON')
  return value
 return json.loads(raw.decode('utf-8'),object_pairs_hook=pairs,parse_float=finite,parse_constant=lambda _:(_ for _ in ()).throw(ValueError('PORTABILITY_NONFINITE_JSON')))
def fixed_contract():
 p=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilityPins.java'
 literal=p.read_text().split('MANIFEST=',1)[1].split(';',1)[0];raw=json.loads(literal).encode();return strict(raw),raw
def path_owned(path,root):
 p=path.absolute();r=root.resolve()
 if p.resolve()!=p or not p.is_relative_to(r):raise ValueError('PORTABILITY_PATH_LINK_OR_ROOT')
 for parent in [p,*p.parents]:
  if parent==r:break
  if parent.is_symlink():raise ValueError('PORTABILITY_PATH_LINK')
 return p
def gate(args,offline=False):
 publication=CONTROLLER/'publication.json';authorization=CONTROLLER/'execution-authorization.json'
 if not publication.is_file() or not authorization.is_file():raise ValueError('PORTABILITY_UNPUBLISHED_NO_PRIVATE_AUTHORITY')
 p=strict(publication.read_bytes());a=strict(authorization.read_bytes())
 if p.get('status')!='PUBLISHED_FOR_ONE_PORTABILITY_PREPARATION' or a.get('status')!='APPROVED_FOR_ONE_PORTABILITY_PREPARATION' or p.get('authorizationSha256')!=hashfile(authorization) or p.get('authorThreadId')!='01a098ef-d830-7531-bca7-2d66b0a5b587' or a.get('authorThreadId')!=p.get('authorThreadId') or p.get('runId')!=RUN_ID or a.get('runId')!=RUN_ID or p.get('runnerSha256')!=a.get('runnerSha256') or p.get('controllerSourceSha256')!=a.get('controllerSourceSha256') or a.get('privateModelInferences')!=0 or a.get('tensorBudget')!=40 or a.get('queryDenominator')!=20 or a.get('maxSessionSeconds')!=1500 or a.get('perImageSeconds')!=60 or a.get('producerSeconds')!=900:raise ValueError('PORTABILITY_AUTHORIZATION_BINDING')
 source=CONTROLLER/'controller-source-manifest.json'
 if hashfile(source)!=a.get('controllerSourceSha256'):raise ValueError('PORTABILITY_SOURCE_INDEX_PIN')
 index=strict(source.read_bytes())
 for row in index['files']:
  f=pathlib.Path(row['path'])
  if not f.is_file() or f.is_symlink() or f.stat().st_size!=row['bytes'] or hashfile(f)!=row['sha256']:raise ValueError('PORTABILITY_SOURCE_DRIFT')
 contract,raw=fixed_contract()
 if hashlib.sha256(raw).hexdigest()!=a.get('manifestSha256'):raise ValueError('PORTABILITY_CONTRACT_PIN')
 session_path=path_owned(args.session,CONTROLLER/('attempt-'+RUN_ID));session=strict(session_path.read_bytes());directory=session_path.parent
 if session.get('RunId')!=RUN_ID or session.get('MaxSeconds')!=1500 or session.get('AuthorizationSha256')!=hashfile(authorization) or session.get('RunnerSha256')!=a.get('runnerSha256') or session.get('Nonce') is None:raise ValueError('PORTABILITY_SESSION_BINDING')
 now=datetime.datetime.now(datetime.timezone.utc)
 deadline=datetime.datetime.fromisoformat(session['Deadline']);start=datetime.datetime.fromisoformat(session['Started'])
 if now>=deadline or (deadline-start).total_seconds()!=1500 or (directory/'cancel.json').exists() or (directory/'recovery-phase.json').exists():raise ValueError('PORTABILITY_SESSION_STOPPED_OR_EXPIRED')
 if offline:
  receipt_path=directory/'offline-observed.json';receipt=strict(receipt_path.read_bytes())
  if receipt.get('Kind')!='ACTUAL_NATIVE_OFFLINE_OBSERVED' or receipt.get('RunId')!=RUN_ID or receipt.get('Nonce')!=session['Nonce'] or receipt.get('SessionSha256')!=hashfile(session_path) or receipt.get('HelperId',0)<=0:raise ValueError('PORTABILITY_OFFLINE_RECEIPT_BINDING')
  if not (directory/'ready.json').is_file() or not (directory/'arm.json').is_file():raise ValueError('PORTABILITY_HELPER_ARM_REQUIRED')
 return contract,raw,directory
def metadata(contract):
 values={}
 for entry in contract['metadata']:
  f=path_owned(FROZEN/entry['path'],FROZEN);raw=f.read_bytes()
  if len(raw)!=entry['bytes'] or hashlib.sha256(raw).hexdigest()!=entry['sha256']:raise ValueError('PORTABILITY_FROZEN_METADATA_DRIFT')
  values[entry['path']]=strict(raw)
 return values
def load_crop():
 path=ROOT/'apps/recognition-lab/tools/framing-comparison/crop_producer.py'
 spec=importlib.util.spec_from_file_location('portability_frozen_crop',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
def worker(conn,path,annotation):
 try:
  module=load_crop();data=module.buffered(str(path),str(PHOTOS),annotation['assetSha256'],limit=6*1024*1024)
  tensor,_,_,details=module.preprocess(data,annotation);raw=tensor.tobytes()
  if len(raw)!=602112:raise ValueError('PORTABILITY_CONTROL_SHAPE')
  conn.send_bytes(raw)
 except Exception:
  conn.send_bytes(b'PORTABILITY_PREPROCESS_FAILED')
 finally:conn.close()
class PortabilityStageFailure(Exception):
 def __init__(self,stage,error):
  code=str(error)
  if not (code.startswith('PORTABILITY_') and len(code)<=128 and all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_' for c in code)):
   code='PORTABILITY_STAGE_FAILED_PRIVATE_DETAILS_WITHHELD'
  self.stage=stage;self.code=code
  super().__init__(code)
@contextlib.contextmanager
def preparation_stage(stage):
 try:yield
 except PortabilityStageFailure:raise
 except Exception as error:raise PortabilityStageFailure(stage,error) from error
def load_inventory():
 dependency=path_owned(ROOT/'apps/recognition-lab/tools/exploratory/producer.py',ROOT)
 inventory_path=path_owned(ROOT/'apps/recognition-lab/tools/exploratory/inventory.py',ROOT)
 index=strict((CONTROLLER/'controller-source-manifest.json').read_bytes())
 for target in [dependency,inventory_path]:
  rows=[row for row in index['files'] if pathlib.Path(row['path'])==target]
  if len(rows)!=1 or target.stat().st_size!=rows[0]['bytes'] or hashfile(target)!=rows[0]['sha256']:
   raise ValueError('PORTABILITY_INVENTORY_DEPENDENCY_PIN')
 absent=object();previous=sys.modules.get('producer',absent)
 try:
  spec=importlib.util.spec_from_file_location('producer',dependency)
  exact=importlib.util.module_from_spec(spec);sys.modules['producer']=exact
  spec.loader.exec_module(exact)
  spec=importlib.util.spec_from_file_location('portability_inventory',inventory_path)
  module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  return module
 finally:
  if previous is absent:sys.modules.pop('producer',None)
  else:sys.modules['producer']=previous

def prepare(args):
 with preparation_stage('AUTHORITY'):
  contract,raw,directory=gate(args,offline=not args.preflight)
 with preparation_stage('METADATA'):
  values=metadata(contract);study=values['comparison.json']['study'];annotations={a['id']:a for a in values['annotations.json']['entries']};assets={e['id']:e['asset'] for e in study['entries']}
 # The same installed software inventory is required; no interpreter is created.
 with preparation_stage('INVENTORY_LOAD'):
  module=load_inventory()
 with preparation_stage('INVENTORY_COMPARE'):
  actual=(json.dumps(module.inventory(),separators=(',',':'),ensure_ascii=False)).encode()
  if actual!=(ROOT/'apps/recognition-lab/runs/exploratory/e01-e03-20261004/software.json').read_bytes():raise ValueError('PORTABILITY_SOFTWARE_INVENTORY_DRIFT')
 with preparation_stage('INPUT_HASHES'):
  for f in contract['records']:
   path=path_owned(PHOTOS/assets[f['id']]['path'],PHOTOS)
   if path.stat().st_size!=f['jpegBytes'] or hashfile(path)!=f['jpegSha256']:raise ValueError('PORTABILITY_ORIGINAL_HASH_OR_SIZE')
 if args.preflight:print('CONNECTED_PREFLIGHT_PASSED');return
 if not OUTPUT.is_dir() or not (OUTPUT/'attempt-claim.json').is_file() or (OUTPUT/'private-portability-input.zip').exists() or (OUTPUT/'packet.pending.zip').exists():raise ValueError('PORTABILITY_NEW_CLAIM_OUTPUT_REQUIRED')
 started=time.monotonic();pending=OUTPUT/'packet.pending.zip';records=[];ctx=multiprocessing.get_context('spawn')
 with zipfile.ZipFile(pending,'x',compression=zipfile.ZIP_STORED,allowZip64=False) as z:
  z.writestr('manifest.json',raw)
  for m in contract['metadata']:z.writestr(m['path'],(FROZEN/m['path']).read_bytes())
  for f in contract['records']:
   gate(args,True)
   if time.monotonic()-started>=900:raise ValueError('PORTABILITY_PREPARATION_TOTAL_DEADLINE')
   path=path_owned(PHOTOS/assets[f['id']]['path'],PHOTOS);parent,child=ctx.Pipe(duplex=False);process=ctx.Process(target=worker,args=(child,path,annotations[f['id']]));process.start();child.close()
   try:
    deadline=time.monotonic()+min(60,900-(time.monotonic()-started))
    while not parent.poll(min(.25,max(0,deadline-time.monotonic()))):
     if time.monotonic()>=deadline:raise ValueError('PORTABILITY_IMAGE_DEADLINE')
     if (directory/'cancel.json').exists() or (directory/'recovery-phase.json').exists():raise ValueError('PORTABILITY_PREPARATION_CANCELLED')
    tensor=parent.recv_bytes(602112)
    if len(tensor)!=602112 or hashlib.sha256(tensor).hexdigest()!=f['tensorSha256']:raise ValueError('PORTABILITY_FROZEN_TENSOR_MISMATCH')
   finally:
    if process.is_alive():process.terminate()
    process.join(5);parent.close();process.close()
   gate(args,True)
   # Original bytes are copied without normalization, downscaling or metadata edits.
   with path.open('rb') as source,z.open(f['jpegPath'],'w') as destination:
    digest=hashlib.sha256();count=0
    while True:
     chunk=source.read(8192)
     if not chunk:break
     count+=len(chunk);digest.update(chunk);destination.write(chunk)
    if count!=f['jpegBytes'] or digest.hexdigest()!=f['jpegSha256']:raise ValueError('PORTABILITY_ORIGINAL_CHANGED')
   z.writestr(f['tensorPath'],tensor);records.append(dict(id=f['id'],tensorSha256=f['tensorSha256'],jpegSha256=f['jpegSha256']));print(f'PREPARED {len(records)}/40',flush=True)
 gate(args,True)
 if pending.stat().st_size>128*1024*1024 or len(records)!=40:raise ValueError('PORTABILITY_FINAL_PACKET_BOUND')
 with pending.open('rb') as f:os.fsync(f.fileno())
 target=OUTPUT/'private-portability-input.zip';os.rename(pending,target)
 receipt=dict(kind='PRIVATE_PORTABILITY_HOST_PREPARATION',runId=RUN_ID,packetSha256=hashfile(target),packetBytes=target.stat().st_size,manifestSha256=hashlib.sha256(raw).hexdigest(),records=records,privateModelInferences=0,sessionSha256=hashfile(args.session),offlineReceiptSha256=hashfile(directory/'offline-observed.json'))
 with (OUTPUT/'packet-receipt.json').open('x') as f:json.dump(receipt,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
 print('PRIVATE_PORTABILITY_PACKET_PREPARED_NO_MODEL_INFERENCE')
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--preflight',action='store_true');parser.add_argument('--session',required=True,type=pathlib.Path);args=parser.parse_args()
 try:prepare(args)
 except Exception as error:
  failure=error if isinstance(error,PortabilityStageFailure) else PortabilityStageFailure('ASSEMBLY',error)
  message='PORTABILITY_STAGE_'+failure.stage+':'+failure.code
  try:print(message,file=sys.stderr)
  except Exception:
   try:print('PORTABILITY_DIAGNOSTIC_WRITE_FAILED:'+message,file=sys.stdout)
   except Exception:pass # No diagnostic channel; the original refusal remains exit 1.
  return 1
 return 0
if __name__=='__main__':sys.exit(main())
