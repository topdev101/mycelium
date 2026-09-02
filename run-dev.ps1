# Mycelium dev launcher (Windows).
# Starts the FastAPI backend in a new window and the Next.js frontend here.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

# Ensure Node is reachable even if this shell predates the PATH update.
$nodeDir = "C:\_work\tools\node-v24.20.0-win-x64"
if (Test-Path $nodeDir) { $env:Path = "$nodeDir;$env:Path" }

Write-Host "🍄  Starting Mycelium..." -ForegroundColor Cyan

$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

if (-not (Test-Path (Join-Path $backend ".venv"))) {
  Write-Host "No backend venv found. Run the backend setup in README.md first." -ForegroundColor Yellow
}

# Backend -> new window
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$backend'; .\.venv\Scripts\Activate.ps1; Write-Host 'Backend :8000' -ForegroundColor Green; uvicorn app.main:app --reload --port 8000"
)

Start-Sleep -Seconds 2

# Frontend -> this window
Set-Location $frontend
Write-Host "Frontend :3000  (Ctrl+C to stop)" -ForegroundColor Green
npm run dev
