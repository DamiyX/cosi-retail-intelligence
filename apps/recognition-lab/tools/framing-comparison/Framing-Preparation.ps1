#requires -Version 7.5
<# Preparation/library only: no launcher, attempt, publication or automatic toggle.
   FC05's independently bound controller supplies the existing helper/session.
   This adapter adds ONLY fixed preflight/crop/evaluation stages. #>
[CmdletBinding()]
param([ValidateSet('Plan','Library')][string]$Mode='Plan')
$framingMode=$Mode
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$framingGuard='C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a5-20261010\Invoke-ManualExperiment.ps1'
if((Get-FileHash -LiteralPath $framingGuard).Hash.ToLowerInvariant() -cne 'dbe7abae4f931d7f75890a4b470521aea7dfedd1826cb81064d9223198401a67'){throw 'FROZEN_GUARD_DRIFT'}
. $framingGuard -Mode Library
$script:FramingAdapterPath=$PSCommandPath
function Get-FramingCommandPlan($Package) {
 Assert-Keys $Package @('Comparison','Annotations','Baseline','Root','Model','Setup','Software','SourceManifest','OutputRoot','RunId','ProducerApproval','FullRoot')
 $lab='C:\Users\doyew\Documents\DEV 2\COSI-m8-planning\apps\recognition-lab'
 if($Package.RunId -cnotmatch '^framing-[a-zA-Z0-9_-]{1,48}$'){throw 'NEW_FRAMING_ID_REQUIRED'}
 foreach($key in $Package.PSObject.Properties.Name){if($Package.$key -isnot [string]){throw 'FRAMING_PACKAGE_TYPE'}}
 foreach($key in 'Comparison','Annotations','Baseline','Model','Setup','Software','SourceManifest','ProducerApproval'){
  if(-not [IO.Path]::GetFullPath($Package.$key).StartsWith($lab+'\',[StringComparison]::Ordinal)){throw 'FRAMING_INPUT_CEILING'}
 }
 if($Package.Root -cne "$lab\private-data\r1-pilot" -or $Package.Model -cne "$lab\runs\exploratory\e01-e03-20261004\mobilenet_v3_small.tflite" -or
  $Package.Software -cne "$lab\runs\exploratory\e01-e03-20261004\software.json" -or
  $Package.OutputRoot -cne "$lab\runs\framing-comparison\private-$($Package.RunId)" -or
  $Package.Baseline -cne (Join-Path $Package.FullRoot 'bundle.json')){throw 'FRAMING_FIXED_INPUT_OUTPUT_BINDING'}
 $producer=Join-Path $lab 'tools/framing-comparison/crop_producer.py'
 $common=@('--comparison',$Package.Comparison,'--annotations',$Package.Annotations,'--baseline',$Package.Baseline,
  '--root',$Package.Root,'--model',$Package.Model,'--setup',$Package.Setup,'--software',$Package.Software,
  '--source-manifest',$Package.SourceManifest,'--out',(Join-Path $Package.OutputRoot 'producer'),
  '--run-id',$Package.RunId,'--approval',$Package.ProducerApproval)
 return [pscustomobject]@{
  Preflight=@('-B',$producer,'--preflight')+$common;PreflightDeadlineMs=120000
  Producer=@('-B',$producer)+$common;ProducerDeadlineMs=930000
  Evaluator=@((Join-Path $lab 'src/framingComparisonCli.ts'),'evaluate','--comparison',$Package.Comparison,
   '--annotations',$Package.Annotations,'--baseline',$Package.Baseline,'--crop',(Join-Path $Package.OutputRoot 'producer/bundle.json'),
   '--setup',$Package.Setup,'--source-manifest',$Package.SourceManifest,'--original-root',$Package.Root,
   '--full-root',$Package.FullRoot,'--crop-root',(Join-Path $Package.OutputRoot 'producer'),
   '--out',(Join-Path $Package.OutputRoot 'report'),'--run-id',$Package.RunId,'--approval',$Package.ProducerApproval)
  EvaluatorDeadlineMs=60000;QueryDenominator=20;NewEncodingBudget=40;Method='MANUAL_RADIO_OFF_ORIGINAL_NO_USABLE_UPLINK'
 }
}
function Assert-FramingExecutionGate($Context,$Package) {
 # This file is not a controller. Require a NEW independently compiled controller
 # and its hash-bound package receipt, never an a1-a5 Context or cloned old claim.
 Assert-SessionAlive $Context
 if($Context.Record.RunId -cne $Package.RunId -or $Context.Record.RunId -cnotmatch '^framing-' -or
  $script:ManualId -cne $Package.RunId -or $script:OfflineRoot -ceq 'C:\Users\doyew\AppData\Local\Temp\cosi-exploratory-manual-a5-20261010'){
  throw 'NEW_COORDINATOR_CONTROLLER_AND_E04_REQUIRED'
 }
 $path=Join-Path $Context.Directory 'framing-package-receipt.json'
 $receipt=Read-StrictJson $path
 Assert-Keys $receipt @('status','authorThreadId','runId','sessionSha256','runnerSha256','adapterSha256','packageSha256','producerApprovalSha256')
 $json=ConvertTo-Json -InputObject $Package -Depth 8 -Compress
 $packageHash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($json))).ToLowerInvariant()
 if($receipt.status -cne 'APPROVED_FOR_ONE_FRAMING_STAGE_PIPELINE' -or $receipt.authorThreadId -cne '01a098ef-d830-7531-bca7-2d66b0a5b587' -or
  $receipt.runId -cne $Package.RunId -or $receipt.sessionSha256 -cne $Context.RecoveryHash -or
  $receipt.runnerSha256 -cne $Context.Record.RunnerSha256 -or $receipt.adapterSha256 -cne (Get-Sha $script:FramingAdapterPath) -or
  $receipt.packageSha256 -cne $packageHash -or $receipt.producerApprovalSha256 -cne (Get-Sha $Package.ProducerApproval)){
  throw 'FRAMING_STAGE_RECEIPT_BINDING'
 }
}
function Invoke-FramingConnectedPreflight($Context,$Package) {
 Assert-FramingExecutionGate $Context $Package;Assert-NoOtherRuntime $Context.Runtime
 $plan=Get-FramingCommandPlan $Package
 $r=Invoke-OwnedChild $Context $Context.Runtime.Programs[0] $plan.Preflight (Join-Path $Context.Directory 'connected-preflight.log') $plan.PreflightDeadlineMs {param($c) Assert-SessionAlive $c;Assert-ActualState $c $false}
 if($r.ExitCode -ne 0 -or [IO.File]::ReadAllText((Join-Path $Context.Directory 'connected-preflight.log')).Trim() -cne 'CONNECTED_PREFLIGHT_PASSED'){throw 'CONNECTED_PREFLIGHT_REJECTED'}
}
function Invoke-FramingOfflineStages($Context,$Package) {
 Assert-FramingExecutionGate $Context $Package;Assert-LiveOffline $Context
 $plan=Get-FramingCommandPlan $Package
 if(Test-Path -LiteralPath $Package.OutputRoot){throw 'PRIVATE_OUTPUT_EXISTS_NO_RETRY'}
 $null=New-Item -ItemType Directory -Path $Package.OutputRoot
 $null=New-Item -ItemType Directory -Path (Split-Path (Join-Path $Package.OutputRoot 'producer')) -Force
 $null=Write-ImmutableJson (Join-Path $Package.OutputRoot 'attempt-claim.json') ([pscustomobject]@{
  RunId=$Package.RunId;RunnerSha256=$Context.Record.RunnerSha256;AuthorizationSha256=$Context.Record.AuthorizationSha256;
  RecoverySha256=$Context.RecoveryHash;Method=$plan.Method;QueryDenominator=20;NewEncodingBudget=40})
 $producer=Invoke-OfflineChild $Context $Context.Runtime.Programs[0] $plan.Producer (Join-Path $Context.Directory 'private-producer.log') $plan.ProducerDeadlineMs
 Assert-LiveOffline $Context
 if($producer.ExitCode -notin 0,2){throw 'PRODUCER_FAILED_RETAIN_PARTIAL_DENOMINATOR_20'}
 $evaluator=Invoke-OfflineChild $Context $Context.Runtime.Manifest.node.path $plan.Evaluator (Join-Path $Context.Directory 'private-evaluator.log') $plan.EvaluatorDeadlineMs
 Assert-LiveOffline $Context
 if($evaluator.ExitCode -notin 0,2){throw 'EVALUATOR_FAILED_RETAIN_DENOMINATOR_20'}
 return $(if($producer.ExitCode -eq 0 -and $evaluator.ExitCode -eq 0){0}else{2})
}
if($framingMode -ceq 'Plan'){
 [pscustomobject]@{Status='PREPARATION_ONLY_NO_CONTROLLER_OR_E04';Primary='FF->CC';QueryDenominator=20;NewEncodings=40;
  PreflightDeadlineMs=120000;ProducerDeadlineMs=930000;PerImageSeconds=60;ProducerSeconds=900;EvaluatorDeadlineMs=60000;
  NativeAndJobControls='Imported frozen a5 guards; FC05 must bind NEW controller/session/root/runtime/approval; actual OFF/drain/ON not run.'} | ConvertTo-Json
}
