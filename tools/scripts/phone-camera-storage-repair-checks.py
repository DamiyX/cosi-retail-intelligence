"""C6 source checks only. No Gradle/native link, APK, phone, model or network actions."""
import datetime, hashlib, json, os, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
RUN = ROOT / 'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-source-20261018-a1'
CPU = ROOT / 'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime'
MAIN = CPU / 'src/main/java/expo/modules/recognitioncpu'
TEST = CPU / 'src/test/java/expo/modules/recognitioncpu'
CACHE = pathlib.Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1')
JAVA = CACHE / 'jdk17/bin'
NODE = pathlib.Path('C:/Users/doyew/.cache/cosi-toolchain/node-v24.21.0-win-x64/node.exe')

def main():
    mode, name = sys.argv[1:]
    assert mode in ('android', 'syntax', 'focused', 'ui', 'types', 'lint')
    assert name.isascii() and name.replace('-', '').isalnum()
    assert (RUN / 'scope.json').is_file() and not (RUN / 'writer-stopped.json').exists()
    out = RUN / name
    out.mkdir(exist_ok=False)
    rows = []
    def run(args, cwd=ROOT):
        command = [str(x) for x in args]
        env = dict(os.environ, CI='1', EXPO_NO_TELEMETRY='1', EXPO_NO_DOTENV='1')
        p = subprocess.run(command, cwd=cwd, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')
        rows.append(dict(command=command, cwd=str(cwd), exitCode=p.returncode, stdout=p.stdout, stderr=p.stderr))
        (out / 'result.json').write_text(json.dumps(dict(atUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(), mode=mode, receipts=rows), indent=2)+'\n')
        print(json.dumps(dict(mode=mode, exitCode=p.returncode, stdout=p.stdout[-1500:], stderr=p.stderr[-2500:])), flush=True)
        if p.returncode:
            raise SystemExit(p.returncode)
    if mode == 'android':
        jars = [CACHE / 'sdk/platforms/android-36/android.jar']
        for lib in ['litert-api-2.2.0', 'litert-2.2.0']:
            found = list((CACHE / 'gradle/caches/9.3.1/transforms').glob('*/workspace/transformed/'+lib+'/jars/classes.jar'))
            assert len(found) == 1
            jars += found
        (out / 'classpath.json').write_text(json.dumps([dict(path=str(p), sha256=hashlib.sha256(p.read_bytes()).hexdigest()) for p in jars], indent=2)+'\n')
        sources = list(MAIN.glob('CameraProof*.java')) + [MAIN / (x+'.java') for x in ['PhonePortabilityImage', 'PhonePortabilityJson', 'GeneratedImageGeometry']]
        run([JAVA / 'javac.exe', '-Xlint:all', '-h', out / 'jni', '-classpath', os.pathsep.join(str(p) for p in jars), '-d', out / 'classes', *sources])
    elif mode == 'syntax':
        ndk = CACHE / 'sdk/ndk/27.1.12297006/toolchains/llvm/prebuilt/windows-x86_64'
        for api in (24, 30):
            for arch in ('aarch64-linux-android', 'armv7a-linux-androideabi', 'i686-linux-android', 'x86_64-linux-android'):
                run([ndk / 'bin/clang.exe', '--target='+arch+str(api), '--sysroot='+str(ndk / 'sysroot'), '-std=c11', '-Wall', '-Wextra', '-Werror', '-Werror=unguarded-availability', '-fsyntax-only', CPU / 'src/main/cpp/camera_proof_publish.c'])
    elif mode == 'focused':
        sources = [MAIN / (x+'.java') for x in ['CameraProofFrame', 'CameraProofStore', 'CameraProofLifecycle', 'CameraProofFinalizer', 'PhonePortabilityImage', 'PhonePortabilityJson', 'GeneratedImageGeometry']]
        sources += [TEST / (x+'.java') for x in ['CameraProofChecks', 'CameraProofRecoveryChecks', 'CameraProofFinalizationChecks']]
        run([JAVA / 'javac.exe', '-Xlint:all', '-d', out / 'classes', *sources])
        for check in ('CameraProofRecoveryChecks', 'CameraProofFinalizationChecks'):
            run([JAVA / 'java.exe', '-cp', out / 'classes', 'expo.modules.recognitioncpu.'+check, out / check])
    elif mode == 'ui':
        run([NODE, ROOT / 'node_modules/jest/bin/jest.js', '--runInBand', '--cacheDirectory', out / 'jest-cache', '--runTestsByPath', '__tests__/recognitionExperimentCameraProof.test.ts', '__tests__/recognitionExperimentCameraProofUi.test.tsx', '__tests__/recognitionExperimentCameraProofConfig.test.ts', '__tests__/recognitionExperimentCameraProofIsolation.test.tsx'], ROOT / 'apps/mobile')
    elif mode == 'types':
        run([NODE, ROOT / 'node_modules/typescript/bin/tsc', '--noEmit'], ROOT / 'apps/mobile')
    elif mode == 'lint':
        run([NODE, ROOT / 'node_modules/eslint/bin/eslint.js', '.', '--max-warnings=0'], ROOT / 'apps/mobile')

if __name__ == '__main__':
    main()
