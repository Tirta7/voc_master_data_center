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
set LOCATION_NAME=Ballistic Surabaya
set GITHUB_TOKEN=
set FONNTE_TOKEN=
:: ==============================================================

set INSTALL_DIR=%~dp0
cd /d "%INSTALL_DIR%"

:: ---- Deteksi IP LAN dengan PowerShell (lebih aman dari batch) ----
for /f "delims=" %%i in ('powershell -NoProfile -Command "([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object {$_.AddressFamily -eq 'InterNetwork'} | Select-Object -First 1).IPAddressToString"') do set SERVER_IP=%%i
if not defined SERVER_IP set SERVER_IP=localhost

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
echo  [OK] File konfigurasi dibuat ^(IP: %SERVER_IP%^)
goto END_ENV

:UPDATE_ENV
powershell -NoProfile -Command "(Get-Content '.env') -replace 'SERVER_IP=.*', 'SERVER_IP=%SERVER_IP%' | Set-Content '.env'"
echo  [OK] Konfigurasi diperbarui ^(IP: %SERVER_IP%^)

:END_ENV

:: ---------------------------------------------------------------
:: LANGKAH 5: Download Docker images dari registry
:: ---------------------------------------------------------------
echo [5/7] Mengunduh aplikasi dari server...
echo  Ini bisa memakan waktu 10-20 menit ^(pertama kali^)...
echo.
docker compose pull
if errorlevel 1 goto DO_LOCAL_BUILD
echo  [OK] Semua komponen berhasil diunduh dari cloud.
goto START_SERVICES

:DO_LOCAL_BUILD
echo.
echo  [!] Gagal mengunduh aplikasi dari cloud registry.
echo  [i] Mengaktifkan mode kompilasi mandiri [Local Build]...
echo      Ini akan merakit aplikasi langsung di komputer ini.
echo.
if not exist "backend\Dockerfile" (
    echo  [ERROR] File 'Dockerfile' di folder 'backend' tidak ditemukan!
    echo          Harap salin file 'Dockerfile' dari PC developer ke:
    echo          C:\Billiard_APPS\backend\Dockerfile
    echo.
    pause
    exit /b 1
)
if not exist "frontend\Dockerfile" (
    echo  [ERROR] File 'Dockerfile' di folder 'frontend' tidak ditemukan!
    echo          Harap salin file 'Dockerfile' dari PC developer ke:
    echo          C:\Billiard_APPS\frontend\Dockerfile
    echo.
    pause
    exit /b 1
)
echo      Harap tunggu, proses ini memakan waktu 5-10 menit...
echo.
docker compose build
if errorlevel 1 goto LOCAL_BUILD_FAIL
echo  [OK] Aplikasi berhasil dirakit secara lokal.
goto START_SERVICES

:LOCAL_BUILD_FAIL
echo.
echo  [ERROR] Gagal merakit aplikasi secara lokal!
echo  Pastikan semua file backend dan frontend lengkap di folder ini.
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
