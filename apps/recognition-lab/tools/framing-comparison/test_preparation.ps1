#requires -Version 7.5
param([Parameter(Mandatory)][string]$EvidenceRoot)
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$script:checks=[Collections.Generic.List[string]]::new();$script:events=[Collections.Generic.List[string]]::new()
function Check([bool]$Condition,[string]$Name){if(-not $Condition){throw "GENERATED_CHECK_FAILED_$Name"};$script:checks.Add($Name)}
$run=Join-Path $EvidenceRoot ('preparation-tests-'+[Guid]::NewGuid().ToString('N'))
$null=New-Item -ItemType Directory -Path $run
. (Join-Path $PSScriptRoot 'Framing-Preparation.ps1') -Mode Library
$lab='C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\apps\recognition-lab'
$package=[pscustomobject]@{
 Comparison="$lab\runs\framing-comparison\generated-preparation\comparison.json"
 Annotations="$lab\runs\framing-comparison\generated-preparation\annotations.json"
 Baseline="$lab\runs\framing-comparison\generated-preparation\full\bundle.json"
 Root="$lab\private-data\r1-pilot"
 Model="$lab\runs\exploratory\e01-e03-20261004\mobilenet_v3_small.tflite"
 Setup="$lab\runs\framing-comparison\generated-preparation\setup.json"
 Software="$lab\runs\exploratory\e01-e03-20261004\software.json"
 SourceManifest="$lab\runs\framing-comparison\generated-preparation\source-manifest.json"
 OutputRoot="$lab\runs\framing-comparison\private-framing-generated-preparation"
 RunId='framing-generated-preparation'
 ProducerApproval="$lab\runs\framing-comparison\generated-preparation\not-an-approval.json"
 FullRoot="$lab\runs\framing-comparison\generated-preparation\full"
}
$plan=Get-FramingCommandPlan $package
Check ($plan.QueryDenominator -eq 20 -and $plan.NewEncodingBudget -eq 40) 'fixed20and40'
Check ($plan.PreflightDeadlineMs -eq 120000 -and $plan.ProducerDeadlineMs -eq 930000 -and $plan.EvaluatorDeadlineMs -eq 60000) 'deadlinesPreserved'
Check ($plan.Preflight[0] -ceq '-B' -and $plan.Preflight[2] -ceq '--preflight' -and $plan.Producer[0] -ceq '-B') 'fixedPythonCommands'
Check ($plan.Producer[1] -ceq (Join-Path $lab 'tools/framing-comparison/crop_producer.py') -and $plan.Evaluator[0] -ceq (Join-Path $lab 'src/framingComparisonCli.ts')) 'fixedScriptEntrypoints'
Check (@($plan.Producer | Where-Object {$_ -ceq '--annotations'}).Count -eq 1 -and @($plan.Evaluator | Where-Object {$_ -ceq '--baseline'}).Count -eq 1) 'exactBoundInputFlags'
Check ($plan.Evaluator[1] -ceq 'evaluate' -and $plan.Evaluator[-2] -ceq '--approval') 'fixedEvaluatorNoPassthrough'
foreach($change in @(@('RunId','offline-manual-20261010-a5'),@('Root','C:\elsewhere'),@('OutputRoot',"$lab\runs\other"),@('Model','arbitrary'),@('RunId',$true))){
 $bad=$package | Select-Object *;$bad.($change[0])=$change[1];$rejected=$false
 try{$null=Get-FramingCommandPlan $bad}catch{$rejected=$true};Check $rejected ('reject'+$change[0]+$script:checks.Count)
}
$bad=$package | Select-Object *;$bad | Add-Member ArbitraryArguments '--anything';$rejected=$false
try{$null=Get-FramingCommandPlan $bad}catch{$rejected=$true};Check $rejected 'rejectArbitraryPassthrough'
foreach($value in @([uint32]18,[int]18,[long]18)){Check (Test-ManualInterfaceIndex $value) ('nativeIndexAccepted'+$value.GetType().Name)}
foreach($value in @($true,[double]18,'18',[uint32]0,[long]4294967296)){Check (-not (Test-ManualInterfaceIndex $value)) ('nativeIndexRejected'+$script:checks.Count)}
# No native query: use the actual gate with session validation stubbed and an
# OLD controller identity. It must reject before reading a receipt or any pixel.
function Assert-SessionAlive($Context){$script:events.Add('session')}
$context=[pscustomobject]@{Record=[pscustomobject]@{RunId='offline-manual-20261010-a5';RunnerSha256='GENERATED_STUB';AuthorizationSha256='GENERATED_STUB'};RecoveryHash='GENERATED_STUB';Directory=$run;
 Runtime=[pscustomobject]@{Programs=@('GENERATED_NO_PROCESS');Manifest=[pscustomobject]@{node=[pscustomobject]@{path='GENERATED_NO_PROCESS'}}}}
$rejected=$false
try{Assert-FramingExecutionGate $context $package}catch{$rejected=($_.Exception.Message -ceq 'NEW_COORDINATOR_CONTROLLER_AND_E04_REQUIRED')}
Check $rejected 'oldControllerRejectedBeforeReceipt'
# Generated stage sequencing: all capability sinks are explicit stubs below.
# NO native state, process/job, attempt/claim/package/approval is created.
function Assert-FramingExecutionGate($Context,$Package){$script:events.Add('gate')}
function Assert-NoOtherRuntime($Runtime){$script:events.Add('runtime')}
function Assert-ActualState($Context,[bool]$Offline){$script:events.Add($(if($Offline){'native-offline-STUB'}else{'native-connected-STUB'}))}
function Assert-LiveOffline($Context){$script:events.Add('offline-STUB')}
function Invoke-OwnedChild($Context,[string]$Program,[string[]]$Arguments,[string]$Log,[int]$TimeoutMs,[scriptblock]$Guard){
 & $Guard $Context;$script:events.Add('preflight-start-STUB');[IO.File]::WriteAllText($Log,"CONNECTED_PREFLIGHT_PASSED`n");& $Guard $Context
 $script:events.Add('preflight-drain-STUB');return [pscustomobject]@{ExitCode=0}
}
$script:producerExit=0;$script:evaluatorExit=0
function Invoke-OfflineChild($Context,[string]$Program,[string[]]$Arguments,[string]$Log,[int]$TimeoutMs){
 $stage=if($Log.EndsWith('private-producer.log')){'producer'}else{'evaluator'}
 Assert-LiveOffline $Context;$script:events.Add($stage+'-start-STUB');Assert-LiveOffline $Context;$script:events.Add($stage+'-drain-STUB')
 return [pscustomobject]@{ExitCode=$(if($stage -ceq 'producer'){$script:producerExit}else{$script:evaluatorExit})}
}
function New-Item { $script:events.Add('mkdir-STUB') }
function Test-Path { return $false }
function Write-ImmutableJson { $script:events.Add('claim-write-STUB');return 'GENERATED_NO_CLAIM_WRITTEN' }
$script:events.Clear();Invoke-FramingConnectedPreflight $context $package
Check (($script:events -join '|') -ceq 'gate|runtime|session|native-connected-STUB|preflight-start-STUB|session|native-connected-STUB|preflight-drain-STUB') 'connectedStageGuardAndDrainSequence'
$script:events.Clear();$code=Invoke-FramingOfflineStages $context $package
Check ($code -eq 0) 'completeExit0'
$sequence=$script:events -join '|'
Check ($sequence.IndexOf('producer-drain-STUB') -lt $sequence.IndexOf('evaluator-start-STUB') -and $sequence.EndsWith('offline-STUB')) 'producerDrainBeforeEvaluatorAndFinalGuard'
foreach($pair in @(@(2,0),@(0,2),@(2,2))){$script:producerExit=$pair[0];$script:evaluatorExit=$pair[1];Check ((Invoke-FramingOfflineStages $context $package) -eq 2) ('partialExit2_'+($pair -join '_'))}
$script:producerExit=1;$script:events.Clear();$failed=$false
try{$null=Invoke-FramingOfflineStages $context $package}catch{$failed=$true};Check ($failed -and 'evaluator-start-STUB' -notin $script:events) 'producerFailureNoEvaluation'
$script:producerExit=0;$script:evaluatorExit=1;$failed=$false
try{$null=Invoke-FramingOfflineStages $context $package}catch{$failed=$true};Check $failed 'evaluationFailureRetained'
function Test-Path { return $true }
$script:events.Clear();$rejected=$false
try{$null=Invoke-FramingOfflineStages $context $package}catch{$rejected=($_.Exception.Message -ceq 'PRIVATE_OUTPUT_EXISTS_NO_RETRY')}
Check ($rejected -and 'claim-write-STUB' -notin $script:events -and 'producer-start-STUB' -notin $script:events) 'existingAttemptRejectedBeforeClaimOrProcess'
$result=[pscustomobject]@{Kind='GENERATED_STAGE_WIRING_NOT_NATIVE_COMPATIBILITY';Checks=$script:checks.ToArray();Count=$script:checks.Count;
 NativeQueries=$false;RealProcesses=$false;PrivatePixels=$false;OperationalApproval=$false;AttemptClaimWritten=$false;NetworkEffects=$false;
 Limitation='Child/native/session/claim sinks mocked for new stage sequencing. Frozen actual guard definitions are imported unchanged; future fresh controller/E04 integration/native OFF/drain/ON pending.'}
[IO.File]::WriteAllText((Join-Path $run 'results.json'),(ConvertTo-Json $result -Depth 8)+"`n")
Write-Output (ConvertTo-Json ([pscustomobject]@{Checks=$result.Count;Pass=$true;GeneratedOnly=$true;NativeEvidence=$false}) -Compress)
