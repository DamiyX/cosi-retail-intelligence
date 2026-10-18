"""Generated coloured JPEG originals only; no model or private inputs."""
import argparse,io,json,sys
from pathlib import Path
import crop_producer as crop
def generate(out):
    from PIL import Image,ImageDraw
    root=crop.checked_path(out,crop.baseline.LAB/'runs',missing=True);crop.checked_path(root.parent,crop.baseline.LAB/'runs',directory=True)
    root.mkdir();(root/'images').mkdir();(root/'full').mkdir();rows=[]
    for i in range(40):
        width,height=(480,320) if i%2 else (321,479);orientation=i%8+1
        image=Image.new('RGB',(width,height),(31+i,61+i,91+i));draw=ImageDraw.Draw(image)
        draw.rectangle((0,0,width//2-1,height//2-1),fill=(230,30+i,20));draw.rectangle((width//2,0,width-1,height//2-1),fill=(20,220,30+i))
        draw.rectangle((0,height//2,width//2-1,height-1),fill=(20,30+i,220));draw.rectangle((width//2,height//2,width-1,height-1),fill=(220,210,30+i))
        draw.rectangle((10+i,15,24+i,29),fill=(255,255,255));exif=Image.Exif();exif[274]=orientation
        stream=io.BytesIO();image.save(stream,format='JPEG',quality=95,subsampling=0,progressive=i%3==0,exif=exif);data=stream.getvalue()
        item='img-'+str(i).zfill(2);path=root/'images'/(item+'.jpg');path.write_bytes(data)
        tensor,thumb,details=crop.baseline.preprocess(data);(root/'full'/('thumb-'+item+'.png')).write_bytes(thumb)
        oriented=(height,width) if orientation>=5 else (width,height)
        rows.append(dict(id=item,path='images/'+item+'.jpg',sha256=crop.digest(data),width=oriented[0],height=oriented[1],orientation=orientation,pixelSha256=details['pixelSha256'],tensorSha256=details['tensorSha256'],thumbnailSha256=crop.digest(thumb)))
    (root/'index.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8');print(json.dumps(dict(GeneratedOriginals=40,OrientationValues=list(range(1,9)),NoModel=True,NoPrivate=True)),flush=True)
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--out',required=True);args=parser.parse_args()
    try:generate(args.out)
    except Exception:print('GENERATED_FIXTURE_SETUP_BLOCKED',file=sys.stderr);sys.exit(1)
