@echo off
setlocal

echo ====================================================
echo  SETUP AUTOMATIC DAILY BACKUP (VOC BILLIARD)
echo ====================================================
echo.

set SCRIPT_PATH=%~dp0backup_postgres.bat
set TASK_NAME=VOC_Billiard_Auto_Backup
set TIME=02:00

if not exist "%SCRIPT_PATH%" (
    echo [ERROR] Tidak dapat menemukan %SCRIPT_PATH%
    echo Harap jalankan script ini di folder yang sama dengan backup_postgres.bat
    pause
    exit /b 1
)

echo Membuat Scheduled Task untuk menjalankan backup setiap hari jam %TIME% pagi...
echo.

schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\"" /sc daily /st %TIME% /f

if %ERRORLEVEL% equ 0 (
    echo.
    echo [BERHASIL] Penjadwalan otomatis berhasil dibuat!
    echo Task "%TASK_NAME%" akan berjalan setiap hari pada jam %TIME%.
) else (
    echo.
    echo [GAGAL] Terjadi kesalahan saat membuat penjadwalan.
    echo Pastikan Anda menjalankan script ini sebagai Administrator (Run as Administrator) jika perlu.
)

echo.
pause
endlocal
