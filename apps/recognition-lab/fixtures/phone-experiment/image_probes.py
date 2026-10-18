"""Generated pixels/tensors only. No model, private file input or native execution."""
import argparse,hashlib,json,math,os
from pathlib import Path
import PIL
from PIL import Image,ImageOps
import numpy as np

def digest(raw):return hashlib.sha256(raw).hexdigest()
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);args=parser.parse_args()
 lab=Path(__file__).resolve().parents[2];ceiling=lab/'runs/phone-experiment';out=Path(os.path.abspath(args.out))
 if not out.is_relative_to(ceiling) or out.exists():raise ValueError('PHONE_PROBE_OUTPUT')
 for ancestor in [out,*out.parents]:
  if ancestor.exists() and ancestor.lstat().st_file_attributes & 0x400:raise ValueError('PHONE_PROBE_LINK')
 if PIL.__version__!='12.3.0':raise ValueError('PHONE_PILLOW_VERSION')
 out.mkdir(parents=True);rows=[]
 def tensor(image):
  w,h=image.size;s=min(224/w,224/h);rw=max(1,math.floor(w*s+.5));rh=max(1,math.floor(h*s+.5))
  padded=Image.new('RGB',(224,224),(128,128,128));padded.paste(image.resize((rw,rh),Image.Resampling.LANCZOS),((224-rw)//2,(224-rh)//2))
  return (np.asarray(padded,dtype=np.float32)/np.float32(255)).astype('<f4').tobytes()
 for orientation in range(1,9):
  image=Image.new('RGB',(37,23));image.putdata([(255 if x in [0,36] else x*7,255 if y in [0,22] else y*11,(x*3+y*5)%256) for y in range(23) for x in range(37)])
  exif=Image.Exif();exif[274]=orientation;name=f'orientation-{orientation}';jpg=out/(name+'.jpg');image.save(jpg,quality=95,exif=exif)
  with Image.open(jpg) as decoded:upright=ImageOps.exif_transpose(decoded).convert('RGB')
  w,h=upright.size;box=(max(0,math.floor(w*.06)),max(0,math.floor(h*.06)),min(w,math.ceil(w*.94)),min(h,math.ceil(h*.94)))
  rgb=upright.tobytes();full=tensor(upright);crop=tensor(upright.crop(box))
  for suffix,raw in [('.upright.rgb',rgb),('.full.f32le',full),('.crop.f32le',crop)]:
   with (out/(name+suffix)).open('xb') as f:f.write(raw)
  rows.append(dict(id=name,orientation=orientation,width=w,height=h,effectiveBox=dict(zip(['left','top','right','bottom'],box)),
   jpegSha256=digest(jpg.read_bytes()),uprightRgbSha256=digest(rgb),fullTensorSha256=digest(full),cropTensorSha256=digest(crop),tensorBytes=len(full)))
 runtime=[]
 count=224*224*3
 for name,values in [('zero',np.zeros(count,dtype='<f4')),('gray128',np.full(count,np.float32(128)/np.float32(255),dtype='<f4')),('gradient',np.linspace(0,1,count,dtype='<f4'))]:
  raw=values.tobytes();filename=name+'.runtime.f32le'
  with (out/filename).open('xb') as f:f.write(raw)
  runtime.append(dict(id=name,path=filename,sha256=digest(raw),bytes=len(raw),shape=[1,224,224,3],dtype='float32-le'))
 manifest=dict(schemaVersion=1,kind='GENERATED_PHONE_IMAGE_AND_RUNTIME_PROBES',nativeValidated=False,modelExecuted=False,Pillow=PIL.__version__,
  imageRecipe='Pillow12.3.0 EXIF1-8/RGB/LANCZOS/gray128/floor(x+0.5)/odd-extra-right-bottom/divide255-float32',images=rows,runtimeInputs=runtime)
 with (out/'probe-manifest.json').open('x',encoding='utf-8') as f:json.dump(manifest,f,indent=2);f.write('\n')
 print(json.dumps(dict(generatedOnly=True,imageOracles=len(rows),runtimeTensors=len(runtime),nativeValidated=False,modelExecuted=False)))
if __name__=='__main__':main()
