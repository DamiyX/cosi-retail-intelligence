"""Copy only the accepted public model and generated P0 probes; verify every byte."""
import hashlib
import json
import pathlib
import shutil
import sys
root = pathlib.Path(sys.argv[1]).resolve()
run = root / 'apps/recognition-lab/runs/phone-experiment/p1-native-build-20261012-a1'
assets = root / 'apps/mobile/recognition-native/recognition-experiment/android/src/main/assets/recognition-experiment'
assets.mkdir(parents=True, exist_ok=True)
probes = root / 'apps/recognition-lab/runs/phone-experiment/p0-preparation-20261011-a1/tests/ccc990d0-1d7e-40f5-aaa0-9f0d9f23e3b2/image-oracles'
model = root / 'apps/recognition-lab/runs/exploratory/e01-e03-20261004/mobilenet_v3_small.tflite'
inspection = root / 'apps/recognition-lab/runs/phone-experiment/p1-artifact-inspection-20261011-a1'
sources = [model, *sorted(probes.iterdir()), *sorted(p for p in inspection.rglob('*.txt') if 'LICENSE' in p.name or 'THIRD_PARTY_NOTICE' in p.name)]
records = []
for source in sources:
    if not source.is_file():
        continue
    target = assets / source.name
    if not target.exists():
        shutil.copyfile(source, target)
    original = source.read_bytes()
    assert target.read_bytes() == original, f'Asset differs: {source.name}'
    records.append(dict(source=str(source.relative_to(root)), target=str(target.relative_to(root)), bytes=len(original), sha256=hashlib.sha256(original).hexdigest()))
manifest = json.loads((probes / 'probe-manifest.json').read_bytes())
for probe in manifest['runtimeInputs']:
    data = (assets / probe['path']).read_bytes()
    assert len(data) == probe['bytes'] and hashlib.sha256(data).hexdigest() == probe['sha256']
assert hashlib.sha256(model.read_bytes()).hexdigest() == 'bbbb4c51a55a53905af1daec995ca1aae355046f8839bb8c9f5ce9271394bc40'
(run / 'asset-copies.json').write_text(json.dumps(records, indent=2) + '\n')
print(json.dumps(dict(publicOrGeneratedCopies=len(records), runtimeFixturesVerified=3, privateImagesDecoded=False)))
