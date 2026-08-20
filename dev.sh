#!/usr/bin/env bash
# Tek komutla frontend başlatma.
# 1) Tunnel modunda başlatmayı 3 kez dener (ngrok zaman zaman flaky oluyor).
# 2) 3 denemede de olmazsa aynı-wifi moduna düşer (en azından ayakta kalsın).
cd "$(dirname "$0")"

max_attempts=3
for i in $(seq 1 $max_attempts); do
  echo "Tunnel modunda başlatılıyor (deneme $i/$max_attempts)..."
  npx expo start --tunnel --go && exit 0
  echo "Tunnel başarısız oldu, 3 saniye sonra tekrar denenecek..."
  sleep 3
done

echo "$max_attempts denemede de tunnel kurulamadı, aynı-wifi modunda başlatılıyor..."
npx expo start --go
