@echo off
setlocal enabledelayedexpansion
title VOC Billiard — Build Paket Distribusi Customer
color 0B
chcp 65001 > nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║      VOC BILLIARD — BUILD PAKET DISTRIBUSI CUSTOMER         ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  Membuat paket deploy yang:                                  ║
echo ║   ✓ TIDAK mengandung source code (.ts)                      ║
echo ║   ✓ Hanya berisi compiled files yang sudah siap jalan       ║
echo ║   ✓ Aman diberikan ke customer/teknisi                      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set TIMESTAMP=%date:~6,4%%date:~3,2%%date:~0,2%
set DIST_DIR=%USERPROFILE%\Desktop\VOC_Distribusi_%TIMESTAMP%

echo [>>] Paket akan dibuat di: %DIST_DIR%
echo.
pause

:: ─────────────────────────────────────────────────────────────
:: BUILD TERBARU
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ Build Backend ^& Frontend ═══════════════════════════════════

echo [>>] Build Backend...
cd /d "%~dp0backend"
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Build backend gagal!
    pause
    exit /b 1
)

echo [>>] Build Frontend...
cd /d "%~dp0frontend"
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Build frontend gagal!
    pause
    exit /b 1
)
echo [OK] Build selesai.

:: ─────────────────────────────────────────────────────────────
:: BUAT FOLDER DISTRIBUSI
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ Menyusun Paket Distribusi ══════════════════════════════════
mkdir "%DIST_DIR%" 2>nul
mkdir "%DIST_DIR%\backend" 2>nul
mkdir "%DIST_DIR%\frontend" 2>nul
mkdir "%DIST_DIR%\logs" 2>nul
mkdir "%DIST_DIR%\esp32_mqtt_client" 2>nul

echo [>>] Copy Backend (hanya dist, bukan src)...
:: Hanya copy dist/ dan node_modules/ — TIDAK copy src/ (.ts files)
robocopy "%~dp0backend\dist"         "%DIST_DIR%\backend\dist"         /E /NFL /NDL /NJH /NJS
robocopy "%~dp0backend\node_modules" "%DIST_DIR%\backend\node_modules" /E /NFL /NDL /NJH /NJS
copy "%~dp0backend\package.json"     "%DIST_DIR%\backend\package.json"  >nul
copy "%~dp0backend\.env.example"     "%DIST_DIR%\backend\.env.example"  >nul 2>&1
:: Buat .env dari .env yang ada (sudah isi nilai production)
if exist "%~dp0backend\.env" (
    copy "%~dp0backend\.env"         "%DIST_DIR%\backend\.env"          >nul
)
echo [OK] Backend (tanpa source code) disalin.

echo [>>] Copy Frontend (hanya .next standalone, bukan src)...
:: Hanya copy .next/ — TIDAK copy src/ (halaman .tsx)
robocopy "%~dp0frontend\.next"       "%DIST_DIR%\frontend\.next"        /E /NFL /NDL /NJH /NJS
robocopy "%~dp0frontend\node_modules""%DIST_DIR%\frontend\node_modules" /E /NFL /NDL /NJH /NJS /XD ".cache"
robocopy "%~dp0frontend\public"      "%DIST_DIR%\frontend\public"       /E /NFL /NDL /NJH /NJS
copy "%~dp0frontend\package.json"    "%DIST_DIR%\frontend\package.json"  >nul
if exist "%~dp0frontend\.env.local" (
    copy "%~dp0frontend\.env.local"  "%DIST_DIR%\frontend\.env.local"   >nul
)
echo [OK] Frontend (tanpa source code) disalin.

echo [>>] Copy file pendukung...
:: File yang diperlukan untuk jalan
copy "%~dp0mosquitto.conf"    "%DIST_DIR%\mosquitto.conf"   >nul 2>&1
copy "%~dp0ecosystem.config.js" "%DIST_DIR%\ecosystem.config.js" >nul 2>&1
copy "%~dp0update_ip.js"      "%DIST_DIR%\update_ip.js"    >nul 2>&1
copy "%~dp0DEPLOY.bat"        "%DIST_DIR%\DEPLOY.bat"       >nul 2>&1
copy "%~dp0FACTORY_RESET.bat" "%DIST_DIR%\FACTORY_RESET.bat" >nul 2>&1

:: Copy firmware ESP32 (ini boleh, bukan source bisnis sensitif)
robocopy "%~dp0esp32_mqtt_client" "%DIST_DIR%\esp32_mqtt_client" /E /NFL /NDL /NJH /NJS

:: Buat INSTALL_CUSTOMER.bat yang lebih sederhana (hanya setup service)
echo [>>] Membuat INSTALL_CUSTOMER.bat...
(
echo @echo off
echo setlocal
echo title VOC Billiard - Setup
echo chcp 65001 ^> nul
echo echo.
echo echo Menginstall VOC Billiard System...
echo echo.
echo :: Install prerequisites
echo winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements 2^>nul
echo winget install PostgreSQL.PostgreSQL --silent --accept-package-agreements --accept-source-agreements 2^>nul
echo winget install EclipseFoundation.Mosquitto --silent --accept-package-agreements --accept-source-agreements 2^>nul
echo winget install tporadowski.redis --silent --accept-package-agreements --accept-source-agreements 2^>nul
echo npm install -g pm2 2^>nul
echo :: Setup database
echo set PGPASSWORD=1
echo "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -p 4538 -h 127.0.0.1 -c "CREATE DATABASE billiard_db;" 2^>nul
echo :: Update IP dan jalankan
echo node update_ip.js
echo call DEPLOY.bat
echo echo Instalasi selesai^^! Login: admin / 123
echo pause
echo endlocal
) > "%DIST_DIR%\INSTALL_CUSTOMER.bat"

echo [OK] INSTALL_CUSTOMER.bat dibuat.

:: ─────────────────────────────────────────────────────────────
:: VERIFIKASI — Pastikan tidak ada file .ts
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ Verifikasi Keamanan ════════════════════════════════════════
set TS_COUNT=0
for /r "%DIST_DIR%" %%f in (*.ts) do (
    if not "%%~xf"==".json" (
        set /a TS_COUNT+=1
    )
)

if !TS_COUNT! gtr 0 (
    echo [!!] PERINGATAN: Ditemukan !TS_COUNT! file .ts di paket distribusi!
    echo      Ini mungkin dari node_modules, biasanya tidak berbahaya.
) else (
    echo [OK] Verifikasi: Tidak ada source code .ts di paket distribusi.
)

:: ─────────────────────────────────────────────────────────────
:: SELESAI
:: ─────────────────────────────────────────────────────────────
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║            PAKET DISTRIBUSI SIAP! ✓                         ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                              ║
echo ║  Lokasi: %DIST_DIR%
echo ║                                                              ║
echo ║  ISI PAKET (AMAN untuk customer):                           ║
echo ║   ✓ backend/dist/      (compiled JS, tidak terbaca mudah)   ║
echo ║   ✓ frontend/.next/    (compiled, minified)                 ║
echo ║   ✓ DEPLOY.bat         (jalankan aplikasi)                  ║
echo ║   ✓ INSTALL_CUSTOMER.bat (setup di PC customer)             ║
echo ║   ✓ esp32_mqtt_client/ (firmware Arduino)                   ║
echo ║                                                              ║
echo ║  TIDAK ADA di paket:                                        ║
echo ║   ✗ backend/src/       (source TypeScript)                  ║
echo ║   ✗ frontend/src/      (source React/Next.js)               ║
echo ║   ✗ .git/              (history commit)                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set /p OPEN_FOLDER="Buka folder distribusi? (y/n): "
if /i "%OPEN_FOLDER%"=="y" explorer "%DIST_DIR%"

pause
endlocal
