#requires -Version 7.5
param([Parameter(Mandatory)][string]$TaskRun)
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$repository='C:\Users\doyew\Documents\DEV 2\COSI-m8-planning'
$expected=Join-Path $repository 'apps/recognition-lab/runs/phone-experiment/p1-portability-c1-20261012-a1'
if([IO.Path]::GetFullPath($TaskRun) -cne [IO.Path]::GetFullPath($expected) -and ([IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($TaskRun)) -cne [IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($expected)) -or [IO.Path]::GetFileName($TaskRun) -cnotmatch '^p1-portability-audit-[a-zA-Z0-9-]{1,64}$')){throw 'NEW_GENERATED_RUN_REQUIRED'}
if(Test-Path -LiteralPath (Join-Path $TaskRun 'stopped.json')){throw 'FROZEN_WRITER_EVIDENCE_CANNOT_OVERWRITE'}
$fixed='C:\Users\doyew\AppData\Local\Temp\cosi-phone-portability-c1-20261012-a1'
$old='C:\Users\doyew\AppData\Local\Temp\cosi-framing-manual-20261011-a1'
$controller=Join-Path $fixed 'Invoke-PortabilityPreparation.ps1';$pwsh=(Get-Process -Id $PID).Path
$checks=[Collections.Generic.List[string]]::new()
function Check([bool]$b,[string]$name){if(-not $b){throw "GENERATED_CHECK_FAILED_$name"};$checks.Add($name)}
function Reject([scriptblock]$body,[string]$code,[string]$name){$actual='';try{& $body}catch{$actual=$_.Exception.Message};Check ($actual -ceq $code) $name}
foreach($arguments in @(@('-Mode','Start'),@('-Mode','Start','-PublishedApproval',('a'*64)),@('-Mode','Helper','-SessionHash',('b'*64)))){
 $out=& $pwsh -NoProfile -File $controller @arguments 2>&1;$exit=$LASTEXITCODE;$text=$out -join "`n"
 Check ($exit -eq 1 -and $text.Contains('COORDINATOR_PORTABILITY_PUBLICATION_REQUIRED_KEEP_WIFI_ON')) ('unpublished_'+$checks.Count)
 [IO.File]::WriteAllText((Join-Path $TaskRun ('controller-rejection-'+$checks.Count+'.log')),$text+"`n")
}
Check (-not (Test-Path (Join-Path $fixed 'attempt-portability-host-c1-20261012-a1'))) 'noAttempt'
Check (-not (Test-Path (Join-Path $repository 'apps/recognition-lab/runs/phone-experiment/private-portability-host-c1-20261012-a1'))) 'noPrivateOutput'
foreach($n in 'Support-ReadOnly.ps1','Native.cs','runtime-offline.json','network-binding.private.json'){
 Check ((Get-FileHash -LiteralPath (Join-Path $old $n)).Hash -ceq (Get-FileHash -LiteralPath (Join-Path $fixed $n)).Hash) ('unchanged_'+$n)
}
. $controller -Mode Library
Assert-LaunchRoot;Assert-FramingControllerSources (Get-Sha (Join-Path $fixed 'controller-source-manifest.json'))
Check ($script:ManualId -ceq 'portability-host-c1-20261012-a1' -and $script:OfflineRoot -ceq $fixed) 'newFixedBinding'
function Functions($Path){$tokens=$null;$errors=$null;$ast=[Management.Automation.Language.Parser]::ParseFile($Path,[ref]$tokens,[ref]$errors);Check ($errors.Count -eq 0) ('parse_'+[IO.Path]::GetFileName($Path));$m=@{};foreach($f in $ast.FindAll({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst]},$false)){$m[$f.Name]=$f.Extent.Text.Replace("`r`n","`n")};return $m}
$previous=Functions (Join-Path $old 'Invoke-FramingExperiment.ps1');$current=Functions $controller
foreach($name in $previous.Keys){
 $wanted=$previous[$name];if($name -ceq 'Assert-LaunchRoot'){$wanted=$wanted.Replace($old,$fixed)}
 Check ($current.ContainsKey($name) -and $current[$name] -ceq $wanted) ('unchangedGuard_'+$name)
}
$null=Functions (Join-Path $fixed 'Portability-Bindings.ps1')
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
# Definitions compile, but no native method or actual network snapshot is called.
Initialize-ManualNative;Initialize-ChildJob;Check (('ManualNative' -as [type]) -and ('ExploratoryChildJob' -as [type])) 'nativeDefinitionsCompileOnly'
$receipt=[pscustomobject]@{generatedOnly=$true;checks=$checks.ToArray();count=$checks.Count;nativeControlsExecuted=$false;privatePixelsDecoded=$false;published=$false}
[IO.File]::WriteAllText((Join-Path $TaskRun 'controller-generated-checks.json'),(ConvertTo-Json $receipt -Depth 5)+"`n")
Write-Host "PASS $($checks.Count) generated controller checks. No native controls or private work."
