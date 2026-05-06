@echo off
setlocal
title VOC Billiard — Mulai Layanan
color 0A
chcp 65001 >nul 2>&1

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║         VOC BILLIARD — MEMULAI LAYANAN...               ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Pastikan Docker berjalan
docker info >nul 2>&1
if %errorLevel% neq 0 (
    echo  [>>] Membuka Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo  [..] Tunggu Docker siap (30 detik)...
    timeout /t 30 /nobreak >nul
)

echo  [>>] Menjalankan semua layanan...
docker compose --env-file .env up -d

echo.
echo  [..] Menunggu aplikasi siap (20 detik)...
timeout /t 20 /nobreak >nul

:: Cek apakah berhasil
docker compose ps

:: Deteksi IP untuk info akses
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "169.254"') do (
    set RAW_IP=%%a
    set RAW_IP=!RAW_IP: =!
    if not defined MYIP set MYIP=!RAW_IP!
)
if not defined MYIP set MYIP=lihat ipconfig

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  ✅ Aplikasi Berjalan!                                    ║
echo  ║                                                          ║
echo  ║  Akses:                                                  ║
echo  ║   PC ini  : http://localhost:3001                       ║
echo  ║   PC/HP   : http://%MYIP%:3001            ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

timeout /t 3 /nobreak >nul
start http://localhost:3001

pause
endlocal
