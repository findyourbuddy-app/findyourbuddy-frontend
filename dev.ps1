# Tek komutla frontend başlatma.
# 1) Önceki çalıştırmadan kalan Metro/ngrok süreçlerini temizler.
# 2) Tunnel modunda başlatmayı 3 kez dener (ngrok zaman zaman flaky oluyor).
# 3) 3 denemede de olmazsa aynı-wifi moduna düşer (en azından ayakta kalsın).
Set-Location $PSScriptRoot

Write-Host "Önceki çalıştırmadan kalan süreçler temizleniyor..." -ForegroundColor DarkGray
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

$maxAttempts = 3
for ($i = 1; $i -le $maxAttempts; $i++) {
    Write-Host "Tunnel modunda başlatılıyor (deneme $i/$maxAttempts)..." -ForegroundColor Cyan
    npx expo start --tunnel --go
    if ($LASTEXITCODE -eq 0) { exit 0 }
    Write-Host "Tunnel başarısız oldu, 3 saniye sonra tekrar denenecek..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

Write-Host "$maxAttempts denemede de tunnel kurulamadı, aynı-wifi modunda başlatılıyor..." -ForegroundColor Red
npx expo start --go
