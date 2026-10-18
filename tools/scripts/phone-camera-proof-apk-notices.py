"""Freeze this build's runtime metadata/notices and the derivative MIT licence."""
import hashlib,importlib.util,io,json,pathlib,re,xml.etree.ElementTree as ET,zipfile
spec=importlib.util.spec_from_file_location('g3',pathlib.Path(__file__).with_name('phone-camera-proof-build.py'));g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)

def main():
 g.live();assert (g.WRITER/'release-success.json').is_file()
 resolved=g.read(g.WRITER/'resolved-artifacts.json');runtime=resolved['app']['releaseRuntimeClasspath']['artifacts'];dest=g.WRITER/'runtime-notices';dest.mkdir()
 maven=pathlib.Path(g.read(g.WRITER/'c1-cache-reuse.json')['mavenRoot']);records=[]
 def retain(source,target):
  data=source.read_bytes()
  with target.open('xb') as f:f.write(data)
  assert g.sha(source)==g.sha(target);return dict(path=str(source),copy=str(target),bytes=len(data),sha256=g.sha(source))
 def pom(coord):
  parts=coord.split(':');assert len(parts)==3 and all(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*',p) for p in parts),coord
  group,name,version=parts;p=maven/group.replace('.','/')/name/version/(name+'-'+version+'.pom')
  if p.is_file():return p
  base=g.TOOLS/'gradle/caches/modules-2/files-2.1'/group/name/version
  rows=list(g.ext(base).glob('*/*.pom')) if g.ext(base).is_dir() else []
  if not rows:return None
  return pathlib.Path(str(rows[0]).removeprefix('\\\\?\\'))
 def metadata(coord,folder,seen=None):
  seen=set() if seen is None else seen
  if coord in seen or len(seen)>=8:return dict(coordinate=coord,cycleOrDepthRefusal=True)
  seen.add(coord);p=pom(coord)
  if p is None:return dict(coordinate=coord,metadataAvailable=False)
  tree=ET.fromstring(p.read_bytes());find=lambda name:next((e for e in tree if e.tag.split('}')[-1]==name),None)
  licences=[]
  for e in tree.iter():
   if e.tag.split('}')[-1]=='license':licences.append({c.tag.split('}')[-1]:(c.text or '').strip() for c in e})
  target=folder/('pom-'+hashlib.sha256(coord.encode()).hexdigest()[:16]+'.xml')
  if not target.exists():retain(p,target)
  row=dict(coordinate=coord,path=str(p),copy=str(target),sha256=g.sha(p),declaredLicences=licences)
  parent=find('parent')
  if parent is not None:
   fields={e.tag.split('}')[-1]:(e.text or '').strip() for e in parent};parentCoord=':'.join(fields.get(k,'') for k in ['groupId','artifactId','version'])
   if '${' not in parentCoord:row['parent']=metadata(parentCoord,folder,seen)
   else:row['unresolvedParentProperty']=parentCoord
  return row
 def texts(blob,coord,folder,prefix=''):
  rows=[]
  with zipfile.ZipFile(io.BytesIO(blob)) as z:
   for e in z.infolist():
    name=pathlib.PurePosixPath(e.filename).name.lower()
    if e.is_dir():continue
    if any(term in name for term in ['license','notice','copying']) and not name.endswith(('.class','.so','.jar','.aar')):
     assert e.file_size<=4*1024*1024
     data=z.read(e);target=folder/(hashlib.sha256((prefix+e.filename).encode()).hexdigest()[:16]+'.txt')
     with target.open('xb') as f:f.write(data)
     rows.append(dict(archiveEntry=prefix+e.filename,copy=str(target),bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
    if e.filename=='classes.jar' and not prefix:rows+=texts(z.read(e),coord,folder,'classes.jar!/')
  return rows
 unique={r['coordinate']:r for r in runtime if r['external']}
 for coordinate,artifact in sorted(unique.items()):
  p=pathlib.Path(artifact['path']);assert g.sha(p)==artifact['sha256'];folder=dest/hashlib.sha256(coordinate.encode()).hexdigest()[:16];folder.mkdir()
  records.append(dict(coordinate=coordinate,binaryPath=str(p),binarySha256=artifact['sha256'],metadata=metadata(coordinate,folder),presentNoticeTexts=texts(p.read_bytes(),coordinate,folder)))
 camera=g.STAGE/'camera-packages/expo-camera/LICENSE';licence=retain(camera,dest/'expo-camera-57.0.6-MIT-LICENSE.txt')
 g.put(g.WRITER/'runtime-notices.json',dict(createdUtc=g.now(),runtimeCoordinates=len(records),records=records,cameraDerivativeLicence=licence,cameraCopyrightUnchanged=True,metadataMissing=[r['coordinate'] for r in records if r['metadata'].get('metadataAvailable') is False],noticeTexts=sum(len(r['presentNoticeTexts']) for r in records),scope='Actual C2 runtime closure and present notice texts/parent metadata; not an old zero-camera inventory or legal compliance conclusion',scannerRuntimeExcluded=True,newNetwork=False))
 print(json.dumps(dict(runtimeCoordinates=len(records),noticeTexts=sum(len(r['presentNoticeTexts']) for r in records),MITLicencePreserved=True,newNetwork=False)))

if __name__=='__main__':main()
