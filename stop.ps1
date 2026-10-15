$ErrorActionPreference = "Stop"

foreach ($port in 3000, 8000) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        $connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        }
        Write-Host "已停止端口 $port 对应的进程。"
    } else {
        Write-Host "端口 $port 当前未占用。"
    }
}