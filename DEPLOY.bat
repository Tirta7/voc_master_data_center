@echo off
setlocal
color 0B
title VOC BILLIARD - DEPLOYMENT TOOL (v5.1 - IP Independent)

echo ========================================================
echo        VOC BILLIARD SYSTEM - UNIFIED DEPLOYMENT
echo ========================================================
echo Menyiapkan infrastruktur, IP, Database, Lampu, dan PM2...
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Force Cleanup (Aggressive)
echo [1/7] Membersihkan proses lama...
call pm2 kill >nul 2>&1
taskkill /F /IM mosquitto.exe >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1

:: Fix EPERM: Hapus socket PM2
if exist "%HOMEDRIVE%%HOMEPATH%\.pm2\rpc.sock" del /f /q "%HOMEDRIVE%%HOMEPATH%\.pm2\rpc.sock" >nul 2>&1
if exist "%HOMEDRIVE%%HOMEPATH%\.pm2\pub.sock" del /f /q "%HOMEDRIVE%%HOMEPATH%\.pm2\pub.sock" >nul 2>&1
timeout /t 3 > nul

:: Kill Ports
echo [i] Memastikan Port 3000-8083 dilepas...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":1883" ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8083" ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
echo [OK] Proses lama dibersihkan.
echo.

:: 2. Sinkronisasi IP Jaringan
echo [2/7] Sinkronisasi IP Jaringan...
node update_ip.js
echo.
echo [i] CATATAN: Frontend sudah IP-independent, tidak perlu rebuild saat IP ganti.
echo.

:: 3. Memeriksa node_modules
echo [3/7] Memeriksa Paket (node_modules)...
if exist "backend\node_modules\" goto NEXT_PKG_FE
echo [!] Folder backend/node_modules tidak ditemukan!
echo [i] Menginstall paket backend (tunggu sebentar)...
cd backend && call npm install && cd ..

:NEXT_PKG_FE
if exist "frontend\node_modules\" goto OK_PKG
echo [!] Folder frontend/node_modules tidak ditemukan!
echo [i] Menginstall paket frontend (tunggu sebentar)...
cd frontend && call npm install && cd ..

:OK_PKG
echo [OK] Paket siap.
echo.

:: 4. Jalankan Database
echo [4/7] Memastikan Database aktif...
start /b "" net start Redis >nul 2>&1
start /b "" net start postgresql-x64-18 >nul 2>&1
echo [OK] Database Service dipanggil.
echo.

:: 5. Jalankan MQTT Broker (Mosquitto)
echo [5/7] Menjalankan MQTT Broker...
if exist "C:\Program Files\mosquitto\mosquitto.exe" goto MOSQ_EXIST
echo [ERR] Mosquitto tidak ditemukan. Lampu mungkin tidak jalan.
goto MOSQ_END

:MOSQ_EXIST
start /b "" "C:\Program Files\mosquitto\mosquitto.exe" -c mosquitto.conf
echo [OK] Broker aktif.

:MOSQ_END
echo.

:: 6. Memeriksa Build Aplikasi
echo [6/7] Memeriksa Build Aplikasi...
echo.
echo [i] Catatan:
echo     - Build hanya dibutuhkan 1x saat pertama install atau setelah update kode.
echo     - GANTI IP WIFI tidak memerlukan build ulang (sudah IP-independent).
echo.

if not exist "backend\dist\" (
    echo [!] Backend dist tidak ditemukan. Membangun ulang...
    cd backend && call npm run build && cd ..
) else (
    echo [OK] Backend dist sudah ada.
)

if not exist "frontend\.next\" (
    echo [!] Folder frontend/.next tidak ditemukan!
    echo [i] Membangun frontend - ini hanya perlu 1 kali...
    cd frontend && call npm run build && cd ..
) else (
    echo [OK] Frontend build sudah ada.
)

echo [OK] Build siap.
echo.

:: 7. Jalankan Aplikasi via PM2
echo [7/7] Memulai Backend ^& Frontend via PM2...

:: Pendekatan aman: Coba restart dulu (kalau proses sudah ada)
call pm2 restart ecosystem.config.js --update-env >nul 2>&1
if errorlevel 1 (
    :: Jika gagal (berarti proses belum ada), jalankan start baru
    call pm2 start ecosystem.config.js --update-env
)

if errorlevel 1 goto PM2_FAIL

call pm2 save --force >nul 2>&1
echo [OK] Aplikasi aktif.
goto BROWSER_INFO

:PM2_FAIL
echo.
echo [ERR] Gagal menjalankan PM2!
echo TIPS: Klik kanan DEPLOY.bat dan pilih 'Run as Administrator'.
pause
exit /b 1

:BROWSER_INFO
echo.
echo ========================================================
echo    STATUS: SISTEM ONLINE
echo ========================================================
echo Silakan akses di HP / Komputer lain:
node -e "const os=require('os');const ifs=os.networkInterfaces();for(const n in ifs)for(const i of ifs[n])if(i.family==='IPv4')if(i.internal===false)console.log(' -> http://'+i.address+':3000')"
echo.
echo [Admin Online] https://admin.vocbilliard.online
echo ========================================================
echo.

:: Buka browser lokal
node -e "const os=require('os');const ifs=os.networkInterfaces();for(const n in ifs)for(const i of ifs[n])if(i.family==='IPv4')if(i.internal===false){require('child_process').exec('start http://'+i.address+':3000');process.exit(0)}"

pause
exit /b 0
