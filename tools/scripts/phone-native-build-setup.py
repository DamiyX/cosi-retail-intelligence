"""Task-local official archive acquisition. Does not touch devices or global settings."""
import hashlib
import json
import pathlib
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
import sys

RUN = pathlib.Path(sys.argv[1]).resolve()
TOOL_ROOT = pathlib.Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else RUN
META = RUN / 'metadata'
DOWNLOADS = RUN / 'downloads'
DOWNLOADS.mkdir(exist_ok=True)

def acquire(url, name, size, algorithm, expected):
    target = DOWNLOADS / name
    if not target.exists():
        request = urllib.request.Request(url, headers={'User-Agent': 'COSI-local-build'})
        with urllib.request.urlopen(request, timeout=120) as response, target.open('xb') as out:
            while block := response.read(1024 * 1024):
                out.write(block)
    actual = hashlib.new(algorithm)
    sha256 = hashlib.sha256()
    with target.open('rb') as stream:
        while block := stream.read(1024 * 1024):
            actual.update(block)
            sha256.update(block)
    if target.stat().st_size != size or actual.hexdigest() != expected:
        raise ValueError(f'Archive verification failed: {name}')
    receipt = dict(url=url, name=name, expectedBytes=size, actualBytes=target.stat().st_size,
                   officialAlgorithm=algorithm, officialExpected=expected,
                   officialActual=actual.hexdigest(), sha256=sha256.hexdigest())
    (META / (name + '.receipt.json')).write_text(json.dumps(receipt, indent=2) + '\n')
    print('VERIFIED', name, size, sha256.hexdigest(), flush=True)
    return target

def extract(archive, destination, strip, repair_owned=False):
    owned = (destination / '.cosi-verified-extraction').exists()
    if owned and not repair_owned:
        return
    if destination.exists() and not (repair_owned and owned):
        raise ValueError(f'Refusing partial/unowned extraction: {destination}')
    destination.mkdir(parents=True, exist_ok=repair_owned)
    with zipfile.ZipFile(archive) as z:
        for member in z.infolist():
            parts = pathlib.PurePosixPath(member.filename).parts
            if not parts or any(p in ('..', '') or ':' in p for p in parts) or member.filename.startswith(('/', '\\')):
                raise ValueError('Unsafe archive path')
            if ((member.external_attr >> 16) & 0o170000) == 0o120000:
                raise ValueError('Archive symlinks unsupported')
            relative = pathlib.Path(*parts[strip:])
            if not relative.parts:
                continue
            target = destination / relative
            if not target.resolve().is_relative_to(destination.resolve()):
                raise ValueError('Archive traversal')
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                if target.exists() and repair_owned:
                    if target.read_bytes() != z.read(member):
                        raise ValueError('Refusing differing repair destination')
                    continue
                with z.open(member) as source, target.open('xb') as out:
                    while block := source.read(1024 * 1024):
                        out.write(block)
    (destination / '.cosi-verified-extraction').write_text('Verified archive; see metadata receipt.\n')
    print('EXTRACTED', str(destination), flush=True)

if '--gradle' in sys.argv[3:]:
    url = 'https://services.gradle.org/distributions/gradle-9.3.1-bin.zip'
    request = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'COSI-local-build'})
    with urllib.request.urlopen(request, timeout=120) as response:
        expected_size = int(response.headers['Content-Length'])
    expected_hash = (META / 'gradle-9.3.1-bin.zip.sha256').read_text().strip()
    acquire(url, 'gradle-9.3.1-bin.zip', expected_size, 'sha256', expected_hash)
    # Wrapper independently checked this hash before its original extraction.
    # This retained archive supplies byte-size/hash/legal-text audit evidence.
    sys.exit(0)

jdk = json.loads((META / 'jdk-release.json').read_bytes())
asset = next(a for a in jdk['assets'] if a['name'] == 'OpenJDK17U-jdk_x64_windows_hotspot_17.0.20.1_1.zip')
archive = acquire(asset['browser_download_url'], asset['name'], asset['size'], 'sha256', asset['digest'].split(':')[1])
extract(archive, TOOL_ROOT / 'jdk17', 1)
repo = ET.fromstring((META / 'repository.xml').read_bytes())
licenses = {p.attrib['id']: p.text for p in repo if p.tag.endswith('license')}
paths = ['cmdline-tools;latest', 'platforms;android-36', 'build-tools;36.0.0', 'ndk;27.1.12297006', 'cmake;3.22.1']
if '--platform-tools' in sys.argv[3:]:
    paths.append('platform-tools')
for name in paths:
    package = next(p for p in repo if p.tag.endswith('remotePackage') and p.attrib['path'] == name)
    entry = next(p for p in package.find('archives') if p.findtext('host-os') in (None, 'windows')).find('complete')
    filename = entry.findtext('url')
    archive = acquire('https://dl.google.com/android/repository/' + filename, filename,
                      int(entry.findtext('size')), entry.find('checksum').attrib['type'], entry.findtext('checksum'))
    strip = 0 if name.startswith('cmake;') else 1
    repair = name.startswith('cmake;') and '--repair-cmake' in sys.argv[3:]
    extract(archive, TOOL_ROOT / 'sdk' / pathlib.Path(*name.split(';')), strip, repair)
    license_id = package.find('uses-license').attrib['ref']
    text = licenses[license_id]
    (META / (license_id + '.txt')).write_text(text, encoding='utf-8')
    license_dir = TOOL_ROOT / 'sdk' / 'licenses'
    license_dir.mkdir(exist_ok=True)
    # Installed AGP repository License.getLicenseHash hashes the exact UTF8 value.
    # Retain whitespace; trimming produces an unrecognized acceptance hash.
    digest = hashlib.sha1(text.encode()).hexdigest()
    license_path = license_dir / license_id
    accepted = license_path.read_text().splitlines() if license_path.exists() else []
    if digest not in accepted:
        license_path.write_text('\n'.join([*accepted, digest]) + '\n')
    print('TASK_LOCAL_LICENSE', license_id, digest, flush=True)
