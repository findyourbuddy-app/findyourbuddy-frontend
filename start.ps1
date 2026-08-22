# Windows lokal — frontend başlatır
Set-Location $PSScriptRoot

$LOCAL_IP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.PrefixOrigin -eq 'Dhcp' -and $_.IPAddress -notmatch '^169\.' } |
    Select-Object -First 1).IPAddress

if (-not $LOCAL_IP) { $LOCAL_IP = "127.0.0.1" }
Write-Host "Backend: http://${LOCAL_IP}:8001"

$env:EXPO_PUBLIC_API_BASE_URL = "http://${LOCAL_IP}:8001"
npx expo start --clear
