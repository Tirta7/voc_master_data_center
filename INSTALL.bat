@echo off
title VOC Billiard System - Installer v3.5
color 0A

echo.
echo =====================================================
echo   VOC BILLIARD SYSTEM - AUTO INSTALLER v3.5
echo =====================================================

:: --- [1. CEK ADMIN] ---
net session >nul 2>&1
if errorlevel 1 goto :no_admin

set "BASE_DIR=%~dp0"
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"

:: --- [2. PILIH ZONA WAKTU] ---
echo.
echo PILIH ZONA WAKTU:
echo [1] WIB
echo [2] WITA
echo [3] WIT
echo.
set /p PILIHAN="Masukkan angka 1, 2, atau 3: "

set "TIMEZONE=Asia/Jakarta"
set "TZ_NAME=WIB"
set "TZ_WIN=SE Asia Standard Time"

if "%PILIHAN%"=="2" set "TIMEZONE=Asia/Makassar"
if "%PILIHAN%"=="2" set "TZ_NAME=WITA"
if "%PILIHAN%"=="2" set "TZ_WIN=Singapore Standard Time"

if "%PILIHAN%"=="3" set "TIMEZONE=Asia/Jayapura"
if "%PILIHAN%"=="3" set "TZ_NAME=WIT"
if "%PILIHAN%"=="3" set "TZ_WIN=Tokyo Standard Time"

tzutil /s "%TZ_WIN%" >nul 2>&1
echo [OK] Zona waktu: %TZ_NAME%

:: --- [3. INPUT IP] ---
echo.
echo Masukkan IP Server ini (Cek di ipconfig). 
echo Contoh: 192.168.1.15
echo.
set /p MY_IP="Masukkan IP: "
if "%MY_IP%"=="" set "MY_IP=127.0.0.1"
echo [OK] IP Server: %MY_IP%

:: --- [4. KONFIGURASI] ---
echo.
set /p NAMA_TEMPAT="Nama Tempat Billiard: "
if "%NAMA_TEMPAT%"=="" set "NAMA_TEMPAT=VOC Billiard"

set "DB_PASSWORD=VocBilliard2024"

echo.
echo Konfigurasi Siap: %NAMA_TEMPAT% | %TZ_NAME% | %MY_IP%
pause

:: --- [5. INSTALL NODEJS] ---
echo.
echo [1/5] Cek Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo Menginstall Node.js...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements
)

:: --- [6. INSTALL POSTGRES] ---
echo.
echo [2/5] Cek PostgreSQL...
set "PG_EXE="
if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set "PG_EXE=C:\Program Files\PostgreSQL\17\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "PG_EXE=C:\Program Files\PostgreSQL\16\bin\psql.exe"

if "%PG_EXE%"=="" (
    echo Menginstall PostgreSQL...
    winget install --id PostgreSQL.PostgreSQL --silent --accept-package-agreements --accept-source-agreements
)

:: --- [7. INSTALL MQTT ^& REDIS] ---
echo.
echo [3/5] Cek MQTT ^& Redis...
net start mosquitto >nul 2>&1
if errorlevel 1 (
    winget install EclipseFoundation.Mosquitto --silent --accept-package-agreements
    net start mosquitto >nul 2>&1
)

net start Redis >nul 2>&1
if errorlevel 1 (
    winget install Memurai.Memurai --silent --accept-package-agreements
    net start Redis >nul 2>&1
)

:: --- [8. PM2] ---
echo.
echo [4/5] Cek PM2...
pm2 --version >nul 2>&1
if errorlevel 1 call npm install -g pm2

:: --- [9. CONFIG .ENV] ---
echo.
echo [5/5] Membuat konfigurasi .env...
echo DB_HOST=127.0.0.1 > "%BACKEND_DIR%\.env"
echo DB_PORT=4538 >> "%BACKEND_DIR%\.env"
echo DB_USERNAME=postgres >> "%BACKEND_DIR%\.env"
echo DB_PASSWORD=%DB_PASSWORD% >> "%BACKEND_DIR%\.env"
echo DB_DATABASE=billiard_db >> "%BACKEND_DIR%\.env"
echo APP_URL=http://%MY_IP%:4000 >> "%BACKEND_DIR%\.env"
echo TZ=%TIMEZONE% >> "%BACKEND_DIR%\.env"
echo NODE_ENV=production >> "%BACKEND_DIR%\.env"

echo NEXT_PUBLIC_API_URL=http://%MY_IP%:4000 > "%FRONTEND_DIR%\.env.local"
echo NEXT_PUBLIC_MQTT_URL=ws://%MY_IP%:8083 >> "%FRONTEND_DIR%\.env.local"

:: --- [10. BUILD] ---
echo.
echo Membangun aplikasi (10 menit)...
cd /d "%BACKEND_DIR%"
call npm install --omit=dev --legacy-peer-deps
cd /d "%FRONTEND_DIR%"
call npm install --omit=dev --legacy-peer-deps

:: --- [11. START] ---
echo.
echo Menjalankan layanan...
cd /d "%BASE_DIR%"
pm2 delete all >nul 2>&1
pm2 start ecosystem.config.js
pm2 save

:: Shortcuts
set "DESK=%USERPROFILE%\Desktop"
powershell -Command "$s=New-Object -ComObject WScript.Shell; $d=$s.CreateShortcut('%DESK%\VOC_Start.lnk'); $d.TargetPath='%BASE_DIR%DEPLOY.bat'; $d.Save()"

echo.
echo =====================================================
echo   SUKSES! Aplikasi siap di http://%MY_IP%:3000
echo =====================================================
pause
start http://localhost:3000
goto :eof

:no_admin
echo [ERROR] ANDA HARUS MENJALANKAN SEBAGAI ADMINISTRATOR.
pause
goto :eof
