$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskTools = Join-Path $taskRoot '.tools'
$taskVersion = 'v24.21.0'
$taskArchiveName = "node-$taskVersion-win-x64.zip"
$taskNodeRoot = Join-Path $taskTools "node-$taskVersion-win-x64"
New-Item -ItemType Directory -Force -Path $taskTools | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $taskNodeRoot 'node.exe'))) {
  $taskArchive = Join-Path $taskTools $taskArchiveName
  $taskBaseUrl = "https://nodejs.org/dist/$taskVersion"
  Invoke-WebRequest "$taskBaseUrl/$taskArchiveName" -OutFile $taskArchive
  $taskManifest = (Invoke-WebRequest "$taskBaseUrl/SHASUMS256.txt").Content
  $taskLine = ($taskManifest -split "`n" | Where-Object { $_.TrimEnd().EndsWith("  $taskArchiveName") } | Select-Object -First 1)
  if (-not $taskLine -or (Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne ($taskLine -split '\s+')[0]) {
    throw 'Node archive checksum mismatch.'
  }
  Expand-Archive -LiteralPath $taskArchive -DestinationPath $taskTools -Force
}
$env:PATH = "$taskNodeRoot;$env:PATH"
if ((& (Join-Path $taskNodeRoot 'npm.cmd') --version) -ne '12.2.0') {
  & (Join-Path $taskNodeRoot 'node.exe') (Join-Path $taskNodeRoot 'node_modules/npm/bin/npm-cli.js') install --global npm@12.2.0 --prefix $taskNodeRoot
  if ($LASTEXITCODE) { throw 'npm update failed.' }
}
Write-Host "Node $(& (Join-Path $taskNodeRoot 'node.exe') --version), npm $(& (Join-Path $taskNodeRoot 'npm.cmd') --version) active in this terminal."
