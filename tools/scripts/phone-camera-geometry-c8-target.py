"""Deterministic generated-only chart; no display/phone action."""
import pathlib,json,hashlib
from PIL import Image,ImageDraw,ImageFont
R=pathlib.Path(__file__).resolve().parents[2]
W=R/'apps/recognition-lab/runs/phone-experiment/p2-camera-geometry-c8-source-20261022-a1/writer/target-a2'
def main():
 assert not W.exists();W.mkdir()
 im=Image.new('RGB',(900,1200),'white');d=ImageDraw.Draw(im);font=ImageFont.load_default(size=30)
 d.rectangle((16,16,883,1183),outline='black',width=8)
 markers=[(1,110,110),(2,790,110),(3,790,1090),(4,110,1090),(5,450,110),(6,790,600),(7,450,1090),(8,110,600)]
 facts=[]
 for number,x,y in markers:
  d.rectangle((x-44,y-44,x+43,y+43),fill='black');d.rectangle((x-32,y-32,x+31,y+31),fill='white')
  # ID bits are asymmetric inside a complete 88px outer square; outer edge is the measurement boundary.
  d.rectangle((x-22,y-22,x-7,y-7),fill='black')
  for bit,(bx,by) in enumerate([(7,-22),(-22,7),(7,7)]):
   if (number-1)&(1<<bit):d.rectangle((x+bx,y+by,x+bx+15,y+by+15),fill='black')
  d.text((x-10,y+49 if y<1000 else y-82),str(number),fill='black',font=font)
  facts.append(dict(id=number,center=[x,y],outerHalfOpen=[x-44,y-44,x+44,y+44],measurement='midpoint of opposite outer-square boundaries in image-edge coordinates'))
 for x in range(220,701,80):d.line((x,240,x,960),fill='black',width=2)
 for y in range(240,961,80):d.line((220,y,700,y),fill='black',width=2)
 d.polygon([(450,210),(420,265),(438,265),(438,320),(462,320),(462,265),(480,265)],fill='black');d.text((490,220),'UP',font=font,fill='black')
 d.polygon([(200,500),(255,470),(255,488),(330,488),(330,512),(255,512),(255,530)],fill='black');d.text((240,540),'LEFT',font=font,fill='black')
 d.ellipse((390,690,510,810),outline='black',width=7);d.rectangle((265,850,330,915),fill='black');d.polygon([(600,840),(550,925),(650,925)],fill='black')
 d.text((245,970),'C8 STATIONARY CHART',font=font,fill='black')
 png=W/'stationary-chart.png';im.save(png,format='PNG',compress_level=9,optimize=False);sha=hashlib.sha256(png.read_bytes()).hexdigest()
 manifest=dict(targetId='stationary-chart-c8-900x1200-v1',sha256=sha,width=900,height=1200,format='RGB black-white PNG',coordinateSystem='Image-edge units: image extent [0,900)x[0,1200); raster pixel(i,j) has center(i+0.5,j+0.5). Outer half-open square bounds are edges, not pixel-index centers.',markers=facts,borderOuterHalfOpen=[16,16,884,1184],displayMillimetres='UNMEASURED; record in later physical packet',geometryAccepted=False)
 (W/'target-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 (W/'stationary-chart.html').write_text('<!doctype html><meta charset="utf-8"><title>C8 stationary chart</title><style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}img{width:100%;height:100%;object-fit:contain;image-rendering:auto}</style><img src="stationary-chart.png" alt="C8 stationary generated chart">',encoding='utf-8')
 print(json.dumps(dict(targetId=manifest['targetId'],sha256=sha)))
if __name__=='__main__':main()
