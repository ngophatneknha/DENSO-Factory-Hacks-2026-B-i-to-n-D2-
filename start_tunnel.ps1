# ==============================================================================
# DENSO Factory Hacks 2026 - Cloudflare Tunnel Launcher
# Phát link HTTPS trực tiếp cho Ban Giám khảo truy cập từ xa
# ==============================================================================

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BinDir = Join-Path $Root "bin"
$CloudflaredPath = Join-Path $BinDir "cloudflared.exe"

if (-not (Test-Path $CloudflaredPath)) {
    Write-Host "[*] Đang tải công cụ Cloudflare Tunnel..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
    curl.exe -L -o $CloudflaredPath "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  KHỞI ĐỘNG CLOUDFLARE TUNNEL - D2 LOGISTICS CONTROL ROOM       " -ForegroundColor Yellow
Write-Host "  Đang trỏ tới http://127.0.0.1:8000...                         " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan

& $CloudflaredPath tunnel --url http://127.0.0.1:8000
