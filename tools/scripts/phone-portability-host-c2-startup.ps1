# C2 diagnostics only. These receipts never authorize radio or work transitions.
function Write-StartupFailureReceipt($Context,[string]$Stage,$ErrorRecord,[bool]$HelperLaunchRequested,[string]$Owner='Controller') {
 Assert-LaunchRoot
 $expected=Join-Path $script:OfflineRoot ('attempt-'+$script:ManualId)
 if([IO.Path]::GetFullPath($Context.Directory) -cne [IO.Path]::GetFullPath($expected) -or $Owner -cnotin 'Controller','Helper' -or
    $Stage -cnotin 'SESSION_VALIDATION','CONNECTED_STATE_VALIDATION','HELPER_NATIVE_INIT','HELPER_LAUNCH','HELPER_IDENTITY','HELPER_READY','CONTROLLER_ARM','CONTROLLER_WAIT','RESULT_VALIDATION','HELPER_SESSION_VALIDATION','HELPER_PACKAGE_VALIDATION','HELPER_EXECUTION') {throw 'STARTUP_RECEIPT_CONTEXT'}
 $null=Assert-Session $Context -AllowExpired
 $helperStatus=if($Context.HelperId -gt 0 -and $Context.HelperTicks -gt 0){'IDENTITY_OBSERVED'}elseif($Context.HelperId -gt 0){'ID_RETURNED_IDENTITY_UNCONFIRMED'}elseif($HelperLaunchRequested){'REQUESTED_UNCONFIRMED'}else{'NOT_REQUESTED'}
 $workStatus=if($helperStatus -ceq 'NOT_REQUESTED'){'NOT_STARTED_BY_CONTROLLER'}else{'UNKNOWN_REVIEW_HELPER_RECEIPTS'}
 $record=[pscustomobject]@{Kind='SANITIZED_STARTUP_FAILURE';RunId=$script:ManualId;SessionSha256=$Context.RecoveryHash;Nonce=$Context.Record.Nonce;
  Stage=$Stage;Code=Get-FailureSymbol $ErrorRecord;Owner=$Owner;HelperStatus=$helperStatus;WorkStatus=$workStatus;
  RadioOnAuthority=$false;DrainProvedByThisReceipt=$false;At=[DateTimeOffset]::UtcNow.ToString('o')}
 $name=if($Owner -ceq 'Controller'){'controller-startup-failure.json'}else{'helper-startup-failure.json'}
 return Write-ImmutableJson (Join-Path $Context.Directory $name) $record
}
function Write-StartupFailureSafely($Context,[string]$Stage,$ErrorRecord,[bool]$HelperLaunchRequested,[string]$Owner='Controller') {
 try {
  $null=Write-StartupFailureReceipt $Context $Stage $ErrorRecord $HelperLaunchRequested $Owner
  Write-Host 'Sanitized startup failure saved. This attempt is consumed; close this window. No retry or reconnection authority.'
 }catch {
  Write-Host ('STARTUP_FAILURE_RECEIPT_NOT_SAVED: '+(Get-FailureSymbol $_))
  Write-Host 'The original failure remains authoritative. Retain any helper; request review. No retry or reconnection authority.'
 }
}
function Invoke-RecordedHelperAdmission($Context,$Runtime,[string]$Approval) {
 $stage='HELPER_SESSION_VALIDATION'
 try {
  $null=Assert-Session $Context
  $stage='HELPER_PACKAGE_VALIDATION'
  $package=Get-FramingPackage $Runtime $script:ManualId $Approval (Get-Sha $script:OfflineScript)
  $stage='HELPER_EXECUTION'
  return Invoke-ManualHelper $Context $package
 }catch {
  Write-StartupFailureSafely $Context $stage $_ $true 'Helper'
  throw
 }
}
