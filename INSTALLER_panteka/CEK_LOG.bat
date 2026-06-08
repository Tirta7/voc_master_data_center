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

echo.
echo  ============================================================
echo    MENGAMBIL LOG BACKEND...
echo  ============================================================
echo.
docker logs --tail 100 voc_backend > "%~dp0backend_logs.txt"
echo  [OK] Log berhasil disimpan di file backend_logs.txt
echo.
pause
endlocal
