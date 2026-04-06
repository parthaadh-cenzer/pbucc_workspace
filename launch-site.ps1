$ProjectPath = $PSScriptRoot
$WaitSeconds = 10
$DefaultUrl = "http://localhost:3000"

if (-not (Test-Path -LiteralPath (Join-Path $ProjectPath "package.json"))) {
  Write-Host "[ERROR] package.json not found at $ProjectPath" -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}

Set-Location -LiteralPath $ProjectPath

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location -LiteralPath '$ProjectPath'; npm run dev"
) -WorkingDirectory $ProjectPath

Start-Sleep -Seconds $WaitSeconds

Start-Process $DefaultUrl
