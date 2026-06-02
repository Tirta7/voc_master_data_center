@echo off
title Cloudflare Tunnel - VOC Billiard
echo ===================================================
echo Memulai Cloudflare Tunnel (Multi-Route)...
echo Akses Kasir: https://admin.vocbilliard.online
echo API Server:  https://api.vocbilliard.online
echo MQTT Server: wss://mqtt.vocbilliard.online
echo ===================================================
echo JANGAN TUTUP JENDELA INI SELAMA INGIN DIAKSES DARI LUAR
echo ===================================================
d:\Billiard_APPS\cloudflared.exe tunnel --config d:\Billiard_APPS\config.yml run
pause
