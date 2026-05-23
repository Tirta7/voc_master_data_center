@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

:: Menggunakan PowerShell untuk mendapatkan timestamp yang kebal terhadap regional settings Windows
for /f "usebackq" %%a in (`powershell -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"`) do set "TIMESTAMP=%%a"
set "BACKUP_FILE=backup_billiard_%TIMESTAMP%.sql"

echo ===================================================
echo   BACKUP DATABASE VOC BILLIARD
echo ===================================================
echo.
echo Memulai proses backup database...
echo Target file: %BACKUP_FILE%
echo.

:: 1. Deteksi apakah pg_dump.exe terinstal di Windows Host
set "PG_DUMP_PATH="
where pg_dump >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PG_DUMP_PATH=pg_dump"
) else (
    :: Cek lokasi instalasi standar PostgreSQL di Windows
    for %%v in (18 17 16 15 14) do (
        if exist "C:\Program Files\PostgreSQL\%%v\bin\pg_dump.exe" (
            set "PG_DUMP_PATH="C:\Program Files\PostgreSQL\%%v\bin\pg_dump.exe""
            goto DUMP_FOUND
        )
    )
)

:DUMP_FOUND
if not "%PG_DUMP_PATH%"=="" (
    echo [INFO] Menemukan pg_dump lokal. Melakukan backup database lokal...
    :: Konfigurasi kredensial dari .env (Port 4538, user postgres, password 1)
    set "PGPASSWORD=1"
    %PG_DUMP_PATH% -h 127.0.0.1 -p 4538 -U postgres -d billiard_db -c --if-exists > "%BACKUP_FILE%"
) else (
    echo [INFO] pg_dump lokal tidak ditemukan. Mencoba backup via Docker container...
    :: Fallback jika database berjalan di Docker
    docker exec voc_postgres pg_dump -U postgres -d billiard_db -c --if-exists > "%BACKUP_FILE%"
)

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUKSES] Backup berhasil disimpan sebagai "%BACKUP_FILE%"
) else (
    echo.
    echo [GAGAL] Terjadi kesalahan saat melakukan backup.
    echo Pastikan PostgreSQL (Service Windows / Docker) aktif dan password/port sudah sesuai.
)
echo.
pause
