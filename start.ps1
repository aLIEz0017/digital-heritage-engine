$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$backendRoot = Join-Path $repoRoot "backend"
$frontendRoot = Join-Path $repoRoot "frontend"
$pythonExe = Join-Path $backendRoot ".venv\Scripts\python.exe"
$npmCmd = (Get-Command npm.cmd -ErrorAction Stop).Source

if (-not (Test-Path $pythonExe)) {
    throw "未找到 backend\.venv，请先运行 install-deps.ps1"
}

$env:VITE_API_BASE_URL = "http://localhost:8000/api/v1"
$env:VITE_API_URL = "http://localhost:8000/api/v1"
$env:VITE_DEV_PROXY_TARGET = "http://localhost:8000"

Start-Process -FilePath $pythonExe -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000") -WorkingDirectory $backendRoot
$frontendProc = Start-Process -FilePath $npmCmd -ArgumentList @("run", "dev", "--", "--host", "0.0.0.0", "--port", "3000") -WorkingDirectory $frontendRoot -PassThru

Start-Sleep -Seconds 2
$backendListening = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
$frontendListening = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if ($backendListening) {
    Write-Host "后端已启动：http://localhost:8000"
} else {
    Write-Host "后端未监听 8000 端口，请检查日志。" -ForegroundColor Yellow
}

if ($frontendListening) {
    Write-Host "前端已启动：http://localhost:3000"
} else {
    Write-Host "前端未监听 3000 端口。可能是依赖缺失或 npm 启动失败。" -ForegroundColor Yellow
    Write-Host "请在 frontend 目录手动执行：npm run dev -- --host 0.0.0.0 --port 3000" -ForegroundColor Yellow
}

if ($frontendProc -and -not $frontendProc.HasExited) {
    Write-Host "前端进程 PID: $($frontendProc.Id)"
}