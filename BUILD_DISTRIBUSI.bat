@echo off
setlocal enabledelayedexpansion
title VOC Billiard - Build Distribusi
color 0B

echo.
echo =====================================================
echo   VOC BILLIARD - BUILD PAKET DISTRIBUSI
echo   Buat paket deploy tanpa source code
echo =====================================================
echo.
echo Script ini akan:
echo  1. Build backend dan frontend
echo  2. Pack ke folder DISTRIBUSI\ tanpa source code .ts/.tsx
echo  3. Siap dicopy ke USB untuk deploy ke lokasi client
echo.
pause

set ROOT=%~dp0
set DIST=%ROOT%DISTRIBUSI
set BACKEND_DIR=%ROOT%backend
set FRONTEND_DIR=%ROOT%frontend

:: ─────────────────────────────────────────
:: STEP 1 - BUILD BACKEND
:: ─────────────────────────────────────────
echo.
echo [1/4] Build Backend (NestJS)...
cd /d "%BACKEND_DIR%"
call npm install --prefer-offline --legacy-peer-deps 2>nul
if %errorLevel% neq 0 call npm install --legacy-peer-deps
if %errorLevel% neq 0 (
    echo [ERROR] npm install backend gagal!
    pause & exit /b 1
)
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Build backend gagal!
    pause & exit /b 1
)
echo [OK] Backend berhasil dibuild.

:: ─────────────────────────────────────────
:: STEP 2 - BUILD FRONTEND
:: ─────────────────────────────────────────
echo.
echo [2/4] Build Frontend (Next.js)...
cd /d "%FRONTEND_DIR%"
if exist ".next" rmdir /s /q ".next"
call npm install --prefer-offline --legacy-peer-deps 2>nul
if %errorLevel% neq 0 call npm install --legacy-peer-deps
if %errorLevel% neq 0 (
    echo [ERROR] npm install frontend gagal!
    pause & exit /b 1
)
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Build frontend gagal!
    pause & exit /b 1
)
echo [OK] Frontend berhasil dibuild.

:: ─────────────────────────────────────────
:: STEP 3 - BUAT FOLDER DISTRIBUSI
:: ─────────────────────────────────────────
echo.
echo [3/4] Membuat folder DISTRIBUSI...

if exist "%DIST%" (
    echo [>>] Menghapus folder DISTRIBUSI lama...
    rmdir /s /q "%DIST%"
)
mkdir "%DIST%"

:: Backend - hanya dist/ + package.json (TANPA src/)
echo [>>] Copy backend (compiled only, tanpa source .ts)...
mkdir "%DIST%\backend"
xcopy "%BACKEND_DIR%\dist"         "%DIST%\backend\dist\"    /E /I /Q /Y >nul
copy  "%BACKEND_DIR%\package.json" "%DIST%\backend\"          /Y >nul
copy  "%BACKEND_DIR%\package-lock.json" "%DIST%\backend\"    /Y >nul 2>nul
if exist "%BACKEND_DIR%\public"  xcopy "%BACKEND_DIR%\public"  "%DIST%\backend\public\"  /E /I /Q /Y >nul
if exist "%BACKEND_DIR%\assets"  xcopy "%BACKEND_DIR%\assets"  "%DIST%\backend\assets\"  /E /I /Q /Y >nul
if exist "%BACKEND_DIR%\.env.example" copy "%BACKEND_DIR%\.env.example" "%DIST%\backend\" /Y >nul
echo [OK] Backend dikemas tanpa source code.

:: Frontend - hanya .next/ + public/ + package.json (TANPA src/)
echo [>>] Copy frontend (compiled only, tanpa source .tsx)...
mkdir "%DIST%\frontend"
xcopy "%FRONTEND_DIR%\.next"         "%DIST%\frontend\.next\" /E /I /Q /Y >nul
xcopy "%FRONTEND_DIR%\public"        "%DIST%\frontend\public\" /E /I /Q /Y >nul
copy  "%FRONTEND_DIR%\package.json"  "%DIST%\frontend\"       /Y >nul
copy  "%FRONTEND_DIR%\package-lock.json" "%DIST%\frontend\"  /Y >nul 2>nul
echo [OK] Frontend dikemas tanpa source code.

:: File konfigurasi
echo [>>] Copy file pendukung...
copy "%ROOT%mosquitto.conf"      "%DIST%\" /Y >nul
copy "%ROOT%ecosystem.config.js" "%DIST%\" /Y >nul
copy "%ROOT%DEPLOY.bat"          "%DIST%\" /Y >nul
copy "%ROOT%STOP_APP.bat"        "%DIST%\" /Y >nul
copy "%ROOT%CHECKLIST_INSTALASI.txt" "%DIST%\" /Y >nul 2>nul

:: ─────────────────────────────────────────
:: STEP 4 - BUAT INSTALL.bat UNTUK DISTRIBUSI
:: ─────────────────────────────────────────
echo [>>] Membuat INSTALL.bat untuk distribusi...
copy "%ROOT%INSTALL.bat" "%DIST%\INSTALL.bat" /Y >nul
echo [OK] INSTALL.bat disalin.

echo.
echo =====================================================
echo   SELESAI! Paket distribusi siap.
echo =====================================================
echo.
echo   Lokasi : %DIST%
echo.
echo   ISI FOLDER (aman untuk client):
echo   [v] backend\dist\       - compiled NestJS
echo   [v] frontend\.next\     - compiled Next.js
echo   [v] INSTALL.bat         - installer untuk client
echo   [v] DEPLOY.bat          - start harian
echo   [v] STOP_APP.bat        - stop aplikasi
echo   [v] mosquitto.conf      - konfigurasi MQTT
echo.
echo   TIDAK ADA (source code aman):
echo   [x] backend\src\        - source TypeScript
echo   [x] frontend\src\       - source React/TSX
echo   [x] esp32_mqtt_client\  - firmware Arduino
echo.
echo   Cara deploy ke lokasi client:
echo   1. Copy folder DISTRIBUSI\ ke USB
echo   2. Di PC client: klik kanan INSTALL.bat -> Run as administrator
echo.

explorer "%DIST%"
pause
endlocal
