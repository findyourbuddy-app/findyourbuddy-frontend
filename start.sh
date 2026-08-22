#!/usr/bin/env bash
# Linux/Mac lokal — frontend başlatır
cd "$(dirname "$0")"

LOCAL_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
[ -z "$LOCAL_IP" ] && LOCAL_IP="127.0.0.1"
echo "Backend: http://$LOCAL_IP:8001"

EXPO_PUBLIC_API_BASE_URL="http://$LOCAL_IP:8001" npx expo start --clear
