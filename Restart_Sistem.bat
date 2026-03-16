@echo off
setlocal enabledelayedexpansion
color 0B
title VOC BILLIARD - FULL SYSTEM RESTART

echo ========================================================
echo        VOC BILLIARD - RESTARTING ALL SYSTEMS
echo ========================================================
echo Deskripsi: Script ini akan mematikan semua service (Node, MQTT, Redis)
echo lalu menghidupkannya kembali dari awal secara bersih.
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Menghentikan seluruh service...
call Stop_Sistem.bat --nopause

echo.
echo [2/3] Memberi jeda sinkronisasi sistem (5 detik)...
timeout /t 5 /nobreak > nul

echo.
echo [3/3] Menghidupkan kembali sistem...
call Start_App.bat

echo.
echo ========================================================
echo    RESTART SELESAI!
echo    Pastikan jendela-jendela service baru sudah muncul.
echo ========================================================
echo.
timeout /t 5
exit /b 0
