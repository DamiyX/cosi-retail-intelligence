"""C9 fixed A6 exporter index; preserve all historical C7/C8 bindings and original owner."""
import datetime, hashlib, json, pathlib, sys

R = pathlib.Path(__file__).resolve().parents[2]
W = R / 'apps/recognition-lab/runs/phone-experiment/p2-camera-export-c9-source-20261023-a2/writer'
M = R / 'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def live():
    state = json.loads((R / '.agents/workflows/recognition-track-b.json').read_text())
    charter = json.loads((W / 'charter.json').read_text())
    assert state['lease'] == charter['lease'] and state['lease']['holder'] == '01a1051f-0777-7573-ad09-0e550a4bd56a'
    assert datetime.datetime.fromisoformat(state['lease']['expires_at']) > datetime.datetime.now(datetime.timezone.utc)
    assert not (W / 'writer-stopped.json').exists()


def binding():
    paths = {R / x['path'] for x in json.loads((W / 'before-source-index.json').read_text())}
    paths.discard(M / 'CameraEvidenceExportSource.java')
    paths.add(M / 'CameraEvidenceC9.java')
    paths.add(M.parents[4] / 'test/java/expo/modules/recognitioncpu/CameraEvidenceC9Checks.java')
    paths.update((R / 'tools/scripts').glob('phone-camera-export-c9-*.py'))
    paths.add(W / 'capture-profile.json')
    return (json.dumps([dict(path=p.relative_to(R).as_posix(), bytes=p.stat().st_size, sha256=sha(p))
                        for p in sorted(paths)], sort_keys=True, separators=(',', ':')) + '\n').encode()


def generated(digest):
    return ('package expo.modules.recognitioncpu;\n/** Derived C9 index; indexed renderer excludes its own output. Original capture pins stay separate. */\n'
            'public final class CameraEvidenceExportSource { private CameraEvidenceExportSource(){} public static final String SHA256="' + digest + '"; }\n').encode()


def main():
    raw = binding(); digest = hashlib.sha256(raw).hexdigest(); target = M / 'CameraEvidenceExportSource.java'
    if sys.argv[1:] == ['bind']:
        live()
        before = next(x for x in json.loads((W / 'before-source-index.json').read_text()) if x['path'] == target.relative_to(R).as_posix())
        assert sha(target) == before['sha256'] and not (W / 'source-index.json').exists()
        with (W / 'source-index.json').open('xb') as f:
            f.write(raw)
        target.write_bytes(generated(digest))
        with (W / 'runtime-binding.json').open('x', encoding='utf-8') as f:
            json.dump(dict(sourceIndexSha256=digest, derivedSourceSha256=sha(target), historicalDerivedSourceSha256=before['sha256'],
                           rule='generated(index digest) in indexed C9 renderer; output excluded from own inputs', originalCaptureProvenanceUnchanged=True), f, indent=2)
            f.write('\n')
    elif sys.argv[1:] == ['check']:
        assert (W / 'source-index.json').read_bytes() == raw and target.read_bytes() == generated(digest), 'STALE_C9_SOURCE'
    else:
        raise ValueError('Explicit bind/check required')
    print(json.dumps(dict(rows=len(json.loads(raw)), sourceIndexSha256=digest, derivedSourceSha256=sha(target))))


if __name__ == '__main__':
    main()
