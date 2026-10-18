"""Freeze GENERATED-only stage controls; accepted P0/Pillow outputs are read-only."""
import argparse,hashlib,json,math,pathlib,subprocess
import PIL
from PIL import Image
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[2]
P0=ROOT/'apps/recognition-lab/runs/phone-experiment/p0-preparation-20261011-a1/tests/ccc990d0-1d7e-40f5-aaa0-9f0d9f23e3b2/image-oracles'
def sha(b):return hashlib.sha256(b).hexdigest()
def geometry(w,h):
 s=min(224/w,224/h);rw=max(1,math.floor(w*s+.5));rh=max(1,math.floor(h*s+.5));l=(224-rw)//2;t=(224-rh)//2
 return [rw,rh,l,t,224-rw-l,224-rh-t]
def bilinear(a):
 h,w,_=a.shape;rw,rh,l,t,_,_=geometry(w,h)
 sy=np.clip((np.arange(rh,dtype=np.float64)+.5)*h/rh-.5,0,h-1);sx=np.clip((np.arange(rw,dtype=np.float64)+.5)*w/rw-.5,0,w-1)
 y0=np.floor(sy).astype(int);y1=np.minimum(h-1,y0+1);x0=np.floor(sx).astype(int);x1=np.minimum(w-1,x0+1)
 fy=(sy-y0)[:,None,None];fx=(sx-x0)[None,:,None]
 upper=a[y0[:,None],x0[None,:]]*(1-fx)+a[y0[:,None],x1[None,:]]*fx
 lower=a[y1[:,None],x0[None,:]]*(1-fx)+a[y1[:,None],x1[None,:]]*fx
 resized=np.floor(upper*(1-fy)+lower*fy+.5).astype(np.uint8)
 out=np.full((224,224,3),128,dtype=np.uint8);out[t:t+rh,l:l+rw]=resized;return out.tobytes()
def pillow(a):
 h,w,_=a.shape;rw,rh,l,t,_,_=geometry(w,h);out=Image.new('RGB',(224,224),(128,128,128))
 out.paste(Image.fromarray(a).resize((rw,rh),Image.Resampling.LANCZOS),(l,t))
 return (np.asarray(out,dtype=np.float32)/np.float32(255)).astype('<f4').tobytes()
def main():
 p=argparse.ArgumentParser();p.add_argument('--run',required=True);args=p.parse_args();run=pathlib.Path(args.run).resolve()
 assert run==ROOT/'apps/recognition-lab/runs/phone-experiment/p1-image-pipeline-20261012-a1'
 assert PIL.__version__=='12.3.0'
 out=run/'generated-oracles';out.mkdir(exist_ok=False);assets=[];cases=[]
 manifest=json.loads((P0/'probe-manifest.json').read_bytes());assert not manifest['nativeValidated'] and not manifest['modelExecuted'] and len(manifest['images'])==8
 def asset(name,b):
  (out/name).write_bytes(b);assets.append(dict(path=name,bytes=len(b),sha256=sha(b)));return dict(path='recognition-image-experiment/'+name,bytes=len(b),sha256=sha(b))
 def original(name,key,row):
  b=(P0/name).read_bytes();assert sha(b)==row[key];return dict(path='recognition-experiment/'+name,bytes=len(b),sha256=sha(b))
 def add(id,source,rawW,rawH,orientation,upright,oracleRgb,box,pillowOracle,guide=None):
  l,t,r,b=box;a=upright[t:b,l:r];phone=asset(id+'.bilinear.rgb',bilinear(a))
  cases.append(dict(id=id,source=source,rawWidth=rawW,rawHeight=rawH,orientation=orientation,uprightWidth=upright.shape[1],uprightHeight=upright.shape[0],
    uprightOracle=oracleRgb,effectiveBox=box,letterbox=geometry(r-l,b-t),pillowOracle=pillowOracle,phoneResizeOracle=phone,**(dict(guide=guide) if guide else {})))
 inverses={2:Image.Transpose.FLIP_LEFT_RIGHT,3:Image.Transpose.ROTATE_180,4:Image.Transpose.FLIP_TOP_BOTTOM,5:Image.Transpose.TRANSPOSE,6:Image.Transpose.ROTATE_90,7:Image.Transpose.TRANSVERSE,8:Image.Transpose.ROTATE_270}
 images={}
 for row in manifest['images']:
  name=row['id'];w,h=row['width'],row['height'];rgb=original(name+'.upright.rgb','uprightRgbSha256',row);upright=np.frombuffer((P0/(name+'.upright.rgb')).read_bytes(),dtype=np.uint8).reshape(h,w,3)
  encoded=Image.fromarray(upright)
  if row['orientation']!=1:encoded=encoded.transpose(inverses[row['orientation']])
  assert encoded.size==(37,23)
  raw=asset(name+'.encoded.rgb',encoded.tobytes());raw['format']='RGB';jpg=original(name+'.jpg','jpegSha256',row);jpg['format']='JPEG'
  with Image.open(P0/(name+'.jpg')) as j:assert j.size==(37,23) and j.getexif()[274]==row['orientation']
  images[row['orientation']]=(raw,upright,rgb)
  for mode,source in [('jpeg',jpg),('raw',raw)]:
   for arm,box in [('full',[0,0,w,h]),('crop',[row['effectiveBox'][k] for k in ['left','top','right','bottom']])]:
    oracle=original(name+'.'+arm+'.f32le',arm+'TensorSha256',row);assert oracle['bytes']==602112
    add(name+'-'+mode+'-'+arm,source,37,23,row['orientation'],upright,rgb,box,oracle)
 # Invoke the actual accepted mapGuide instead of silently implementing a second oracle.
 node=r'C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe'
 code="import {mapGuide} from './apps/recognition-lab/src/phoneExperimentProbes.ts';let rows=[];for(const rotation of [0,90,180,270])for(const mirrored of [false,true]){let g={imageWidth:37,imageHeight:23,previewWidth:rotation%180?251:431,previewHeight:rotation%180?431:251,rotation,mirrored};rows.push({input:g,expected:mapGuide(g)});}console.log(JSON.stringify(rows));"
 guides=json.loads(subprocess.check_output([node,'--input-type=module','-e',code],cwd=ROOT));(run/'accepted-map-guide.json').write_text(json.dumps(guides,indent=2)+'\n')
 rotations={0:1,90:6,180:3,270:8}
 for i,g in enumerate(guides):
  orientation=rotations[g['input']['rotation']];raw,upright,rgb=images[orientation]
  e=g['expected'];box=[e['effectiveCrop'][k] for k in ['left','top','right','bottom']];l,t,r,b=box
  o=asset(f'guide-{i}.pillow.f32le',pillow(upright[t:b,l:r]));add(f'guide-{i}',raw,37,23,orientation,upright,rgb,box,o,g)
 # P0 only upsamples. Two edge/alternating-channel controls cover actual downsampling,
 # opposite aspect ratios and odd padding; freeze before phone outcomes.
 for w,h in [(257,129),(129,257)]:
  yy,xx=np.indices((h,w));a=np.stack([np.where((xx%2)==0,255,0),np.where((yy%3)==0,255,0),(xx*7+yy*13)%256],axis=2).astype(np.uint8)
  a[0,:]=[255,0,0];a[-1,:]=[0,255,0];a[:,0]=[0,0,255];a[:,-1]=[255,255,0]
  name=f'downsample-{w}x{h}';raw=asset(name+'.rgb',a.tobytes());raw['format']='RGB';rgb={k:v for k,v in raw.items() if k!='format'}
  box=[1,3,255,128] if w==257 else [0,1,128,254]
  l,t,r,b=box;o=asset(name+'.pillow.f32le',pillow(a[t:b,l:r]));add(name,raw,w,h,1,a,rgb,box,o)
 assert len(cases)==42
 spec=dict(schemaVersion=1,kind='GENERATED_IMAGE_STAGE_SPEC',recipe='generated-android-bitmap-rgb-center-bilinear-u8-v1',Pillow='12.3.0',
  modelExecuted=False,nativeValidated=False,p0ManifestSha256=sha((P0/'probe-manifest.json').read_bytes()),caseCount=42,cases=cases,
  limits=dict(maxSide=512,maxAssetBytes=1048576,maxBundleBytes=50331648,maxUncompressedBytes=50331648,outputEntries=211),
  tolerances=dict(version='generated-image-stages-v1',rawOrientationCropMismatch=0,geometryMaxError=1e-12,rawPhoneResizeMismatch=0,floatConversionMismatch=0,jpegVsPillow='DESCRIPTIVE_NO_ACCEPTANCE_THRESHOLD',bilinearVsLanczos='DESCRIPTIVE_NO_EQUIVALENCE_CLAIM'))
 b=(json.dumps(spec,indent=2)+'\n').encode();(out/'image-stage-spec.json').write_bytes(b);assets.append(dict(path='image-stage-spec.json',bytes=len(b),sha256=sha(b)))
 target=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/src/main/assets/recognition-image-experiment';target.mkdir(exist_ok=False)
 for f in out.iterdir():(target/f.name).write_bytes(f.read_bytes())
 java=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/GeneratedImagePins.java'
 java.write_text('package expo.modules.recognitioncpu;\n/** Generated by tools/scripts/phone-image-oracles.py from frozen generated inputs. */\npublic final class GeneratedImagePins {\n  private GeneratedImagePins() {}\n  public static final String SPEC_SHA256 = "'+sha(b)+'";\n  public static final String P0_MANIFEST_SHA256 = "'+spec['p0ManifestSha256']+'";\n}\n')
 (run/'generated-assets.json').write_text(json.dumps(assets,indent=2)+'\n')
 print(json.dumps(dict(cases=len(cases),assets=len(assets),specSha256=sha(b),modelExecuted=False,nativeValidated=False)))
if __name__=='__main__':main()
