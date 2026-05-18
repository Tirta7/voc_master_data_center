@echo off
cd /d "%~dp0"

echo ===================================================
echo   HARD RESTART DATABASE VOC BILLIARD
echo ===================================================
echo.
echo Melakukan hard restart pada container database (voc_postgres)...

:: Restart container postgresql via docker compose
docker compose restart postgres

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUKSES] Database berhasil di-restart.
) else (
    echo.
    echo [GAGAL] Gagal me-restart database. Pastikan Docker Desktop berjalan.
)
echo.
pause
