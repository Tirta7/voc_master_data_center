@echo off
setlocal enabledelayedexpansion
title VOC Billiard System — Installer
color 0A
chcp 65001 > nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║         VOC BILLIARD SYSTEM — AUTO INSTALLER v1.0           ║
echo ║         Hybrid IoT Billiard Management Platform             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Script ini akan menginstall semua yang diperlukan secara otomatis:
echo   [1] Node.js (Runtime backend ^& frontend)
echo   [2] PostgreSQL (Database)
echo   [3] Redis     (Cache/Session)
echo   [4] Mosquitto (MQTT Broker)
echo   [5] PM2       (Process Manager)
echo   [6] npm install backend ^& frontend
echo   [7] Build backend ^& frontend
echo   [8] Setup database
echo.
echo  PERHATIAN: Butuh koneksi internet. Proses bisa 10-20 menit.
echo.
pause

:: ─────────────────────────────────────────────────────────────
:: CEK HAL DASAR
:: ─────────────────────────────────────────────────────────────
echo.
echo [*] Memeriksa apakah dijalankan sebagai Administrator...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] ERROR: Harap jalankan INSTALL.bat sebagai ADMINISTRATOR!
    echo     Klik kanan file ini → "Run as administrator"
    pause
    exit /b 1
)
echo [OK] Berjalan sebagai Administrator.

:: ─────────────────────────────────────────────────────────────
:: STEP 1 — NODE.JS
:: ─────────────────────────────────────────────────────────────
echo.
echo ════════════════════════════════════════
echo  STEP 1: Node.js
echo ════════════════════════════════════════
node --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
    echo [OK] Node.js sudah terinstall: !NODE_VER!
) else (
    echo [>>] Menginstall Node.js via winget...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    if %errorLevel% neq 0 (
        echo [!] winget gagal. Download manual dari: https://nodejs.org
        echo     Setelah install, jalankan INSTALL.bat lagi.
        pause
        exit /b 1
    )
    :: Refresh PATH
    call RefreshEnv.cmd 2>nul || (
        set "PATH=%PATH%;C:\Program Files\nodejs"
    )
    echo [OK] Node.js berhasil diinstall.
)

:: ─────────────────────────────────────────────────────────────
:: STEP 2 — POSTGRESQL
:: ─────────────────────────────────────────────────────────────
echo.
echo ════════════════════════════════════════
echo  STEP 2: PostgreSQL
echo ════════════════════════════════════════
sc query postgresql-x64-16 >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] PostgreSQL sudah terinstall.
) else (
    sc query postgresql-x64-17 >nul 2>&1
    if %errorLevel% equ 0 (
        echo [OK] PostgreSQL sudah terinstall.
    ) else (
        echo [>>] Menginstall PostgreSQL via winget...
        winget install PostgreSQL.PostgreSQL --silent --accept-package-agreements --accept-source-agreements
        if %errorLevel% neq 0 (
            echo [!] Gagal install PostgreSQL otomatis.
            echo     Download dari: https://www.postgresql.org/download/windows/
            echo     - Install dengan password: 1
            echo     - Port: 4538
            echo     Setelah install, jalankan INSTALL.bat lagi.
            pause
            exit /b 1
        )
        echo [OK] PostgreSQL berhasil diinstall.
    )
)

:: ─────────────────────────────────────────────────────────────
:: STEP 3 — MOSQUITTO
:: ─────────────────────────────────────────────────────────────
echo.
echo ════════════════════════════════════════
echo  STEP 3: Mosquitto MQTT Broker
echo ════════════════════════════════════════
sc query mosquitto >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Mosquitto sudah terinstall.
) else (
    where mosquitto >nul 2>&1
    if %errorLevel% equ 0 (
        echo [OK] Mosquitto ditemukan di PATH.
    ) else (
        echo [>>] Menginstall Mosquitto via winget...
        winget install EclipseFoundation.Mosquitto --silent --accept-package-agreements --accept-source-agreements
        if %errorLevel% neq 0 (
            echo [!] Gagal install Mosquitto otomatis.
            echo     Download dari: https://mosquitto.org/download/
            echo     Setelah install, jalankan INSTALL.bat lagi.
            pause
            exit /b 1
        )
        echo [OK] Mosquitto berhasil diinstall.
    )
)

:: ─────────────────────────────────────────────────────────────
:: STEP 4 — REDIS (Windows port via Memurai atau via winget)
:: ─────────────────────────────────────────────────────────────
echo.
echo ════════════════════════════════════════
echo  STEP 4: Redis
echo ════════════════════════════════════════
sc query Redis >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Redis sudah terinstall sebagai service.
) else (
    where redis-server >nul 2>&1
    if %errorLevel% equ 0 (
        echo [OK] Redis ditemukan di PATH.
    ) else (
        echo [>>] Menginstall Redis via winget (Memurai)...
        winget install Memurai.Memurai --silent --accept-package-agreements --accept-source-agreements 2>nul
        if %errorLevel% neq 0 (
            echo [>>] Mencoba Redis alternatif...
            winget install tporadowski.redis --silent --accept-package-agreements --accept-source-agreements 2>nul
        )
        if %errorLevel% neq 0 (
            echo [!] Gagal install Redis otomatis.
            echo     Download Memurai dari: https://www.memurai.com/get-memurai
            echo     atau Redis dari: https://github.com/tporadowski/redis/releases
            echo     Setelah install, jalankan INSTALL.bat lagi.
            pause
        ) else (
            echo [OK] Redis berhasil diinstall.
        )
    )
)

:: ─────────────────────────────────────────────────────────────
:: STEP 5 — PM2
:: ─────────────────────────────────────────────────────────────
echo.
echo ════════════════════════════════════════
echo  STEP 5: PM2 Process Manager
echo ════════════════════════════════════════
pm2 --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('pm2 --version') do set PM2_VER=%%i
    echo [OK] PM2 sudah terinstall: !PM2_VER!
) else (
    echo [>>] Menginstall PM2...
    npm install -g pm2
    if %errorLevel% neq 0 (
        echo [ERROR] Gagal install PM2.
        pause
        exit /b 1
    )
    echo [OK] PM2 berhasil diinstall.
)

:: ─────────────────────────────────────────────────────────────
:: STEP 6 — NPM INSTALL
:: ─────────────────────────────────────────────────────────────
echo.
echo ════════════════════════════════════════
echo  STEP 6: Install Dependencies npm
echo ════════════════════════════════════════

echo [>>] Backend: npm install...
cd /d "%~dp0backend"
call npm install
if %errorLevel% neq 0 (
    echo [ERROR] npm install backend gagal.
    pause
    exit /b 1
)
echo [OK] Backend dependencies siap.

echo [>>] Frontend: npm install...
cd /d "%~dp0frontend"
call npm install
if %errorLevel% neq 0 (
    echo [ERROR] npm install frontend gagal.
    pause
    exit /b 1
)
echo [OK] Frontend dependencies siap.

:: ─────────────────────────────────────────────────────────────
:: STEP 7 — BUILD
:: ─────────────────────────────────────────────────────────────
echo.
echo ════════════════════════════════════════
echo  STEP 7: Build Aplikasi
echo ════════════════════════════════════════

echo [>>] Build Backend (NestJS)...
cd /d "%~dp0backend"
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Build backend gagal.
    pause
    exit /b 1
)
echo [OK] Backend berhasil di-build.

echo [>>] Build Frontend (Next.js) — ini membutuhkan beberapa menit...
cd /d "%~dp0frontend"
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Build frontend gagal.
    pause
    exit /b 1
)
echo [OK] Frontend berhasil di-build.

:: ─────────────────────────────────────────────────────────────
:: STEP 8 — SETUP DATABASE
:: ─────────────────────────────────────────────────────────────
echo.
echo ════════════════════════════════════════
echo  STEP 8: Setup Database PostgreSQL
echo ════════════════════════════════════════
echo.
echo  Database akan dibuat dengan konfigurasi:
echo    Host    : 127.0.0.1
echo    Port    : 4538
echo    User    : postgres
echo    Password: 1
echo    Database: billiard_db
echo.

:: Cari psql
set PSQL_PATH=""
for %%p in (
    "C:\Program Files\PostgreSQL\17\bin\psql.exe"
    "C:\Program Files\PostgreSQL\16\bin\psql.exe"
    "C:\Program Files\PostgreSQL\15\bin\psql.exe"
    "C:\Program Files (x86)\PostgreSQL\17\bin\psql.exe"
) do (
    if exist %%p set PSQL_PATH=%%p
)

if %PSQL_PATH%=="" (
    echo [!] psql tidak ditemukan. Coba cari di PATH...
    where psql >nul 2>&1
    if %errorLevel% equ 0 (
        set PSQL_PATH=psql
        echo [OK] psql ditemukan di PATH.
    ) else (
        echo [!] psql tidak ditemukan. Setup database dilewati.
        echo     Jalankan manual: createdb -U postgres -p 4538 billiard_db
        goto :SKIP_DB
    )
)

:: Buat database
echo [>>] Membuat database billiard_db...
set PGPASSWORD=1
%PSQL_PATH% -U postgres -p 4538 -h 127.0.0.1 -c "CREATE DATABASE billiard_db;" 2>nul
echo [OK] Database siap (atau sudah ada sebelumnya).

:SKIP_DB

:: ─────────────────────────────────────────────────────────────
:: STEP 9 — KONFIGURASI IP
:: ─────────────────────────────────────────────────────────────
echo.
echo ════════════════════════════════════════
echo  STEP 9: Konfigurasi IP Jaringan
echo ════════════════════════════════════════
cd /d "%~dp0"
node update_ip.js
echo [OK] IP dikonfigurasi.

:: ─────────────────────────────────────────────────────────────
:: STEP 10 — BUAT SHORTCUT DEPLOY.bat DI DESKTOP
:: ─────────────────────────────────────────────────────────────
echo.
echo ════════════════════════════════════════
echo  STEP 10: Membuat Shortcut di Desktop
echo ════════════════════════════════════════
set SHORTCUT_TARGET=%~dp0DEPLOY.bat
set SHORTCUT_PATH=%USERPROFILE%\Desktop\VOC Billiard.lnk
set ICON_PATH=%~dp0frontend\public\favicon.ico

powershell -Command ^
 "$ws = New-Object -ComObject WScript.Shell; ^
  $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); ^
  $s.TargetPath = '%SHORTCUT_TARGET%'; ^
  $s.WorkingDirectory = '%~dp0'; ^
  $s.Description = 'VOC Billiard System'; ^
  $s.Save()"

if %errorLevel% equ 0 (
    echo [OK] Shortcut "VOC Billiard" dibuat di Desktop.
) else (
    echo [!] Gagal buat shortcut (tidak kritis, lanjut).
)

:: ─────────────────────────────────────────────────────────────
:: SELESAI
:: ─────────────────────────────────────────────────────────────
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                  INSTALASI SELESAI!                         ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                              ║
echo ║  Cara menjalankan aplikasi:                                  ║
echo ║  1. Klik shortcut "VOC Billiard" di Desktop                 ║
echo ║     ATAU                                                     ║
echo ║  2. Jalankan DEPLOY.bat di folder ini                       ║
echo ║                                                              ║
echo ║  Akses dari PC    : http://localhost:3000                   ║
echo ║  Akses dari HP    : http://[IP PC]:3000                     ║
echo ║                                                              ║
echo ║  Jika ada masalah, jalankan DEPLOY.bat terlebih dahulu      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Tekan sembarang tombol untuk EXIT...
pause > nul
endlocal
