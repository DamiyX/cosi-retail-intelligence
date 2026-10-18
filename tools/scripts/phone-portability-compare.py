"""Future numerical-only comparator. No image decoder, model, camera or network access."""
import argparse,hashlib,json,pathlib,struct,subprocess,zipfile,math
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2]
sha=lambda b:hashlib.sha256(b).hexdigest()
def strict(raw):
 if len(raw)>2*1024*1024:raise ValueError('PORTABILITY_JSON_BOUND')
 def pairs(items):
  out={}
  for k,v in items:
   if k in out:raise ValueError('PORTABILITY_JSON_DUPLICATE')
   out[k]=v
  return out
 def finite(token):
  value=float(token)
  if not math.isfinite(value):raise ValueError('PORTABILITY_NONFINITE')
  return value
 return json.loads(raw.decode('utf-8'),object_pairs_hook=pairs,parse_float=finite,parse_constant=lambda _:(_ for _ in ()).throw(ValueError('PORTABILITY_NONFINITE')))
def contract():
 source=(ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilityPins.java').read_text()
 literal=source.split('MANIFEST = ',1)[1].split(';\n',1)[0] if 'MANIFEST = ' in source else source.split('MANIFEST=',1)[1].split(';',1)[0]
 raw=json.loads(literal).encode();return strict(raw),raw
def archive(path,cap):
 if path.is_symlink() or not path.is_file() or path.stat().st_size>cap:raise ValueError('PORTABILITY_ZIP_BOUND')
 z=zipfile.ZipFile(path);rows=z.infolist();names=[e.filename for e in rows]
 if len(names)!=len(set(names)) or z.comment or len(names)>161 or sum(e.file_size for e in rows)>cap:raise ValueError('PORTABILITY_ZIP_COUNT_OR_DUPLICATE')
 end=path.stat().st_size-22
 with path.open('rb') as f:
  f.seek(end);eocd=f.read(22);sig,disk,cdisk,n1,n2,size,offset,comment=struct.unpack('<IHHHHIIH',eocd)
  if (sig,disk,cdisk,n1,n2,comment)!=(0x06054b50,0,0,len(rows),len(rows),0) or offset+size!=end:raise ValueError('PORTABILITY_ZIP_DIRECTORY')
  cursor=0
  for e in rows:
   if e.flag_bits&~2048 or e.compress_type!=0 or e.compress_size!=e.file_size or e.extra or e.comment or '..' in e.filename or '\\' in e.filename or e.filename.startswith('/') or e.header_offset!=cursor:raise ValueError('PORTABILITY_ZIP_TYPE_OR_PATH')
   f.seek(cursor);header=f.read(30);values=struct.unpack('<IHHHHHIIIHH',header);sig,ver,flags,method,t,d,crc,compressed,rawsize,nlen,extra=values
   name=f.read(nlen)
   if (sig,flags,method,crc,compressed,rawsize,extra)!=(0x04034b50,e.flag_bits,0,e.CRC,e.file_size,e.file_size,0) or name.decode('utf-8')!=e.filename:raise ValueError('PORTABILITY_ZIP_LOCAL_AGREEMENT')
   cursor+=30+nlen+e.file_size
  if cursor!=offset:raise ValueError('PORTABILITY_ZIP_GAP')
 return z,names
def unit(v):
 if len(v)!=1024 or not all(np.isfinite(x) for x in v):raise ValueError('PORTABILITY_VECTOR_VALUE')
 scale=max(abs(x) for x in v)
 if scale==0:raise ValueError('PORTABILITY_VECTOR_ZERO')
 scaled=[x/scale for x in v];norm=sum(x*x for x in scaled)**.5;return [x/norm for x in scaled]
def lane(frames,vectors,name):
 refs=[f for f in frames if f['role']=='reference'];failed=[f['id'] for f in refs if f['id'] not in vectors];norm={k:unit(v) for k,v in vectors.items()};queries=[]
 for f in sorted((f for f in frames if f['role']=='query'),key=lambda f:f['id']):
  candidates=[]
  if not failed and f['id'] in vectors:
   q=norm[f['id']]
   for p in sorted(set(f['productId'] for f in refs)):
    scored=[]
    for r in refs:
     if r['productId']==p:scored.append((max(-1,min(1,sum(a*b for a,b in zip(q,norm[r['id']])))),r['id']))
    scored.sort(key=lambda x:(-x[0],x[1]));candidates.append(dict(productId=p,nearestReferenceId=scored[0][1],score=scored[0][0]))
   candidates.sort(key=lambda c:(-c['score'],c['productId']))
  rank=next((i+1 for i,c in enumerate(candidates) if c['productId']==f['productId']),None)
  queries.append(dict(id=f['id'],truth=f['productId'],candidates=candidates,failure='INCOMPLETE_GALLERY' if failed else 'QUERY_FAILED' if f['id'] not in vectors else None,correctRank=rank))
 return dict(lane=name,denominator=20,first=sum(q['correctRank']==1 for q in queries),firstThree=sum(q['correctRank'] is not None and q['correctRank']<=3 for q in queries),failedReferences=failed,queries=queries,complete=not failed and len(vectors)==40)
def equal(a,b):
 if type(a) in (float,int):
  if type(b) not in (float,int) or not np.isfinite(b) or abs(a-b)>1e-12:raise ValueError('PORTABILITY_NUMERIC_MISMATCH')
 elif isinstance(a,dict):
  if not isinstance(b,dict) or a.keys()!=b.keys():raise ValueError('PORTABILITY_OBJECT_MISMATCH')
  for k in a:equal(a[k],b[k])
 elif isinstance(a,list):
  if not isinstance(b,list) or len(a)!=len(b):raise ValueError('PORTABILITY_LIST_MISMATCH')
  for x,y in zip(a,b):equal(x,y)
 elif a!=b:raise ValueError('PORTABILITY_VALUE_MISMATCH')
def compare(packet_path,result_path,output,manifest=None,manifest_raw=None):
 if output.exists():raise ValueError('PORTABILITY_NEW_OUTPUT_REQUIRED')
 if manifest is None:manifest,manifest_raw=contract()
 p,pnames=archive(packet_path,128*1024*1024);z,znames=archive(result_path,48*1024*1024)
 try:
  frames=manifest['records'];expected=['manifest.json',*[m['path'] for m in manifest['metadata']],*[n for f in frames for n in (f['jpegPath'],f['tensorPath'])]]
  if pnames!=expected or p.read('manifest.json')!=manifest_raw:raise ValueError('PORTABILITY_MANIFEST_OR_ORDER')
  for m in manifest['metadata']:
   raw=p.read(m['path'])
   if len(raw)!=m['bytes'] or sha(raw)!=m['sha256']:raise ValueError('PORTABILITY_METADATA_PIN')
   strict(raw)
  baseline=strict(p.read('bundle.json'));base={r['id']:r['values'] for r in baseline['records']};receipt=strict(z.read('receipt.json'))
  with packet_path.open('rb') as stream:packet_sha=hashlib.file_digest(stream,'sha256').hexdigest()
  source=(ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilitySource.java').read_text().split('SHA256="')[1].split('"')[0]
  pins=dict(schemaVersion=1,kind='PRIVATE_PHONE_PORTABILITY_RESULTS',manifestSha256=sha(manifest_raw),packetSha256=packet_sha,replaySourceSha256=source,modelSha256=manifest['modelSha256'],runtime='FROM_APPLICATION_ONLY',threads=1,xnnpack=False,nnapi=False,gpu=False)
  for k,v in pins.items():equal(v,receipt.get(k))
  if len(receipt['records'])!=80 or len(receipt['lanes'])!=2 or type(receipt['attemptedInferences']) is not int or not 0<=receipt['attemptedInferences']<=80:raise ValueError('PORTABILITY_RESULT_COUNTS')
  ledger=receipt['files'];names=[e['path'] for e in ledger]
  if znames!=names+['receipt.json'] or len(names)!=len(set(names)):raise ValueError('PORTABILITY_RESULT_LEDGER')
  indexed={e['path']:e for e in ledger};observations=[];vectors={};tensors={};expected_outputs=[];produced=0
  for lane_name in ('control','phone'):
   vectors[lane_name]={}
   for i,f in enumerate(frames):
    row=receipt['records'][i+(0 if lane_name=='control' else 40)];identity=f['id']
    if row['id']!=identity or row['lane']!=lane_name or row['kind'] not in ('vector','failure'):raise ValueError('PORTABILITY_RECORD_ORDER')
    if type(row.get('totalMs')) not in (int,float) or not math.isfinite(row['totalMs']) or row['totalMs']<0:raise ValueError('PORTABILITY_RECORD_TIMING')
    success=row['kind']=='vector'
    if not success and row.get('code') not in ('NOT_RUN','CANCELLED','FRAME_FAILED','TIMEOUT'):raise ValueError('PORTABILITY_FAILURE_KIND')
    emitted='tensorSha256' in row or 'vectorSha256' in row
    if success and not emitted or emitted and not success and row.get('code')!='TIMEOUT':raise ValueError('PORTABILITY_SUCCESS_EVIDENCE')
    if emitted:
     if type(row.get('inferenceMs')) not in (int,float) or not math.isfinite(row['inferenceMs']) or row['inferenceMs']<0:raise ValueError('PORTABILITY_INFERENCE_TIMING')
     produced+=1
     for suffix,size,key in [('tensor',602112,'tensorSha256'),('vector',4096,'vectorSha256')]:
      path=f'{lane_name}/{identity}.{suffix}.f32le';expected_outputs.append(path);entry=indexed[path];raw=z.read(path)
      if len(raw)!=size or entry['bytes']!=size or sha(raw)!=entry['sha256'] or sha(raw)!=row[key]:raise ValueError('PORTABILITY_OUTPUT_HASH_OR_SIZE')
      v=np.frombuffer(raw,dtype='<f4')
      if not np.isfinite(v).all():raise ValueError('PORTABILITY_OUTPUT_NONFINITE')
      if suffix=='tensor':
       if (v<0).any() or (v>1).any() or lane_name=='control' and sha(raw)!=f['tensorSha256']:raise ValueError('PORTABILITY_TENSOR_PIN_OR_RANGE')
       if success:tensors[(lane_name,identity)]=path
      else:
       values=v.astype(np.float64).tolist();unit(values)
       if success:vectors[lane_name][identity]=values
    observations.append(dict(id=identity,lane=lane_name,kind='vector',values=vectors[lane_name][identity],tensorSha256=row['tensorSha256']) if success else dict(id=identity,lane=lane_name,kind='failure',code=row['code']))
   equal(lane(frames,vectors[lane_name],lane_name),receipt['lanes'][0 if lane_name=='control' else 1])
  if expected_outputs!=names or produced>receipt['attemptedInferences']:raise ValueError('PORTABILITY_EXTRA_OUTPUT_OR_ATTEMPTS')
  tensor_comparisons=[]
  for f in frames:
   if all((l,f['id']) in tensors for l in ('control','phone')):
    a=np.frombuffer(z.read(tensors[('control',f['id'])]),dtype='<f4').astype(np.float64);b=np.frombuffer(z.read(tensors[('phone',f['id'])]),dtype='<f4').astype(np.float64);delta=np.abs(a-b)
    tensor_comparisons.append(dict(id=f['id'],unequalComponents=int(np.count_nonzero(a!=b)),maxAbsoluteDifference=float(delta.max()),meanAbsoluteDifference=float(delta.mean())))
  with result_path.open('rb') as stream:result_sha=hashlib.file_digest(stream,'sha256').hexdigest()
  input=dict(schemaVersion=1,kind='PRIVATE_PORTABILITY_NUMERICAL_COMPARISON',manifestSha256=pins['manifestSha256'],replaySourceSha256=source,packetSha256=packet_sha,resultSha256=result_sha,modelSha256=manifest['modelSha256'],frames=[{k:f[k] for k in ('id','role','productId','tensorSha256')} for f in frames],observations=observations,baseline=[dict(id=f['id'],values=base[f['id']]) for f in frames],tensorComparisons=tensor_comparisons)
  output.mkdir();input_path=output/'numerical-input.private.json';input_path.write_text(json.dumps(input,separators=(',',':'))+'\n')
  node=pathlib.Path(r'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe');done=subprocess.run([str(node),str(ROOT/'apps/recognition-lab/src/phonePortabilityCli.ts'),'--input',str(input_path),'--output',str(output/'comparison.private.json')],capture_output=True,text=True);(output/'comparator.stdout.log').write_text(done.stdout);(output/'comparator.stderr.log').write_text(done.stderr)
  if done.returncode not in (0,2):raise ValueError('PORTABILITY_TYPESCRIPT_COMPARATOR_FAILED')
  report=json.loads((output/'comparison.private.json').read_bytes())
  for i,row in enumerate(receipt['records'][:40]):
   if row['kind']=='vector':
    calculated=report['runtimeParity'][i];equal({k:calculated[k] for k in ['maxComponentError','cosineDistance','rawMaxAbsoluteDifference','rawMeanAbsoluteDifference','passesFrozenTolerance']},row['runtimeParity'])
  for name in ('control','phone','baseline'):
   computed=lane(frames,base if name=='baseline' else vectors[name],name);saved=report[name]
   # TS retains additional near-tie/margin annotations; compare every core score/rank.
   subset={k:saved[k] for k in computed if k!='queries'};subset['queries']=[{k:q[k] for k in computed['queries'][i]} for i,q in enumerate(saved['queries'])];equal(computed,subset)
  (output/'independent-checks.json').write_text(json.dumps(dict(allRecords=80,queryDenominator=20,lanes=2,independentScoresAgree=True,resultSha256=result_sha,complete=report['complete'],privateImagesDecoded=False,modelExecuted=False),indent=2)+'\n')
  return dict(complete=report['complete'],runtimeParityPassed=report['runtimeParityPassed'],independentScoresAgree=True)
 finally:p.close();z.close()
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--packet',required=True,type=pathlib.Path);parser.add_argument('--result',required=True,type=pathlib.Path);parser.add_argument('--output',required=True,type=pathlib.Path);parser.add_argument('--expected-result-sha256',required=True);args=parser.parse_args()
 if len(args.expected_result_sha256)!=64 or any(c not in '0123456789abcdef' for c in args.expected_result_sha256):raise ValueError('PORTABILITY_EXPECTED_HASH')
 with args.result.open('rb') as stream:actual=hashlib.file_digest(stream,'sha256').hexdigest()
 if actual!=args.expected_result_sha256:raise ValueError('PORTABILITY_DEVICE_EXPORT_HASH_MISMATCH')
 print(json.dumps(compare(args.packet.resolve(),args.result.resolve(),args.output.resolve())))
if __name__=='__main__':main()
