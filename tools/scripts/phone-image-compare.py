"""Validate the complete generated-only exported ZIP and independently compare stages."""
import argparse,hashlib,json,pathlib,zipfile,importlib.util,math
import numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[2]
SPEC_SHA='001741899a70a9b6b6d2f06d710ac46e26a6b47714c51c113093f33981c80bfc'
def sha(b):return hashlib.sha256(b).hexdigest()
def delta(a,b):
 assert a.shape==b.shape
 d=np.abs(a.astype(np.float64)-b.astype(np.float64));return dict(components=int(d.size),mismatchCount=int(np.count_nonzero(d)),maxAbsoluteError=float(d.max()),meanAbsoluteError=float(d.mean()))
def orient(a,o):
 transforms={2:Image.Transpose.FLIP_LEFT_RIGHT,3:Image.Transpose.ROTATE_180,4:Image.Transpose.FLIP_TOP_BOTTOM,5:Image.Transpose.TRANSPOSE,6:Image.Transpose.ROTATE_270,7:Image.Transpose.TRANSVERSE,8:Image.Transpose.ROTATE_90}
 return np.asarray(Image.fromarray(a).transpose(transforms[o])) if o!=1 else a
def compare(bundle,spec,assets):
 modspec=importlib.util.spec_from_file_location('generated_oracles',ROOT/'tools/scripts/phone-image-oracles.py');module=importlib.util.module_from_spec(modspec);modspec.loader.exec_module(module)
 assert len(bundle)<=48*1024*1024
 import io
 with zipfile.ZipFile(io.BytesIO(bundle)) as z:
  entries=z.infolist();names=[e.filename for e in entries]
  expected={c['id']+'/'+s for c in spec['cases'] for s in ['encoded.rgb','upright.rgb','crop.rgb','letterbox.rgb','tensor.f32le']}|{'receipt.json'}
  assert len(entries)==211 and len(set(names))==211 and set(names)==expected
  assert all(not e.flag_bits&1 and not e.is_dir() and e.file_size<=1048576 for e in entries) and sum(e.file_size for e in entries)<=48*1024*1024
  receipt=json.loads(z.read('receipt.json'));assert receipt['schemaVersion']==1 and receipt['kind']=='GENERATED_IMAGE_PHONE_OUTPUTS' and receipt['recipe']==spec['recipe'] and receipt['specSha256']==SPEC_SHA and receipt['caseCount']==42 and receipt['modelExecuted'] is False
  ledger={r['path']:r for r in receipt['files']};assert len(ledger)==210 and set(ledger)==expected-{'receipt.json'}
  for path,row in ledger.items():
   b=z.read(path);assert len(b)==row['bytes'] and sha(b)==row['sha256']
  assert receipt['uncompressedOutputBytes']==sum(r['bytes'] for r in ledger.values())
  assert len(receipt['cases'])==42
  rows=[]
  for c,native in zip(spec['cases'],receipt['cases']):
   assert native['id']==c['id'] and native['sourceSha256']==c['source']['sha256'] and native['sourceFormat']==c['source']['format']
   for k in ['orientation','rawWidth','rawHeight','uprightWidth','uprightHeight','effectiveBox','letterbox']:assert native[k]==c[k]
   for k in ['decodeAndReadMs','processingMs','caseTotalMs']:assert isinstance(native[k],(int,float)) and math.isfinite(native[k]) and native[k]>=0
   def rgb(s,w,h):
    b=z.read(c['id']+'/'+s+'.rgb');assert len(b)==w*h*3;return np.frombuffer(b,dtype=np.uint8).reshape(h,w,3)
   encoded=rgb('encoded',c['rawWidth'],c['rawHeight']);upright=rgb('upright',c['uprightWidth'],c['uprightHeight']);l,t,r,b=c['effectiveBox'];crop=rgb('crop',r-l,b-t);pad=rgb('letterbox',224,224)
   tensorBytes=z.read(c['id']+'/tensor.f32le');assert len(tensorBytes)==602112;tensor=np.frombuffer(tensorBytes,dtype='<f4');assert np.isfinite(tensor).all() and ((tensor>=0)&(tensor<=1)).all()
   frozen=np.frombuffer((assets/c['uprightOracle']['path']).read_bytes(),dtype=np.uint8).reshape(c['uprightHeight'],c['uprightWidth'],3)
   frozenPad=np.frombuffer((assets/c['phoneResizeOracle']['path']).read_bytes(),dtype=np.uint8).reshape(224,224,3)
   frozenPillow=np.frombuffer((assets/c['pillowOracle']['path']).read_bytes(),dtype='<f4')
   recomputed={
    'decodedUprightVsPillowRgb':delta(upright,frozen),'cropVsFrozenRgb':delta(crop,frozen[t:b,l:r]),
    'resizeVsFrozenBilinearRgb':delta(pad,frozenPad),
    'tensorVsFrozenBilinear':delta(tensor,(frozenPad.reshape(-1).astype(np.float32)/np.float32(255))),
    'tensorVsFrozenPillowLanczos':delta(tensor,frozenPillow)}
   for name,metric in recomputed.items():
    assert native[name]['components']==metric['components'] and native[name]['mismatchCount']==metric['mismatchCount']
    for key in ['maxAbsoluteError','meanAbsoluteError']:assert abs(native[name][key]-metric[key])<=1e-12
   geometry=delta(upright,orient(encoded,c['orientation']));cropping=delta(crop,upright[t:b,l:r]);resize=delta(pad,np.frombuffer(module.bilinear(crop),dtype=np.uint8).reshape(224,224,3))
   conversion=delta(tensor,pad.reshape(-1).astype(np.float32)/np.float32(255))
   exact=geometry['mismatchCount']==0 and cropping['mismatchCount']==0 and resize['mismatchCount']==0 and conversion['mismatchCount']==0
   if c['source']['format']=='RGB':exact=exact and all(recomputed[k]['mismatchCount']==0 for k in ['decodedUprightVsPillowRgb','cropVsFrozenRgb','resizeVsFrozenBilinearRgb','tensorVsFrozenBilinear'])
   if 'guide' in c:
    e=c['guide']['expected'];want=[e['orientedWidth'],e['orientedHeight'],*[e['guide'][k] for k in ['left','top','right','bottom']],*[e['effectiveCrop'][k] for k in ['left','top','right','bottom']],*[e['encodedCrop'][k] for k in ['left','top','right','bottom']],e['scale'],e['offsetX'],e['offsetY']]
    assert len(native['guideActual'])==17;error=max(abs(a-b) for a,b in zip(native['guideActual'],want));assert error<=1e-12 and abs(error-native['guideMaxError'])<=1e-12
   rows.append(dict(id=c['id'],exactGeometryResizeAndConversion=exact,orientation=geometry,crop=cropping,resize=resize,floatConversion=conversion,comparisons=recomputed))
  return dict(kind='COMPLETE_GENERATED_STAGE_COMPARISON',bundleSha256=sha(bundle),specSha256=SPEC_SHA,caseCount=42,outputEntries=211,exactStagesPassed=sum(r['exactGeometryResizeAndConversion'] for r in rows),cases=rows,modelExecuted=False,deviceAcceptanceClaimed=False,jpegAndLanczosDifferences='DESCRIPTIVE; NO EQUIVALENCE THRESHOLD')
def main():
 p=argparse.ArgumentParser();p.add_argument('--bundle',required=True);p.add_argument('--bundle-sha256',required=True);p.add_argument('--out',required=True);args=p.parse_args()
 out=pathlib.Path(args.out).resolve();ceiling=ROOT/'apps/recognition-lab/runs/phone-experiment';assert out.is_relative_to(ceiling) and not out.exists()
 source=pathlib.Path(args.bundle).resolve();assert source.is_relative_to(ceiling) and source.stat().st_size<=48*1024*1024
 b=source.read_bytes();assert sha(b)==args.bundle_sha256
 assets=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/src/main/assets';raw=(assets/'recognition-image-experiment/image-stage-spec.json').read_bytes();assert sha(raw)==SPEC_SHA
 result=compare(b,json.loads(raw),assets);out.mkdir();(out/'comparison.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(cases=42,exactStagesPassed=result['exactStagesPassed'],deviceAcceptanceClaimed=False)))
 if result['exactStagesPassed']!=42:raise SystemExit(2)
if __name__=='__main__':main()
