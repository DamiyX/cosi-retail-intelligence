"""Camera-only provenance. Does not build, access a phone/model, or rewrite P1 pins."""
import hashlib,json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
CPU=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu'
def binding():
 paths=[ROOT/p for p in ['apps/mobile/app.config.ts','apps/mobile/plugins/withRecognitionExperiment.js','apps/mobile/recognition-entry.js','apps/mobile/src/recognitionExperiment/ExperimentRoot.tsx','apps/mobile/src/recognitionExperiment/nativeAdapter.ts','apps/mobile/src/recognitionExperiment/CameraProofPanel.tsx','apps/mobile/recognition-native/recognition-experiment/android/src/main/java/expo/modules/recognitionexperiment/RecognitionExperimentModule.kt','apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/build.gradle','package.json','package-lock.json','tools/scripts/phone-camera-proof-source.py']]
 paths+=list((ROOT/'apps/mobile/src/recognitionExperiment').glob('cameraProof*.ts'))
 paths+=[p for p in CPU.glob('CameraProof*.java') if p.name!='CameraProofSource.java']
 paths+=[CPU/n for n in ['PhonePortabilityImage.java','PhonePortabilityJson.java','GeneratedImageGeometry.java']]
 paths+=[ROOT/'apps/mobile/package.json',ROOT/'node_modules/expo-modules-core/package.json']
 paths+=[ROOT/'node_modules/expo-camera'/n for n in ['package.json','src/CameraView.tsx','src/Camera.types.ts','src/utils/props.ts','plugin/src/withCamera.ts','android/build.gradle','android/src/main/AndroidManifest.xml','android/src/main/java/expo/modules/camera/ExpoCameraView.kt','android/src/main/java/expo/modules/camera/CameraViewModule.kt','android/src/main/java/expo/modules/camera/tasks/ResolveTakenPicture.kt','android/src/main/java/expo/modules/camera/Options.kt']]
 rows=[dict(path=p.relative_to(ROOT).as_posix(),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in sorted(set(paths))]
 raw=(json.dumps(rows,sort_keys=True,separators=(',',':'))+'\n').encode();return raw,hashlib.sha256(raw).hexdigest()
def main():
 raw,digest=binding();source=CPU/'CameraProofSource.java'
 expected=('package expo.modules.recognitioncpu;\n/** Camera source manifest only; never a P1 pin. */\npublic final class CameraProofSource { private CameraProofSource(){} public static final String SHA256="'+digest+'"; }\n').encode()
 if len(sys.argv)==3 and sys.argv[1]=='--write':
  out=pathlib.Path(sys.argv[2]).resolve();parents=[ROOT/'apps/recognition-lab/runs/phone-experiment'/name/'writer' for name in ['p2-camera-source-20261015-a1','p2-camera-source-c1-20261015-a1']];parent=out.parent
  assert parent in parents and (parent.parent/'coordinator-dispatch.json').is_file() and not out.exists() and not (parent/'writer-stopped.json').exists()
  source.write_bytes(expected)
  with out.open('xb') as f:f.write(raw)
 elif sys.argv[1:]==['--check']:assert source.read_bytes()==expected,'STALE_CAMERA_SOURCE_BINDING'
 else:raise ValueError('Use --write NEW_writer_manifest_path or --check')
 print(json.dumps(dict(kind='CAMERA_SOURCE_BINDING',sha256=digest,rows=len(json.loads(raw)),nativeValidated=False,modelExecuted=False)))
if __name__=='__main__':main()
