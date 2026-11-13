"""C6-C1 source checks/binding only; old C6 receipts and STOP remain immutable."""
import datetime, hashlib, importlib.util, json, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
RUN = ROOT / 'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-c1-source-20261018-a1'
CPU = ROOT / 'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src'
JAVA = pathlib.Path('C:/Users/doyew/.cache/cosi-p1-20261012-a1/jdk17/bin')

def module(name):
    spec = importlib.util.spec_from_file_location(name, pathlib.Path(__file__).with_name(name+'.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result

def live():
    state = json.loads((ROOT / '.agents/workflows/recognition-track-b.json').read_text())
    lease = json.loads((RUN / 'scope.json').read_text())['lease']
    assert state['lease'] == lease and lease['holder'] == '01a1051f-0777-7573-ad09-0e550a4bd56a'
    assert datetime.datetime.now(datetime.timezone.utc) < datetime.datetime.fromisoformat(lease['expires_at'])
    assert not (RUN / 'writer-stopped.json').exists()

def binding():
    raw = module('phone-camera-storage-repair-source').binding()
    rows = {r['path']: r for r in json.loads(raw)}
    p = pathlib.Path(__file__)
    rows[p.relative_to(ROOT).as_posix()] = dict(path=p.relative_to(ROOT).as_posix(), bytes=p.stat().st_size, sha256=hashlib.sha256(p.read_bytes()).hexdigest())
    return (json.dumps([rows[k] for k in sorted(rows)], sort_keys=True, separators=(',', ':'))+'\n').encode()

def main():
    mode = sys.argv[1]
    if mode in ('binding', 'check-binding'):
        raw = binding()
        if mode == 'binding':
            live()
            with (RUN / 'source-index.json').open('xb') as f:
                f.write(raw)
        else:
            assert (RUN / 'source-index.json').read_bytes() == raw, 'STALE_C6_C1_BINDING'
        print(json.dumps(dict(rows=len(json.loads(raw)), sha256=hashlib.sha256(raw).hexdigest(), legacyOwnerIsRuntimeProvenance=False, nativeValidated=False)))
        return
    live()
    if mode == 'android':
        checks = module('phone-camera-storage-repair-checks')
        checks.RUN = RUN
        checks.main()
        return
    assert mode == 'focused'
    name = sys.argv[2]
    assert name.isascii() and name.replace('-', '').isalnum()
    out = RUN / name
    out.mkdir(exist_ok=False)
    main_src = CPU / 'main/java/expo/modules/recognitioncpu'
    test = CPU / 'test/java/expo/modules/recognitioncpu'
    sources = [main_src / (n+'.java') for n in ['CameraProofFrame', 'CameraProofStore', 'CameraProofLifecycle', 'CameraProofFinalizer', 'PhonePortabilityImage', 'PhonePortabilityJson', 'GeneratedImageGeometry']]
    sources += [test / (n+'.java') for n in ['CameraProofChecks', 'CameraProofRecoveryChecks', 'CameraProofFinalizationChecks', 'CameraProofDurabilityChecks']]
    inputs = [dict(path=s.relative_to(ROOT).as_posix(), sha256=hashlib.sha256(s.read_bytes()).hexdigest()) for s in sources]
    rows = []
    commands = [[JAVA / 'javac.exe', '-Xlint:all', '-d', out / 'classes', *sources]]
    commands += [[JAVA / 'java.exe', '-cp', out / 'classes', 'expo.modules.recognitioncpu.'+check, out / check] for check in ['CameraProofDurabilityChecks', 'CameraProofRecoveryChecks', 'CameraProofFinalizationChecks']]
    for args in commands:
        live()
        assert all(hashlib.sha256((ROOT / s['path']).read_bytes()).hexdigest() == s['sha256'] for s in inputs), 'SOURCE_CHANGED_DURING_CHECK'
        p = subprocess.run([str(a) for a in args], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
        rows.append(dict(command=[str(a) for a in args], exitCode=p.returncode, stdout=p.stdout, stderr=p.stderr))
        (out / 'result.json').write_text(json.dumps(dict(atUtc=datetime.datetime.now(datetime.timezone.utc).isoformat(), receipts=rows, source=inputs), indent=2)+'\n')
        assert all(hashlib.sha256((ROOT / s['path']).read_bytes()).hexdigest() == s['sha256'] for s in inputs), 'SOURCE_CHANGED_DURING_CHECK'
        print(json.dumps(dict(exitCode=p.returncode, stdout=p.stdout[-1800:], stderr=p.stderr[-2500:])), flush=True)
        if p.returncode:
            raise SystemExit(p.returncode)

if __name__ == '__main__':
    main()
