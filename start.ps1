param (
    [switch]$Tunnel
)

# Windows lokal — frontend başlatır
Set-Location $PSScriptRoot

$LOCAL_IP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.PrefixOrigin -eq 'Dhcp' -and $_.IPAddress -notmatch '^169\.' } |
    Select-Object -First 1).IPAddress

if (-not $LOCAL_IP) { $LOCAL_IP = "127.0.0.1" }
Write-Host "Backend: http://${LOCAL_IP}:8001"

$env:EXPO_PUBLIC_API_BASE_URL = "http://${LOCAL_IP}:8001"

# 8081 portunu kullanan process varsa kapat
$pid8081 = (Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($pid8081) {
    Write-Host "Port 8081 mesgul (PID: $pid8081), kapatiliyor..."
    Stop-Process -Id $pid8081 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Tarayicide buyuk QR goster (telefon kamerasi ile kolay okunur)
$expoUrl = "exp://${LOCAL_IP}:8081"
$qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$([uri]::EscapeDataString($expoUrl))"
$html = @"
<!DOCTYPE html>
<html>
<body style="margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#1a1a1a;font-family:sans-serif;color:#fff">
  <h2 style="margin-bottom:24px">FindYourBuddy — Expo Go ile ac</h2>
  <img src="$qrApiUrl" width="400" height="400" style="background:white;padding:16px;border-radius:8px"/>
  <p style="margin-top:20px;color:#aaa;font-size:14px">$expoUrl</p>
  <p style="color:#666;font-size:12px">Expo Go yoksa: App Store / Play Store'dan indir</p>
</body>
</html>
"@
$qrFile = "$PSScriptRoot\qr.html"
$html | Out-File -FilePath $qrFile -Encoding utf8
Start-Process $qrFile
Write-Host "QR kod tarayicida acildi."

if ($Tunnel) {
    Write-Host "Tunnel modunda baslatiliyor (ngrok)..." -ForegroundColor Yellow
    npx expo start --tunnel --clear
} else {
    Write-Host "Lokal LAN modunda baslatiliyor (Hizli & Guvenli)..." -ForegroundColor Green
    npx expo start --lan --clear
}
