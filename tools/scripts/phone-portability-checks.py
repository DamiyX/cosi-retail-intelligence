"""Generated-only strict packet, geometry, rank and result validation checks."""
import hashlib,json,pathlib,struct,subprocess,sys,zipfile,io,copy
ROOT=pathlib.Path(__file__).resolve().parents[2]
RUN=pathlib.Path(sys.argv[1]).resolve()
assert RUN.parent==ROOT/'apps/recognition-lab/runs/phone-experiment' and (RUN.name in ('p1-portability-preparation-20261012-a1','p1-portability-c1-20261012-a1') or __import__('re').fullmatch(r'p1-portability-audit-[a-zA-Z0-9-]{1,64}',RUN.name))
assert RUN.is_dir() and not (RUN/'stopped.json').exists(), 'A fresh explicit generated run is required; frozen writer evidence cannot be overwritten.'
JAVA=pathlib.Path(r'C:/Users/doyew/.cache/cosi-p1-20261012-a1/jdk17/bin')
SRC=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src'
sha=lambda b:hashlib.sha256(b).hexdigest()
encode=lambda o:(json.dumps(o,sort_keys=True,separators=(',',':'))+'\n').encode()
def stored(target,entries):
 with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_STORED,allowZip64=False) as z:
  for name,b in entries:z.writestr(name,b)
def main():
 out=RUN/'generated-portability';out.mkdir(exist_ok=True);classes=out/'classes';classes.mkdir(exist_ok=True)
 tensor=struct.pack('<f',0.5)*(224*224*3);jpeg=b'\xff\xd8GENERATED-CONTAINER-ONLY\xff\xd9';frames=[];baseline=[];entries=[]
 model='bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40'
 for p in range(1,11):
  for role in ('reference','query'):
   for n in (1,2):
    identity=f'p{p:02d}-'+('ref' if role=='reference' else 'query')+f'-{n}';vector=[0.0]*1024;vector[p-1]=1.0
    f=dict(id=identity,role=role,productId=f'p{p:02d}',jpegPath='images/'+identity+'.jpg',jpegSha256=sha(jpeg),jpegBytes=len(jpeg),width=3,height=2,orientation=1,effectiveBox=[0,0,3,2],tensorPath='controls/'+identity+'.f32le',tensorSha256=sha(tensor),tensorBytes=len(tensor));frames.append(f);baseline.append(dict(id=identity,kind='vector',values=vector));entries.extend([(f['jpegPath'],jpeg),(f['tensorPath'],tensor)])
 metadata=[('comparison.json',encode(dict(generated=True))),('annotations.json',encode(dict(generated=True))),('bundle.json',encode(dict(records=baseline,modelSha256=model,runFailure=None)))]
 contract=dict(schemaVersion=1,kind='PRIVATE_PHONE_PORTABILITY_PACKET',modelSha256=model,controlRecipe='frozen-laptop-product-box-lanczos-v1',phoneRecipe='generated-android-bitmap-rgb-center-bilinear-u8-v1',records=frames,metadata=[dict(path=n,sha256=sha(b),bytes=len(b)) for n,b in metadata]);manifest=encode(contract)
 pins=out/'PhonePortabilityPins.java';pins.write_text('package expo.modules.recognitioncpu; public final class PhonePortabilityPins { public static final String MANIFEST='+json.dumps(manifest.decode())+'; public static final String MANIFEST_SHA="'+sha(manifest)+'";}')
 files=['GeneratedEvidenceStore.java','GeneratedImageGeometry.java','PhonePortabilityJson.java','PhonePortabilityZip.java','PhonePortabilityPacket.java','PhonePortabilityRank.java','PhonePortabilityImage.java','PhonePortabilitySource.java','PhonePortabilityResult.java']
 sources=[SRC/'main/java/expo/modules/recognitioncpu'/n for n in files]+[pins,SRC/'test/java/expo/modules/recognitioncpu/PhonePortabilityChecks.java']
 subprocess.run([str(JAVA/'javac.exe'),'-d',str(classes),*[str(p) for p in sources]],check=True)
 command=[str(JAVA/'java.exe'),'-cp',str(classes),'expo.modules.recognitioncpu.PhonePortabilityChecks']
 checks=[]
 def run(label,args,passing=True):
  result=subprocess.run([*command,*map(str,args)],capture_output=True,text=True);(out/(label+'.stdout.log')).write_text(result.stdout);(out/(label+'.stderr.log')).write_text(result.stderr)
  checks.append(dict(name=label,exit=result.returncode,expectedPass=passing));assert (result.returncode==0)==passing,(label,result.stderr[-1200:])
 run('geometry-rank-json',[])
 packet=out/'generated-packet.zip';allentries=[('manifest.json',manifest),*metadata,*entries];stored(packet,allentries);run('valid-packet',['packet',packet])
 bads={'wrong-hash':[(n,b+b'x' if i==4 else b) for i,(n,b) in enumerate(allentries)],'reordered':list(reversed(allentries)),'traversal':[('../manifest.json' if i==0 else n,b) for i,(n,b) in enumerate(allentries)],'duplicate-entry':allentries+[allentries[-1]],'missing-entry':allentries[:-1],'wrong-manifest':[('manifest.json',manifest.replace(b'"schemaVersion":1',b'"schemaVersion":2')),*allentries[1:]]}
 for label,values in bads.items():target=out/(label+'.zip');stored(target,values);run(label,['packet',target],False)
 corrupted=bytearray(packet.read_bytes());corrupted[50]^=1;target=out/'corrupt-crc.zip';target.write_bytes(corrupted);run('corrupt-crc',['packet',target],False)
 target=out/'truncated.zip';target.write_bytes(packet.read_bytes()[:-1]);run('truncated',['packet',target],False)
 target=out/'compressed.zip'
 with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as z:
  for n,b in allentries:z.writestr(n,b)
 run('compressed',['packet',target],False)
 # All outputs are generated one-hot controls. Full 80-record result exercises every ledger/hash/rank.
 records=[];resultentries=[];lanes=[];ledger=[]
 for lane in ('control','phone'):
  for f,base in zip(frames,baseline):
   vb=struct.pack('<1024f',*base['values']);row=dict(id=f['id'],lane=lane,kind='vector',totalMs=1,inferenceMs=0.1,tensorSha256=sha(tensor),vectorSha256=sha(vb))
   if lane=='control':row['runtimeParity']=dict(maxComponentError=0,cosineDistance=0,rawMaxAbsoluteDifference=0,rawMeanAbsoluteDifference=0,passesFrozenTolerance=True)
   records.append(row)
   for suffix,b in [('tensor',tensor),('vector',vb)]:n=f"{lane}/{f['id']}.{suffix}.f32le";resultentries.append((n,b));ledger.append(dict(path=n,bytes=len(b),sha256=sha(b)))
  queries=[]
  for f in sorted((f for f in frames if f['role']=='query'),key=lambda f:f['id']):
   candidates=[dict(productId=f'p{p:02d}',nearestReferenceId=f'p{p:02d}-ref-1',score=1 if f['productId']==f'p{p:02d}' else 0) for p in range(1,11)];candidates.sort(key=lambda c:(-c['score'],c['productId']));queries.append(dict(id=f['id'],truth=f['productId'],candidates=candidates,failure=None,correctRank=1))
  lanes.append(dict(lane=lane,denominator=20,first=20,firstThree=20,failedReferences=[],queries=queries,complete=True))
 source=(SRC/'main/java/expo/modules/recognitioncpu/PhonePortabilitySource.java').read_text().split('SHA256="')[1].split('"')[0]
 receipt=dict(schemaVersion=1,kind='PRIVATE_PHONE_PORTABILITY_RESULTS',manifestSha256=sha(manifest),packetSha256=sha(packet.read_bytes()),replaySourceSha256=source,modelSha256=model,runtime='FROM_APPLICATION_ONLY',threads=1,xnnpack=False,nnapi=False,gpu=False,attemptedInferences=80,records=records,lanes=lanes,files=ledger,totalMs=80)
 target=out/'generated-result.zip';stored(target,[*resultentries,('receipt.json',encode(receipt))]);run('valid-result',['result',packet,target])
 for label,mutate in [('stale-source',lambda r:r.update(replaySourceSha256='0'*64)),('wrong-options',lambda r:r.update(threads=2)),('partial-records',lambda r:r.update(records=r['records'][:-1])),('rank-tamper',lambda r:r['lanes'][0]['queries'][0].update(correctRank=2)),('hash-tamper',lambda r:r['files'][0].update(sha256='0'*64)),('attempt-ceiling',lambda r:r.update(attemptedInferences=81)),('packet-mismatch',lambda r:r.update(packetSha256='0'*64))]:
  bad=copy.deepcopy(receipt);mutate(bad);target=out/(label+'.zip');stored(target,[*resultentries,('receipt.json',encode(bad))]);run(label,['result',packet,target],False)
 # A failed reference invalidates only its own gallery; cancelled/late queries retain 20 denominator.
 bad=copy.deepcopy(receipt);bad['records'][0]=dict(id=frames[0]['id'],lane='control',kind='failure',code='CANCELLED',totalMs=0);bad['files']=bad['files'][2:];bad['lanes'][0].update(first=0,firstThree=0,complete=False,failedReferences=[frames[0]['id']])
 for q in bad['lanes'][0]['queries']:q.update(candidates=[],failure='INCOMPLETE_GALLERY',correctRank=None)
 target=out/'cancelled-result.zip';stored(target,[*resultentries[2:],('receipt.json',encode(bad))]);run('cancelled-result',['result',packet,target])
 (RUN/'generated-portability-checks.json').write_bytes(encode(dict(checks=checks,generatedOnly=True,androidDecoderExecuted=False,modelExecuted=False,privatePixelsDecoded=False)))
 print(json.dumps(dict(checks=len(checks),expectedFailures=sum(not c['expectedPass'] for c in checks),generatedOnly=True)))
if __name__=='__main__':main()
