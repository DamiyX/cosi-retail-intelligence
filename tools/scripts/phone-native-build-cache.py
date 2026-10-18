"""Copy immutable Gradle archives into the explicitly owned short Windows cache."""
import hashlib
import json
import os
import pathlib
import shutil
import sys
source = pathlib.Path(sys.argv[1]).resolve()
target = pathlib.Path(sys.argv[2]).resolve()
run = pathlib.Path(sys.argv[3]).resolve()
assert str(target).lower().replace('\\', '/') == 'c:/p1g-20261012-a1'
assert target.exists(), 'The writer must establish this exact task cache first.'

def extended(path):
    return pathlib.Path('\\\\' + '?' + '\\' + str(path)) if os.name == 'nt' else path

records = []
for relative in ['wrapper/dists', 'caches/modules-2/files-2.1']:
    original = extended(source / relative)
    for directory, folders, files in os.walk(original, followlinks=False):
        for filename in files:
            if filename.endswith(('.lock', '.lck')):
                continue
            old = pathlib.Path(directory) / filename
            suffix = old.relative_to(extended(source))
            new = extended(target / suffix)
            new.parent.mkdir(parents=True, exist_ok=True)
            if not new.exists():
                shutil.copyfile(old, new)
            old_hash = hashlib.file_digest(old.open('rb'), 'sha256').hexdigest()
            new_hash = hashlib.file_digest(new.open('rb'), 'sha256').hexdigest()
            assert old_hash == new_hash, f'Refusing differing cache destination: {suffix}'
            records.append(dict(path=str(suffix), bytes=old.stat().st_size, sha256=old_hash))
(run / 'short-gradle-cache.json').write_text(json.dumps(dict(original=str(source), new=str(target),
    copied=['wrapper/dists', 'caches/modules-2/files-2.1'], records=records, movedOrDeleted=False), indent=2) + '\n')
print(json.dumps(dict(copiedOrVerifiedFiles=len(records), bytes=sum(r['bytes'] for r in records),
                      originalPreserved=True)), flush=True)
