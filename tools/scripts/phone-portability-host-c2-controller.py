"""Generate C2 unpublished copies from preserved C1; no runtime/private/radio operation."""
import pathlib,json,hashlib,sys,ast
ROOT=pathlib.Path(__file__).resolve().parents[2]
RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-host-c2-20261013-a1'
OLD=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/cosi-phone-portability-c1-20261012-a1')
NEW=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/cosi-phone-portability-host-c2-20261013-a1')
OP='portability-host-c2-20261013-a1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def write(name,raw):
 with (NEW/name).open('xb') as f:f.write(raw)
 assert (NEW/name).read_bytes()==raw
def replace_once(text,a,b):
 assert text.count(a)==1,a
 return text.replace(a,b)
def main():
 assert not sys.argv[1:] and not (RUN/'stopped.json').exists()
 assert {p.name for p in NEW.iterdir()}=={'network-binding.private.json'}
 capture=json.loads((RUN/'connected-capture.json').read_bytes())
 assert capture['ConnectedValidation']=='PASSED' and sha((NEW/'network-binding.private.json').read_bytes())==capture['BindingSha256']
 for name in ['Support-ReadOnly.ps1','Native.cs','runtime-offline.json']:write(name,(OLD/name).read_bytes())
 baseline=json.loads((RUN/'consumed-controller-before.json').read_bytes())
 for row in baseline:assert sha(pathlib.Path(row['path']).read_bytes())==row['sha256']
 source=(OLD/'Invoke-PortabilityPreparation.ps1').read_text()
 bindings=(OLD/'Portability-Bindings.ps1').read_text()
 for a,b in [(str(OLD),str(NEW)),('portability-host-c1-20261012-a1',OP),('phone-portability-prepare.py','phone-portability-host-c2-prepare.py')]:
  source=source.replace(a,b);bindings=bindings.replace(a,b)
 write('Portability-Bindings.ps1',bindings.encode())
 old_binding_hash=sha((OLD/'Portability-Bindings.ps1').read_bytes())
 source=replace_once(source,old_binding_hash,sha(bindings.encode()))
 old_network_hash=sha((OLD/'network-binding.private.json').read_bytes())
 source=replace_once(source,old_network_hash,capture['BindingSha256'])
 startup=(ROOT/'tools/scripts/phone-portability-host-c2-startup.ps1').read_text()
 source=replace_once(source,'function Invoke-ManualController(',startup+'\nfunction Invoke-ManualController(')
 source=replace_once(source,' $null=Assert-Session $c;Assert-ActualState $c $false\n Initialize-ManualNative'," $startupStage='SESSION_VALIDATION';$helperRequested=$false\n try {\n $null=Assert-Session $c\n $startupStage='CONNECTED_STATE_VALIDATION';Assert-ActualState $c $false\n $startupStage='HELPER_NATIVE_INIT';Initialize-ManualNative")
 source=replace_once(source,' $c.HelperId=[ManualNative]::LaunchVisibleHelper'," $startupStage='HELPER_LAUNCH';$helperRequested=$true\n $c.HelperId=[ManualNative]::LaunchVisibleHelper")
 source=replace_once(source,' $proc=[Diagnostics.Process]::GetProcessById($c.HelperId);'," $startupStage='HELPER_IDENTITY'\n $proc=[Diagnostics.Process]::GetProcessById($c.HelperId);")
 source=replace_once(source," $ready=Join-Path $dir 'ready.json'", " $startupStage='HELPER_READY'\n $ready=Join-Path $dir 'ready.json'")
 source=replace_once(source,' Assert-Ready $c\n'," $startupStage='CONTROLLER_ARM';Assert-Ready $c\n")
 source=replace_once(source," $result=Join-Path $dir 'result.json'", " $startupStage='CONTROLLER_WAIT'\n $result=Join-Path $dir 'result.json'")
 source=replace_once(source,' $r=Read-StrictJson $result;'," $startupStage='RESULT_VALIDATION'\n $r=Read-StrictJson $result;")
 source=replace_once(source,' return $r\n}\nfunction Assert-ControllerWait'," return $r\n }catch{Write-StartupFailureSafely $c $startupStage $_ $helperRequested;throw}\n}\nfunction Assert-ControllerWait")
 source=replace_once(source," $null=Assert-Session $c\n $package=Get-FramingPackage $runtime $script:ManualId $record.AuthorizationSha256 (Get-Sha $script:OfflineScript)\n $result=Invoke-ManualHelper $c $package", " $result=Invoke-RecordedHelperAdmission $c $runtime $record.AuthorizationSha256")
 write('Invoke-PortabilityPreparation.ps1',source.encode())
 pwsh=r'C:\Users\doyew\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe'
 launcher='\r\n'.join(['@echo off','setlocal',f'"{pwsh}" -NoLogo -NoProfile -File "{NEW / "Invoke-PortabilityPreparation.ps1"}" -Mode Start','set "portability_exit=%errorlevel%"','echo Preparation stopped. Do not retry this launcher without coordinator review.','echo Pressing a key only CLOSES this window; it does not start or continue processing.','echo Keep any surviving helper open. Only its existing empty-job proof permits WiFi ON.','pause >nul','endlocal & exit /b %portability_exit%',''])
 write('COSI-Portability-Preparation.cmd',launcher.encode())
 files=[NEW/n for n in ['Invoke-PortabilityPreparation.ps1','Portability-Bindings.ps1','Support-ReadOnly.ps1','Native.cs','runtime-offline.json','network-binding.private.json','COSI-Portability-Preparation.cmd']]
 files+=[ROOT/'tools/scripts'/('phone-portability-host-c2-'+n) for n in ['controller.py','prepare.py','capture.ps1','startup.ps1','checks.ps1']]
 files+=[OLD/n for n in ['Invoke-PortabilityPreparation.ps1','Portability-Bindings.ps1','controller-source-manifest.json']]
 files+=[ROOT/p for p in ['tools/scripts/phone-portability-prepare.py','apps/recognition-lab/tools/framing-comparison/crop_producer.py','apps/recognition-lab/tools/framing-comparison/Framing-Preparation.ps1','apps/recognition-lab/tools/exploratory/producer.py','apps/recognition-lab/tools/exploratory/inventory.py','apps/recognition-lab/runs/exploratory/e01-e03-20261004/software.json','apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilityPins.java']]
 files+=[NEW.parent/'cosi-framing-manual-20261011-a1/Invoke-FramingExperiment.ps1',NEW.parent/'cosi-exploratory-manual-a5-20261010/Invoke-ManualExperiment.ps1']
 index=dict(schemaVersion=1,kind='UNPUBLISHED_PORTABILITY_CONTROLLER_SOURCE',files=[dict(path=str(p),bytes=p.stat().st_size,sha256=sha(p.read_bytes())) for p in sorted(files)])
 write('controller-source-manifest.json',(json.dumps(index,indent=2)+'\n').encode())
 # Only draft identity/hash substitution; schemas and all finite limits remain exact.
 for name in ['execution-authorization','publication','network-review']:
  draft=json.loads((OLD/(name+'.template.json')).read_bytes())
  for key,value in [('runId',OP),('runnerSha256',sha(source.encode())),('networkBindingSha256',capture['BindingSha256']),('controllerSourceSha256',sha((NEW/'controller-source-manifest.json').read_bytes())),('launcherSha256',sha(launcher.encode()))]:
   if key in draft:draft[key]=value
  write(name+'.template.json',(json.dumps(draft,indent=2)+'\n').encode())
 receipt=dict(root=str(NEW),operation=OP,sourceFiles=len(files),runnerSha256=sha(source.encode()),sourceIndexSha256=sha((NEW/'controller-source-manifest.json').read_bytes()),networkBindingSha256=capture['BindingSha256'],published=False,approvalCreated=False,actualWork=False)
 (RUN/'controller-preparation.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print(json.dumps(receipt))
if __name__=='__main__':main()
