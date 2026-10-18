param(
  [Parameter(Mandatory=$true)][string]$TaskRun,
  [Parameter(Mandatory=$true)][string]$ToolRoot,
  [string]$NodeDirectory = 'C:\Users\doyew\.cache\cosi-toolchain\node-v24.21.0-win-x64',
  [string]$GradleCache = '',
  [switch]$EvidenceOnly,
  [string]$Attempt = 'a1'
)
$ErrorActionPreference = 'Stop'
$taskRunPath = (Resolve-Path -LiteralPath $TaskRun).Path
$toolRootPath = (Resolve-Path -LiteralPath $ToolRoot).Path
$repository = (Resolve-Path -LiteralPath '.').Path
$leaseDocument = Get-Content -Raw -LiteralPath (Join-Path $repository '.agents/workflows/recognition-track-b.json') | ConvertFrom-Json -DateKind String
if ($leaseDocument.lease.holder -ne '01a1051f-0777-7573-ad09-0e550a4bd56a' -or
    [DateTimeOffset]::UtcNow -ge [DateTimeOffset]::Parse($leaseDocument.lease.expires_at)) {
  throw 'Writer lease is expired or belongs to another holder; stop before build.'
}
if ($taskRunPath -ne (Join-Path $repository 'apps/recognition-lab/runs/phone-experiment/p1-portability-c1-20261012-a1')) {
  throw 'This build must write only to the explicit NEW portability preparation run.'
}
$env:JAVA_HOME = Join-Path $toolRootPath 'jdk17'
$env:ANDROID_HOME = Join-Path $toolRootPath 'sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:GRADLE_USER_HOME = if ($GradleCache) { [System.IO.Path]::GetFullPath($GradleCache) } else { Join-Path $toolRootPath 'gradle' }
$env:COSI_P1_CXX_ROOT = Join-Path $env:GRADLE_USER_HOME 'cxx'
$env:PATH = "$NodeDirectory;$env:JAVA_HOME\bin;$env:PATH"
$env:EXPO_PUBLIC_APP_ENV = 'recognition-verification'
$env:COSI_RECOGNITION_EXPERIMENT = '1'
$env:COSI_SCANNER_VERIFICATION = '0'
$env:NODE_ENV = 'production'
$env:CI = '1'
$env:COSI_P1_RUN = $taskRunPath
$env:COSI_TEST_KEYSTORE = Join-Path $toolRootPath 'recognition-test.jks'
$passwordFile = Join-Path $toolRootPath 'test-signing-password.txt'
if (!(Test-Path -LiteralPath $passwordFile)) {
  throw 'Accepted cached test signer is required; no new signing prerequisite is authorized.'
}
$env:COSI_TEST_STORE_PASSWORD = [System.IO.File]::ReadAllText($passwordFile)
$env:COSI_TEST_KEY_PASSWORD = $env:COSI_TEST_STORE_PASSWORD
if (!(Test-Path -LiteralPath $env:COSI_TEST_KEYSTORE)) {
  throw 'Accepted cached test keystore is required.'
}
$wrapper = Join-Path $repository 'apps/mobile/android/gradle/wrapper/gradle-wrapper.properties'
$wrapperText = [System.IO.File]::ReadAllText($wrapper)
if (!$wrapperText.Contains('distributionSha256Sum=')) {
  throw 'Accepted checksum-bound cached Gradle wrapper is required; no download fallback.'
}
$command = @(':app:assembleRelease', ':app:p1ResolvedArtifacts', ':app:dependencies', '--configuration', 'releaseRuntimeClasspath', '--init-script', (Join-Path $taskRunPath 'inspect.init.gradle'), '--write-locks', '--offline', '--no-daemon', '--console=plain', '--max-workers=2')
if ($EvidenceOnly) {
  $command = @(':app:processReleaseMainManifest', ':app:createBundleReleaseJsAndAssets', ':app:p1ResolvedArtifacts', ':app:dependencies', '--configuration', 'releaseRuntimeClasspath', '--init-script', (Join-Path $taskRunPath 'inspect.init.gradle'), '--write-locks', '--offline', '--no-daemon', '--console=plain', '--max-workers=2')
}
[System.IO.File]::WriteAllText((Join-Path $taskRunPath "gradle-command-$Attempt.json"), (ConvertTo-Json @{command=$command; java=$env:JAVA_HOME; sdk=$env:ANDROID_HOME; gradleCache=$env:GRADLE_USER_HOME; entry='recognition-entry.js'; deviceActions=$false}))
Push-Location (Join-Path $repository 'apps/mobile/android')
try {
  & './gradlew.bat' @command *> (Join-Path $taskRunPath "gradle-release-$Attempt.log")
  $buildExit = $LASTEXITCODE
} finally {
  Pop-Location
  Remove-Item Env:COSI_TEST_STORE_PASSWORD, Env:COSI_TEST_KEY_PASSWORD
}
[System.IO.File]::WriteAllText((Join-Path $taskRunPath "gradle-exit-$Attempt.txt"), "$buildExit`n")
Get-Content -LiteralPath (Join-Path $taskRunPath "gradle-release-$Attempt.log") -Tail 30
exit $buildExit
