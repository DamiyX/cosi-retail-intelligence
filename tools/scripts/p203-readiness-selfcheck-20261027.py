"""Offline coordinator checks, bounded subprocesses, no device transport."""
from pathlib import Path
import ast, json, subprocess, time
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'apps/recognition-lab/runs/phone-experiment/p203-readiness-main-implementation-20261027-a1'
NODE=Path('C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe')

def run(name,cmd,cwd=ROOT,timeout=90):
 start=time.monotonic()
 try:
  p=subprocess.run([str(x) for x in cmd],cwd=cwd,capture_output=True,timeout=timeout)
  result=dict(exitCode=p.returncode,stdout=p.stdout.decode('utf-8',errors='replace'),stderr=p.stderr.decode('utf-8',errors='replace'))
 except subprocess.TimeoutExpired as error:
  result=dict(exitCode=None,timedOut=True,stdout=(error.stdout or b'').decode('utf-8',errors='replace'),stderr=(error.stderr or b'').decode('utf-8',errors='replace'))
 result.update(seconds=time.monotonic()-start,command=[str(x) for x in cmd])
 path=OUT/(name+'.json')
 assert not path.exists(), 'PRESERVE_EXISTING_RECEIPT'
 path.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
 print(json.dumps(dict(check=name,exitCode=result['exitCode'],seconds=result['seconds'])),flush=True)

if __name__=='__main__':
 for f in (ROOT/'tools/scripts/camera-orientation-evidence-v3').glob('*.py'):
  ast.parse(f.read_text(encoding='utf-8'))
 print('V3 Python AST checks passed',flush=True)
 run('typecheck',[NODE,ROOT/'node_modules/typescript/bin/tsc','--noEmit','-p',ROOT/'apps/mobile/tsconfig.json'])
 run('touched-lint',[NODE,ROOT/'node_modules/eslint/bin/eslint.js','src/recognitionExperiment/CameraOrientationPanel.tsx','src/recognitionExperiment/cameraOrientationEvidence.ts','src/recognitionExperiment/cameraOrientationProof.ts','--max-warnings=0'],ROOT/'apps/mobile')
 previous=json.loads((ROOT/'apps/recognition-lab/runs/phone-experiment/p203-evidence-main-implementation-20261026-a1/java-compile.json').read_text(encoding='utf-8'))
 command=previous['command']
 command[command.index('-d')+1]=str(OUT/'java-classes')
 java=ROOT/'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu'
 for f in java.glob('Camera*.java'):
  if str(f) not in command: command.append(str(f))
 run('java-compile',command)
 run('existing-proof-tests',[NODE,ROOT/'node_modules/jest/bin/jest.js','--runInBand','--runTestsByPath','__tests__/recognitionExperimentCameraOrientation.test.ts'],ROOT/'apps/mobile')
