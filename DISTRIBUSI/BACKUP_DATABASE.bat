@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set "TIMESTAMP=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "BACKUP_FILE=backup_billiard_%TIMESTAMP%.sql"

echo ===================================================
echo   BACKUP DATABASE VOC BILLIARD
echo ===================================================
echo.
echo Memulai proses backup database dari Docker...
echo Target file: %BACKUP_FILE%
echo.

:: Menjalankan pg_dump di dalam container dan menyimpan output ke komputer Host
docker exec voc_postgres pg_dump -U postgres -d billiard_db -c --if-exists > "%BACKUP_FILE%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUKSES] Backup berhasil disimpan sebagai "%BACKUP_FILE%"
) else (
    echo.
    echo [GAGAL] Terjadi kesalahan saat melakukan backup. Pastikan Docker dan database menyala.
)
echo.
pause
