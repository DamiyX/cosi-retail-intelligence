#requires -Version 7.5
$ErrorActionPreference='Stop';Set-StrictMode -Version Latest
$repository=Split-Path (Split-Path $PSScriptRoot)
$taskRun=Join-Path $repository 'apps/recognition-lab/runs/phone-experiment/p1-portability-host-c3-20261013-a1'
$target='C:\Users\doyew\AppData\Local\Temp\cosi-phone-portability-host-c3-20261013-a1'
$old='C:\Users\doyew\AppData\Local\Temp\cosi-phone-portability-c1-20261012-a1'
try {
 if($args.Count -ne 0 -or (Test-Path -LiteralPath $target) -or -not (Test-Path -LiteralPath (Join-Path $taskRun 'baseline.json')) -or (Test-Path -LiteralPath (Join-Path $taskRun 'stopped.json'))){throw 'NEW_CAPTURE_ROOT_REQUIRED'}
 . (Join-Path $old 'Invoke-PortabilityPreparation.ps1') -Mode Library
 $runtime=Get-OfflineRuntime;$binding=Get-OfflineBinding
 $state=Get-NetworkState $binding
 $originalCode='PASSED'
 try{Assert-NetworkState $state $binding $false}catch{$originalCode=Get-FailureSymbol $_;if($originalCode -cne 'PRESTART_ROUTE_DRIFT'){throw}}
 $connected=@($state.IP | Where-Object Connected | Select-Object -ExpandProperty Index -Unique)
 $fresh=$binding | Select-Object *
 $fresh.ConnectedRoutes=@($state.Routes | Where-Object {$_.Index -in $connected})
 # Retained old identity/profile/allowlists must pass before snapshot updates.
 Assert-NetworkState $state $fresh $false
 $fresh.Adapters=@($state.Adapters)
 Initialize-ManualNative;Assert-Radio ([ManualNative]::Radio($fresh.Wlan.InterfaceGuid)) $false
 $null=New-Item -ItemType Directory -Path $target
 $digest=Write-ImmutableJson (Join-Path $target 'network-binding.private.json') $fresh
 # Second actual observation validates the frozen snapshot; no launch-time rebinding.
 $again=Get-NetworkState $fresh;Assert-NetworkState $again $fresh $false
 Assert-Radio ([ManualNative]::Radio($fresh.Wlan.InterfaceGuid)) $false
 $receipt=[pscustomobject]@{Kind='READ_ONLY_CONNECTED_BINDING_CAPTURE';OriginalBindingCode=$originalCode;ConnectedValidation='PASSED';
  NativeSoftwareRadioOn=$true;BindingSha256=$digest;ConnectedRoutes=$fresh.ConnectedRoutes.Count;AdapterCount=$fresh.Adapters.Count;
  NoHelperOrJobs=$true;RadioChanged=$false;PrivateWork=$false;At=[DateTimeOffset]::UtcNow.ToString('o')}
 $null=Write-ImmutableJson (Join-Path $taskRun 'connected-capture.json') $receipt
 Write-Host 'PASS actual read-only connected binding and native radio validation. Raw network identifiers withheld.'
}catch{Write-Host 'CONNECTED_CAPTURE_FAILED_PRIVATE_DETAILS_WITHHELD';exit 1}
