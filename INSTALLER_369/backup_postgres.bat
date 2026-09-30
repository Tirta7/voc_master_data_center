@echo off
setlocal enabledelayedexpansion

REM ==========================================
REM BACKUP POSTGRESQL - VOC BILLIARD SYSTEM
REM Mendukung mode: Docker (PC Client) & Lokal
REM ==========================================

REM ── Kredensial Database ──────────────────
set DB_USER=postgres
set DB_NAME=billiard_db

REM ── Konfigurasi Lokal (PC Dev/Server) ────
set DB_HOST=localhost
set DB_PORT=4538
set PGPASSWORD_LOCAL=1
set PG_DUMP_EXE=C:\Program Files\PostgreSQL\18\bin\pg_dump.exe

REM ── Konfigurasi Docker (PC Client) ───────
set CONTAINER_NAME=voc_postgres
set PGPASSWORD_DOCKER=vocbilliard2024

REM ── Folder Output Backup ─────────────────
REM Gunakan folder di samping script ini agar portabel di PC mana saja
set BACKUP_DIR=%~dp0backups

REM ==========================================
REM GENERATE TIMESTAMP (PowerShell, bukan wmic)
REM ==========================================
for /f "usebackq" %%T in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"`) do set TIMESTAMP=%%T
set FILENAME=%DB_NAME%_backup_%TIMESTAMP%.sql
set BACKUP_PATH=%BACKUP_DIR%\%FILENAME%

REM Buat folder backup jika belum ada
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo.
echo ==========================================
echo  BACKUP DATABASE: %DB_NAME%
echo ==========================================

REM ==========================================
REM AUTO-DETECT: Docker atau Lokal?
REM ==========================================
set USE_DOCKER=no
docker inspect %CONTAINER_NAME% >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set USE_DOCKER=yes
)

REM ==========================================
REM JALANKAN BACKUP
REM ==========================================
if "%USE_DOCKER%"=="yes" (
    echo  Mode    : DOCKER
    echo  Container: %CONTAINER_NAME%
    echo  Output  : %BACKUP_PATH%
    echo ------------------------------------------
    docker exec -e PGPASSWORD=%PGPASSWORD_DOCKER% %CONTAINER_NAME% ^
        pg_dump -U %DB_USER% %DB_NAME% > "%BACKUP_PATH%"
) else (
    echo  Mode    : LOKAL
    echo  Host    : %DB_HOST%:%DB_PORT%
    echo  Output  : %BACKUP_PATH%
    echo ------------------------------------------
    REM Cek apakah pg_dump.exe ada
    if not exist "%PG_DUMP_EXE%" (
        echo.
        echo [ERROR] File pg_dump.exe tidak ditemukan di:
        echo   %PG_DUMP_EXE%
        echo.
        echo Coba cari pg_dump di PATH sistem...
        where pg_dump >nul 2>&1
        if %ERRORLEVEL% equ 0 (
            echo Ditemukan pg_dump di PATH. Menggunakan versi tersebut...
            set PG_DUMP_EXE=pg_dump
        ) else (
            echo [GAGAL] pg_dump tidak ditemukan. Install PostgreSQL client tools.
            goto :error_end
        )
    )
    set PGPASSWORD=%PGPASSWORD_LOCAL%
    "%PG_DUMP_EXE%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME% > "%BACKUP_PATH%"
)

REM ==========================================
REM CEK HASIL
REM ==========================================
if %ERRORLEVEL% equ 0 (
    REM Verifikasi file tidak kosong
    for %%A in ("%BACKUP_PATH%") do set FILE_SIZE=%%~zA
    if !FILE_SIZE! equ 0 (
        del "%BACKUP_PATH%"
        echo.
        echo [GAGAL] File backup kosong ^(0 bytes^). Periksa koneksi database.
        goto :error_end
    )
    echo.
    echo [BERHASIL] Backup selesai^^!
    echo   File  : %BACKUP_PATH%
    echo   Ukuran: !FILE_SIZE! bytes
    echo.
    REM Hapus backup lama jika lebih dari 10 file
    set COUNT=0
    for %%F in ("%BACKUP_DIR%\%DB_NAME%_backup_*.sql") do set /a COUNT+=1
    if !COUNT! gtr 10 (
        echo  Info: Membersihkan backup lama ^(simpan 10 terbaru^)...
        for /f "skip=10 delims=" %%F in ('dir /b /o-d "%BACKUP_DIR%\%DB_NAME%_backup_*.sql" 2^>nul') do (
            del "%BACKUP_DIR%\%%F"
            echo   Dihapus: %%F
        )
    )
    
    REM ==========================================
    REM UPLOAD VIA RCLONE (JIKA ADA)
    REM ==========================================
    set "GDRIVE_FOLDER_ID="
    if exist ".env" (
        for /f "tokens=1,* delims==" %%a in (.env) do (
            if /i "%%a"=="GDRIVE_FOLDER_ID" set "GDRIVE_FOLDER_ID=%%b"
        )
    )
    if not "!GDRIVE_FOLDER_ID!"=="" (
        rclone version >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            echo  Info: Mengupload ke Google Drive via Rclone...
            rclone copy "%BACKUP_PATH%" "gdrive:/" --drive-root-folder-id "!GDRIVE_FOLDER_ID!"
            if !ERRORLEVEL! equ 0 (
                echo   [BERHASIL] Upload Google Drive selesai!
            ) else (
                echo   [GAGAL] Upload Google Drive gagal. Pastikan sudah menjalankan 'rclone config'.
            )
        ) else (
            echo  Info: Rclone tidak terinstal, melewati proses upload.
        )
    )
    
    goto :end
)

:error_end
echo.
echo [GAGAL] Terjadi kesalahan saat backup^^!
echo.
echo Kemungkinan penyebab:
if "%USE_DOCKER%"=="yes" (
    echo  - Container '%CONTAINER_NAME%' tidak berjalan
    echo    Solusi: docker start %CONTAINER_NAME%
    echo  - Password Docker salah ^(cek .env di folder installer^)
) else (
    echo  - PostgreSQL tidak berjalan di port %DB_PORT%
    echo  - Password salah ^(cek file .env^)
    echo  - pg_dump.exe tidak ditemukan
)

:end
echo ==========================================
endlocal
