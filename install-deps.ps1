$ErrorActionPreference = 'Stop'

function Main {
    try {
        $repoRoot = $PSScriptRoot
        Set-Location $repoRoot

        $pythonExe = Join-Path $repoRoot 'backend\.venv\Scripts\python.exe'
        if (-not (Test-Path $pythonExe)) {
            python -m venv backend\.venv
        }

        & $pythonExe -m pip install --upgrade pip
        & $pythonExe -m pip install -r backend\requirements.txt pytest pytest-asyncio

        Set-Location (Join-Path $repoRoot "frontend")
        if (Test-Path package-lock.json) {
            npm ci
        } else {
            npm install
        }

        Write-Host ''
        Write-Host 'Dependency installation completed.'
    } catch {
        Write-Host ''
        Write-Host 'Dependency installation failed. Please check the error above.' -ForegroundColor Red
        Write-Host ('Error message: ' + $_.Exception.Message) -ForegroundColor Red
        if ($_.Exception.InnerException) {
            Write-Host ('Inner error: ' + $_.Exception.InnerException.Message) -ForegroundColor Red
        }
        Write-Host ('Fully qualified error id: ' + $_.FullyQualifiedErrorId) -ForegroundColor Red
        if ($_.ScriptStackTrace) {
            Write-Host 'Script stack trace:' -ForegroundColor Red
            Write-Host $_.ScriptStackTrace -ForegroundColor Red
        }
        Read-Host 'Press Enter to exit'
        exit 1
    }
}

Main