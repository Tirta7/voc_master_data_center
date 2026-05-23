@echo off
setlocal
color 0C
title VOC BILLIARD - FORCE STOP ALL SERVICES

echo ========================================================
echo        VOC BILLIARD - SHUTDOWN / CLEANUP TOOL
echo ========================================================
echo Mematikan semua service Node, PM2, dan membebaskan Port...
echo Gunakan script ini jika ingin pindah ke mode DEV atau 
echo mereset aplikasi jika terjadi port nyangkut / bentrok.
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Mematikan PM2 dan Proses Node.js...
call pm2 kill >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM PM2 >nul 2>&1

:: Fix EPERM: Hapus socket PM2
if exist "%HOMEDRIVE%%HOMEPATH%\.pm2\rpc.sock" del /f /q "%HOMEDRIVE%%HOMEPATH%\.pm2\rpc.sock" >nul 2>&1
if exist "%HOMEDRIVE%%HOMEPATH%\.pm2\pub.sock" del /f /q "%HOMEDRIVE%%HOMEPATH%\.pm2\pub.sock" >nul 2>&1
timeout /t 2 > nul

echo [2/3] Mematikan MQTT Broker (Mosquitto)...
taskkill /F /IM mosquitto.exe >nul 2>&1

echo [3/3] Memastikan Port (3000, 4000, 1883, 8083) dibebaskan...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":1883" ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8083" ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1

echo.
echo ========================================================
echo [SELESAI] Semua proses telah dimatikan dan port sudah bersih!
echo Anda sekarang bisa aman menjalankan Mode DEV atau Deploy ulang.
echo ========================================================
echo.
pause
exit /b 0
