@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: SELF-ELEVATION - Pastikan berjalan sebagai Administrator
:: ============================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Meminta hak Administrator...
    echo Klik YES pada popup UAC yang muncul.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"%~f0\" & pause' -Verb RunAs -Wait"
    exit /b 0
)

:: ============================================================
:: SUDAH ADMIN - mulai instalasi
:: ============================================================
chcp 437 >nul 2>&1
title VOC Billiard - Auto Installer v3.0
color 0A
cls

echo.
echo  ============================================================
echo    VOC BILLIARD MANAGEMENT SYSTEM
echo    Auto Installer v3.0 - Docker + GitHub PAT Edition
echo    Semua layanan diinstall otomatis dalam satu klik!
echo  ============================================================
echo.

set "INSTALL_DIR=%~dp0"
echo  Folder: %INSTALL_DIR%
echo.

:: ============================================================
:: BACA KONFIGURASI dari file .token
:: ============================================================
set "GITHUB_TOKEN="
set "GITHUB_USERNAME=tirta7"
set "FONNTE_TOKEN="
set "LOCATION_NAME="
set "TIMEZONE_ZONE=WIB"

if exist "%INSTALL_DIR%.token" (
    echo  [OK] File .token ditemukan. Membaca konfigurasi...
    for /f "usebackq tokens=1,* delims==" %%a in ("%INSTALL_DIR%.token") do (
        if /i "%%a"=="GITHUB_TOKEN"    set "GITHUB_TOKEN=%%b"
        if /i "%%a"=="GITHUB_USERNAME" set "GITHUB_USERNAME=%%b"
        if /i "%%a"=="FONNTE_TOKEN"    set "FONNTE_TOKEN=%%b"
        if /i "%%a"=="LOCATION_NAME"   set "LOCATION_NAME=%%b"
        if /i "%%a"=="TIMEZONE_ZONE"   set "TIMEZONE_ZONE=%%b"
    )
) else (
    echo  [!] File .token tidak ditemukan di folder ini.
    echo      Pastikan file .token ada di: %INSTALL_DIR%
    echo      Salin dari .token.example lalu rename menjadi .token
    echo      dan isi GITHUB_TOKEN serta LOCATION_NAME
    echo.
)

:: Minta token jika masih kosong
if "!GITHUB_TOKEN!"=="" (
    echo.
    echo  ============================================================
    echo   PERLU: GitHub Personal Access Token (Classic)
    echo   Buat di: https://github.com/settings/tokens/new
    echo   Centang scope: read:packages
    echo  ============================================================
    set /p "GITHUB_TOKEN=  Masukkan GitHub PAT Token: "
    echo.
)
if "!GITHUB_TOKEN!"=="" (
    echo  [ERROR] Token tidak boleh kosong. Instalasi dibatalkan.
    pause
    exit /b 1
)

:: Minta nama lokasi jika kosong
if "!LOCATION_NAME!"=="" (
    echo.
    set /p "LOCATION_NAME=  Masukkan Nama Lokasi (contoh: Ballistic Surabaya): "
    echo.
)
if "!LOCATION_NAME!"=="" set "LOCATION_NAME=Lokasi Baru"

:: Tentukan TZ
set "TZ_VALUE="
if /I "!TIMEZONE_ZONE!"=="WIB"  set "TZ_VALUE=Asia/Jakarta"
if /I "!TIMEZONE_ZONE!"=="WITA" set "TZ_VALUE=Asia/Makassar"
if /I "!TIMEZONE_ZONE!"=="WIT"  set "TZ_VALUE=Asia/Jayapura"
if "!TZ_VALUE!"=="" (
    echo.
    echo  PILIH ZONA WAKTU:
    echo  [1] WIB  - Jawa, Sumatera, Kalimantan Barat/Tengah
    echo  [2] WITA - Bali, NTB, NTT, Sulawesi, Kalimantan Timur
    echo  [3] WIT  - Maluku, Papua
    set /p "TIMEZONE_CHOICE=  Pilihan (1/2/3): "
    if "!TIMEZONE_CHOICE!"=="1" set "TZ_VALUE=Asia/Jakarta"
    if "!TIMEZONE_CHOICE!"=="2" set "TZ_VALUE=Asia/Makassar"
    if "!TIMEZONE_CHOICE!"=="3" set "TZ_VALUE=Asia/Jayapura"
    if "!TZ_VALUE!"=="" set "TZ_VALUE=Asia/Jakarta"
)

:: Deteksi IP LAN
for /f "delims=" %%i in ('powershell -NoProfile -Command "([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object {$_.AddressFamily -eq 'InterNetwork'} | Select-Object -First 1).IPAddressToString"') do set "SERVER_IP=%%i"
if "!SERVER_IP!"=="" set "SERVER_IP=localhost"

cd /d "!INSTALL_DIR!"

echo.
echo  Lokasi  : !LOCATION_NAME!
echo  Server  : http://!SERVER_IP!:3000
echo  TZ      : !TZ_VALUE!
echo.

:: Generate Machine ID
set "MACHINE_ID="
if exist "!INSTALL_DIR!.env" (
    for /f "tokens=2 delims==" %%v in ('findstr /i "MACHINE_ID=" "!INSTALL_DIR!.env" 2^>nul') do set "MACHINE_ID=%%v"
)
if "!MACHINE_ID!"=="" (
    echo  [..] Membuat Serial Number PC...
    for /f "delims=" %%m in ('powershell -NoProfile -Command "$mac=(Get-NetAdapter | Where-Object {$_.Status -eq ''Up''} | Select-Object -First 1).MacAddress -replace ''-'',''; $inp=$mac+$env:COMPUTERNAME; $bytes=[System.Text.Encoding]::UTF8.GetBytes($inp); $sha=[System.Security.Cryptography.SHA256]::Create(); $hash=$sha.ComputeHash($bytes); $hex=($hash | ForEach-Object {$_.ToString(''x2'')}) -join ''''; ''VOC-''+($hex.Substring(0,4)+$hex.Substring(8,4)).ToUpper()"') do set "MACHINE_ID=%%m"
    if "!MACHINE_ID!"=="" set "MACHINE_ID=VOC-%RANDOM%%RANDOM%"
    if exist "!INSTALL_DIR!.env" (
        echo MACHINE_ID=!MACHINE_ID!>> "!INSTALL_DIR!.env"
        echo LICENSE_KEY=>> "!INSTALL_DIR!.env"
    )
    echo  [OK] Serial Number: !MACHINE_ID!
) else (
    echo  [OK] Serial Number: !MACHINE_ID! (sudah ada)
)

echo.
echo ============================================================
echo  MEMULAI INSTALASI OTOMATIS...
echo  Harap tunggu, bisa 10-30 menit pertama kali.
echo ============================================================
echo.


:: ============================================================
:: [1/8] Cek Windows
:: ============================================================
echo [1/8] Mengecek sistem operasi...
ver | find "10." >nul 2>&1
if not errorlevel 1 goto WIN_OK
ver | find "11." >nul 2>&1
if not errorlevel 1 goto WIN_OK
echo  [ERROR] Windows 10 atau 11 diperlukan.
pause
exit /b 1
:WIN_OK
echo  [OK] Windows kompatibel.


:: ============================================================
:: [2/8] Install / Cek Docker Desktop
:: ============================================================
echo [2/8] Mengecek Docker Desktop...
docker --version >nul 2>&1
if not errorlevel 1 goto DOCKER_FOUND

echo  [!] Docker Desktop tidak ditemukan. Menginstall otomatis...
echo      Proses ini memakan waktu 5-15 menit...
echo.

where winget >nul 2>&1
if not errorlevel 1 (
    echo  Menginstall via winget...
    winget install -e --id Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements
    goto DOCKER_INSTALLED
)

echo  Mengunduh Docker Desktop installer...
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe' -OutFile '%TEMP%\DockerInstaller.exe'"
if not exist "%TEMP%\DockerInstaller.exe" (
    echo  [ERROR] Gagal mengunduh. Periksa koneksi internet.
    pause
    exit /b 1
)
echo  Menginstall Docker Desktop...
start /wait "" "%TEMP%\DockerInstaller.exe" install --quiet --accept-license
del /q "%TEMP%\DockerInstaller.exe" >nul 2>&1

:DOCKER_INSTALLED
echo.
echo  ============================================================
echo   Docker Desktop berhasil diinstall!
echo   WAJIB RESTART komputer sekarang,
echo   lalu jalankan INSTALL.bat kembali.
echo  ============================================================
echo.
pause
exit /b 0

:DOCKER_FOUND
echo  [OK] Docker Desktop ditemukan.


:: ============================================================
:: Pastikan Docker Engine berjalan
:: ============================================================
echo  [..] Memastikan Docker Engine aktif...
docker info >nul 2>&1
if not errorlevel 1 goto DOCKER_RUNNING

echo  [!] Docker Engine belum aktif. Membuka Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo  Menunggu Docker Engine siap (maks 120 detik)...

set "DOCKER_WAIT=0"
:WAIT_DOCKER
timeout /t 10 /nobreak >nul
set /a "DOCKER_WAIT+=10"
docker info >nul 2>&1
if not errorlevel 1 goto DOCKER_RUNNING
echo  [..] Menunggu Docker... (!DOCKER_WAIT! detik)
if !DOCKER_WAIT! LSS 120 goto WAIT_DOCKER

echo  [ERROR] Docker Engine tidak bisa berjalan.
echo  Solusi:
echo   1. Buka Docker Desktop dari Start Menu
echo   2. Tunggu ikon tray berwarna hijau
echo   3. Jalankan INSTALL.bat kembali
pause
exit /b 1

:DOCKER_RUNNING
echo  [OK] Docker Engine berjalan.


:: ============================================================
:: [3/8] Login ke GitHub Container Registry
:: ============================================================
echo [3/8] Login ke GitHub Container Registry (ghcr.io)...
echo !GITHUB_TOKEN! | docker login ghcr.io -u !GITHUB_USERNAME! --password-stdin
if errorlevel 1 (
    echo.
    echo  [ERROR] Gagal login ke ghcr.io!
    echo  Pastikan:
    echo   1. Token belum expired
    echo   2. Token punya scope: read:packages
    echo   3. Username: !GITHUB_USERNAME!
    echo.
    echo  Cara buat token baru:
    echo   Buka https://github.com/settings/tokens/new
    echo   Pilih Classic, centang read:packages
    echo.
    pause
    exit /b 1
)
echo  [OK] Login berhasil ke ghcr.io


:: ============================================================
:: [4/8] Pastikan mosquitto.conf ada
:: ============================================================
echo [4/8] Mempersiapkan MQTT Broker...
if not exist "!INSTALL_DIR!mosquitto.conf" (
    echo  [!] mosquitto.conf tidak ada, membuat otomatis...
    (
        echo # Mosquitto MQTT Broker Configuration
        echo log_type all
        echo log_dest stdout
        echo listener 1883 0.0.0.0
        echo socket_domain ipv4
        echo allow_anonymous true
        echo listener 8083 0.0.0.0
        echo protocol websockets
        echo allow_anonymous true
        echo max_connections -1
        echo set_tcp_nodelay true
        echo persistence false
    ) > "!INSTALL_DIR!mosquitto.conf"
)
echo  [OK] MQTT Broker siap.


:: ============================================================
:: [5/8] Buat / Update file .env
:: ============================================================
echo [5/8] Membuat file konfigurasi (.env)...

if exist "!INSTALL_DIR!.env" goto UPDATE_ENV

set "DB_PASS=voc!RANDOM!!RANDOM!"
(
    echo # VOC Billiard Config - !LOCATION_NAME!
    echo DB_USERNAME=postgres
    echo DB_PASSWORD=!DB_PASS!
    echo DB_DATABASE=billiard_db
    echo SERVER_IP=!SERVER_IP!
    echo FONNTE_TOKEN=!FONNTE_TOKEN!
    echo GITHUB_TOKEN=!GITHUB_TOKEN!
    echo LOCATION_NAME=!LOCATION_NAME!
    echo LOCATION_ID=LOC_%COMPUTERNAME%
    echo TZ=!TZ_VALUE!
    echo GAS_WEBAPP_URL=
    echo GAS_SECRET=
    echo MACHINE_ID=!MACHINE_ID!
    echo LICENSE_KEY=
) > "!INSTALL_DIR!.env"
echo  [OK] File .env dibuat (IP: !SERVER_IP! / TZ: !TZ_VALUE!)
goto END_ENV

:UPDATE_ENV
powershell -NoProfile -Command "$c=Get-Content '!INSTALL_DIR!.env'; $c=$c -replace 'SERVER_IP=.*','SERVER_IP=!SERVER_IP!'; $c=$c -replace '^TZ=.*','TZ=!TZ_VALUE!'; $c | Set-Content '!INSTALL_DIR!.env'"
echo  [OK] Konfigurasi diperbarui (IP: !SERVER_IP! / TZ: !TZ_VALUE!)

:END_ENV


:: ============================================================
:: [6/8] Pull Docker images (Auto-Retry 5x)
:: ============================================================
echo [6/8] Mengunduh semua komponen dari cloud...
echo  (PostgreSQL + Redis + MQTT + Backend + Frontend)
echo  Pertama kali bisa 10-25 menit tergantung internet...
echo.

set "TRY_COUNT=0"
:PULL_LOOP
set /a "TRY_COUNT+=1"
echo  [PULL] Percobaan !TRY_COUNT! dari 5...
docker compose -f "!INSTALL_DIR!docker-compose.yml" pull
if not errorlevel 1 (
    echo  [OK] Semua komponen berhasil diunduh!
    goto START_SERVICES
)

if !TRY_COUNT! LSS 5 (
    echo  [!] Jaringan error, menunggu 15 detik lalu coba lagi...
    timeout /t 15 /nobreak >nul
    goto PULL_LOOP
)

echo.
echo  ======================================================
echo   [ERROR] GAGAL MENGUNDUH SETELAH 5x PERCOBAAN
echo  ======================================================
echo.
echo   Kemungkinan penyebab:
echo   1. Koneksi internet tidak stabil
echo   2. GitHub Token salah atau expired
echo   3. Image belum di-push ke ghcr.io/tirta7
echo.
echo   Solusi:
echo   1. Periksa koneksi internet
echo   2. Update file .token dengan token baru
echo   3. Jalankan INSTALL.bat kembali
echo.
pause
exit /b 1

:START_SERVICES


:: ============================================================
:: [7/8] Jalankan semua layanan
:: ============================================================
echo [7/8] Menjalankan semua layanan...
docker compose -f "!INSTALL_DIR!docker-compose.yml" --env-file "!INSTALL_DIR!.env" up -d
if errorlevel 1 (
    echo.
    echo  [ERROR] Gagal menjalankan layanan!
    echo  Lihat detail: docker compose logs
    echo.
    pause
    exit /b 1
)
echo  [OK] Semua layanan aktif:
echo       - PostgreSQL (database)
echo       - Redis (cache)
echo       - Mosquitto (MQTT broker)
echo       - Backend NestJS
echo       - Frontend Next.js


:: ============================================================
:: [8/8] Health Check
:: ============================================================
echo [8/8] Menunggu aplikasi siap (maks 2 menit)...

set "HEALTH_WAIT=0"
:HEALTH_LOOP
timeout /t 10 /nobreak >nul
set /a "HEALTH_WAIT+=10"
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 5 -UseBasicParsing | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto APP_READY
echo  [..] Masih loading... (!HEALTH_WAIT! detik)
if !HEALTH_WAIT! LSS 120 goto HEALTH_LOOP
echo  [!] Aplikasi belum merespons, tapi mungkin masih warming up.

:APP_READY

:: Buat shortcut di Desktop
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\VOC Billiard.lnk'); $s.TargetPath='http://localhost:3000'; $s.Description='VOC Billiard Management System'; $s.Save()" >nul 2>&1
echo  [OK] Shortcut VOC Billiard dibuat di Desktop.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\STOP VOC Billiard.lnk'); $s.TargetPath='!INSTALL_DIR!STOP.bat'; $s.Description='Stop VOC Billiard'; $s.Save()" >nul 2>&1
echo  [OK] Shortcut STOP VOC Billiard dibuat di Desktop.


:: ============================================================
:: SELESAI!
:: ============================================================
cls
echo.
echo  ============================================================
echo    INSTALASI SELESAI!  VOC BILLIARD SIAP DIGUNAKAN
echo  ============================================================
echo.
echo    Layanan aktif:
echo      PostgreSQL  (database)    port 5432
echo      Redis       (cache)       port 6379
echo      Mosquitto   (MQTT)        port 1883 / 8083
echo      Backend     (NestJS API)  http://localhost:4000
echo      Frontend    (Next.js)     http://localhost:3000
echo.
echo  ============================================================
echo    Akses Aplikasi:
echo    Browser PC ini  : http://localhost:3000
echo    Akses dari HP   : http://!SERVER_IP!:3000
echo    Halaman Kasir   : http://!SERVER_IP!:3000/billing
echo    Akses Online    : https://asus.vocbilliard.online
echo  ============================================================
echo.
echo    Lokasi    : !LOCATION_NAME!
echo    Serial PC : !MACHINE_ID!
echo.
echo  ============================================================
echo.
echo  Tekan sembarang tombol untuk membuka aplikasi di browser...
pause >nul

start http://localhost:3000
endlocal
