"""External C6 code provenance; does not overwrite legacy owner, old stages or source pins."""
import hashlib, importlib.util, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
RUN = ROOT / 'apps/recognition-lab/runs/phone-experiment/p2-camera-storage-c6-source-20261018-a1'

def binding():
    spec = importlib.util.spec_from_file_location('camera_source', pathlib.Path(__file__).with_name('phone-camera-proof-source.py'))
    legacy = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(legacy)
    raw, _ = legacy.binding()
    rows = {row['path']: row for row in json.loads(raw)}
    cpu = ROOT / 'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime'
    paths = list((cpu / 'src/main/cpp').glob('*')) + [cpu / 'consumer-rules.pro', cpu / 'src/main/java/expo/modules/recognitioncpu/CameraProofSource.java']
    paths += list((cpu / 'src/test/java/expo/modules/recognitioncpu').glob('CameraProof*Checks.java'))
    paths += [ROOT / n for n in ['apps/mobile/src/recognitionExperiment/cameraRuntime.ts', 'tools/scripts/phone-camera-storage-repair-source.py', 'tools/scripts/phone-camera-storage-repair-checks.py', 'apps/mobile/__tests__/recognitionExperimentCameraProof.test.ts', 'apps/mobile/__tests__/recognitionExperimentCameraProofUi.test.tsx']]
    for p in paths:
        name = p.relative_to(ROOT).as_posix()
        rows[name] = dict(path=name, bytes=p.stat().st_size, sha256=hashlib.sha256(p.read_bytes()).hexdigest())
    return (json.dumps([rows[k] for k in sorted(rows)], sort_keys=True, separators=(',', ':'))+'\n').encode()

def main():
    raw = binding()
    p = RUN / 'source-index.json'
    if sys.argv[1:] == ['--write']:
        assert (RUN / 'scope.json').is_file() and not (RUN / 'writer-stopped.json').exists()
        with p.open('xb') as f:
            f.write(raw)
    elif sys.argv[1:] == ['--check']:
        assert p.read_bytes() == raw, 'STALE_C6_EXTERNAL_SOURCE_BINDING'
    else:
        raise ValueError('Explicit --write/--check required')
    print(json.dumps(dict(kind='C6_EXTERNAL_SOURCE_BINDING', sha256=hashlib.sha256(raw).hexdigest(), rows=len(json.loads(raw)), legacyOwnerCoversRepairedCode=False, nativeValidated=False, apkBuilt=False)))

if __name__ == '__main__':
    main()
