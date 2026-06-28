@echo off
setlocal enabledelayedexpansion

title FRANCHISE GENERATOR - VOC BILLIARD
color 0B

echo ============================================================
echo   SISTEM PEMBUAT CABANG OTOMATIS (FRANCHISE GENERATOR)
echo ============================================================
echo.
echo Alat ini akan menggandakan folder installer, mendaftarkan
echo domain baru, dan mem-bypass sistem kartu kredit Cloudflare
echo secara otomatis dalam 10 detik!
echo.

set /p BRANCH="Masukkan nama kota cabang baru (huruf kecil semua tanpa spasi, contoh: gresik): "
if "!BRANCH!"=="" (
    echo Nama cabang tidak boleh kosong!
    pause
    exit /b
)

echo.
echo [1/4] Membuat Cloudflare Tunnel baru bernama "!BRANCH!-branch"...
cloudflared tunnel create !BRANCH!-branch > temp_tunnel_output.txt 2>&1

set "TUNNEL_UUID="
for /f "tokens=6" %%a in ('findstr /c:"Created tunnel" temp_tunnel_output.txt') do set "TUNNEL_UUID=%%a"

if "!TUNNEL_UUID!"=="" (
    echo.
    echo [ERROR] Gagal membuat tunnel. Kemungkinan besar nama "!BRANCH!-branch" sudah pernah dibuat sebelumnya!
    echo Silakan gunakan nama lain atau cek file temp_tunnel_output.txt
    pause
    exit /b
)

echo [OK] Tunnel berhasil diciptakan! ID: !TUNNEL_UUID!
echo.

echo [2/4] Mendaftarkan 3 Domain DNS ke satelit Cloudflare...
cloudflared tunnel route dns !BRANCH!-branch !BRANCH!.vocbilliard.online
cloudflared tunnel route dns !BRANCH!-branch api-!BRANCH!.vocbilliard.online
cloudflared tunnel route dns !BRANCH!-branch mqtt-!BRANCH!.vocbilliard.online
echo [OK] Domain berhasil didaftarkan!
echo.

echo [3/4] Menggandakan folder "INSTALLER_CLIENT" menjadi "INSTALLER_!BRANCH!"...
set "TARGET_DIR=INSTALLER_!BRANCH!"
xcopy "INSTALLER_CLIENT" "!TARGET_DIR!\" /E /I /H /Y /Q >nul
copy "backup_postgres.bat" "!TARGET_DIR!\backup_postgres.bat" >nul
copy "setup_auto_backup.bat" "!TARGET_DIR!\setup_auto_backup.bat" >nul
echo [OK] Folder berhasil digandakan!
echo.

echo [4/4] Memasukkan konfigurasi rahasia khusus cabang !BRANCH!...
:: Menyuntikkan credential rahasia
copy "C:\Users\tirta\.cloudflared\!TUNNEL_UUID!.json" "!TARGET_DIR!\cloudflare\credentials.json" >nul

:: Membuat config.yml khusus Docker cabang
(
  echo tunnel: !TUNNEL_UUID!
  echo credentials-file: /etc/cloudflared/credentials.json
  echo.
  echo ingress:
  echo   - hostname: !BRANCH!.vocbilliard.online
  echo     service: http://voc_frontend:3000
  echo   - hostname: api-!BRANCH!.vocbilliard.online
  echo     service: http://voc_backend:4000
  echo   - hostname: mqtt-!BRANCH!.vocbilliard.online
  echo     service: http://voc_mosquitto:8083
  echo   - service: http_status:404
) > "!TARGET_DIR!\cloudflare\config.yml"

:: Menyulap semua tulisan 'pekalongan' menjadi nama cabang baru menggunakan PowerShell
powershell -NoProfile -Command "(Get-Content '!TARGET_DIR!\docker-compose.yml') -replace 'pekalongan', '!BRANCH!' | Set-Content '!TARGET_DIR!\docker-compose.yml'"
powershell -NoProfile -Command "(Get-Content '!TARGET_DIR!\INSTALL.bat') -replace 'pekalongan', '!BRANCH!' | Set-Content '!TARGET_DIR!\INSTALL.bat'"
powershell -NoProfile -Command "(Get-Content '!TARGET_DIR!\MULAI.bat') -replace 'pekalongan', '!BRANCH!' | Set-Content '!TARGET_DIR!\MULAI.bat'"

del temp_tunnel_output.txt >nul 2>&1

echo [OK] Konfigurasi berhasil disuntikkan!
echo.
echo ============================================================
echo   SELESAI! AJAIB!
echo ============================================================
echo Folder instalasi khusus untuk !BRANCH! sudah matang:
echo %CD%\!TARGET_DIR!
echo.
echo Anda tinggal masuk ke dalam folder tersebut, isi .token
echo dan copy foldernya ke Flashdisk untuk dikirim ke lokasi!
echo ============================================================
pause
