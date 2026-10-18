#requires -Version 7.5
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$repository=Split-Path (Split-Path $PSScriptRoot)
$run=Join-Path $repository 'apps/recognition-lab/runs/phone-experiment/p1-portability-host-c3-20261013-a1'
$fixed='C:\Users\doyew\AppData\Local\Temp\cosi-phone-portability-host-c3-20261013-a1'
$old='C:\Users\doyew\AppData\Local\Temp\cosi-phone-portability-c1-20261012-a1'
$checkOutput=Join-Path $run 'controller-generated-checks-a5.json'
if($args.Count -or (Test-Path (Join-Path $run 'stopped.json')) -or (Test-Path $checkOutput)){throw 'FRESH_C2_CHECK_EVIDENCE_REQUIRED'}
$checks=[Collections.Generic.List[string]]::new()
function Check([bool]$b,[string]$name){if(-not $b){throw "GENERATED_CHECK_FAILED_$name"};$checks.Add($name)}
function Reject([scriptblock]$body,[string]$code,[string]$name){$actual='';try{& $body}catch{$actual=Get-FailureSymbol $_};Check ($actual -ceq $code) $name}
function Functions($Path){$tokens=$null;$errors=$null;$ast=[Management.Automation.Language.Parser]::ParseFile($Path,[ref]$tokens,[ref]$errors);Check ($errors.Count -eq 0) ('parse_'+[IO.Path]::GetFileName($Path));$m=@{};foreach($f in $ast.FindAll({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst]},$false)){$m[$f.Name]=$f.Extent.Text.Replace("`r`n","`n")};return $m}
$oldFunctions=Functions (Join-Path $old 'Invoke-PortabilityPreparation.ps1')
$newFunctions=Functions (Join-Path $fixed 'Invoke-PortabilityPreparation.ps1')
foreach($name in $oldFunctions.Keys){
 if($name -ceq 'Invoke-ManualController'){continue}
 $expected=$oldFunctions[$name]
 if($name -ceq 'Assert-LaunchRoot'){$expected=$expected.Replace($old,$fixed)}
 Check ($newFunctions[$name] -ceq $expected) ('unchangedGuard_'+$name)
}
foreach($name in 'Support-ReadOnly.ps1','Native.cs','runtime-offline.json'){Check ((Get-FileHash (Join-Path $old $name)).Hash -ceq (Get-FileHash (Join-Path $fixed $name)).Hash) ('unchanged_'+$name)}
$newController=Join-Path $fixed 'Invoke-PortabilityPreparation.ps1'
. $newController -Mode Library
Assert-LaunchRoot;Assert-FramingControllerSources (Get-Sha (Join-Path $fixed 'controller-source-manifest.json'))
Reject {Read-Publication} 'COORDINATOR_PORTABILITY_PUBLICATION_REQUIRED_KEEP_WIFI_ON' 'unpublishedRefusesBeforeWork'
Check (-not (Test-Path (Join-Path $fixed ('attempt-'+$script:ManualId)))) 'noRealAttempt'
Check (-not (Test-Path (Get-FramingFixedPackage).OutputRoot)) 'noRealPrivateOutput'
foreach($v in @([uint32]18,[int]18,[long]18)){Check (Test-ManualInterfaceIndex $v) ('integer_'+$v.GetType().Name)}
foreach($v in @($true,'18',[double]18,[long]4294967296)){Check (-not (Test-ManualInterfaceIndex $v)) ('invalidInteger_'+$checks.Count)}
Assert-Radio @([pscustomobject]@{Index=0;Software=2;Hardware=1}) $true;Check $true 'softwareOffAccepted'
Reject {Assert-Radio @([pscustomobject]@{Index=0;Software=1;Hardware=1}) $true} 'MANUAL_RADIO_NOT_OFF' 'softwareOnRejected'
Reject {Assert-Radio @([pscustomobject]@{Index=0;Software=2;Hardware=1}) $false} 'ORIGINAL_RADIO_NOT_ON' 'restorationNeedsOn'
$adapters=@([pscustomobject]@{Index=[uint32]18;Guid='fixture-wifi';Hardware=$true;Virtual=$false;Description='fixture';Name='wifi';Status='Disconnected'},[pscustomobject]@{Index=[uint32]1;Guid='fixture-loop';Hardware=$false;Virtual=$true;Description='fixture';Name='loop';Status='Up'})
$binding=[pscustomobject]@{Adapters=$adapters;Wlan=[pscustomobject]@{InterfaceIndex=18;ProfileName='fixture'};LoopbackIndex=1;InternalSwitchIndex=2;NonIPUpVirtualIndices=@(1);OfflineInternalRoutes=@();ConnectedRoutes=@()}
$state=[pscustomobject]@{Wlan=[pscustomobject]@{State='disconnected';Profile=$null};Adapters=$adapters;IP=@([pscustomobject]@{Index=[uint32]1;Connected=$true});Routes=@([pscustomobject]@{Index=[uint32]1;Prefix='127.0.0.0/8';Hop='0.0.0.0'})}
Assert-NetworkState $state $binding $true;Check $true 'generatedNoUplinkAccepted'
$extra=$state|Select-Object *;$extra.IP=@($state.IP)+@([pscustomobject]@{Index=[uint32]22;Connected=$true})
Reject {Assert-NetworkState $extra $binding $true} 'OTHER_USABLE_IP_INTERFACE' 'extraUplinkRejected'
$connected=$state|Select-Object *;$connected.Wlan=[pscustomobject]@{State='connected';Profile='fixture'}
Reject {Assert-NetworkState $connected $binding $true} 'WLAN_NOT_DISCONNECTED' 'connectedWifiRejected'
$route=$state|Select-Object *;$route.Routes=@([pscustomobject]@{Index=[uint32]1;Prefix='0.0.0.0/0';Hop='0.0.0.0'})
Reject {Assert-NetworkState $route $binding $true} 'UNKNOWN_LOOPBACK_ROUTE' 'externalRouteRejected'
$online=$state|Select-Object *;$online.Wlan=[pscustomobject]@{State='connected';Profile='fixture'}
$binding.ConnectedRoutes=@($state.Routes);Assert-NetworkState $online $binding $false;Check $true 'freshGeneratedConnectedPasses'
$stale=$binding|Select-Object *;$stale.ConnectedRoutes=@([pscustomobject]@{Index=[uint32]1;Prefix='127.0.0.2/32';Hop='0.0.0.0'})
Reject {Assert-NetworkState $online $stale $false} 'PRESTART_ROUTE_DRIFT' 'stale32StillRejected'
$badProfile=$online|Select-Object *;$badProfile.Wlan=[pscustomobject]@{State='connected';Profile='other'}
Reject {Assert-NetworkState $badProfile $binding $false} 'ORIGINAL_SAVED_PROFILE_NOT_CONNECTED' 'profileStillExact'
$script:ChildrenStopped=$true;$script:JobsCreated=1;$script:JobsDrained=0
Reject {Assert-EmptyProof} 'RETAIN_OFFLINE_CHILD_LIFETIME_UNCONFIRMED' 'undrainedNoOnAuthority'
$script:JobsDrained=1;Assert-EmptyProof;Check $true 'emptyProofStillRequired'
$script:ChildrenStopped=$false
Reject {Assert-EmptyProof} 'RETAIN_OFFLINE_CHILD_LIFETIME_UNCONFIRMED' 'unknownChildNoOnAuthority'
# Fixture boundary: no real helper/process, native radio, jobs, private producer or operational mode.
Add-Type -TypeDefinition 'public static class ManualNative {public static int Calls=0; public static int Mode=0; public static int LaunchVisibleHelper(string p,string[] a,string r){Calls++;if(Mode==1)throw new System.Exception("FIXTURE_LAUNCH_FAILURE");return System.Environment.ProcessId;}}'
$script:realImmutableWriter=${function:Write-ImmutableJson}
$script:fixtureRoot=Join-Path $run 'startup-fixtures-a5';$null=New-Item -ItemType Directory -Path $script:fixtureRoot
function Fixture([string]$name,[bool]$before=$false,[string]$failure='PRESTART_ROUTE_DRIFT',[bool]$failReceipt=$false) {
 # Execute the parsed actual function in fixture scope; all non-effect guards stay real.
 if($before){Invoke-Expression $oldFunctions['Invoke-ManualController']}else{Invoke-Expression $newFunctions['Invoke-ManualController']}
 Set-Item -Path Function:script:Write-ImmutableJson -Value $script:realImmutableWriter
 $script:OfflineRoot=Join-Path $script:fixtureRoot $name;$null=New-Item -ItemType Directory -Path $script:OfflineRoot
 $script:OfflineScript=if($before){Join-Path $old 'Invoke-PortabilityPreparation.ps1'}else{$newController}
 $script:ManualId=if($before){'portability-host-c1-20261012-a1'}else{'portability-host-c3-20261013-a1'}
 $script:NetworkDigest=(Get-FileHash (Join-Path $(if($before){$old}else{$fixed}) 'network-binding.private.json')).Hash.ToLowerInvariant()
 $script:OfflineRuntimeDigest=(Get-FileHash (Join-Path $fixed 'runtime-offline.json')).Hash.ToLowerInvariant()
 $script:fixtureFailure=$failure;$script:effectCount=0
 function script:Assert-LaunchRoot {if(-not $script:OfflineRoot.StartsWith($script:fixtureRoot+'\',[StringComparison]::Ordinal)){throw 'FIXTURE_ROOT'}}
 function script:Assert-FixedEnvironment {}
 function script:Assert-NoOtherRuntime($r) {}
 function script:Assert-ActualState($c,[bool]$offline){if($script:fixtureFailure){throw $script:fixtureFailure}}
 function script:Initialize-ManualNative {}
 function script:Test-HelperAlive($c){return $false}
 [ManualNative]::Calls=0
 if($failReceipt){
  $script:baseImmutable=${function:Write-ImmutableJson}
  function script:Write-ImmutableJson($Path,$Value){if($Path.EndsWith('controller-startup-failure.json')){throw 'FIXTURE_RECEIPT_DISK_FAILURE'};return & $script:baseImmutable $Path $Value}
 }
 $package=[pscustomobject]@{OutputRoot=Join-Path $script:OfflineRoot 'never-private-output'}
 $code='';try{$null=Invoke-ManualController ([pscustomobject]@{Manifest=[pscustomobject]@{controls=[pscustomobject]@{powershell=[pscustomobject]@{path='fixture-never-started'}}}}) ([pscustomobject]@{}) $package ('a'*64)}catch{$code=Get-FailureSymbol $_}
 $dir=Join-Path $script:OfflineRoot ('attempt-'+$script:ManualId)
 return [pscustomobject]@{Code=$code;Directory=$dir;Package=$package;HelperCalls=[ManualNative]::Calls}
}
$before=Fixture 'before' $true
Check ($before.Code -ceq 'PRESTART_ROUTE_DRIFT' -and @(Get-ChildItem $before.Directory).Count -eq 1) 'beforeSessionOnlyDiagnosticGap'
$after=Fixture 'after'
$receiptPath=Join-Path $after.Directory 'controller-startup-failure.json';$receipt=Read-StrictJson $receiptPath
Check ($after.Code -ceq 'PRESTART_ROUTE_DRIFT' -and $receipt.Code -ceq $after.Code -and $receipt.Stage -ceq 'CONNECTED_STATE_VALIDATION') 'afterDurableOriginalFailure'
Check ($after.HelperCalls -eq 0 -and $before.HelperCalls -eq 0 -and $receipt.SessionSha256 -ceq (Get-Sha (Join-Path $after.Directory 'session.json')) -and $receipt.Nonce -ceq (Read-StrictJson (Join-Path $after.Directory 'session.json')).Nonce) 'receiptBoundNoHelperLaunch'
Check ($receipt.HelperStatus -ceq 'NOT_REQUESTED' -and $receipt.WorkStatus -ceq 'NOT_STARTED_BY_CONTROLLER' -and -not $receipt.RadioOnAuthority -and -not $receipt.DrainProvedByThisReceipt) 'beforeHelperNoEffectsOrAuthority'
Check (-not (Test-Path $after.Package.OutputRoot) -and @(Get-ChildItem $after.Directory).Count -eq 2) 'afterOnlySessionAndSanitizedReceipt'
$saved=Get-Sha $receiptPath
Reject {Invoke-ManualController ([pscustomobject]@{}) ([pscustomobject]@{}) $after.Package ('a'*64)} 'ATTEMPT_EXISTS_NO_RETRY' 'duplicateAttemptStillRefused'
Check ((Get-Sha $receiptPath) -ceq $saved) 'duplicateDoesNotOverwriteReceipt'
$record=Read-StrictJson (Join-Path $after.Directory 'session.json');$context=[pscustomobject]@{Record=$record;Directory=$after.Directory;RecoveryHash=Get-Sha (Join-Path $after.Directory 'session.json');HelperId=0;HelperTicks=0}
try{throw 'FIXTURE_SECOND_FAILURE'}catch{Write-StartupFailureSafely $context 'CONNECTED_STATE_VALIDATION' $_ $false}
Check ((Get-Sha $receiptPath) -ceq $saved) 'receiptExistsNoOverwrite'
$other=$context|Select-Object *;$other.Directory=Join-Path $script:OfflineRoot 'another-attempt'
try{throw 'FIXTURE_FAILURE'}catch{$errorRecord=$_}
Reject {Write-StartupFailureReceipt $other 'CONNECTED_STATE_VALIDATION' $errorRecord $false} 'STARTUP_RECEIPT_CONTEXT' 'otherAttemptUntouched'
$unsafe=Fixture 'sanitized' $false 'fixture raw 192.0.2.99 private profile'
$raw=[IO.File]::ReadAllText((Join-Path $unsafe.Directory 'controller-startup-failure.json'))
Check ($unsafe.Code -ceq 'OPERATION_FAILED_PRIVATE_DETAILS_WITHHELD' -and -not $raw.Contains('192.0.2.99') -and -not $raw.Contains('private profile')) 'unstructuredFailureSanitized'
# Force only the new receipt write to fail; actual session writer remains real.
$writeFailure=Fixture 'write-failure' $false 'PRESTART_ROUTE_DRIFT' $true
Check ($writeFailure.Code -ceq 'PRESTART_ROUTE_DRIFT' -and -not (Test-Path (Join-Path $writeFailure.Directory 'controller-startup-failure.json')) -and @(Get-ChildItem $writeFailure.Directory).Count -eq 1 -and $writeFailure.HelperCalls -eq 0) 'receiptWriteFailureKeepsOriginalError'
$late=Fixture 'late-helper-lost' $false ''
$lateReceipt=Read-StrictJson (Join-Path $late.Directory 'controller-startup-failure.json')
Check ($late.Code -ceq 'HELPER_READY_UNCONFIRMED_NO_OFF_AUTHORITY' -and $lateReceipt.HelperStatus -ceq 'IDENTITY_OBSERVED' -and $lateReceipt.WorkStatus -ceq 'UNKNOWN_REVIEW_HELPER_RECEIPTS' -and -not $lateReceipt.RadioOnAuthority) 'lateFailureRetainsHelperUncertainty'
Check (-not (Test-Path (Join-Path $late.Directory 'on-prompt.json')) -and -not (Test-Path (Join-Path $late.Directory 'stop-receipt.json'))) 'lateFailureDoesNotInventDrainOrOn'
function script:Get-FramingPackage {throw 'FIXTURE_HELPER_PACKAGE_FAILURE'}
$lateSession=Read-StrictJson (Join-Path $late.Directory 'session.json')
$helperContext=[pscustomobject]@{Record=$lateSession;Directory=$late.Directory;RecoveryHash=Get-Sha (Join-Path $late.Directory 'session.json');HelperId=$PID;HelperTicks=(Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks}
Reject {Invoke-RecordedHelperAdmission $helperContext ([pscustomobject]@{}) ('a'*64)} 'FIXTURE_HELPER_PACKAGE_FAILURE' 'helperAdmissionOriginalError'
$helperReceipt=Read-StrictJson (Join-Path $late.Directory 'helper-startup-failure.json')
Check ($helperReceipt.Owner -ceq 'Helper' -and $helperReceipt.Stage -ceq 'HELPER_PACKAGE_VALIDATION' -and -not $helperReceipt.RadioOnAuthority) 'helperAdmissionDurableNoAuthority'
# Actual helper failure/finally logic under explicit effect stubs; no real jobs or radio.
$runtimeFailure=Fixture 'runtime-preflight' $false ''
$runtimeSession=Read-StrictJson (Join-Path $runtimeFailure.Directory 'session.json')
$runtimeContext=[pscustomobject]@{Record=$runtimeSession;Directory=$runtimeFailure.Directory;RecoveryHash=Get-Sha (Join-Path $runtimeFailure.Directory 'session.json');HelperId=$PID;HelperTicks=(Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks;DiagnosticCount=0;LastDiagnostic='';Timer=[Diagnostics.Stopwatch]::StartNew()}
function script:Test-HelperAlive($c){return $true}
function script:Assert-OutsideJob {}
function script:Invoke-ConnectedPreflight($c,$p){throw 'FIXTURE_RUNTIME_FAILURE'}
$script:ChildrenStopped=$false;$script:JobsCreated=1;$script:JobsDrained=0
$runtimeResult=Invoke-ManualHelper $runtimeContext ([pscustomobject]@{})
Check ($runtimeResult.Failure -ceq 'FIXTURE_RUNTIME_FAILURE' -and $null -eq $runtimeResult.StopReceiptSha256 -and -not (Test-Path (Join-Path $runtimeFailure.Directory 'on-prompt.json')) -and -not (Test-Path (Join-Path $runtimeFailure.Directory 'stop-receipt.json'))) 'runtimeFailureUndrainedCannotAuthorizeOn'
Check (Test-Path (Join-Path $runtimeFailure.Directory 'diagnostic-01.json')) 'runtimeFailureDiagnosticRetained'
$cancelled=Fixture 'helper-cancel' $false ''
$cancelSession=Read-StrictJson (Join-Path $cancelled.Directory 'session.json')
$cancelContext=[pscustomobject]@{Record=$cancelSession;Directory=$cancelled.Directory;RecoveryHash=Get-Sha (Join-Path $cancelled.Directory 'session.json');HelperId=$PID;HelperTicks=(Get-Process -Id $PID).StartTime.ToUniversalTime().Ticks;DiagnosticCount=0;LastDiagnostic='';Timer=[Diagnostics.Stopwatch]::StartNew()}
function script:Test-HelperAlive($c){return $true}
function script:Invoke-ConnectedPreflight($c,$p){throw 'USER_CANCELLED'}
$script:ChildrenStopped=$true;$script:JobsCreated=0;$script:JobsDrained=0
$cancelResult=Invoke-ManualHelper $cancelContext ([pscustomobject]@{})
Check ($cancelResult.Failure -ceq 'USER_CANCELLED' -and $cancelResult.StopReceiptSha256 -cmatch '^[0-9a-f]{64}$' -and $cancelResult.RecoveryPhaseSha256 -cmatch '^[0-9a-f]{64}$' -and -not (Test-Path (Join-Path $cancelled.Directory 'on-prompt.json'))) 'cancelKeepsOwnedEmptyProofWithoutOffPrompt'
Check ((Read-StrictJson (Join-Path $cancelled.Directory 'stop-receipt.json')).ActiveChildren -eq 0) 'cancelRetainsActualReceiptRulesWithStubbedJobCounters'
$uncertain=$cancelContext|Select-Object *;$uncertain.HelperTicks=[long]0
try{throw 'FIXTURE_IDENTITY_FAILURE'}catch{$identityError=$_}
$null=Write-StartupFailureReceipt $uncertain 'HELPER_IDENTITY' $identityError $true 'Helper'
Check ((Read-StrictJson (Join-Path $cancelled.Directory 'helper-startup-failure.json')).HelperStatus -ceq 'ID_RETURNED_IDENTITY_UNCONFIRMED') 'returnedIdIsNotConfirmedIdentity'
# Real publication/parser/source checks in the real unpublished root, without Start/Helper.
. $newController -Mode Library
$publicationTemplate=Read-StrictJson (Join-Path $fixed 'publication.template.json')
Check ($publicationTemplate.status -ceq 'DRAFT_NOT_PUBLISHED') 'draftIsNotPublication'
Reject {Assert-FramingControllerSources ('a'*64)} 'PORTABILITY_FILE_BINDING' 'wrongSourceHashRejected'
[IO.File]::WriteAllText((Join-Path $run 'malformed-fixture.json'),'{invalid fixture')
Reject {Read-StrictJson (Join-Path $run 'malformed-fixture.json')} 'OPERATION_FAILED_PRIVATE_DETAILS_WITHHELD' 'malformedJsonRejected'
$launcher=[IO.File]::ReadAllText((Join-Path $fixed 'COSI-Portability-Preparation.cmd'))
Check ($launcher.Contains('only CLOSES') -and $launcher.Contains('does not start or continue') -and $launcher.Contains('pause >nul')) 'pauseExplicitlyCloseOnly'
Check (-not $launcher.Contains('This attempt is consumed')) 'preownedRefusalDoesNotClaimConsumedSession'
$script:OfflineRoot=Join-Path $script:fixtureRoot 'source-and-publication';$null=New-Item -ItemType Directory -Path $script:OfflineRoot
$rows=@(for($i=0;$i -lt 15;$i++){$p=Join-Path $script:OfflineRoot "probe-$i.txt";[IO.File]::WriteAllText($p,"fixture-$i");[pscustomobject]@{path=$p;sha256=Get-Sha $p;bytes=(Get-Item $p).Length}})
$index=[pscustomobject]@{schemaVersion=1;kind='UNPUBLISHED_PORTABILITY_CONTROLLER_SOURCE';files=$rows}
$indexHash=Write-ImmutableJson (Join-Path $script:OfflineRoot 'controller-source-manifest.json') $index
Assert-FramingControllerSources $indexHash;Check $true 'actualSourceRowsAcceptedBeforeDrift'
[IO.File]::WriteAllText($rows[0].path,'changed fixture bytes')
Reject {Assert-FramingControllerSources $indexHash} 'PORTABILITY_FILE_BINDING' 'actualSourceRowDriftRefuses'
$malformedPub=[pscustomobject]@{status='DRAFT_NOT_PUBLISHED';authorThreadId='PENDING';runId=$script:ManualId;runnerSha256='a'*64;authorizationSha256='b'*64;launcherSha256='c'*64;controllerSourceSha256=$indexHash}
$null=Write-ImmutableJson (Join-Path $script:OfflineRoot 'publication.json') $malformedPub
Reject {Read-Publication} 'PORTABILITY_PUBLICATION_BINDING' 'malformedPublicationRefuses'
Check (-not (Test-Path (Join-Path $script:OfflineRoot ('attempt-'+$script:ManualId)))) 'malformedPublicationDoesNotClaimAttempt'
$script:OfflineRoot=$fixed
$report=[pscustomobject]@{count=$checks.Count;checks=$checks.ToArray();realControllerFunctions=$true;stubBoundaries=@('fixture root','native helper launch returns current PID only','network guard failure injection','runtime process admission','helper outside-job/preflight/liveness effects','job counters for helper finally');operationalModesInvoked=@();actualRadioOrHelperLaunched=$false;privateWork=$false;published=$false;fixtureRoot=$script:fixtureRoot}
$null=Write-ImmutableJson $checkOutput $report
Write-Host "PASS $($checks.Count) C2 controller checks with explicit fixture boundaries."
