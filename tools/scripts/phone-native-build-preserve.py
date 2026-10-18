"""Compare every captured source/protected byte without decoding private data."""
import concurrent.futures
import hashlib
import json
import os
import pathlib
import subprocess
import sys
root = pathlib.Path(sys.argv[1]).resolve()
run = pathlib.Path(sys.argv[2]).resolve()
assert run == root / 'apps/recognition-lab/runs/phone-experiment/p1-portability-c1-20261012-a1'
assert not (run/'stopped.json').exists(), 'Frozen writer evidence cannot be overwritten.'
baseline = json.loads((run / 'baseline.json').read_bytes())

def git(*args):
    return subprocess.check_output(['git', *args], cwd=root)

def current(row):
    path = root / row['path']
    try:
        stat = path.lstat()
    except FileNotFoundError:
        return dict(path=row['path'], missing=True)
    if stat.st_file_attributes & 0x400:
        target = os.readlink(path)
        return dict(path=row['path'], kind='link', target=target, sha256=hashlib.sha256(target.encode()).hexdigest())
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    return dict(path=row['path'], bytes=path.stat().st_size, sha256=digest)

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    source_now = list(pool.map(current, baseline['files']))
    protected_now = list(pool.map(current, baseline['protected']))
changed = [new for old, new in zip(baseline['files'], source_now) if old != new]
protected_changed = [new for old, new in zip(baseline['protected'], protected_now) if old != new]
protected_paths = set()
for ceiling in [root / 'apps/recognition-lab/runs', root / 'apps/recognition-lab/private-data', root / 'output', root / 'node_modules/expo-camera']:
    for directory, folders, files in os.walk(ceiling, followlinks=False):
        parent = pathlib.Path(directory)
        if parent == run:
            folders.clear()
            continue
        for name in list(folders):
            path = parent / name
            if path == run:
                folders.remove(name)
            elif path.lstat().st_file_attributes & 0x400:
                protected_paths.add(str(path.relative_to(root)))
                folders.remove(name)
        protected_paths.update(str((parent / name).relative_to(root)) for name in files)
baseline_protected_paths = {r['path'] for r in baseline['protected']}
protected_additions = sorted(protected_paths - baseline_protected_paths)
allowed_existing = {'.agents/workflows/recognition-track-b.json',
    'apps/mobile/recognition-native/recognition-experiment/android/src/main/java/expo/modules/recognitionexperiment/RecognitionExperimentModule.kt',
    'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilitySource.java',
    *('tools/scripts/'+name for name in ['phone-native-build-config.mjs','phone-native-build-run.ps1','phone-native-build-preserve.py','phone-portability-checks.py','phone-portability-store-checks.py','phone-portability-host-checks.py','phone-portability-apk-checks.py','phone-portability-controller.py','phone-portability-controller-checks.ps1','phone-portability-prepare.py'])}
unexpected_changed = [r for r in changed if r['path'].replace('\\', '/') not in allowed_existing]
old_paths = {r['path'].replace('\\', '/') for r in baseline['files']}
now_paths = {p.decode().replace('\\', '/') for p in git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split(b'\0') if p}
new_paths = sorted(now_paths - old_paths)

def allowed_new(path):
    return path in [
      'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilityState.java',
      'apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/test/java/expo/modules/recognitioncpu/PhonePortabilityStateChecks.java',
      'tools/scripts/phone-portability-state-checks.py',
      'docs/recognition/reports/PHONE_P1_PORTABILITY_C1_RESULT_20261012.md',
      'docs/recognition/reports/PHONE_P1_PORTABILITY_C1_HANDOFF_20261012.md']

unexpected_new = [p for p in new_paths if not allowed_new(p)]
workflow_before = json.loads((run / 'workflow-before.raw').read_bytes())
workflow_now = json.loads((root / '.agents/workflows/recognition-track-b.json').read_bytes())
workflow_delta = sorted(k for k in set(workflow_before) | set(workflow_now) if workflow_before.get(k) != workflow_now.get(k))
unexpected_workflow = [k for k in workflow_delta if k not in ['lease', 'current_state', 'updated_at']]
result = dict(head=git('rev-parse', 'HEAD').decode().strip(), branch=git('branch', '--show-current').decode().strip(),
              baselineSourceCount=len(source_now), protectedCount=len(protected_now), changedExisting=changed,
              newSourcePaths=new_paths, protectedChanges=protected_changed, unexpectedExisting=unexpected_changed,
              protectedAdditions=protected_additions,
              unexpectedNew=unexpected_new, workflowDelta=workflow_delta, unexpectedWorkflow=unexpected_workflow,
              privateImagesDecoded=False)
output = run / sys.argv[3]
output.write_text(json.dumps(result, indent=2) + '\n')
assert not protected_changed and not protected_additions and not unexpected_changed and not unexpected_new and not unexpected_workflow
assert result['head'] == baseline['head'] and result['branch'] == baseline['branch']
print(json.dumps(dict(source=len(source_now), protected=len(protected_now), protectedChanges=0,
                      existingAllowedChanges=len(changed), newAllowedSources=len(new_paths), workflowDelta=workflow_delta)))
