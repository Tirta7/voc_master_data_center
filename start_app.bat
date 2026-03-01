@echo off
echo ==========================================
echo    VOC BILLIARD SYSTEM - AUTO START
echo ==========================================
echo.

:: 1. Jalankan Mosquitto MQTT Broker (Background)
echo [1/3] Memulai MQTT Broker...
start /b "" "C:\Program Files\mosquitto\mosquitto.exe" -c d:\Billiard_APPS\mosquitto.conf
timeout /t 2 > nul

:: 2. Jalankan PM2 Ecosystem (Backend + Frontend)
echo [2/3] Memulai Backend dan Frontend via PM2...
cd /d d:\Billiard_APPS
call pm2 start ecosystem.config.js

:: 3. Simpan konfigurasi PM2 agar jalan saat sistem restart
echo [3/3] Menyimpan konfigurasi startup PM2...
call pm2 save

echo.
echo ==========================================
echo    SISTEM ONLINE - SILAKAN KERJA!
echo ==========================================
echo.
pause
