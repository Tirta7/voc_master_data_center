@echo off
setlocal enabledelayedexpansion
title VOC Billiard — Buat Backup Portable
color 0B
chcp 65001 > nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║        VOC BILLIARD — BUAT BACKUP PORTABLE                  ║
echo ║  Menyalin source code TANPA node_modules (ringan)          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set SOURCE=%~dp0
set DEST=%USERPROFILE%\Desktop\Billiard_APPS_PORTABLE
set TIMESTAMP=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%

set DEST=%USERPROFILE%\Desktop\Billiard_APPS_%TIMESTAMP%

echo [>>] Source   : %SOURCE%
echo [>>] Tujuan   : %DEST%
echo.
echo  YANG DISALIN    : Semua source code, .env, config, firmware
echo  YANG DI-SKIP    : node_modules, .next, dist, .git (folder berat)
echo.
pause

:: Buat folder tujuan
mkdir "%DEST%" 2>nul

echo.
echo [>>] Menyalin file source code...

robocopy "%SOURCE%" "%DEST%" /E /XD ^
    node_modules ^
    .next ^
    dist ^
    .git ^
    tmp ^
    logs ^
    /XF ^
    "*.log" ^
    /NFL /NDL /NJH /NJS /nc /ns /np

echo.
echo [OK] Source code berhasil disalin!

:: Tampilkan ukuran folder
for /f "tokens=3" %%a in ('dir /s /b "%DEST%" 2^>nul ^| find /v /c ""') do set FILECOUNT=%%a
echo [INFO] Total file: %FILECOUNT% file

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                   BACKUP SELESAI!                           ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                              ║
echo ║  Folder backup ada di Desktop:                               ║
echo ║  %DEST%
echo ║                                                              ║
echo ║  CARA INSTALL DI PC BARU:                                   ║
echo ║  1. Copy folder tsb ke PC baru (via USB / LAN / GDrive)    ║
echo ║  2. Klik kanan INSTALL.bat → Run as administrator           ║
echo ║  3. Tunggu proses selesai (~15-20 menit)                    ║
echo ║  4. Jalankan DEPLOY.bat untuk mulai aplikasi                ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set /p OPEN_FOLDER="Buka folder backup? (y/n): "
if /i "%OPEN_FOLDER%"=="y" explorer "%DEST%"

pause
endlocal
