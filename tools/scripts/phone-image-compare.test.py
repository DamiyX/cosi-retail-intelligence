"""Synthetic packet counterexamples only; no phone, Android decoder or inference."""
import unittest,pathlib,json,hashlib,importlib.util,zipfile,io,copy
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2];RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-image-pipeline-20261012-a1'
def load(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
compare=load('image_compare',ROOT/'tools/scripts/phone-image-compare.py');oracle=load('image_oracle',ROOT/'tools/scripts/phone-image-oracles.py')
ASSETS=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/src/main/assets';SPEC=json.loads((RUN/'generated-oracles/image-stage-spec.json').read_bytes())
def packet(files):
 out=io.BytesIO()
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as z:
  for name,b in files.items():z.writestr(name,b)
 return out.getvalue()
def synthesize():
 files={};rows=[];ledger=[]
 for c in SPEC['cases']:
  if c['source']['format']=='JPEG':p=ASSETS/'recognition-image-experiment'/(c['source']['path'].split('/')[-1].replace('.jpg','.encoded.rgb'))
  else:p=ASSETS/c['source']['path']
  encoded=np.frombuffer(p.read_bytes(),dtype=np.uint8).reshape(c['rawHeight'],c['rawWidth'],3);upright=compare.orient(encoded,c['orientation']);l,t,r,b=c['effectiveBox'];crop=upright[t:b,l:r]
  pad=np.frombuffer(oracle.bilinear(crop),dtype=np.uint8).reshape(224,224,3);tensor=pad.reshape(-1).astype(np.float32)/np.float32(255)
  frozen=np.frombuffer((ASSETS/c['uprightOracle']['path']).read_bytes(),dtype=np.uint8).reshape(c['uprightHeight'],c['uprightWidth'],3);fp=np.frombuffer((ASSETS/c['phoneResizeOracle']['path']).read_bytes(),dtype=np.uint8).reshape(224,224,3)
  row={k:c[k] for k in ['id','orientation','rawWidth','rawHeight','uprightWidth','uprightHeight','effectiveBox','letterbox']};row.update(sourceSha256=c['source']['sha256'],sourceFormat=c['source']['format'],decodeAndReadMs=0,processingMs=0,caseTotalMs=0)
  row.update(decodedUprightVsPillowRgb=compare.delta(upright,frozen),cropVsFrozenRgb=compare.delta(crop,frozen[t:b,l:r]),resizeVsFrozenBilinearRgb=compare.delta(pad,fp),tensorVsFrozenBilinear=compare.delta(tensor,fp.reshape(-1).astype(np.float32)/np.float32(255)),tensorVsFrozenPillowLanczos=compare.delta(tensor,np.frombuffer((ASSETS/c['pillowOracle']['path']).read_bytes(),dtype='<f4')))
  if 'guide' in c:
   e=c['guide']['expected'];row['guideActual']=[e['orientedWidth'],e['orientedHeight'],*[e['guide'][k] for k in ['left','top','right','bottom']],*[e['effectiveCrop'][k] for k in ['left','top','right','bottom']],*[e['encodedCrop'][k] for k in ['left','top','right','bottom']],e['scale'],e['offsetX'],e['offsetY']];row['guideMaxError']=0
  for suffix,a in [('encoded.rgb',encoded),('upright.rgb',upright),('crop.rgb',crop),('letterbox.rgb',pad),('tensor.f32le',tensor.astype('<f4'))]:
   raw=a.tobytes();name=c['id']+'/'+suffix;files[name]=raw;ledger.append(dict(path=name,bytes=len(raw),sha256=compare.sha(raw)))
  rows.append(row)
 receipt=dict(schemaVersion=1,kind='GENERATED_IMAGE_PHONE_OUTPUTS',hostSynthetic=True,recipe=SPEC['recipe'],specSha256=compare.SPEC_SHA,caseCount=42,modelExecuted=False,cases=rows,files=ledger,uncompressedOutputBytes=sum(r['bytes'] for r in ledger))
 files['receipt.json']=json.dumps(receipt).encode();return files
class Tests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.files=synthesize();cls.bundle=packet(cls.files);(RUN/'host-synthetic-complete-packet.zip').write_bytes(cls.bundle)
 def check(self,files):return compare.compare(packet(files),SPEC,ASSETS)
 def mutateReceipt(self,fn):
  files=dict(self.files);r=json.loads(files['receipt.json']);fn(r);files['receipt.json']=json.dumps(r).encode();return files
 def test_complete_synthetic_packet(self):self.assertEqual(compare.compare(self.bundle,SPEC,ASSETS)['exactStagesPassed'],42)
 def test_missing(self):
  f=dict(self.files);f.pop('orientation-1-jpeg-full/tensor.f32le')
  with self.assertRaises(AssertionError):self.check(f)
 def test_unlisted_path(self):
  f=dict(self.files);f['../private.jpg']=f.pop('orientation-1-jpeg-full/tensor.f32le')
  with self.assertRaises(AssertionError):self.check(f)
 def test_wrong_payload_hash(self):
  f=dict(self.files);name='orientation-1-jpeg-full/encoded.rgb';b=bytearray(f[name]);b[0]^=1;f[name]=bytes(b)
  with self.assertRaises(AssertionError):self.check(f)
 def test_inference_claim(self):
  with self.assertRaises(AssertionError):self.check(self.mutateReceipt(lambda r:r.update(modelExecuted=True)))
 def test_recipe_substitution(self):
  with self.assertRaises(AssertionError):self.check(self.mutateReceipt(lambda r:r.update(recipe='Pillow-exact')))
 def test_source_substitution(self):
  def bad(r):r['cases'][0]['sourceSha256']='0'*64
  with self.assertRaises(AssertionError):self.check(self.mutateReceipt(bad))
 def test_fabricated_success_metric(self):
  def bad(r):r['cases'][0]['tensorVsFrozenPillowLanczos']['mismatchCount']=0
  with self.assertRaises(AssertionError):self.check(self.mutateReceipt(bad))
 def test_crop_defect_with_honest_hashes_and_metrics_is_detected(self):
  f=dict(self.files);name='orientation-1-jpeg-full/crop.rgb';b=bytearray(f[name]);b[0]^=1;f[name]=bytes(b);r=json.loads(f['receipt.json'])
  for row in r['files']:
   if row['path']==name:row['sha256']=compare.sha(f[name])
  frozen=np.frombuffer((ASSETS/SPEC['cases'][0]['uprightOracle']['path']).read_bytes(),dtype=np.uint8).reshape(23,37,3)
  r['cases'][0]['cropVsFrozenRgb']=compare.delta(np.frombuffer(f[name],dtype=np.uint8).reshape(23,37,3),frozen);f['receipt.json']=json.dumps(r).encode()
  result=self.check(f);self.assertEqual(result['exactStagesPassed'],41);self.assertEqual(result['cases'][0]['crop']['mismatchCount'],1)
if __name__=='__main__':unittest.main(verbosity=2)
