@echo off
setlocal enabledelayedexpansion
title VOC Billiard System — Installer
color 0A
chcp 65001 > nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║         VOC BILLIARD SYSTEM — AUTO INSTALLER v2.0           ║
echo ║         Hybrid IoT Billiard Management Platform             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Script ini akan menginstall semua yang diperlukan secara otomatis:
echo   [1] Node.js          [5] PM2 Process Manager
echo   [2] PostgreSQL       [6] npm install ^& Build
echo   [3] Redis            [7] Setup Database
echo   [4] Mosquitto MQTT   [8] Konfigurasi IP ^& Desktop Shortcut
echo.
echo  PERHATIAN: Butuh koneksi internet. Proses ~15-20 menit.
echo.
pause

:: ─────────────────────────────────────────────────────────────
:: CEK ADMINISTRATOR
:: ─────────────────────────────────────────────────────────────
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] ERROR: Jalankan sebagai ADMINISTRATOR!
    echo     Klik kanan INSTALL.bat → "Run as administrator"
    pause
    exit /b 1
)
echo [OK] Berjalan sebagai Administrator.

:: ─────────────────────────────────────────────────────────────
:: STEP 1 — NODE.JS
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ STEP 1/8: Node.js ══════════════════════════════════════════
node --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f %%i in ('node --version') do echo [OK] Node.js %%i sudah ada.
) else (
    echo [>>] Menginstall Node.js LTS via winget...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    if %errorLevel% neq 0 (
        echo [!] Download manual: https://nodejs.org
        echo     Install Node.js LTS lalu jalankan INSTALL.bat lagi.
        pause
        exit /b 1
    )
    :: Refresh PATH
    set "PATH=%PATH%;C:\Program Files\nodejs"
    echo [OK] Node.js berhasil diinstall. Restart terminal mungkin diperlukan.
)

:: ─────────────────────────────────────────────────────────────
:: STEP 2 — POSTGRESQL
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ STEP 2/8: PostgreSQL ═══════════════════════════════════════
set PG_FOUND=0
for %%v in (17 16 15 14) do (
    sc query postgresql-x64-%%v >nul 2>&1
    if !errorLevel! equ 0 set PG_FOUND=1
)
if %PG_FOUND% equ 1 (
    echo [OK] PostgreSQL sudah terinstall.
) else (
    echo [>>] Menginstall PostgreSQL via winget...
    winget install PostgreSQL.PostgreSQL --silent --accept-package-agreements --accept-source-agreements
    if %errorLevel% neq 0 (
        echo [!] Install PostgreSQL manual dari: https://www.postgresql.org/download/windows/
        echo     Gunakan port: 4538, password: 1
        echo     Lalu jalankan INSTALL.bat lagi.
        pause
        exit /b 1
    )
    echo [OK] PostgreSQL berhasil diinstall.
)

:: ─────────────────────────────────────────────────────────────
:: STEP 3 — MOSQUITTO
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ STEP 3/8: Mosquitto MQTT Broker ════════════════════════════
where mosquitto >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Mosquitto sudah ada.
) else (
    echo [>>] Menginstall Mosquitto via winget...
    winget install EclipseFoundation.Mosquitto --silent --accept-package-agreements --accept-source-agreements
    if %errorLevel% neq 0 (
        echo [!] Install manual dari: https://mosquitto.org/download/
        pause
    ) else (
        echo [OK] Mosquitto berhasil diinstall.
    )
)

:: ─────────────────────────────────────────────────────────────
:: STEP 4 — REDIS
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ STEP 4/8: Redis ════════════════════════════════════════════
sc query Redis >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Redis service sudah ada.
) else (
    where redis-server >nul 2>&1
    if %errorLevel% equ 0 (
        echo [OK] Redis ditemukan di PATH.
    ) else (
        echo [>>] Menginstall Redis (Memurai) via winget...
        winget install Memurai.Memurai --silent --accept-package-agreements --accept-source-agreements 2>nul
        if %errorLevel% neq 0 (
            winget install tporadowski.redis --silent --accept-package-agreements --accept-source-agreements 2>nul
        )
        if %errorLevel% equ 0 (
            echo [OK] Redis berhasil diinstall.
        ) else (
            echo [!] Install Memurai manual dari: https://www.memurai.com/get-memurai
        )
    )
)

:: ─────────────────────────────────────────────────────────────
:: STEP 5 — PM2
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ STEP 5/8: PM2 Process Manager ══════════════════════════════
pm2 --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f %%i in ('pm2 --version') do echo [OK] PM2 v%%i sudah ada.
) else (
    echo [>>] Menginstall PM2...
    npm install -g pm2
    if %errorLevel% neq 0 (
        echo [ERROR] PM2 gagal diinstall.
        pause
        exit /b 1
    )
    echo [OK] PM2 berhasil diinstall.
)

:: ─────────────────────────────────────────────────────────────
:: STEP 6 — SETUP .ENV
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ STEP 6/8: Konfigurasi Environment (.env) ════════════════════

:: Backend .env
if not exist "%~dp0backend\.env" (
    if exist "%~dp0backend\.env.example" (
        copy "%~dp0backend\.env.example" "%~dp0backend\.env" >nul
        echo [OK] backend/.env dibuat dari template.
        echo.
        echo [!!] PENTING: Edit backend/.env dan isi nilai yang sesuai:
        echo      DB_PASSWORD, FONNTE_TOKEN, APP_URL
        echo      File ada di: %~dp0backend\.env
        echo.
    ) else (
        echo [!] backend/.env.example tidak ditemukan, buat manual.
    )
) else (
    echo [OK] backend/.env sudah ada.
)

:: Frontend .env.local
if not exist "%~dp0frontend\.env.local" (
    if exist "%~dp0frontend\.env.example" (
        copy "%~dp0frontend\.env.example" "%~dp0frontend\.env.local" >nul
        echo [OK] frontend/.env.local dibuat dari template.
    )
) else (
    echo [OK] frontend/.env.local sudah ada.
)

:: ─────────────────────────────────────────────────────────────
:: STEP 7 — NPM INSTALL & BUILD
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ STEP 7/8: Install Dependencies ^& Build ══════════════════════

echo [>>] Backend: npm install...
cd /d "%~dp0backend"
call npm install --prefer-offline 2>nul || call npm install
if %errorLevel% neq 0 (
    echo [ERROR] npm install backend gagal.
    pause
    exit /b 1
)
echo [>>] Backend: npm run build...
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Build backend gagal.
    pause
    exit /b 1
)
echo [OK] Backend siap.

echo [>>] Frontend: npm install...
cd /d "%~dp0frontend"
call npm install --prefer-offline 2>nul || call npm install
if %errorLevel% neq 0 (
    echo [ERROR] npm install frontend gagal.
    pause
    exit /b 1
)
echo [>>] Frontend: npm run build (mohon tunggu ~5 menit)...
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Build frontend gagal.
    pause
    exit /b 1
)
echo [OK] Frontend siap.

:: ─────────────────────────────────────────────────────────────
:: STEP 8 — DATABASE & IP & SHORTCUT
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ STEP 8/8: Database, IP, ^& Shortcut ══════════════════════════

:: Cari psql
set PSQL=""
for %%p in (
    "C:\Program Files\PostgreSQL\17\bin\psql.exe"
    "C:\Program Files\PostgreSQL\16\bin\psql.exe"
    "C:\Program Files\PostgreSQL\15\bin\psql.exe"
) do (
    if exist %%p set PSQL=%%p
)
if %PSQL%=="" where psql >nul 2>&1 && set PSQL=psql

if not %PSQL%=="" (
    echo [>>] Membuat database billiard_db...
    set PGPASSWORD=1
    %PSQL% -U postgres -p 4538 -h 127.0.0.1 -c "CREATE DATABASE billiard_db;" 2>nul
    echo [OK] Database siap.
) else (
    echo [!] psql tidak ditemukan. Buat database manual: createdb billiard_db
)

:: Update IP
cd /d "%~dp0"
echo [>>] Update konfigurasi IP...
node update_ip.js
echo [OK] IP dikonfigurasi.

:: Desktop shortcut
set SHORTCUT=%USERPROFILE%\Desktop\VOC Billiard.lnk
powershell -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath='%~dp0DEPLOY.bat'; $s.WorkingDirectory='%~dp0'; $s.Description='VOC Billiard System'; $s.Save()" 2>nul
echo [OK] Shortcut "VOC Billiard" dibuat di Desktop.

:: ─────────────────────────────────────────────────────────────
:: SELESAI
:: ─────────────────────────────────────────────────────────────
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                  INSTALASI SELESAI! ✓                       ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                              ║
echo ║  SEBELUM menjalankan — pastikan edit file ini:              ║
echo ║   backend\.env  (DB_PASSWORD, APP_URL, FONNTE_TOKEN)        ║
echo ║                                                              ║
echo ║  Cara menjalankan:                                           ║
echo ║   Klik shortcut "VOC Billiard" di Desktop                   ║
echo ║   atau jalankan DEPLOY.bat                                  ║
echo ║                                                              ║
echo ║  Akses dari PC : http://localhost:3000                      ║
echo ║  Akses dari HP : http://[IP PC]:3000                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
endlocal
