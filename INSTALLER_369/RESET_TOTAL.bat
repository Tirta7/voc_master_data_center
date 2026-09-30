@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: SELF-ELEVATION
:: ============================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"%~f0\" & pause' -Verb RunAs -Wait"
    exit /b 0
)

title VOC Billiard - Reset Total (Fresh Install)
color 0C
set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

cls
echo.
echo  ============================================================
echo    MENGHAPUS SEMUA DATA DOCKER LAMA...
echo  ============================================================
echo.
echo  Proses ini akan menghapus semua database dan cache yang
echo  tidak cocok akibat proses instalasi sebelumnya.
echo.

docker compose -f "%INSTALL_DIR%docker-compose.yml" down -v

echo.
echo  ============================================================
echo    MEMULAI ULANG INSTALASI BERSIH...
echo  ============================================================
echo.

docker compose -f "%INSTALL_DIR%docker-compose.yml" --env-file "%INSTALL_DIR%.env" up -d

echo.
echo  [OK] Reset total berhasil!
echo  Silakan tunggu 15-30 detik lalu buka http://localhost:3000
echo.
pause
endlocal
