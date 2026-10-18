"""Create only a NEW unpublished C3 controller; preserve C2 consumed source and guards."""
import pathlib,json,hashlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-host-c3-20261013-a1'
OLD=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/cosi-phone-portability-host-c2-20261013-a1')
NEW=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/cosi-phone-portability-host-c3-20261013-a1')
sha=lambda b:hashlib.sha256(b).hexdigest()
def write(name,raw):
 with (NEW/name).open('xb') as f:f.write(raw)
 assert (NEW/name).read_bytes()==raw
def main():
 assert not sys.argv[1:] and not (RUN/'stopped.json').exists()
 assert {p.name for p in NEW.iterdir()}=={'network-binding.private.json'}
 capture=json.loads((RUN/'connected-capture.json').read_bytes());assert capture['ConnectedValidation']=='PASSED'
 assert capture['BindingSha256']==sha((NEW/'network-binding.private.json').read_bytes())
 for row in json.loads((RUN/'consumed-c2-before.json').read_bytes()):assert sha(pathlib.Path(row['path']).read_bytes())==row['sha256']
 for name in ['Support-ReadOnly.ps1','Native.cs','runtime-offline.json']:write(name,(OLD/name).read_bytes())
 def context(text):
  return text.replace(str(OLD),str(NEW)).replace('portability-host-c2-20261013-a1','portability-host-c3-20261013-a1').replace('phone-portability-host-c2-prepare.py','phone-portability-host-c3-prepare.py')
 bindings=context((OLD/'Portability-Bindings.ps1').read_text());write('Portability-Bindings.ps1',bindings.encode())
 controller=context((OLD/'Invoke-PortabilityPreparation.ps1').read_text())
 controller=controller.replace(sha((OLD/'Portability-Bindings.ps1').read_bytes()),sha(bindings.encode()))
 controller=controller.replace(sha((OLD/'network-binding.private.json').read_bytes()),capture['BindingSha256'])
 write('Invoke-PortabilityPreparation.ps1',controller.encode())
 launcher=context((OLD/'COSI-Portability-Preparation.cmd').read_text()).replace('\n','\r\n');write('COSI-Portability-Preparation.cmd',launcher.encode())
 previous=json.loads((OLD/'controller-source-manifest.json').read_bytes());files=[]
 mapping={'phone-portability-host-c2-controller.py':'phone-portability-host-c3-controller.py','phone-portability-host-c2-prepare.py':'phone-portability-host-c3-prepare.py','phone-portability-host-c2-capture.ps1':'phone-portability-host-c3-capture.ps1','phone-portability-host-c2-checks.ps1':'phone-portability-host-c3-control-checks.ps1'}
 for row in previous['files']:
  p=pathlib.Path(row['path'])
  if p.parent==OLD:p=NEW/p.name
  elif p.name in mapping:p=ROOT/'tools/scripts'/mapping[p.name]
  files.append(p)
 files += [ROOT/'tools/scripts/phone-portability-host-c3-checks.py']+[OLD/n for n in ['Invoke-PortabilityPreparation.ps1','Portability-Bindings.ps1','controller-source-manifest.json']]
 assert len(set(files))==len(files)
 index=dict(schemaVersion=1,kind='UNPUBLISHED_PORTABILITY_CONTROLLER_SOURCE',files=[dict(path=str(p),bytes=p.stat().st_size,sha256=sha(p.read_bytes())) for p in sorted(files)])
 write('controller-source-manifest.json',(json.dumps(index,indent=2)+'\n').encode())
 index_sha=sha((NEW/'controller-source-manifest.json').read_bytes());runner_sha=sha(controller.encode())
 for name in ['execution-authorization','publication','network-review']:
  draft=json.loads((OLD/(name+'.template.json')).read_bytes())
  assert draft['status'].startswith('DRAFT_') and draft['authorThreadId']=='PENDING_COORDINATOR'
  for key,value in [('runId','portability-host-c3-20261013-a1'),('runnerSha256',runner_sha),('networkBindingSha256',capture['BindingSha256']),('controllerSourceSha256',index_sha),('launcherSha256',sha(launcher.encode()))]:
   if key in draft:draft[key]=value
  write(name+'.template.json',(json.dumps(draft,indent=2)+'\n').encode())
 receipt=dict(root=str(NEW),operation='portability-host-c3-20261013-a1',sourceFiles=len(files),runnerSha256=runner_sha,sourceIndexSha256=index_sha,networkBindingSha256=capture['BindingSha256'],published=False,approvalCreated=False,actualWork=False)
 (RUN/'controller-preparation.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
if __name__=='__main__':main()
