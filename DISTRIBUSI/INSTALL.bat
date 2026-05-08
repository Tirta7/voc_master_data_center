@echo off
setlocal enabledelayedexpansion
title VOC Billiard System - Installer v3.1
color 0A

:: VOC BILLIARD SYSTEM - AUTO INSTALLER v3.1
:: Support WIB / WITA / WIT

echo.
echo =====================================================
echo   VOC BILLIARD SYSTEM - AUTO INSTALLER v3.1
echo   Support WIB / WITA / WIT
echo =====================================================
echo   Yang akan diinstall:
echo    Node.js, PostgreSQL, Redis, Mosquitto, PM2
echo    Build + Auto-start saat Windows boot
echo =====================================================
echo.

:: Cek Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] HARUS dijalankan sebagai ADMINISTRATOR!
    echo     Klik kanan INSTALL.bat - Run as administrator
    pause & exit /b 1
)
echo [OK] Mode Administrator aktif.

set INSTALL_DIR=%~dp0
set BACKEND_DIR=%INSTALL_DIR%backend
set FRONTEND_DIR=%INSTALL_DIR%frontend
if not exist "%INSTALL_DIR%logs" mkdir "%INSTALL_DIR%logs"

:: ─────────────────────────────────────────
:: [A] PILIH ZONA WAKTU
:: ─────────────────────────────────────────
echo.
echo =====================================================
echo   PILIH ZONA WAKTU LOKASI INI
echo =====================================================
echo.
echo   [1] WIB  - Waktu Indonesia Barat  (UTC+7)
echo       Contoh: Jakarta, Bandung, Surabaya, Medan,
echo               Palembang, Pekanbaru, Pontianak
echo.
echo   [2] WITA - Waktu Indonesia Tengah (UTC+8)
echo       Contoh: Bali, Lombok, Makassar, Balikpapan,
echo               Banjarmasin, Kupang, Mataram
echo.
echo   [3] WIT  - Waktu Indonesia Timur  (UTC+9)
echo       Contoh: Ambon, Jayapura, Sorong, Timika,
echo               Manokwari, Ternate
echo.
set /p TZ_PILIH="  Pilihan zona waktu (1/2/3): "

if "%TZ_PILIH%"=="1" (
    set TZ=Asia/Jakarta
    set TZ_NAME=WIB (UTC+7)
    set TZ_WINDOWS=SE Asia Standard Time
)
if "%TZ_PILIH%"=="2" (
    set TZ=Asia/Makassar
    set TZ_NAME=WITA (UTC+8)
    set TZ_WINDOWS=Singapore Standard Time
)
if "%TZ_PILIH%"=="3" (
    set TZ=Asia/Jayapura
    set TZ_NAME=WIT (UTC+9)
    set TZ_WINDOWS=Tokyo Standard Time
)
if not defined TZ (
    set TZ=Asia/Jakarta
    set TZ_NAME=WIB (UTC+7) - default
    set TZ_WINDOWS=SE Asia Standard Time
)

echo [OK] Zona waktu: %TZ_NAME%
tzutil /s "%TZ_WINDOWS%" >nul 2>&1
echo [OK] Timezone Windows diset ke %TZ_WINDOWS%.

:: ─────────────────────────────────────────
:: [B] DETEKSI IP OTOMATIS
:: ─────────────────────────────────────────
echo.
echo --- Deteksi IP Jaringan ---
set SERVER_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "169.254"') do (
    set "RAW=%%a" & set "RAW=!RAW: =!"
    if not defined SERVER_IP if not "!RAW!"=="" set SERVER_IP=!RAW!
)
if not defined SERVER_IP set SERVER_IP=127.0.0.1
echo [OK] IP terdeteksi: %SERVER_IP%
set /p IP_IN="  Konfirmasi IP (Enter = pakai %SERVER_IP%, atau ketik IP baru): "
if not "!IP_IN!"=="" set SERVER_IP=!IP_IN!
echo [OK] IP Server: %SERVER_IP%

:: ─────────────────────────────────────────
:: [C] NAMA LOKASI & PASSWORD
:: ─────────────────────────────────────────
echo.
set /p LOKASI_NAMA="  Nama tempat billiard ini (contoh: Billiard Central Makassar): "
if "!LOKASI_NAMA!"=="" set LOKASI_NAMA=VOC Billiard
set /p PG_PASS="  Password database (Enter untuk pakai default: VocBilliard2024!): "
if "!PG_PASS!"=="" set PG_PASS=VocBilliard2024!

echo.
echo =====================================================
echo   Konfigurasi yang akan diterapkan:
echo    Nama  : %LOKASI_NAMA%
echo    Zona  : %TZ_NAME%
echo    IP    : %SERVER_IP%
echo =====================================================
echo.
pause

:: ─────────────────────────────────────────
:: STEP 1 - NODE.JS
:: ─────────────────────────────────────────
echo.
echo [1/8] Memeriksa Node.js...
node --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f %%i in ('node --version') do echo [OK] Node.js %%i sudah ada.
) else (
    echo [>>] Menginstall Node.js LTS via winget...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    if !errorLevel! neq 0 (
        echo [!] Gagal. Download manual: https://nodejs.org (pilih LTS)
        echo     Setelah install, jalankan INSTALL.bat lagi.
        pause & exit /b 1
    )
    set "PATH=%PATH%;C:\Program Files\nodejs"
    echo [OK] Node.js berhasil diinstall.
)

:: ─────────────────────────────────────────
:: STEP 2 - POSTGRESQL
:: ─────────────────────────────────────────
echo.
echo [2/8] Memeriksa PostgreSQL...
set PG_FOUND=0
set PG_PORT=4538
set PSQL_PATH=

for %%v in (17 16 15 14 13) do (
    if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
        if not defined PSQL_PATH (
            set "PSQL_PATH=C:\Program Files\PostgreSQL\%%v\bin"
            set PG_FOUND=1
            echo [OK] PostgreSQL %%v ditemukan.
        )
    )
)

if %PG_FOUND%==0 (
    echo [>>] Menginstall PostgreSQL via winget...
    winget install PostgreSQL.PostgreSQL --silent --accept-package-agreements --accept-source-agreements
    if !errorLevel! neq 0 (
        echo [!] Gagal. Download: https://www.postgresql.org/download/windows/
        echo     Gunakan port 4538 saat install.
        pause & exit /b 1
    )
    for %%v in (17 16 15 14 13) do (
        if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
            if not defined PSQL_PATH set "PSQL_PATH=C:\Program Files\PostgreSQL\%%v\bin"
        )
    )
    echo [OK] PostgreSQL berhasil diinstall.
)

if defined PSQL_PATH set "PATH=%PATH%;%PSQL_PATH%"

:: Cari port PostgreSQL aktif
set PGPASSWORD=1
for %%p in (4538 5432 5433) do (
    if defined PSQL_PATH (
        "%PSQL_PATH%\psql.exe" -U postgres -p %%p -h 127.0.0.1 -c "SELECT 1;" >nul 2>&1
        if !errorLevel! equ 0 (
            set PG_PORT=%%p
            echo [OK] PostgreSQL aktif di port !PG_PORT!
        )
    )
)

:: Buat database dan set password
if defined PSQL_PATH (
    set PGPASSWORD=1
    "%PSQL_PATH%\psql.exe" -U postgres -p %PG_PORT% -h 127.0.0.1 -c "CREATE DATABASE billiard_db;" >nul 2>&1
    "%PSQL_PATH%\psql.exe" -U postgres -p %PG_PORT% -h 127.0.0.1 -c "ALTER USER postgres WITH PASSWORD '%PG_PASS%';" >nul 2>&1
    echo [OK] Database billiard_db siap.
)

:: ─────────────────────────────────────────
:: STEP 3 - MOSQUITTO
:: ─────────────────────────────────────────
echo.
echo [3/8] Memeriksa Mosquitto MQTT...
where mosquitto >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Mosquitto sudah ada.
) else (
    echo [>>] Menginstall Mosquitto...
    winget install EclipseFoundation.Mosquitto --silent --accept-package-agreements --accept-source-agreements
    if !errorLevel! neq 0 (
        echo [!] Install manual: https://mosquitto.org/download/
    ) else (
        echo [OK] Mosquitto diinstall.
    )
)
if exist "%INSTALL_DIR%mosquitto.conf" (
    copy "%INSTALL_DIR%mosquitto.conf" "C:\Program Files\mosquitto\mosquitto.conf" >nul 2>&1
    echo [OK] Konfigurasi Mosquitto diterapkan.
)
net stop mosquitto >nul 2>&1
timeout /t 2 /nobreak >nul
"C:\Program Files\mosquitto\mosquitto.exe" install >nul 2>&1
net start mosquitto >nul 2>&1
echo [OK] Mosquitto service berjalan.

:: ─────────────────────────────────────────
:: STEP 4 - REDIS
:: ─────────────────────────────────────────
echo.
echo [4/8] Memeriksa Redis...
sc query Redis >nul 2>&1
if %errorLevel% equ 0 (
    net start Redis >nul 2>&1
    echo [OK] Redis sudah ada.
) else (
    echo [>>] Menginstall Redis (Memurai)...
    winget install Memurai.Memurai --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    if !errorLevel! neq 0 (
        winget install tporadowski.redis --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    )
    net start Redis >nul 2>&1
    echo [OK] Redis diinstall.
)

:: ─────────────────────────────────────────
:: STEP 5 - PM2
:: ─────────────────────────────────────────
echo.
echo [5/8] Memeriksa PM2...
pm2 --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f %%i in ('pm2 --version') do echo [OK] PM2 v%%i sudah ada.
) else (
    echo [>>] Menginstall PM2...
    call npm install -g pm2
    if !errorLevel! neq 0 (
        echo [ERROR] PM2 gagal diinstall.
        pause & exit /b 1
    )
    echo [OK] PM2 diinstall.
)

:: ─────────────────────────────────────────
:: STEP 6 - FILE .ENV
:: ─────────────────────────────────────────
echo.
echo [6/8] Membuat file konfigurasi .env...

(
    echo DB_HOST=127.0.0.1
    echo DB_PORT=%PG_PORT%
    echo DB_USERNAME=postgres
    echo DB_PASSWORD=%PG_PASS%
    echo DB_DATABASE=billiard_db
    echo REDIS_HOST=localhost
    echo REDIS_PORT=6379
    echo MQTT_URL=mqtt://localhost:1883
    echo MQTT_HOST=localhost
    echo MQTT_PORT=1883
    echo MQTT_CLIENT_ID=billiard_server
    echo PORT=4000
    echo APP_URL=http://%SERVER_IP%:4000
    echo NODE_ENV=production
    echo TZ=%TZ%
    echo LOCATION_NAME=%LOKASI_NAMA%
    echo FONNTE_TOKEN=
) > "%BACKEND_DIR%\.env"
echo [OK] backend\.env dibuat (TZ=%TZ%).

(
    echo NEXT_PUBLIC_API_URL=http://%SERVER_IP%:4000
    echo NEXT_PUBLIC_MQTT_URL=ws://%SERVER_IP%:8083
) > "%FRONTEND_DIR%\.env.local"
echo [OK] frontend\.env.local dibuat.

:: ─────────────────────────────────────────
:: STEP 7 - BUILD (atau skip jika sudah ada)
:: ─────────────────────────────────────────
echo.
echo [7/8] Persiapan aplikasi...

:: Backend
if exist "%BACKEND_DIR%\dist\main.js" (
    echo [OK] Backend sudah compiled. Install deps saja...
    cd /d "%BACKEND_DIR%"
    call npm install --omit=dev --prefer-offline --legacy-peer-deps 2>nul || call npm install --omit=dev --legacy-peer-deps
) else (
    echo [>>] Build backend dari source (5-10 menit)...
    cd /d "%BACKEND_DIR%"
    call npm install --prefer-offline --legacy-peer-deps 2>nul || call npm install --legacy-peer-deps
    call npm run build
    if !errorLevel! neq 0 (
        echo [ERROR] Build backend gagal!
        pause & exit /b 1
    )
)
echo [OK] Backend siap.

:: Frontend
if exist "%FRONTEND_DIR%\.next\server" (
    echo [OK] Frontend sudah compiled. Install deps saja...
    cd /d "%FRONTEND_DIR%"
    call npm install --omit=dev --prefer-offline --legacy-peer-deps 2>nul || call npm install --omit=dev --legacy-peer-deps
) else (
    echo [>>] Build frontend dari source (5-10 menit)...
    cd /d "%FRONTEND_DIR%"
    if exist ".next" rmdir /s /q ".next"
    call npm install --prefer-offline --legacy-peer-deps 2>nul || call npm install --legacy-peer-deps
    call npm run build
    if !errorLevel! neq 0 (
        echo [ERROR] Build frontend gagal!
        pause & exit /b 1
    )
)
echo [OK] Frontend siap.

:: ─────────────────────────────────────────
:: STEP 8 - JALANKAN + AUTO-START
:: ─────────────────────────────────────────
echo.
echo [8/8] Menjalankan aplikasi dan setup auto-start...

cd /d "%INSTALL_DIR%"
pm2 delete all >nul 2>&1
pm2 start ecosystem.config.js
pm2 save

:: Buat script autostart
set AUTOSTART_BAT=%INSTALL_DIR%_autostart.bat
(
    echo @echo off
    echo timeout /t 20 /nobreak ^>nul
    echo net start mosquitto ^>nul 2^>^&1
    echo net start Redis ^>nul 2^>^&1
    echo for %%%%v in ^(17 16 15 14 13^) do net start postgresql-x64-%%%%v ^>nul 2^>^&1
    echo cd /d "%INSTALL_DIR%"
    echo pm2 resurrect
) > "%AUTOSTART_BAT%"

:: Daftar ke Task Scheduler
schtasks /delete /tn "VOC Billiard Autostart" /f >nul 2>&1
schtasks /create /tn "VOC Billiard Autostart" /tr "%AUTOSTART_BAT%" /sc onlogon /ru "%USERNAME%" /rl highest /f >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Auto-start dikonfigurasi via Task Scheduler.
) else (
    set "SF=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
    copy "%AUTOSTART_BAT%" "!SF!\VOC_Billiard.bat" >nul 2>&1
    echo [OK] Auto-start dikonfigurasi via Startup Folder.
)

:: Shortcut Desktop
set DESKTOP=%USERPROFILE%\Desktop
powershell -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%DESKTOP%\VOC Billiard - START.lnk'); $s.TargetPath='%INSTALL_DIR%DEPLOY.bat'; $s.WorkingDirectory='%INSTALL_DIR%'; $s.Save()" >nul 2>&1
powershell -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%DESKTOP%\Buka Aplikasi Billiard.lnk'); $s.TargetPath='http://localhost:3001'; $s.Save()" >nul 2>&1
echo [OK] Shortcut dibuat di Desktop.

timeout /t 20 /nobreak >nul

:: ─────────────────────────────────────────
:: SELESAI
:: ─────────────────────────────────────────
echo.
echo =====================================================
echo   INSTALASI BERHASIL!
echo =====================================================
echo   Lokasi  : %LOKASI_NAMA%
echo   Zona    : %TZ_NAME%
echo.
echo   Akses Aplikasi:
echo    PC Server  - http://localhost:3001
echo    HP / PC    - http://%SERVER_IP%:3001
echo.
echo   Untuk HP Waiter:
echo    1. Sambungkan HP ke WiFi yang sama
echo    2. Buka Chrome - http://%SERVER_IP%:3001
echo    3. Menu titik tiga - Add to Home Screen
echo.
echo   Shortcut di Desktop:
echo    "VOC Billiard - START"   - mulai layanan
echo    "Buka Aplikasi Billiard" - buka browser
echo.
echo   Aplikasi otomatis berjalan saat PC dinyalakan!
echo =====================================================
echo.

timeout /t 5 /nobreak >nul
start http://localhost:3001
pm2 list
echo.
pause
endlocal
