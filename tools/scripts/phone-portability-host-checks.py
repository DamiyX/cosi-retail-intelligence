"""Fresh generated host preparation/comparator checks. Private originals are never decoded."""
import argparse,hashlib,importlib.util,io,json,pathlib,subprocess,sys,zipfile,re
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[2];RUN=pathlib.Path(sys.argv[1]).resolve();assert RUN.parent==ROOT/'apps/recognition-lab/runs/phone-experiment' and (RUN.name in ('p1-portability-preparation-20261012-a1','p1-portability-c1-20261012-a1') or __import__('re').fullmatch(r'p1-portability-audit-[a-zA-Z0-9-]{1,64}',RUN.name))
assert RUN.is_dir() and not (RUN/'stopped.json').exists(), 'A fresh explicit generated run is required; frozen writer evidence cannot be overwritten.'
def load(name,file):
 spec=importlib.util.spec_from_file_location(name,file);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
def main():
 attempt=sys.argv[2] if len(sys.argv)>2 else 'a1';assert re.fullmatch(r'a[1-9][0-9]*',attempt)
 prep=load('generated_portability_prepare',ROOT/'tools/scripts/phone-portability-prepare.py');comparator=load('generated_portability_compare',ROOT/'tools/scripts/phone-portability-compare.py');checks=[]
 def yes(value,label):
  if not value:raise AssertionError(label)
  checks.append(label)
 def no(function,label):
  failed=False
  try:function()
  except Exception:failed=True
  yes(failed,label)
 # Entry gate refuses before any image-library function can run.
 prep.load_crop=lambda:(_ for _ in ()).throw(AssertionError('decoder must not load'))
 no(lambda:prep.prepare(argparse.Namespace(preflight=True,session=pathlib.Path('GENERATED_MISSING_SESSION'))),'unpublished-preflight-rejected')
 no(lambda:prep.prepare(argparse.Namespace(preflight=False,session=pathlib.Path('GENERATED_MISSING_SESSION'))),'unpublished-assembly-rejected')
 no(lambda:prep.path_owned(ROOT/'../outside.jpg',ROOT),'outside-root-rejected')
 no(lambda:comparator.strict(b'{"x":1,"x":2}'),'duplicate-json-rejected')
 no(lambda:comparator.strict(b'{"x":1,"\\u0078":2}'),'escaped-duplicate-json-rejected')
 no(lambda:comparator.strict(b'[NaN]'),'nonfinite-json-rejected')
 no(lambda:comparator.strict(b'[1e999]'),'overflow-json-rejected')
 # Direct call into unchanged preprocessing uses generated JPEGs only, no model worker.
 crop=load('generated_accepted_crop',ROOT/'apps/recognition-lab/tools/framing-comparison/crop_producer.py')
 crop.cpu_interpreter=lambda *a:(_ for _ in ()).throw(AssertionError('model not allowed'))
 for orientation in range(1,9):
  image=Image.new('RGB',(17,13));image.putdata([(x*11%256,y*13%256,(x+y)*7%256) for y in range(13) for x in range(17)]);exif=Image.Exif();exif[274]=orientation;out=io.BytesIO();image.save(out,format='JPEG',quality=95,exif=exif)
  w,h=(13,17) if orientation>=5 else (17,13);marked=dict(left=2,top=2,right=w-2,bottom=h-2);effective=crop.effective_box(marked,w,h)
  ann=dict(width=w,height=h,orientation=orientation,markedBox=marked,effectiveBox=effective);tensor,_,_,details=crop.preprocess(out.getvalue(),ann)
  yes(tensor.shape==(1,224,224,3) and tensor.dtype.str=='<f4' and tensor.nbytes==602112 and hashlib.sha256(tensor.tobytes()).hexdigest()==details['tensorSha256'],f'accepted-generated-preprocess-exif-{orientation}')
  bad=dict(ann,orientation=9);no(lambda:crop.preprocess(out.getvalue(),bad),f'wrong-orientation-{orientation}')
 generated=RUN/'generated-portability';pins=(generated/'PhonePortabilityPins.java').read_text();raw=json.loads(pins.split('MANIFEST=',1)[1].split(';',1)[0]).encode();manifest=json.loads(raw)
 target=RUN/('generated-independent-comparison-'+attempt);result=comparator.compare(generated/'generated-packet.zip',generated/'generated-result.zip',target,manifest,raw)
 yes(result['complete'] and result['runtimeParityPassed'] and result['independentScoresAgree'],'full-generated-independent-comparison')
 no(lambda:comparator.compare(generated/'generated-packet.zip',generated/'generated-result.zip',target,manifest,raw),'existing-comparison-output-rejected')
 cancelled=RUN/('generated-independent-cancelled-'+attempt);r=comparator.compare(generated/'generated-packet.zip',generated/'cancelled-result.zip',cancelled,manifest,raw);yes(not r['complete'] and not r['runtimeParityPassed'] and r['independentScoresAgree'],'cancelled-full-denominator-comparison')
 for label in ['compressed','traversal','duplicate-entry','truncated','rank-tamper','hash-tamper','attempt-ceiling','stale-source','packet-mismatch']:
  packet=generated/(label+'.zip') if label in ['compressed','traversal','duplicate-entry','truncated'] else generated/'generated-packet.zip';output=generated/(label+'.zip') if label not in ['compressed','traversal','duplicate-entry','truncated'] else generated/'generated-result.zip'
  no(lambda:comparator.compare(packet,output,RUN/('negative-comparison-'+label+'-'+attempt),manifest,raw),'independent-reject-'+label)
 (RUN/'host-generated-checks.json').write_text(json.dumps(dict(checks=checks,count=len(checks),generatedOnly=True,privatePixelsDecoded=False,modelExecuted=False),indent=2)+'\n');print(json.dumps(dict(checks=len(checks),generatedOnly=True)))
if __name__=='__main__':main()
