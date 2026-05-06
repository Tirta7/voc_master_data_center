@echo off
setlocal enabledelayedexpansion
title VOC Billiard System — SETUP PC BARU
color 0A
chcp 65001 >nul 2>&1

:: ─────────────────────────────────────────────────────────────
:: CEK ADMINISTRATOR
:: ─────────────────────────────────────────────────────────────
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo  [!] Harus dijalankan sebagai ADMINISTRATOR!
    echo      Klik kanan file ini ^> "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║        VOC BILLIARD SYSTEM — SETUP OTOMATIS v3.0            ║
echo  ║        Hybrid IoT Billiard Management Platform              ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║                                                              ║
echo  ║  Script ini akan menginstall:                                ║
echo  ║   [1] Docker Desktop (semua dependency dalam 1 paket)       ║
echo  ║   [2] Konfigurasi IP dan environment otomatis               ║
echo  ║   [3] Build dan jalankan semua layanan                      ║
echo  ║                                                              ║
echo  ║  Estimasi waktu: 10-20 menit (tergantung internet)         ║
echo  ║  Butuh koneksi internet aktif                               ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Lokasi instalasi: %~dp0
echo.
pause

:: ─────────────────────────────────────────────────────────────
:: STEP 1 — DETEKSI IP OTOMATIS
:: ─────────────────────────────────────────────────────────────
echo.
echo  ══ STEP 1/4: Deteksi IP Jaringan ══════════════════════════════

:: Ambil IP dari adapter WiFi atau Ethernet aktif
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "169.254"') do (
    set RAW_IP=%%a
    set RAW_IP=!RAW_IP: =!
    if not defined SERVER_IP set SERVER_IP=!RAW_IP!
)

if not defined SERVER_IP set SERVER_IP=192.168.1.100

echo  [OK] IP Server terdeteksi: %SERVER_IP%
echo.
echo  Apakah IP ini sudah benar? (HP waiter akan akses via IP ini)
set /p IP_CONFIRM="  Gunakan %SERVER_IP% ? (Y untuk ya / ketik IP baru): "
if /i not "%IP_CONFIRM%"=="Y" (
    if not "%IP_CONFIRM%"=="" set SERVER_IP=%IP_CONFIRM%
)
echo  [OK] Menggunakan IP: %SERVER_IP%

:: ─────────────────────────────────────────────────────────────
:: STEP 2 — BUAT FILE .env
:: ─────────────────────────────────────────────────────────────
echo.
echo  ══ STEP 2/4: Konfigurasi Environment ══════════════════════════

if exist "%~dp0.env" (
    echo  [OK] File .env sudah ada. Melanjutkan...
    :: Update SERVER_IP di .env yang ada
    powershell -Command "(Get-Content '%~dp0.env') -replace 'SERVER_IP=.*', 'SERVER_IP=%SERVER_IP%' | Set-Content '%~dp0.env'" >nul 2>&1
) else (
    :: Buat .env baru dari template
    if exist "%~dp0.env.example" (
        copy "%~dp0.env.example" "%~dp0.env" >nul
        powershell -Command "(Get-Content '%~dp0.env') -replace 'SERVER_IP=.*', 'SERVER_IP=%SERVER_IP%' | Set-Content '%~dp0.env'" >nul 2>&1
        echo  [OK] File .env dibuat dengan IP: %SERVER_IP%
    ) else (
        :: Buat .env dari nol
        (
            echo SERVER_IP=%SERVER_IP%
            echo DB_PASSWORD=VocBilliard2024!
            echo DB_USERNAME=postgres
            echo DB_DATABASE=billiard_db
            echo DB_PORT=5432
            echo REDIS_PORT=6379
            echo FONNTE_TOKEN=
        ) > "%~dp0.env"
        echo  [OK] File .env dibuat.
    )
)

:: ─────────────────────────────────────────────────────────────
:: STEP 3 — CEK / INSTALL DOCKER
:: ─────────────────────────────────────────────────────────────
echo.
echo  ══ STEP 3/4: Periksa Docker Desktop ═══════════════════════════

docker --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('docker --version') do echo  [OK] %%i sudah terinstall.
    
    :: Pastikan Docker Desktop berjalan
    docker info >nul 2>&1
    if %errorLevel% neq 0 (
        echo  [>>] Memulai Docker Desktop...
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe" >nul 2>&1
        echo  [..] Menunggu Docker siap (30 detik)...
        timeout /t 30 /nobreak >nul
        docker info >nul 2>&1
        if %errorLevel% neq 0 (
            echo  [!] Docker belum siap. Buka Docker Desktop manual lalu jalankan:
            echo      START_DOCKER.bat
            pause
            exit /b 1
        )
    )
    echo  [OK] Docker Engine berjalan.
    
) else (
    echo  [>>] Docker Desktop belum ada. Menginstall via winget...
    echo.
    winget install Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements
    if %errorLevel% neq 0 (
        echo.
        echo  [!] Install otomatis gagal. Download manual dari:
        echo      https://www.docker.com/products/docker-desktop/
        echo.
        echo  Setelah install Docker Desktop:
        echo   1. Buka Docker Desktop dan tunggu hingga "Docker Desktop is running"
        echo   2. Jalankan file START_DOCKER.bat
        echo.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Docker Desktop berhasil diinstall!
    echo.
    echo  PENTING: Anda perlu RESTART PC sekarang.
    echo  Setelah restart:
    echo   1. Buka Docker Desktop dan tunggu hingga ready
    echo   2. Jalankan START_DOCKER.bat untuk menjalankan aplikasi
    echo.
    pause
    exit /b 0
)

:: ─────────────────────────────────────────────────────────────
:: STEP 4 — BUILD & JALANKAN
:: ─────────────────────────────────────────────────────────────
echo.
echo  ══ STEP 4/4: Build dan Jalankan Aplikasi ═══════════════════════
echo  [..] Ini akan memakan waktu 10-15 menit untuk build pertama kali...
echo.

cd /d "%~dp0"

:: Build dan jalankan semua container
docker compose --env-file .env up -d --build
if %errorLevel% neq 0 (
    echo.
    echo  [ERROR] Build gagal! Cek error di atas.
    echo  Kemungkinan penyebab:
    echo   - Koneksi internet putus saat download image
    echo   - Port 3001, 4000, 1883 sudah dipakai aplikasi lain
    echo   - RAM tidak cukup (butuh minimal 4GB)
    echo.
    pause
    exit /b 1
)

:: Tunggu semua container sehat
echo.
echo  [..] Menunggu semua layanan siap (maksimal 2 menit)...
timeout /t 60 /nobreak >nul

:: Verifikasi
docker compose ps >nul 2>&1
echo.
echo  Status container:
docker compose ps
echo.

:: ─────────────────────────────────────────────────────────────
:: SELESAI — Tampilkan info akses
:: ─────────────────────────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║              ✅ INSTALASI BERHASIL!                          ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║                                                              ║
echo  ║  Akses Aplikasi:                                             ║
echo  ║   PC Server  : http://localhost:3001                        ║
echo  ║   PC Client  : http://%SERVER_IP%:3001          ║
echo  ║   HP Waiter  : http://%SERVER_IP%:3001          ║
echo  ║               (sambungkan ke WiFi yang sama)                ║
echo  ║                                                              ║
echo  ║  Untuk HP Waiter — Cara tambah ke home screen:              ║
echo  ║   Chrome: Menu (⋮) → "Add to Home Screen"                  ║
echo  ║   Safari: Share (□↑) → "Add to Home Screen"                ║
echo  ║                                                              ║
echo  ║  Untuk mengelola:                                            ║
echo  ║   Mulai   : START_DOCKER.bat                                ║
echo  ║   Stop    : STOP_DOCKER.bat                                 ║
echo  ║   Restart : RESTART_DOCKER.bat                              ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

:: Buat shortcut di Desktop
powershell -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%USERPROFILE%\Desktop\VOC Billiard.lnk'); $s.TargetPath='%~dp0START_DOCKER.bat'; $s.WorkingDirectory='%~dp0'; $s.Description='VOC Billiard System'; $s.Save()" >nul 2>&1
echo  [OK] Shortcut "VOC Billiard" dibuat di Desktop.

:: Buka browser otomatis
timeout /t 5 /nobreak >nul
start http://localhost:3001

pause
endlocal
