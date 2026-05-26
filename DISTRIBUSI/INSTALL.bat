@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title VOC Billiard - Auto Installer
color 0A
cls

echo.
echo  ============================================================
echo    VOC BILLIARD MANAGEMENT SYSTEM
echo    Auto Installer v2.0 ^(Docker Edition^)
echo  ============================================================
echo.

:: ==============================================================
:: KONFIGURASI - Teknisi isi bagian ini sebelum ke lokasi client
:: ==============================================================
set LOCATION_NAME=DD Surabaya
set GITHUB_TOKEN=
set FONNTE_TOKEN=
:: ZONA WAKTU: pilih salah satu → WIB / WITA / WIT
set TIMEZONE_ZONE=WIB
:: ==============================================================

:: ---- Tentukan string TZ berdasarkan TIMEZONE_ZONE ----
if /I "%TIMEZONE_ZONE%"=="WIB"  set TZ_VALUE=Asia/Jakarta
if /I "%TIMEZONE_ZONE%"=="WITA" set TZ_VALUE=Asia/Makassar
if /I "%TIMEZONE_ZONE%"=="WIT"  set TZ_VALUE=Asia/Jayapura
if not defined TZ_VALUE (
    echo.
    echo  ============================================================
    echo   PILIH ZONA WAKTU LOKASI INI:
    echo   [1] WIB  - Jawa, Sumatera, Kalimantan Barat/Tengah
    echo   [2] WITA - Bali, NTB, NTT, Sulawesi, Kalimantan Timur
    echo   [3] WIT  - Maluku, Papua
    echo  ============================================================
    set /p TIMEZONE_CHOICE=  Masukkan pilihan (1/2/3): 
    if "!TIMEZONE_CHOICE!"=="1" set TZ_VALUE=Asia/Jakarta
    if "!TIMEZONE_CHOICE!"=="2" set TZ_VALUE=Asia/Makassar
    if "!TIMEZONE_CHOICE!"=="3" set TZ_VALUE=Asia/Jayapura
    if not defined TZ_VALUE (
        echo  [!] Pilihan tidak valid. Default ke WIB (Asia/Jakarta).
        set TZ_VALUE=Asia/Jakarta
    )
)
echo  [OK] Zona Waktu: %TIMEZONE_ZONE% ^(%TZ_VALUE%^)


set INSTALL_DIR=%~dp0
cd /d "%INSTALL_DIR%"

:: ---- Deteksi IP LAN dengan PowerShell (lebih aman dari batch) ----
for /f "delims=" %%i in ('powershell -NoProfile -Command "([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object {$_.AddressFamily -eq 'InterNetwork'} | Select-Object -First 1).IPAddressToString"') do set SERVER_IP=%%i
if not defined SERVER_IP set SERVER_IP=localhost

:: ---- Generate Machine ID unik dari MAC Address + Hostname ----
findstr /i "MACHINE_ID=" .env >nul 2>&1
if not errorlevel 1 goto MACHINE_ID_EXISTS

echo  [..] Membuat Serial Number unik untuk PC ini...
for /f "delims=" %%m in ('powershell -NoProfile -Command "$mac=(Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | Select-Object -First 1).MacAddress -replace '-',''; $input=$mac+$env:COMPUTERNAME; $bytes=[System.Text.Encoding]::UTF8.GetBytes($input); $sha=[System.Security.Cryptography.SHA256]::Create(); $hash=$sha.ComputeHash($bytes); $hex=($hash | ForEach-Object {$_.ToString('x2')}) -join ''; 'VOC-'+($hex.Substring(0,4)+$hex.Substring(8,4)).ToUpper()"') do set MACHINE_ID=%%m

if not defined MACHINE_ID set MACHINE_ID=VOC-%RANDOM%%RANDOM%

echo MACHINE_ID=!MACHINE_ID! >> .env
echo LICENSE_KEY= >> .env
echo  [OK] Serial Number PC: !MACHINE_ID!
goto MACHINE_ID_DONE

:MACHINE_ID_EXISTS
for /f "tokens=2 delims==" %%v in ('findstr /i "MACHINE_ID=" .env') do set MACHINE_ID=%%v
echo  [OK] Serial Number PC: !MACHINE_ID! (sudah ada)

:MACHINE_ID_DONE


:: ---- Minta GitHub Token jika belum diisi ----
if not "%GITHUB_TOKEN%"=="" goto TOKEN_OK
echo.
echo  ============================================================
echo   PERLU: GitHub Token untuk mengunduh aplikasi
echo   Hubungi teknisi VOC untuk mendapatkan token.
echo  ============================================================
set /p GITHUB_TOKEN=  Masukkan GitHub Token: 
echo.

:TOKEN_OK
if "%GITHUB_TOKEN%"=="" (
    echo  [ERROR] Token tidak boleh kosong. Instalasi dibatalkan.
    pause
    exit /b 1
)

echo  Lokasi : %LOCATION_NAME%
echo  Server  : http://%SERVER_IP%:3000
echo  Folder  : %INSTALL_DIR%
echo.

:: ---------------------------------------------------------------
:: LANGKAH 1: Cek Windows Version
:: ---------------------------------------------------------------
echo [1/7] Mengecek sistem...
ver | find "10." >nul 2>&1
if not errorlevel 1 goto WIN_OK
ver | find "11." >nul 2>&1
if not errorlevel 1 goto WIN_OK
echo  [!] Windows 10 atau 11 diperlukan.
pause
exit /b 1

:WIN_OK
echo  [OK] Windows OK

:: ---------------------------------------------------------------
:: LANGKAH 2: Cek Docker Desktop
:: ---------------------------------------------------------------
echo [2/7] Mengecek Docker Desktop...
docker --version >nul 2>&1
if not errorlevel 1 goto DOCKER_VERSION_OK

echo  [!] Docker Desktop tidak ditemukan. Menginstall otomatis...
echo      Ini mungkin memakan waktu 5-10 menit...
echo.

where winget >nul 2>&1
if not errorlevel 1 goto DOCKER_VIA_WINGET

:: Unduh via PowerShell
echo  Mengunduh Docker Desktop installer...
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe' -OutFile 'DockerInstaller.exe'"
if not exist "DockerInstaller.exe" goto DOCKER_DOWNLOAD_FAIL
echo  Menginstall Docker Desktop ^(harap tunggu^)...
start /wait "" "DockerInstaller.exe" install --quiet --accept-license
del /q DockerInstaller.exe >nul 2>&1
goto DOCKER_INSTALLED

:DOCKER_VIA_WINGET
echo  Menginstall Docker Desktop via winget...
winget install -e --id Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements
goto DOCKER_INSTALLED

:DOCKER_DOWNLOAD_FAIL
echo  [ERROR] Gagal mengunduh Docker Desktop. Periksa koneksi internet.
pause
exit /b 1

:DOCKER_INSTALLED
echo.
echo  ============================================================
echo    Docker Desktop berhasil diinstall!
echo    RESTART komputer terlebih dahulu,
echo    lalu jalankan INSTALL.bat ini kembali.
echo  ============================================================
pause
exit /b 0

:DOCKER_VERSION_OK
echo  [OK] Docker ditemukan.

:: ---------------------------------------------------------------
:: Pastikan Docker Engine berjalan
:: ---------------------------------------------------------------
docker info >nul 2>&1
if not errorlevel 1 goto DOCKER_RUNNING

echo  [!] Docker Engine belum aktif. Membuka Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo  Menunggu Docker Engine siap ^(60 detik^)...
timeout /t 60 /nobreak >nul

docker info >nul 2>&1
if not errorlevel 1 goto DOCKER_RUNNING

echo  [ERROR] Docker Engine gagal berjalan setelah 60 detik.
echo  Buka Docker Desktop secara manual, tunggu ikon tray berwarna hijau,
echo  lalu jalankan INSTALL.bat kembali.
pause
exit /b 1

:DOCKER_RUNNING
echo  [OK] Docker Engine berjalan.

:: ---------------------------------------------------------------
:: LANGKAH 3: Login ke GitHub Container Registry
:: ---------------------------------------------------------------
echo [3/7] Login ke registry...
echo %GITHUB_TOKEN% | docker login ghcr.io -u tirta7 --password-stdin
if errorlevel 1 (
    echo.
    echo  [ERROR] Gagal login ke registry!
    echo  Pastikan token belum expired dan masih aktif.
    echo  Hubungi teknisi VOC untuk token baru.
    pause
    exit /b 1
)
echo  [OK] Login berhasil.

:: ---------------------------------------------------------------
:: LANGKAH 4: Buat / Update file .env
:: ---------------------------------------------------------------
echo [4/7] Membuat konfigurasi...
if exist ".env" goto UPDATE_ENV

echo # VOC Billiard Config - %LOCATION_NAME%> .env
echo DB_USERNAME=postgres>> .env
echo DB_PASSWORD=voc%RANDOM%%RANDOM%>> .env
echo DB_DATABASE=billiard_db>> .env
echo SERVER_IP=%SERVER_IP%>> .env
echo FONNTE_TOKEN=%FONNTE_TOKEN%>> .env
echo GITHUB_TOKEN=%GITHUB_TOKEN%>> .env
echo TZ=%TZ_VALUE%>> .env
echo  [OK] File konfigurasi dibuat ^(IP: %SERVER_IP%  TZ: %TZ_VALUE%^)
goto END_ENV

:UPDATE_ENV
powershell -NoProfile -Command "(Get-Content '.env') -replace 'SERVER_IP=.*', 'SERVER_IP=%SERVER_IP%' -replace 'TZ=.*', 'TZ=%TZ_VALUE%' | Set-Content '.env'"
findstr /I "GITHUB_TOKEN" .env >nul 2>&1
if errorlevel 1 (
    echo GITHUB_TOKEN=%GITHUB_TOKEN%>> .env
)
findstr /I "^TZ=" .env >nul 2>&1
if errorlevel 1 (
    echo TZ=%TZ_VALUE%>> .env
)
echo  [OK] Konfigurasi diperbarui ^(IP: %SERVER_IP%  TZ: %TZ_VALUE%^)

:END_ENV

:: ---------------------------------------------------------------
:: LANGKAH 5: Download Docker images dari registry (dengan Auto-Retry)
:: ---------------------------------------------------------------
echo [5/7] Mengunduh aplikasi dari server...
echo  Ini bisa memakan waktu 10-20 menit ^(pertama kali^)...
echo.

set TRY_COUNT=1
:PULL_LOOP
echo  [PULL] Mencoba mengunduh komponen aplikasi (Percobaan !TRY_COUNT!/5)...
docker compose pull
if not errorlevel 1 (
    echo  [OK] Semua komponen berhasil diunduh dari cloud.
    goto START_SERVICES
)

:: Jika gagal pull, hitung retry
set /a TRY_COUNT+=1
if !TRY_COUNT! LEQ 5 (
    echo  [!] Terjadi kesalahan jaringan transient ^(misal: TLS bad record MAC atau Connection Reset^).
    echo      Menunggu 5 detik sebelum mencoba mengunduh kembali...
    timeout /t 5 /nobreak >nul
    goto PULL_LOOP
)

:: Jika 5x percobaan pull tetap gagal, masuk ke penanganan fallback
goto CHECK_FALLBACK_MODE

:CHECK_FALLBACK_MODE
echo.
echo  ======================================================================
echo   [ERROR] GAGAL MENGUNDUH APLIKASI DARI CLOUD REGISTRY!
echo  ======================================================================
echo.
echo   Kemungkinan Penyebab:
echo   1. Koneksi internet tidak stabil atau terputus.
echo   2. GitHub Token yang dimasukkan salah atau sudah kadaluarsa (Expired).
echo   3. Server registry sedang dalam pemeliharaan.
echo.
echo   Solusi Tindakan:
echo   1. Periksa koneksi internet Anda dan pastikan lancar.
echo   2. Hubungi Teknisi VOC untuk memastikan GitHub Token Anda valid.
echo   3. Jalankan kembali file INSTALL.bat ini jika koneksi sudah stabil.
echo.
echo   CATATAN: Instalasi offline tidak tersedia di PC ini.
echo            Aplikasi hanya dapat diinstall melalui koneksi internet.
echo  ======================================================================
echo.
pause
exit /b 1

:START_SERVICES


:: ---------------------------------------------------------------
:: LANGKAH 6: Jalankan semua layanan
:: ---------------------------------------------------------------
echo [6/7] Menjalankan layanan...
docker compose up -d
if errorlevel 1 (
    echo.
    echo  [ERROR] Gagal menjalankan layanan!
    echo  Jalankan: docker compose logs untuk melihat detail error.
    pause
    exit /b 1
)
echo  [OK] Semua layanan aktif.

:: ---------------------------------------------------------------
:: LANGKAH 7: Tunggu hingga aplikasi siap
:: ---------------------------------------------------------------
echo [7/7] Menunggu aplikasi siap ^(30 detik^)...
timeout /t 30 /nobreak >nul

powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 10 | Out-Null } catch { Write-Host 'masih loading' }" >nul 2>&1
if errorlevel 1 (
    echo  [i] Aplikasi masih warming up, tunggu 30 detik lagi...
    timeout /t 30 /nobreak >nul
)

:: ---------------------------------------------------------------
:: SELESAI
:: ---------------------------------------------------------------
cls
echo.
echo  ============================================================
echo    INSTALASI SELESAI! - VOC BILLIARD SIAP DIGUNAKAN
echo  ============================================================
echo.
echo    Aplikasi Admin   : http://localhost:3000
echo    Aplikasi Kasir   : http://localhost:3000/billing
echo    Akses dari HP    : http://%SERVER_IP%:3000
echo    MQTT Broker      : localhost:1883
echo.
echo  ============================================================
echo    Lokasi: %LOCATION_NAME%
echo  ============================================================
echo.

:: Buat shortcut di Desktop
powershell -NoProfile -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\VOC Billiard.lnk'); $s.TargetPath='http://localhost:3000'; $s.Save()"
echo  Shortcut 'VOC Billiard' sudah dibuat di Desktop.
echo.

:: Buka browser
start http://localhost:3000

echo  Tekan sembarang tombol untuk menutup jendela ini...
pause >nul
endlocal
