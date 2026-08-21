# Start FindYourBuddy Expo Frontend App
Write-Host "Starting FindYourBuddy Expo Frontend..." -ForegroundColor Cyan
Set-Location -Path $PSScriptRoot

# Widen the console so the terminal QR code doesn't line-wrap and become unscannable
try {
    $ui = $Host.UI.RawUI
    $targetWidth = 140
    if ($ui.BufferSize.Width -lt $targetWidth) {
        $ui.BufferSize = New-Object System.Management.Automation.Host.Size($targetWidth, $ui.BufferSize.Height)
    }
    $winSize = $ui.WindowSize
    if ($winSize.Width -lt $targetWidth) {
        $winSize.Width = $targetWidth
        $ui.WindowSize = $winSize
    }
} catch {
    Write-Host "Terminal genisletilemedi - QR bozuk gorunuyorsa pencereyi elle genislet." -ForegroundColor Yellow
}

npx expo start --clear
