"""NEW unpublished recovery controller and fixed donor provenance; no payload/recovery operation."""
import pathlib,hashlib,json,sys
ROOT=pathlib.Path(__file__).resolve().parents[2];RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-host-c4-20261013-a1'
OLD=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/cosi-phone-portability-host-c3-20261013-a1');NEW=OLD.parent/'cosi-phone-portability-host-c4-20261013-a1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def write(name,raw):
 with (NEW/name).open('xb') as f:f.write(raw)
 assert (NEW/name).read_bytes()==raw
def main():
 assert not sys.argv[1:] and not (RUN/'stopped.json').exists() and {p.name for p in NEW.iterdir()}=={'network-binding.private.json'}
 capture=json.loads((RUN/'connected-capture.json').read_bytes());assert capture['ConnectedValidation']=='PASSED'
 donor=json.loads((RUN/'donor-before.json').read_bytes());attempt=OLD/'attempt-portability-host-c3-20261013-a1'
 files=[dict(path=str(p),bytes=p.stat().st_size,sha256=sha(p.read_bytes())) for p in sorted(attempt.iterdir())];assert len(files)==14
 proof=dict(kind='PINNED_FAILED_C3_DONOR_PROVENANCE',donorOperation='portability-host-c3-20261013-a1',donorPath=donor['path'],donorSha256=donor['sha256'],donorBytes=donor['bytes'],originalAttempt=str(attempt),files=files,originalFailedStatusPreserved=True,actualPayloadIntegrityAccepted=False)
 write('donor-provenance.json',(json.dumps(proof,indent=2)+'\n').encode());proof_sha=sha((NEW/'donor-provenance.json').read_bytes())
 for name in ['Support-ReadOnly.ps1','Native.cs','runtime-offline.json']:write(name,(OLD/name).read_bytes())
 def context(text):return text.replace(str(OLD),str(NEW)).replace('portability-host-c3-20261013-a1','portability-host-c4-20261013-a1').replace('phone-portability-host-c3-prepare.py','phone-portability-host-c4-recover.py')
 bindings=context((OLD/'Portability-Bindings.ps1').read_text()).replace('PUBLISHED_FOR_ONE_PORTABILITY_PREPARATION','PUBLISHED_FOR_ONE_PORTABILITY_RECOVERY').replace('APPROVED_FOR_ONE_PORTABILITY_PREPARATION','APPROVED_FOR_ONE_PORTABILITY_RECOVERY')
 bindings=bindings.replace("tensorBudget=40","tensorBudget=0").replace('TensorBudget=40','TensorBudget=0').replace("COSI-Portability-Preparation.cmd","COSI-Archive-Recovery.cmd")
 fields="operationKind='RECOVER_FROM_C3_FINALIZATION_FAILURE';recordCount=40;newControlTensors=0;donorSha256='"+donor['sha256']+"';donorBytes="+str(donor['bytes'])+";donorOperation='portability-host-c3-20261013-a1';donorProvenanceSha256='"+proof_sha+"';"
 bindings=bindings.replace("manifestSha256=",fields+'manifestSha256=',1)
 bindings=bindings.replace("'perImageSeconds')","'perImageSeconds','recordCount','newControlTensors','donorBytes')",1)
 bindings=bindings.replace('QueryDenominator=20})','QueryDenominator=20;DonorSha256=\''+donor['sha256']+'\'})',1)
 bindings=bindings.replace('PORTABILITY_PREPARATION_FAILED_NO_PARTIAL_PACKET','PORTABILITY_RECOVERY_FAILED_RETAIN_ALL_ARTIFACTS')
 bindings+=(RUN/'closure-function.ps1.txt').read_text();write('Portability-Bindings.ps1',bindings.encode())
 controller=context((OLD/'Invoke-PortabilityPreparation.ps1').read_text()).replace(sha((OLD/'Portability-Bindings.ps1').read_bytes()),sha(bindings.encode())).replace(sha((OLD/'network-binding.private.json').read_bytes()),capture['BindingSha256'])
 controller=controller.replace('Offline observed. Experiment running; fixed query denominator 20. Press Q in the controller to cancel.','Offline observed. Recovering the fixed C3 archive; no new tensors or model calls. Press Q here to cancel.')
 controller=controller.replace("  $exitCode=Get-ResultExitCode $result\n", "  $exitCode=Get-ResultExitCode $result\n  if($exitCode -eq 0){$null=Complete-RecoveryClosure $result}\n",1)
 controller=controller.replace('COMPLETE_PROCESSING_COORDINATOR_REVIEW_PENDING','RECOVERED_ARCHIVE_CLOSURE_COORDINATOR_REVIEW_PENDING');write('Invoke-PortabilityPreparation.ps1',controller.encode())
 launcher=context((OLD/'COSI-Portability-Preparation.cmd').read_text()).replace('Preparation stopped.','Archive recovery stopped.').replace('\n','\r\n');write('COSI-Archive-Recovery.cmd',launcher.encode())
 file_list=[NEW/n for n in ['Invoke-PortabilityPreparation.ps1','Portability-Bindings.ps1','Support-ReadOnly.ps1','Native.cs','runtime-offline.json','network-binding.private.json','donor-provenance.json','COSI-Archive-Recovery.cmd']]
 file_list += [ROOT/'tools/scripts'/('phone-portability-host-c4-'+n) for n in ['archive.py','recover.py','controller.py','capture.ps1','checks.py','control-checks.ps1']]
 file_list += [OLD/n for n in ['Invoke-PortabilityPreparation.ps1','Portability-Bindings.ps1','controller-source-manifest.json']]
 previous=json.loads((OLD/'controller-source-manifest.json').read_bytes())
 for row in previous['files']:
  p=pathlib.Path(row['path'])
  if p.parent!=OLD and p not in file_list:file_list.append(p)
 index=dict(schemaVersion=1,kind='UNPUBLISHED_PORTABILITY_CONTROLLER_SOURCE',files=[dict(path=str(p),bytes=p.stat().st_size,sha256=sha(p.read_bytes())) for p in sorted(file_list)])
 write('controller-source-manifest.json',(json.dumps(index,indent=2)+'\n').encode());index_sha=sha((NEW/'controller-source-manifest.json').read_bytes());runner_sha=sha(controller.encode())
 for name in ['execution-authorization','publication','network-review']:
  draft=json.loads((OLD/(name+'.template.json')).read_bytes());assert draft['status'].startswith('DRAFT_')
  for key,value in [('runId','portability-host-c4-20261013-a1'),('runnerSha256',runner_sha),('networkBindingSha256',capture['BindingSha256']),('controllerSourceSha256',index_sha),('launcherSha256',sha(launcher.encode()))]:
   if key in draft:draft[key]=value
  if name=='execution-authorization':draft.update(tensorBudget=0,operationKind='RECOVER_FROM_C3_FINALIZATION_FAILURE',recordCount=40,newControlTensors=0,donorSha256=donor['sha256'],donorBytes=donor['bytes'],donorOperation='portability-host-c3-20261013-a1',donorProvenanceSha256=proof_sha)
  write(name+'.template.json',(json.dumps(draft,indent=2)+'\n').encode())
 receipt=dict(root=str(NEW),operation='portability-host-c4-20261013-a1',sourceFiles=len(file_list),runnerSha256=runner_sha,sourceIndexSha256=index_sha,networkBindingSha256=capture['BindingSha256'],donorProvenanceSha256=proof_sha,published=False,approvalCreated=False,actualPayloadEntriesRead=False)
 (RUN/'controller-preparation.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
if __name__=='__main__':main()
