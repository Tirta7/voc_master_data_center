@echo off
chcp 65001 >nul
title VOC Billiard - Auto Installer
color 0A
cls

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║        VOC BILLIARD MANAGEMENT SYSTEM                   ║
echo  ║        Auto Installer v2.0 (Docker Edition)             ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ════════════════════════════════════════════════════════════════
:: KONFIGURASI — Isi sesuai lokasi sebelum diberikan ke client
:: ════════════════════════════════════════════════════════════════
set LOCATION_NAME=VOC Billiard
set GITHUB_TOKEN=ghp_GANTI_DENGAN_TOKEN_ASLI
set DB_PASSWORD=voc_%RANDOM%%RANDOM%
set FONNTE_TOKEN=
:: ════════════════════════════════════════════════════════════════

set INSTALL_DIR=%~dp0
cd /d "%INSTALL_DIR%"

echo  Lokasi: %LOCATION_NAME%
echo  Folder: %INSTALL_DIR%
echo.

:: ─── LANGKAH 1: Cek Windows Version ────────────────────────────
echo [1/7] Mengecek sistem...
ver | find "10." >nul
if errorlevel 1 (
    ver | find "11." >nul
    if errorlevel 1 (
        echo  [!] Windows 10 atau 11 diperlukan.
        pause & exit /b 1
    )
)
echo  [OK] Windows OK

:: ─── LANGKAH 2: Cek/Install Docker Desktop ─────────────────────
echo [2/7] Mengecek Docker Desktop...
docker --version >nul 2>&1
if errorlevel 1 (
    echo  [!] Docker Desktop tidak ditemukan. Mengunduh...
    echo      Ini mungkin memakan waktu 5-10 menit...
    echo.
    
    where winget >nul 2>&1
    if not errorlevel 1 (
        echo  Menginstall via winget...
        winget install -e --id Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements
    ) else (
        echo  Mengunduh Docker Desktop installer...
        powershell -Command "& { $ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://desktop.docker.com/win/main/amd64/Docker Desktop Installer.exe' -OutFile 'DockerInstaller.exe' }"
        if exist "DockerInstaller.exe" (
            echo  Menginstall Docker Desktop...
            start /wait DockerInstaller.exe install --quiet --accept-license
            del DockerInstaller.exe
        ) else (
            echo  [ERROR] Gagal mengunduh Docker. Cek koneksi internet.
            pause & exit /b 1
        )
    )
    
    echo.
    echo  ┌─────────────────────────────────────────────────────┐
    echo  │  Docker Desktop berhasil diinstall!                 │
    echo  │  RESTART komputer, lalu jalankan file ini lagi.    │
    echo  └─────────────────────────────────────────────────────┘
    pause
    exit /b 0
)

:: Pastikan Docker Engine berjalan
docker info >nul 2>&1
if errorlevel 1 (
    echo  [!] Docker Engine belum berjalan. Menunggu...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo  Menunggu Docker Engine siap (30 detik)...
    timeout /t 30 /nobreak >nul
    docker info >nul 2>&1
    if errorlevel 1 (
        echo  [ERROR] Docker Engine gagal berjalan.
        echo  Buka Docker Desktop secara manual, tunggu hingga siap, lalu jalankan ulang.
        pause & exit /b 1
    )
)
echo  [OK] Docker Desktop berjalan

:: ─── LANGKAH 3: Login ke GitHub Container Registry ─────────────
echo [3/7] Login ke registry...
echo %GITHUB_TOKEN% | docker login ghcr.io -u tirta7 --password-stdin >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Gagal login ke registry!
    echo  Kemungkinan token sudah expired. Hubungi teknisi.
    pause & exit /b 1
)
echo  [OK] Login berhasil

:: ─── LANGKAH 4: Buat file konfigurasi .env ─────────────────────
echo [4/7] Membuat konfigurasi...
if not exist ".env" (
    echo # VOC Billiard Config — %LOCATION_NAME%> .env
    echo DB_USERNAME=postgres>> .env
    echo DB_PASSWORD=%DB_PASSWORD%>> .env
    echo DB_DATABASE=billiard_db>> .env
    echo SERVER_IP=localhost>> .env
    echo FONNTE_TOKEN=%FONNTE_TOKEN%>> .env
    echo  [OK] File konfigurasi dibuat
) else (
    echo  [OK] File konfigurasi sudah ada, dipertahankan
)

:: ─── LANGKAH 5: Download images dari registry ──────────────────
echo [5/7] Mengunduh aplikasi dari server...
echo  Ini mungkin memakan waktu 10-20 menit (pertama kali)...
echo.
docker compose pull
if errorlevel 1 (
    echo  [ERROR] Gagal mengunduh images!
    echo  Cek koneksi internet dan coba lagi.
    pause & exit /b 1
)
echo  [OK] Semua komponen berhasil diunduh

:: ─── LANGKAH 6: Jalankan semua layanan ─────────────────────────
echo [6/7] Menjalankan layanan...
docker compose up -d
if errorlevel 1 (
    echo  [ERROR] Gagal menjalankan layanan!
    echo  Coba jalankan: docker compose logs untuk melihat error.
    pause & exit /b 1
)
echo  [OK] Semua layanan berjalan

:: ─── LANGKAH 7: Tunggu aplikasi siap ───────────────────────────
echo [7/7] Menunggu aplikasi siap...
set /a countdown=30
:wait_loop
set /p =  Menunggu %countdown% detik... <nul
timeout /t 1 /nobreak >nul
set /a countdown=%countdown%-1
if %countdown% gtr 0 goto wait_loop
echo.

:: Cek apakah frontend sudah bisa diakses
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 10 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo  [!] Aplikasi masih loading, tunggu 30 detik lagi...
    timeout /t 30 /nobreak >nul
)

:: ─── SELESAI ────────────────────────────────────────────────────
cls
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                  INSTALASI SELESAI!                     ║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║  🌐 Aplikasi Admin : http://localhost:3000              ║
echo  ║  🌐 Aplikasi Kasir : http://localhost:3000/billing      ║
echo  ║  📡 MQTT Broker   : localhost:1883                      ║
echo  ╠══════════════════════════════════════════════════════════╣
echo  ║  Lokasi: %LOCATION_NAME%
echo  ╚══════════════════════════════════════════════════════════╝
echo.
echo  Membuka browser...
start http://localhost:3000

:: Buat shortcut di Desktop
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\VOC Billiard.lnk'); $s.TargetPath = 'http://localhost:3000'; $s.Save()"

echo.
echo  Shortcut 'VOC Billiard' sudah dibuat di Desktop.
echo.
pause
