param(
  [switch]$Strict,
  [switch]$IncludeCloud
)

$ErrorActionPreference = "Stop"

function New-Result {
  param(
    [bool]$Ok,
    [string]$Name,
    [string]$Details
  )
  [PSCustomObject]@{
    Ok      = $Ok
    Name    = $Name
    Details = $Details
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$results = @()

$desktopWindows = Join-Path $repoRoot "DueFlux_app_desktop/Windows"
$mobileExpo = Join-Path $repoRoot "DueFlux_app_mobile/expo"
$websiteDir = Join-Path $repoRoot "DueFlux_website"
$desktopWorkflow = Join-Path $repoRoot ".github/workflows/desktop-release.yml"
$mobileWorkflow = Join-Path $repoRoot ".github/workflows/mobile-release.yml"
$cloudWorkflow = Join-Path $repoRoot ".github/workflows/cloud-deploy.yml"
$firebaseJsonPath = Join-Path $repoRoot "firebase.json"

$requiredDirsOk = (Test-Path $desktopWindows) -and (Test-Path $mobileExpo) -and ((-not $IncludeCloud) -or (Test-Path $websiteDir))
$results += New-Result $requiredDirsOk "Required app directories" "desktop/Windows, mobile/expo and website folders present."

$desktopPkgPath = Join-Path $desktopWindows "package.json"
if (Test-Path $desktopPkgPath) {
  $desktopPkg = Get-Content -Raw -Path $desktopPkgPath | ConvertFrom-Json
  $hasBuildWin = $null -ne $desktopPkg.scripts.'build:win'
  $hasBuildLinux = $null -ne $desktopPkg.scripts.'build:linux'
  $hasBuildMac = $null -ne $desktopPkg.scripts.'build:mac'
  $hasReleaseWin = $null -ne $desktopPkg.scripts.'release:win'
  $hasReleaseLinux = $null -ne $desktopPkg.scripts.'release:linux'
  $hasReleaseMac = $null -ne $desktopPkg.scripts.'release:mac'
  $hasMacBuildConfig = $null -ne $desktopPkg.build.mac

  $desktopBuildOk = $hasBuildWin -and $hasBuildLinux -and $hasBuildMac -and $hasReleaseWin -and $hasReleaseLinux -and $hasReleaseMac -and $hasMacBuildConfig
  $desktopBuildDetails = "build(win/linux/mac)=$hasBuildWin/$hasBuildLinux/$hasBuildMac, release(win/linux/mac)=$hasReleaseWin/$hasReleaseLinux/$hasReleaseMac, build.mac=$hasMacBuildConfig"
  $results += New-Result $desktopBuildOk "Desktop cross-platform build config" $desktopBuildDetails
} else {
  $results += New-Result $false "Desktop cross-platform build config" "DueFlux_app_desktop/Windows/package.json missing."
}

if (Test-Path $desktopWorkflow) {
  $wf = Get-Content -Raw -Path $desktopWorkflow
  $hasMatrix = $wf -match "matrix:"
  $hasWindowsPlatform = $wf -match 'platform:\s*"?windows'
  $hasLinuxPlatform = $wf -match 'platform:\s*"?linux'
  $hasMacPlatform = $wf -match 'platform:\s*"?macos'
  $usesCanonicalDesktopSource = $wf -match "working-directory:\s*DueFlux_app_desktop/Windows"

  $desktopWorkflowOk = $hasMatrix -and $hasWindowsPlatform -and $hasLinuxPlatform -and $hasMacPlatform -and $usesCanonicalDesktopSource
  $desktopWorkflowDetails = "matrix=$hasMatrix, windows=$hasWindowsPlatform, linux=$hasLinuxPlatform, macos=$hasMacPlatform, canonicalSource=$usesCanonicalDesktopSource"
  $results += New-Result $desktopWorkflowOk "Desktop release workflow coverage" $desktopWorkflowDetails
} else {
  $results += New-Result $false "Desktop release workflow coverage" "desktop-release.yml missing."
}

$appJsonPath = Join-Path $mobileExpo "app.json"
$easPath = Join-Path $mobileExpo "eas.json"
$androidGoogle = Join-Path $mobileExpo "google-services.json"
$iosGoogle = Join-Path $mobileExpo "GoogleService-Info.plist"

if (Test-Path $appJsonPath) {
  $appJson = (Get-Content -Raw -Path $appJsonPath | ConvertFrom-Json).expo
  $platforms = @($appJson.platforms)
  $hasAndroid = $platforms -contains "android"
  $hasIos = $platforms -contains "ios"
  $mobilePlatformsOk = $hasAndroid -and $hasIos
  $results += New-Result $mobilePlatformsOk "Mobile platform targets" "android=$hasAndroid, ios=$hasIos"
} else {
  $results += New-Result $false "Mobile platform targets" "app.json missing."
}

$mobileFirebaseOk = (Test-Path $androidGoogle) -and (Test-Path $iosGoogle)
$results += New-Result $mobileFirebaseOk "Mobile Firebase service files" "google-services.json and GoogleService-Info.plist present."

if (Test-Path $easPath) {
  $eas = Get-Content -Raw -Path $easPath | ConvertFrom-Json
  $hasPreviewProfile = $null -ne $eas.build.preview
  $hasProductionProfile = $null -ne $eas.build.production
  $mobileEasOk = $hasPreviewProfile -and $hasProductionProfile
  $results += New-Result $mobileEasOk "EAS build profiles" "preview=$hasPreviewProfile, production=$hasProductionProfile"
} else {
  $results += New-Result $false "EAS build profiles" "eas.json missing."
}

if (Test-Path $mobileWorkflow) {
  $mWf = Get-Content -Raw -Path $mobileWorkflow
  $hasAndroidBuild = $mWf -match "--platform android"
  $hasIosBuild = $mWf -match "--platform ios"
  $hasExpoAction = $mWf -match "expo/expo-github-action"
  $mobileWorkflowOk = $hasAndroidBuild -and $hasIosBuild -and $hasExpoAction
  $mobileWorkflowDetails = "androidBuild=$hasAndroidBuild, iosBuild=$hasIosBuild, expoAction=$hasExpoAction"
  $results += New-Result $mobileWorkflowOk "Mobile release workflow coverage" $mobileWorkflowDetails
} else {
  $results += New-Result $false "Mobile release workflow coverage" "mobile-release.yml missing."
}

if (Test-Path $cloudWorkflow) {
  $cWf = Get-Content -Raw -Path $cloudWorkflow
  $ok = ($cWf -match 'MrAxisman/DueFlux') -and ($cWf -match 'gh workflow run')
  $results += New-Result $ok "Private cloud deploy routing" "Firebase and Hostinger deployments run in the private repository."
}

if ($IncludeCloud) {
if (Test-Path $firebaseJsonPath) {
  $firebaseJson = Get-Content -Raw -Path $firebaseJsonPath | ConvertFrom-Json
  $hasFunctionsConfig = $null -ne $firebaseJson.functions
  $hasFirestoreConfig = $null -ne $firebaseJson.firestore
  $hasHostingConfig = $null -ne $firebaseJson.hosting
  $hostingPublicWebsite = $hasHostingConfig -and ($firebaseJson.hosting.public -eq "DueFlux_website")
  $firebaseConfigOk = $hasFunctionsConfig -and $hasFirestoreConfig -and $hasHostingConfig -and $hostingPublicWebsite
  $firebaseConfigDetails = "functions=$hasFunctionsConfig, firestore=$hasFirestoreConfig, hosting=$hasHostingConfig, hostingPublicDueFluxWebsite=$hostingPublicWebsite"
  $results += New-Result $firebaseConfigOk "Firebase deployment config" $firebaseConfigDetails
} else {
  $results += New-Result $false "Firebase deployment config" "firebase.json missing."
}

}

Write-Host ""
Write-Host "DueFlux platform audit summary"
Write-Host "--------------------------------"
foreach ($r in $results) {
  $status = if ($r.Ok) { "PASS" } else { "FAIL" }
  Write-Host ("[{0}] {1} :: {2}" -f $status, $r.Name, $r.Details)
}

$failed = @($results | Where-Object { -not $_.Ok })
Write-Host ""
Write-Host ("Checks: {0}, Passed: {1}, Failed: {2}" -f $results.Count, ($results.Count - $failed.Count), $failed.Count)

if ($Strict -and $failed.Count -gt 0) {
  exit 1
}
