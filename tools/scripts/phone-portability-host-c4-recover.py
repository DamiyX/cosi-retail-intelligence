"""Future guarded forty-tensor assembly, reusing the frozen crop preprocess, never its model worker.
Entry refuses unpublished operation before importing any image library or decoding pixels.
"""
import contextlib
import argparse,datetime,hashlib,importlib.util,json,multiprocessing,os,pathlib,sys,time,zipfile,math
ROOT=pathlib.Path(__file__).resolve().parents[2]
CONTROLLER=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/cosi-phone-portability-host-c4-20261013-a1')
OUTPUT=ROOT/'apps/recognition-lab/runs/phone-experiment/private-portability-host-c4-20261013-a1'
RUN_ID='portability-host-c4-20261013-a1'
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
 if any(type(a.get(key))is not int for key in ['tensorBudget','privateModelInferences','queryDenominator','maxSessionSeconds','perImageSeconds','producerSeconds','recordCount','newControlTensors','donorBytes']):raise ValueError('PORTABILITY_RECOVERY_AUTHORIZATION_INTEGER')
 if p.get('status')!='PUBLISHED_FOR_ONE_PORTABILITY_RECOVERY' or a.get('status')!='APPROVED_FOR_ONE_PORTABILITY_RECOVERY' or p.get('authorizationSha256')!=hashfile(authorization) or p.get('authorThreadId')!='01a098ef-d830-7531-bca7-2d66b0a5b587' or a.get('authorThreadId')!=p.get('authorThreadId') or p.get('runId')!=RUN_ID or a.get('runId')!=RUN_ID or p.get('runnerSha256')!=a.get('runnerSha256') or p.get('controllerSourceSha256')!=a.get('controllerSourceSha256') or a.get('privateModelInferences')!=0 or a.get('tensorBudget')!=0 or a.get('queryDenominator')!=20 or a.get('maxSessionSeconds')!=1500 or a.get('perImageSeconds')!=60 or a.get('producerSeconds')!=900:raise ValueError('PORTABILITY_AUTHORIZATION_BINDING')
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
 if a.get('operationKind')!='RECOVER_FROM_C3_FINALIZATION_FAILURE' or a.get('recordCount')!=40 or a.get('newControlTensors')!=0 or a.get('donorSha256')!=DONOR_SHA or a.get('donorBytes')!=DONOR_BYTES or a.get('donorOperation')!=DONOR_OPERATION or a.get('donorProvenanceSha256')!=hashfile(CONTROLLER/'donor-provenance.json'):raise ValueError('PORTABILITY_RECOVERY_AUTHORIZATION_BINDING')
 return contract,raw,directory
DONOR=ROOT/'apps/recognition-lab/runs/phone-experiment/private-portability-host-c3-20261013-a1/packet.pending.zip'
DONOR_SHA='059b6f93ee151b421123a9b18f6dafde7583e80da54abfaab96d5b3b18f2f92e'
DONOR_BYTES=131901810
DONOR_OPERATION='portability-host-c3-20261013-a1'
ORIGINAL_ATTEMPT=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/cosi-phone-portability-host-c3-20261013-a1/attempt-portability-host-c3-20261013-a1')
def load_archive():
 path=path_owned(ROOT/'tools/scripts/phone-portability-host-c4-archive.py',ROOT)
 index=strict((CONTROLLER/'controller-source-manifest.json').read_bytes());rows=[row for row in index['files'] if pathlib.Path(row['path'])==path]
 if len(rows)!=1 or path.stat().st_size!=rows[0]['bytes'] or hashfile(path)!=rows[0]['sha256']:raise ValueError('PORTABILITY_RECOVERY_ARCHIVE_SOURCE_PIN')
 spec=importlib.util.spec_from_file_location('portability_archive',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
def provenance():
 path=CONTROLLER/'donor-provenance.json';p=strict(path.read_bytes())
 if p.get('kind')!='PINNED_FAILED_C3_DONOR_PROVENANCE' or p.get('donorOperation')!=DONOR_OPERATION or p.get('donorSha256')!=DONOR_SHA or p.get('donorBytes')!=DONOR_BYTES or p.get('donorPath')!=str(DONOR) or p.get('originalAttempt')!=str(ORIGINAL_ATTEMPT):raise ValueError('PORTABILITY_RECOVERY_PROVENANCE_BINDING')
 seen=set();required={'session.json','result.json','stop-receipt.json','recovery-phase.json','offline-observed.json'}
 for row in p['files']:
  f=path_owned(pathlib.Path(row['path']),ORIGINAL_ATTEMPT)
  if f.name in seen or f.stat().st_size!=row['bytes'] or hashfile(f)!=row['sha256']:raise ValueError('PORTABILITY_RECOVERY_PROVENANCE_DRIFT')
  seen.add(f.name)
 if not required.issubset(seen):raise ValueError('PORTABILITY_RECOVERY_PROVENANCE_MISSING')
 session_path=ORIGINAL_ATTEMPT/'session.json';session=strict(session_path.read_bytes());result=strict((ORIGINAL_ATTEMPT/'result.json').read_bytes());stop=strict((ORIGINAL_ATTEMPT/'stop-receipt.json').read_bytes());phase=strict((ORIGINAL_ATTEMPT/'recovery-phase.json').read_bytes());offline=strict((ORIGINAL_ATTEMPT/'offline-observed.json').read_bytes())
 if session['RunId']!=DONOR_OPERATION or session['MaxSeconds']!=1500 or (datetime.datetime.fromisoformat(session['Deadline'])-datetime.datetime.fromisoformat(session['Started'])).total_seconds()!=1500:raise ValueError('PORTABILITY_RECOVERY_ORIGINAL_SESSION')
 for item in [result,stop,phase,offline]:
  if item['RunId']!=DONOR_OPERATION or item['Nonce']!=session['Nonce'] or item['SessionSha256']!=hashfile(session_path) or item['HelperId']!=result['HelperId'] or item['HelperStartTicks']!=result['HelperStartTicks'] or type(item['HelperId'])is not int or item['HelperId']<=0:raise ValueError('PORTABILITY_RECOVERY_ORIGINAL_IDENTITY')
 if result['Kind']!='MANUAL_ATTEMPT_RESULT' or result['Failure']!='PORTABILITY_PREPARATION_FAILED_NO_PARTIAL_PACKET' or result['PrivateExitCode']is not None or result['QueryDenominator']!=20 or result['Restoration']!='ORIGINAL_WLAN_AND_ROUTE_PRESENT':raise ValueError('PORTABILITY_RECOVERY_ORIGINAL_NOT_FAILED_CLOSED')
 if stop['Kind']!='OWNED_JOBS_CONFIRMED_EMPTY' or stop['JobsCreated']!=2 or stop['JobsDrained']!=2 or stop['ActiveChildren']!=0 or stop['ChildrenStopped']is not True or phase['Kind']!='STOPPED_RECOVERY_PHASE' or phase['WorkStopped']is not True or phase['MaxRecoverySeconds']!=240 or offline['Kind']!='ACTUAL_NATIVE_OFFLINE_OBSERVED':raise ValueError('PORTABILITY_RECOVERY_ORIGINAL_CLOSURE')
 if result['StopReceiptSha256']!=hashfile(ORIGINAL_ATTEMPT/'stop-receipt.json') or result['RecoveryPhaseSha256']!=hashfile(ORIGINAL_ATTEMPT/'recovery-phase.json') or stop['RecoveryPhaseSha256']!=result['RecoveryPhaseSha256']:raise ValueError('PORTABILITY_RECOVERY_ORIGINAL_HASHES')
 for key in ['JobsCreated','JobsDrained','ActiveChildren']:
  if type(stop[key])is not int:raise ValueError('PORTABILITY_RECOVERY_ORIGINAL_CLOSURE')
 start=datetime.datetime.fromisoformat(session['Started']);end=datetime.datetime.fromisoformat(session['Deadline']);p_at=datetime.datetime.fromisoformat(phase['At']);p_end=datetime.datetime.fromisoformat(phase['RecoveryDeadline']);s_at=datetime.datetime.fromisoformat(stop['At']);r_at=datetime.datetime.fromisoformat(result['At']);o_at=datetime.datetime.fromisoformat(offline['At'])
 if (p_end-p_at).total_seconds()!=240 or not start<=o_at<=end or p_at>end+datetime.timedelta(seconds=30) or not p_at<=s_at<=r_at<=p_end or r_at>datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(seconds=2):raise ValueError('PORTABILITY_RECOVERY_ORIGINAL_TIME_BOUND')
 return p
def run(args):
 stage='AUTHORITY'
 try:
  contract,raw,directory=gate(args,offline=not args.preflight)
  stage='PROVENANCE';proof=provenance();library=load_archive()
  stage='DONOR_STRUCTURE'
  if library.hashfile(DONOR)!=(DONOR_SHA,DONOR_BYTES):raise ValueError('PORTABILITY_ARCHIVE_DONOR_BINDING')
  library.validate(DONOR,contract,raw,False)
  if args.preflight:print('CONNECTED_PREFLIGHT_PASSED');return 0
  stage='OUTPUT_CLAIM'
  if not OUTPUT.is_dir() or not (OUTPUT/'attempt-claim.json').is_file():raise ValueError('PORTABILITY_RECOVERY_NEW_OUTPUT_CLAIM')
  claim=strict((OUTPUT/'attempt-claim.json').read_bytes())
  if any(type(claim.get(key))is not int for key in ['TensorBudget','PrivateModelInferences','QueryDenominator']):raise ValueError('PORTABILITY_RECOVERY_OUTPUT_CLAIM_BINDING')
  if claim.get('RunId')!=RUN_ID or claim.get('RecoverySha256')!=hashfile(args.session) or claim.get('TensorBudget')!=0 or claim.get('PrivateModelInferences')!=0 or claim.get('QueryDenominator')!=20 or claim.get('DonorSha256')!=DONOR_SHA:raise ValueError('PORTABILITY_RECOVERY_OUTPUT_CLAIM_BINDING')
  started=time.monotonic();session_hash=hashfile(args.session)
  def guard():
   if time.monotonic()-started>=900 or hashfile(args.session)!=session_hash or datetime.datetime.now(datetime.timezone.utc)>=datetime.datetime.fromisoformat(strict(args.session.read_bytes())['Deadline']) or (directory/'cancel.json').exists() or (directory/'recovery-phase.json').exists():raise ValueError('PORTABILITY_RECOVERY_STOPPED_OR_EXPIRED')
  stage='RECOVERY'
  receipt=dict(runId=RUN_ID,sessionSha256=session_hash,offlineReceiptSha256=hashfile(directory/'offline-observed.json'),donorOperation=DONOR_OPERATION,donorPath=str(DONOR),donorSha256=DONOR_SHA,donorBytes=DONOR_BYTES,donorProvenanceSha256=hashfile(CONTROLLER/'donor-provenance.json'),originalFailedResultSha256=hashfile(ORIGINAL_ATTEMPT/'result.json'),originalStopReceiptSha256=hashfile(ORIGINAL_ATTEMPT/'stop-receipt.json'))
  library.recover(DONOR,OUTPUT,contract,raw,DONOR_SHA,DONOR_BYTES,receipt,guard)
  gate(args,True);provenance()
  print('PRIVATE_PORTABILITY_ARCHIVE_RECOVERED_NEW_CLOSURE_REQUIRED_NO_NEW_TENSORS');return 0
 except Exception as error:
  code=getattr(error,'code',str(error));where=getattr(error,'stage',stage)
  if not (code.startswith('PORTABILITY_') and len(code)<=128 and all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_' for c in code)):code='PORTABILITY_RECOVERY_FAILED_PRIVATE_DETAILS_WITHHELD'
  message='PORTABILITY_STAGE_'+where+':'+code
  try:print(message,file=sys.stderr)
  except Exception:
   try:print('PORTABILITY_DIAGNOSTIC_WRITE_FAILED:'+message)
   except Exception:pass
  return 1
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--preflight',action='store_true');parser.add_argument('--session',required=True,type=pathlib.Path);return run(parser.parse_args())
if __name__=='__main__':sys.exit(main())
