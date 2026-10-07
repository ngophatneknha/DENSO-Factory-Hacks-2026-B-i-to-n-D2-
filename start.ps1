# ==============================================================================
# DENSO Factory Hacks 2026 - D2 Logistics Control Room
# Script khởi động 1 lệnh duy nhất (FastAPI + React Control Room)
# ==============================================================================

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  DENSO FACTORY HACKS 2026 - BÀI TOÁN D2 LOGISTICS CONTROL ROOM  " -ForegroundColor Yellow
Write-Host "  Hệ thống Predict -> Detect -> Simulate -> Recommend Actions    " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

# 1. Kiểm tra môi trường Python
$VenvPython = Join-Path $Root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "[!] Đang tạo môi trường ảo Python .venv..." -ForegroundColor Yellow
    Set-Location (Join-Path $Root "backend")
    python -m venv .venv
    .\.venv\Scripts\pip.exe install -r requirements.lock.txt
    Set-Location $Root
}

# 2. Xóa biến lỗi SSL nếu có
Remove-Item Env:CURL_CA_BUNDLE -ErrorAction SilentlyContinue

# 3. Khởi tạo dữ liệu mặc định nếu chưa có
Write-Host "[*] Kiểm tra dữ liệu khởi tạo (Synthetic Level D0)..." -ForegroundColor Gray
$env:PYTHONPATH = (Join-Path $Root "backend")
& $VenvPython -m app.init_data

# 4. Kiểm tra bản build Frontend
$FrontendDist = Join-Path $Root "frontend\dist"
if (-not (Test-Path $FrontendDist)) {
    Write-Host "[*] Đang đóng gói bản build Frontend..." -ForegroundColor Yellow
    Set-Location (Join-Path $Root "frontend")
    npm run build
    Set-Location $Root
}

# 5. Mở trình duyệt và khởi động server
Write-Host ""
Write-Host ">>> HỆ THỐNG ĐÃ SẴN SÀNG TẠI: http://localhost:8000" -ForegroundColor Cyan
Write-Host ">>> Đang mở trình duyệt..." -ForegroundColor Gray
Start-Process "http://localhost:8000"

Write-Host ">>> Đang chạy Uvicorn Server (bấm Ctrl+C để dừng)..." -ForegroundColor Green
Set-Location (Join-Path $Root "backend")
& $VenvPython -m uvicorn app.main:app --host 0.0.0.0 --port 8000
