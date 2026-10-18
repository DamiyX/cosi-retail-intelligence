"""Retain resolved runtime metadata and all packaged license/notice texts, without execution."""
import hashlib
import json
import pathlib
import shutil
import sys
import xml.etree.ElementTree as ET
import zipfile
run = pathlib.Path(sys.argv[1]).resolve()
receipt = json.loads((run / 'resolved-artifacts.json').read_bytes())
destination = run / 'resolved-notices'
destination.mkdir(exist_ok=True)
records = []
for artifact in receipt.get('app', receipt)['releaseRuntimeClasspath']:
    source = pathlib.Path(artifact['file'])
    assert hashlib.sha256(source.read_bytes()).hexdigest() == artifact['sha256']
    folder = destination / hashlib.sha256(artifact['coordinate'].encode()).hexdigest()[:12]
    folder.mkdir(exist_ok=True)
    if source.suffix in ('.pom', '.module'):
        target = folder / source.name
        if not target.exists():
            shutil.copyfile(source, target)
        licenses = []
        parent = None
        if source.suffix == '.pom':
            tree = ET.fromstring(source.read_bytes())
            for element in tree.iter():
                if element.tag.split('}')[-1] == 'license':
                    licenses.append({e.tag.split('}')[-1]: e.text for e in element})
                if element.tag.split('}')[-1] == 'parent':
                    parent = {e.tag.split('}')[-1]: e.text for e in element}
        records.append(dict(coordinate=artifact['coordinate'], kind='metadata', file=str(target),
                            bytes=target.stat().st_size, sha256=artifact['sha256'], declaredLicenses=licenses, parent=parent))
    elif source.suffix in ('.aar', '.jar'):
        with zipfile.ZipFile(source) as archive:
            for entry in archive.infolist():
                name = pathlib.PurePosixPath(entry.filename).name.lower()
                if entry.is_dir() or not any(word in name for word in ('license', 'notice', 'copying')):
                    continue
                if name.endswith(('.class', '.so')):
                    continue
                if entry.file_size > 4 * 1024 * 1024:
                    raise ValueError('Oversized notice')
                data = archive.read(entry)
                target = folder / (hashlib.sha256(entry.filename.encode()).hexdigest()[:12] + '-' + pathlib.PurePosixPath(entry.filename).name)
                if not target.exists():
                    target.write_bytes(data)
                assert target.read_bytes() == data
                records.append(dict(coordinate=artifact['coordinate'], kind='packaged-notice', archiveEntry=entry.filename,
                                    file=str(target), bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
(run / 'resolved-notices.json').write_text(json.dumps(records, indent=2) + '\n')
print(json.dumps(dict(retainedRecords=len(records), packagedNotices=sum(r['kind'] == 'packaged-notice' for r in records),
                      scope='metadata and present notice texts; rights/legal review not implied')))
