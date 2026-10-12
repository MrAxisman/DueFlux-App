param(
  [string]$FriendlyName = "DueFlux Messaging",
  [string]$AlphaSender = "DUEFLUX"
)

$ErrorActionPreference = "Stop"

function Assert-Env {
  param([string]$Name)
  $val = [string]([Environment]::GetEnvironmentVariable($Name))
  if (-not $val) {
    throw "Missing environment variable: $Name"
  }
  return $val
}

$accountSid = Assert-Env "TWILIO_ACCOUNT_SID"
$authToken = Assert-Env "TWILIO_AUTH_TOKEN"

if ($AlphaSender.Length -gt 11) {
  throw "AlphaSender must be <= 11 characters. Current length: $($AlphaSender.Length)"
}

# Twilio auth: Basic base64(accountSid:authToken)
$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$accountSid`:$authToken"))
$headers = @{
  Authorization = "Basic $basic"
}

Write-Host ""
Write-Host "Creating Twilio Messaging Service..."
$svcBody = @{
  FriendlyName = $FriendlyName
}
$svc = Invoke-RestMethod -Method Post -Uri "https://messaging.twilio.com/v1/Services" -Headers $headers -Body $svcBody

if (-not $svc.sid) {
  throw "Failed to create Messaging Service (no sid returned)."
}

$serviceSid = [string]$svc.sid
Write-Host "Messaging Service SID: $serviceSid"

Write-Host ""
Write-Host "Attaching Alphanumeric Sender ID (AlphaSender) to service..."
$alphaBody = @{
  AlphaSender = $AlphaSender
}

try {
  $alpha = Invoke-RestMethod -Method Post -Uri ("https://messaging.twilio.com/v1/Services/{0}/AlphaSenders" -f $serviceSid) -Headers $headers -Body $alphaBody
} catch {
  Write-Host ""
  Write-Host "Failed to create AlphaSender."
  Write-Host "Common causes:"
  Write-Host "- Alphanumeric Sender ID not enabled on your Twilio account."
  Write-Host "- Trial account restrictions (recipient must be verified, or alpha not allowed)."
  Write-Host "- Country/operator registration required for your destination."
  throw
}

if (-not $alpha.sid) {
  throw "Failed to create AlphaSender (no sid returned)."
}

Write-Host ("AlphaSender SID: {0}" -f $alpha.sid)
Write-Host ""
Write-Host "Next steps (DueFlux backend):"
Write-Host ("1) Set Firebase secret/env: TWILIO_MESSAGING_SERVICE_SID={0}" -f $serviceSid)
Write-Host "2) (Optional) Keep a numeric sender as fallback for countries that do NOT support alphanumeric Sender IDs."
Write-Host "3) Redeploy functions."
