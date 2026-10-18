"""Host Java/generated recipe checks. Never executes an Android decoder or model."""
import hashlib,json,pathlib,subprocess,sys,importlib.util
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2];RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-image-pipeline-20261012-a1'
JAVA=pathlib.Path(r'C:/Users/doyew/.cache/cosi-p1-20261012-a1/jdk17/bin')
def main():
 helper=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime'
 classes=RUN/'host-java-classes';classes.mkdir(exist_ok=True)
 files=[helper/'src/main/java/expo/modules/recognitioncpu'/n for n in ['GeneratedImageGeometry.java','GeneratedExportState.java']]
 files.append(helper/'src/test/java/expo/modules/recognitioncpu/GeneratedImageChecks.java')
 subprocess.run([str(JAVA/'javac.exe'),'-d',str(classes),*[str(f) for f in files]],check=True)
 command=[str(JAVA/'java.exe'),'-cp',str(classes),'expo.modules.recognitioncpu.GeneratedImageChecks']
 subprocess.run(command,check=True)
 spec=json.loads((RUN/'generated-oracles/image-stage-spec.json').read_bytes());assets=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/src/main/assets';rows=[]
 out=RUN/'host-generated-output';out.mkdir(exist_ok=True)
 for c in spec['cases']:
  if c['source']['format']!='RGB':continue
  target=out/c['id'];result=subprocess.check_output([*command,'case',str(assets/c['source']['path']),str(c['rawWidth']),str(c['rawHeight']),str(c['orientation']),*[str(v) for v in c['effectiveBox']],str(target)],text=True)
  assert json.loads(result)==c['letterbox']
  upright=(target/'upright.rgb').read_bytes();assert upright==(assets/c['uprightOracle']['path']).read_bytes()
  l,t,r,b=c['effectiveBox'];oracle=np.frombuffer(upright,dtype=np.uint8).reshape(c['uprightHeight'],c['uprightWidth'],3)[t:b,l:r].tobytes()
  assert (target/'crop.rgb').read_bytes()==oracle
  padded=(target/'letterbox.rgb').read_bytes();expected=(assets/c['phoneResizeOracle']['path']).read_bytes()
  aa=np.frombuffer(padded,dtype=np.uint8);bb=np.frombuffer(expected,dtype=np.uint8);mismatch=int(np.count_nonzero(aa!=bb))
  rows.append(dict(id=c['id'],bilinearRgbMismatches=mismatch))
  assert mismatch==0,(c['id'],mismatch)
  floats=(aa.astype(np.float32)/np.float32(255)).astype('<f4').tobytes();assert floats==(target/'tensor.f32le').read_bytes()
 guides=json.loads((RUN/'accepted-map-guide.json').read_bytes());guide_rows=[]
 for g in guides:
  i=g['input'];e=g['expected'];actual=json.loads(subprocess.check_output([*command,'guide',*[str(i[k]) for k in ['imageWidth','imageHeight','previewWidth','previewHeight','rotation']],str(i['mirrored']).lower()],text=True))
  oracle=[e['orientedWidth'],e['orientedHeight'],*[e['guide'][k] for k in ['left','top','right','bottom']],*[e['effectiveCrop'][k] for k in ['left','top','right','bottom']],*[e['encodedCrop'][k] for k in ['left','top','right','bottom']],e['scale'],e['offsetX'],e['offsetY']]
  error=max(abs(a-b) for a,b in zip(actual,oracle));assert error<=1e-12;guide_rows.append(dict(input=i,maxError=error))
 result=dict(hostOnly=True,androidDecoderExecuted=False,modelExecuted=False,rawCases=len(rows),caseResults=rows,guideCases=guide_rows)
 (RUN/'host-checks.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(rawCases=len(rows),guideCases=len(guide_rows),hostOnly=True)))
if __name__=='__main__':main()
