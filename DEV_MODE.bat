@echo off
SETLOCAL EnableDelayedExpansion
color 0E
title VOC BILLIARD - DEVELOPER MODE STARTUP

echo ========================================================
echo          VOC BILLIARD - DEVELOPER MODE STARTUP
echo ========================================================
echo Mempersiapkan port untuk menghindari EADDRINUSE...
echo.

:: --- KONFIGURASI PORT ---
set BACKEND_PORT=4000
set FRONTEND_PORT=3000

:: 1. Membersihkan Backend Port (NestJS)
echo [1/2] Memastikan Port %BACKEND_PORT% (Backend) bebas...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /C:":%BACKEND_PORT% " ^| findstr LISTENING 2^>nul') do (
    echo [!] Menemukan proses %%a pada port %BACKEND_PORT%. Menutup proses...
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Membersihkan Frontend Port (Next.js)
echo [2/2] Memastikan Port %FRONTEND_PORT% (Frontend) bebas...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /C:":%FRONTEND_PORT% " ^| findstr LISTENING 2^>nul') do (
    echo [!] Menemukan proses %%a pada port %FRONTEND_PORT%. Menutup proses...
    taskkill /F /PID %%a >nul 2>&1
)

:: 3. Memastikan PM2 tidak mengganggu (Opsional tapi direkomendasikan)
echo.
echo [i] Mematikan PM2 (jika sedang berjalan) agar tidak bentrok...
call pm2 stop all >nul 2>&1

echo.
echo [SUCCESS] Port sudah dilepaskan. Memulai Developer Mode...
echo.

:: Jalankan Backend di jendela terminal baru
echo [i] Memulai Backend (Terminal Baru): npm run start:dev
start "BACKEND [NestJS Dev]" cmd /c "cd /d %~dp0backend && title BACKEND - NestJS Dev && npm run start:dev"

:: Tunda sejenak agar Backend siap duluan (opsional)
timeout /t 2 /nobreak >nul

:: Jalankan Frontend di jendela terminal baru
echo [i] Memulai Frontend (Terminal Baru): npm run dev
start "FRONTEND [Next.js Dev]" cmd /c "cd /d %~dp0frontend && title FRONTEND - Next.js Dev && npm run dev"

echo.
echo ========================================================
echo    DEVELOPER MODE SEDANG BERJALAN!
echo    ----------------------------------------------------
echo    Backend  : http://localhost:4000
echo    Frontend : http://localhost:3001 (atau http://localhost:3000)
echo ========================================================
echo Biarkan jendela ini atau tutup saja.
echo.
pause
