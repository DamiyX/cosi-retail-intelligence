"""Prepare NEW unpublished controller copies. Never invoke radio/network/phone/private processing."""
import hashlib,json,pathlib,re,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
NEW=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/cosi-phone-portability-c1-20261012-a1')
OLD=pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/cosi-framing-manual-20261011-a1')
RUN=ROOT/'apps/recognition-lab/runs/phone-experiment/p1-portability-c1-20261012-a1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def main():
 if sys.argv[1:]:raise ValueError('PREPARATION_NO_ARGUMENTS')
 if (RUN/'stopped.json').exists():raise ValueError('FROZEN_CONTROLLER_CANNOT_REFRESH_AFTER_STOP')
 if any((NEW/n).exists() for n in ['publication.json','execution-authorization.json','network-review.json','attempt-portability-host-c1-20261012-a1']):raise ValueError('OPERATIONAL_STATE_NO_PREPARATION_REFRESH')
 NEW.mkdir(exist_ok=True)
 copied=[]
 for name in ['Support-ReadOnly.ps1','Native.cs','runtime-offline.json','network-binding.private.json']:
  raw=(OLD/name).read_bytes();target=NEW/name
  if target.exists() and target.read_bytes()!=raw:raise ValueError('IMMUTABLE_GUARD_COPY_DRIFT')
  target.write_bytes(raw);copied.append(dict(name=name,sha256=sha(raw)))
 source=(OLD/'Invoke-FramingExperiment.ps1').read_text();source=source.replace(str(OLD),str(NEW)).replace('framing-manual-20261011-a1','portability-host-c1-20261012-a1')
 source=source.replace('Framing-Bindings.ps1','Portability-Bindings.ps1').replace('UNPUBLISHED FRAMING PREPARATION.','UNPUBLISHED PORTABILITY PREPARATION.')
 bindings=NEW/'Portability-Bindings.ps1'
 text=r'''# New exact portability-only bindings. Frozen native/job/restoration guards remain unchanged.
function Get-FramingFixedPackage {
 return [pscustomobject]@{RunId='portability-host-c1-20261012-a1';OutputRoot='C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\apps\recognition-lab\runs\phone-experiment\private-portability-host-c1-20261012-a1'}
}
function Assert-FramingFile($Path,[string]$Digest) {if($Digest -cnotmatch '^[0-9a-f]{64}$' -or (Get-Sha $Path) -cne $Digest){throw 'PORTABILITY_FILE_BINDING'}}
function Assert-FramingControllerSources([string]$ExpectedDigest) {
 $path=Join-Path $script:OfflineRoot 'controller-source-manifest.json';Assert-FramingFile $path $ExpectedDigest
 $m=Read-StrictJson $path;Assert-Keys $m @('schemaVersion','kind','files')
 if($m.schemaVersion -ne 1 -or $m.kind -cne 'UNPUBLISHED_PORTABILITY_CONTROLLER_SOURCE' -or $m.files -isnot [array] -or $m.files.Count -lt 15){throw 'PORTABILITY_SOURCE_SCHEMA'}
 $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
 foreach($row in $m.files){Assert-Keys $row @('path','sha256','bytes');if(-not $seen.Add($row.path)){throw 'PORTABILITY_SOURCE_DUPLICATE'};Assert-FramingFile $row.path $row.sha256;if((Get-Item -LiteralPath $row.path).Length -ne $row.bytes){throw 'PORTABILITY_SOURCE_SIZE'}}
}
function Read-Publication {
 $path=Join-Path $script:OfflineRoot 'publication.json'
 if(-not (Test-Path -LiteralPath $path)){throw 'COORDINATOR_PORTABILITY_PUBLICATION_REQUIRED_KEEP_WIFI_ON'}
 $p=Read-StrictJson $path;Assert-Keys $p @('status','authorThreadId','runId','runnerSha256','authorizationSha256','launcherSha256','controllerSourceSha256')
 if($p.status -cne 'PUBLISHED_FOR_ONE_PORTABILITY_PREPARATION' -or $p.authorThreadId -cne '01a098ef-d830-7531-bca7-2d66b0a5b587' -or $p.runId -cne $script:ManualId -or $p.runnerSha256 -cne (Get-Sha $script:OfflineScript) -or $p.launcherSha256 -cne (Get-Sha (Join-Path $script:OfflineRoot 'COSI-Portability-Preparation.cmd'))){throw 'PORTABILITY_PUBLICATION_BINDING'}
 Assert-FramingControllerSources $p.controllerSourceSha256;return $p.authorizationSha256
}
function Get-FramingPackage($Runtime,[string]$Id,[string]$PublishedHash,[string]$RunnerHash) {
 if($Id -cne $script:ManualId -or $RunnerHash -cne (Get-Sha $script:OfflineScript) -or (Read-Publication) -cne $PublishedHash){throw 'PORTABILITY_NEW_CONTEXT_REQUIRED'}
 $path=Join-Path $script:OfflineRoot 'execution-authorization.json';Assert-FramingFile $path $PublishedHash;$a=Read-StrictJson $path
 $wanted=[ordered]@{schemaVersion=1;status='APPROVED_FOR_ONE_PORTABILITY_PREPARATION';authorThreadId='01a098ef-d830-7531-bca7-2d66b0a5b587';runId=$Id;method='MANUAL_RADIO_OFF_ORIGINAL_NO_USABLE_UPLINK';runnerSha256=$RunnerHash;runtimeSha256=$script:OfflineRuntimeDigest;networkBindingSha256=$script:NetworkDigest;manifestSha256='__MANIFEST__';queryDenominator=20;tensorBudget=40;privateModelInferences=0;maxSessionSeconds=1500;producerSeconds=900;perImageSeconds=60}
 Assert-Keys $a (@($wanted.Keys)+@('controllerSourceSha256','networkReviewSha256'))
 foreach($k in $wanted.Keys){if($a.$k -cne $wanted[$k]){throw 'PORTABILITY_AUTHORIZATION_BINDING'}}
 foreach($k in 'schemaVersion','queryDenominator','tensorBudget','privateModelInferences','maxSessionSeconds','producerSeconds','perImageSeconds'){if($a.$k -isnot [long] -and $a.$k -isnot [int]){throw 'PORTABILITY_AUTHORIZATION_INTEGER'}}
 Assert-FramingControllerSources $a.controllerSourceSha256
 $reviewPath=Join-Path $script:OfflineRoot 'network-review.json';Assert-FramingFile $reviewPath $a.networkReviewSha256;$review=Read-StrictJson $reviewPath
 Assert-Keys $review @('schemaVersion','status','authorThreadId','method','runnerSha256','runtimeSha256','networkBindingSha256','controllerSourceSha256','limitations')
 if($review.schemaVersion -ne 1 -or $review.status -cne 'REVIEWED_FOR_MANUAL_RADIO_OFF_PORTABILITY' -or ($review.limitations -join '|') -cne 'POLLING_RACE_NOT_ATOMIC|LOOPBACK_AND_INTERNAL_SWITCH_REMAIN|HOSTILE_OS_BROKER_UNPROVEN|RECOVERY_HELPER_OR_POWER_FAILURE_UNPROVEN|REASSOCIATION_NOT_INTERNET_PROOF'){throw 'PORTABILITY_NETWORK_REVIEW_REQUIRED'}
 foreach($k in 'authorThreadId','method','runnerSha256','runtimeSha256','networkBindingSha256','controllerSourceSha256'){if($review.$k -cne $a.$k){throw 'PORTABILITY_NETWORK_REVIEW_BINDING'}}
 return Get-FramingFixedPackage
}
function Invoke-ConnectedPreflight($Context,$Package) {
 Assert-SessionAlive $Context;Assert-NoOtherRuntime $Context.Runtime
 $scriptPath='C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\tools\scripts\phone-portability-prepare.py'
 $args=@('-B',$scriptPath,'--preflight','--session',(Join-Path $Context.Directory 'session.json'))
 $done=Invoke-OwnedChild $Context $Context.Runtime.Programs[0] $args (Join-Path $Context.Directory 'connected-preflight.log') 120000 {param($c) Assert-SessionAlive $c;Assert-ActualState $c $false}
 if($done.ExitCode -ne 0 -or [IO.File]::ReadAllText((Join-Path $Context.Directory 'connected-preflight.log')).Trim() -cne 'CONNECTED_PREFLIGHT_PASSED'){throw 'CONNECTED_PREFLIGHT_REJECTED'}
}
function Invoke-OfflinePrivate($Context,$Package) {
 Assert-LiveOffline $Context;Assert-NoOtherRuntime $Context.Runtime
 if(Test-Path -LiteralPath $Package.OutputRoot){throw 'PRIVATE_OUTPUT_EXISTS_NO_RETRY'}
 $null=New-Item -ItemType Directory -Path $Package.OutputRoot
 $null=Write-ImmutableJson (Join-Path $Package.OutputRoot 'attempt-claim.json') ([pscustomobject]@{RunId=$Package.RunId;RunnerSha256=$Context.Record.RunnerSha256;AuthorizationSha256=$Context.Record.AuthorizationSha256;RecoverySha256=$Context.RecoveryHash;TensorBudget=40;PrivateModelInferences=0;QueryDenominator=20})
 $args=@('-B','C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\tools\scripts\phone-portability-prepare.py','--session',(Join-Path $Context.Directory 'session.json'))
 $done=Invoke-OfflineChild $Context $Context.Runtime.Programs[0] $args (Join-Path $Context.Directory 'private-producer.log') 930000
 Assert-LiveOffline $Context;if($done.ExitCode -ne 0){throw 'PORTABILITY_PREPARATION_FAILED_NO_PARTIAL_PACKET'};return 0
}
'''
 manifest=sha((RUN/'packet-contract-metadata.json').read_bytes());text=text.replace('__MANIFEST__',manifest);bindings.write_text(text)
 source=source.replace('ab45bd6bff71d03bcc243904874e911eccdbabdef755477e3dededb04e0cc4b4',sha(bindings.read_bytes()))
 controller=NEW/'Invoke-PortabilityPreparation.ps1';controller.write_text(source)
 pwsh=r'C:\Users\doyew\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe'
 launcher='\r\n'.join(['@echo off','setlocal',f'"{pwsh}" -NoLogo -NoProfile -File "{controller}" -Mode Start','set "portability_exit=%errorlevel%"','echo Preparation stopped. Save helper and controller status. DO NOT retry.','echo Only the helper empty-job proof permits WiFi ON.','pause','endlocal & exit /b %portability_exit%',''])
 (NEW/'COSI-Portability-Preparation.cmd').write_bytes(launcher.encode())
 # Snapshot exact new sources plus unchanged accepted guards/runtime; metadata only.
 files=[NEW/n for n in ['Invoke-PortabilityPreparation.ps1','Portability-Bindings.ps1','Support-ReadOnly.ps1','Native.cs','runtime-offline.json','network-binding.private.json','COSI-Portability-Preparation.cmd']]
 files += [ROOT/p for p in ['tools/scripts/phone-portability-prepare.py','tools/scripts/phone-portability-controller.py','apps/recognition-lab/tools/framing-comparison/crop_producer.py','apps/recognition-lab/tools/framing-comparison/Framing-Preparation.ps1','apps/recognition-lab/tools/exploratory/producer.py','apps/recognition-lab/tools/exploratory/inventory.py','apps/recognition-lab/runs/exploratory/e01-e03-20261004/software.json','apps/mobile/recognition-native/recognition-experiment/android/cpu-runtime/src/main/java/expo/modules/recognitioncpu/PhonePortabilityPins.java']]
 files += [F for F in [OLD/'Invoke-FramingExperiment.ps1',pathlib.Path(r'C:/Users/doyew/AppData/Local/Temp/cosi-exploratory-manual-a5-20261010/Invoke-ManualExperiment.ps1')]]
 index=dict(schemaVersion=1,kind='UNPUBLISHED_PORTABILITY_CONTROLLER_SOURCE',files=[dict(path=str(p),bytes=p.stat().st_size,sha256=sha(p.read_bytes())) for p in sorted(files)])
 (NEW/'controller-source-manifest.json').write_text(json.dumps(index,indent=2)+'\n')
 auth=dict(schemaVersion=1,status='DRAFT_NOT_APPROVED',authorThreadId='PENDING_COORDINATOR',runId='portability-host-c1-20261012-a1',method='MANUAL_RADIO_OFF_ORIGINAL_NO_USABLE_UPLINK',runnerSha256=sha(controller.read_bytes()),runtimeSha256=sha((NEW/'runtime-offline.json').read_bytes()),networkBindingSha256=sha((NEW/'network-binding.private.json').read_bytes()),manifestSha256=manifest,queryDenominator=20,tensorBudget=40,privateModelInferences=0,maxSessionSeconds=1500,producerSeconds=900,perImageSeconds=60,controllerSourceSha256=sha((NEW/'controller-source-manifest.json').read_bytes()),networkReviewSha256='PENDING_COORDINATOR')
 (NEW/'execution-authorization.template.json').write_text(json.dumps(auth,indent=2)+'\n')
 (NEW/'publication.template.json').write_text(json.dumps(dict(status='DRAFT_NOT_PUBLISHED',authorThreadId='PENDING_COORDINATOR',runId=auth['runId'],runnerSha256=auth['runnerSha256'],authorizationSha256='PENDING_COORDINATOR',launcherSha256=sha((NEW/'COSI-Portability-Preparation.cmd').read_bytes()),controllerSourceSha256=auth['controllerSourceSha256']),indent=2)+'\n')
 (NEW/'network-review.template.json').write_text(json.dumps(dict(schemaVersion=1,status='DRAFT_NOT_REVIEWED',authorThreadId='PENDING_COORDINATOR',method=auth['method'],runnerSha256=auth['runnerSha256'],runtimeSha256=auth['runtimeSha256'],networkBindingSha256=auth['networkBindingSha256'],controllerSourceSha256=auth['controllerSourceSha256'],limitations=['POLLING_RACE_NOT_ATOMIC','LOOPBACK_AND_INTERNAL_SWITCH_REMAIN','HOSTILE_OS_BROKER_UNPROVEN','RECOVERY_HELPER_OR_POWER_FAILURE_UNPROVEN','REASSOCIATION_NOT_INTERNET_PROOF']),indent=2)+'\n')
 receipt=dict(root=str(NEW),copiedGuards=copied,controllerSha256=auth['runnerSha256'],sourceIndexSha256=auth['controllerSourceSha256'],sourceFiles=len(index['files']),approvalCreated=False,published=False,privatePixels=False,nativeControlsExecuted=False)
 (RUN/'controller-preparation.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:receipt[k] for k in ['root','sourceFiles','published','privatePixels','nativeControlsExecuted']}))
if __name__=='__main__':main()
