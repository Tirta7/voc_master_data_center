@echo off
setlocal enabledelayedexpansion

REM ==========================================
REM RESTORE POSTGRESQL - VOC BILLIARD SYSTEM
REM Mendukung mode: Docker (PC Client) & Lokal
REM ==========================================

REM ── Kredensial Database ──────────────────
set DB_USER=postgres
set DB_NAME=billiard_db

REM ── Konfigurasi Docker (PC Client) ───────
set CONTAINER_NAME=voc_postgres
set PGPASSWORD_DOCKER=vocbilliard2024

REM ── Konfigurasi Lokal (PC Dev/Server) ────
set DB_HOST=localhost
set DB_PORT=4538
set PGPASSWORD_LOCAL=1
set PG_PSQL_EXE=C:\Program Files\PostgreSQL\18\bin\psql.exe

REM ── Folder Backup ─────────────────────────
set BACKUP_DIR=%~dp0backups

REM ==========================================
REM AUTO-DETECT: Docker atau Lokal?
REM ==========================================
set USE_DOCKER=no

REM Cek apakah Docker ada dulu
where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  Info: Docker tidak ditemukan, menggunakan mode LOKAL.
    goto :start_menu
)

REM Cek apakah container voc_postgres sedang berjalan
docker inspect --format="{{.State.Running}}" %CONTAINER_NAME% >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "delims=" %%R in ('docker inspect --format={{.State.Running}} %CONTAINER_NAME% 2^>nul') do set DOCKER_RUNNING=%%R
    if "!DOCKER_RUNNING!"=="true" (
        set USE_DOCKER=yes
    )
)

:start_menu
cls
echo.
echo =======================================================
echo         MENU RESTORE DATABASE - VOC BILLIARD
echo =======================================================
if "!USE_DOCKER!"=="yes" (
    echo  Mode    : DOCKER ^(Container: %CONTAINER_NAME%^)
) else (
    echo  Mode    : LOKAL ^(Host: %DB_HOST%:%DB_PORT%^)
)
echo =======================================================
echo.

REM Cek folder backups
if not exist "%BACKUP_DIR%" (
    echo [ERROR] Folder backups tidak ditemukan!
    echo.
    echo Kemungkinan penyebab:
    echo  - Belum ada backup yang dibuat
    echo  - File backup ada di folder lain
    echo.
    echo Silakan buat backup terlebih dahulu menggunakan:
    echo   backup_postgres.bat
    echo.
    pause
    exit /b
)

REM Daftar file backup tersedia
echo DAFTAR FILE BACKUP YANG TERSEDIA:
echo -------------------------------------------------------
set FILE_COUNT=0
for %%F in ("%BACKUP_DIR%\*.sql") do (
    set /a FILE_COUNT+=1
    echo  !FILE_COUNT!. %%~nxF
)
echo -------------------------------------------------------
echo.

if !FILE_COUNT! equ 0 (
    echo [ERROR] Tidak ada file .sql di folder backups!
    echo Lokasi folder: %BACKUP_DIR%
    echo.
    pause
    exit /b
)

echo Ketik/Paste nama file yang ingin di-restore (lengkap dengan .sql):
set /p TARGET_FILE="> "

if "!TARGET_FILE!"=="" (
    echo.
    echo [BATAL] Tidak ada file yang dipilih.
    pause
    exit /b
)

set BACKUP_PATH=%BACKUP_DIR%\%TARGET_FILE%

if not exist "%BACKUP_PATH%" (
    echo.
    echo [ERROR] File '!TARGET_FILE!' tidak ditemukan di folder backups!
    echo Lokasi yang dicari: %BACKUP_PATH%
    echo.
    pause
    exit /b
)

echo.
echo =======================================================
echo                   !! PERINGATAN !!
echo =======================================================
echo  Database '%DB_NAME%' akan di-REPLACE dengan isi file:
echo  !TARGET_FILE!
echo.
echo  Semua data yang ada saat ini akan TERTIMPA!
echo  Pastikan Anda sudah backup data terbaru!
echo =======================================================
echo.
set /p CONFIRM="Ketik YES untuk lanjutkan (atau tekan Enter untuk batal): "
if /i "!CONFIRM!" neq "YES" (
    echo.
    echo [BATAL] Proses restore dibatalkan.
    pause
    exit /b
)

echo.
echo Sedang memproses restore database... Mohon tunggu...
echo.

if "!USE_DOCKER!"=="yes" (
    echo Mode: DOCKER ^(Container: %CONTAINER_NAME%^)
    echo.

    REM === LANGKAH 1: Drop & Recreate database di dalam container ===
    echo [1/3] Menghapus database lama dan membuat ulang...
    docker exec -e PGPASSWORD=%PGPASSWORD_DOCKER% %CONTAINER_NAME% psql -U %DB_USER% -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='%DB_NAME%' AND pid <> pg_backend_pid();" >nul 2>&1
    docker exec -e PGPASSWORD=%PGPASSWORD_DOCKER% %CONTAINER_NAME% psql -U %DB_USER% -d postgres -c "DROP DATABASE IF EXISTS %DB_NAME%;" >nul 2>&1
    docker exec -e PGPASSWORD=%PGPASSWORD_DOCKER% %CONTAINER_NAME% psql -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME%;" >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [GAGAL] Tidak bisa reset database. Pastikan container berjalan.
        goto :error_end
    )
    echo  -> Database berhasil direset.

    REM === LANGKAH 2: Copy file backup ke dalam container ===
    echo [2/3] Menyalin file backup ke container...
    docker cp "%BACKUP_PATH%" %CONTAINER_NAME%:/tmp/restore_target.sql
    if %ERRORLEVEL% neq 0 (
        echo [GAGAL] Tidak bisa copy file ke container.
        goto :error_end
    )
    echo  -> File berhasil disalin.

    REM === LANGKAH 3: Jalankan restore dari dalam container ===
    echo [3/3] Memuat data backup ke database...
    docker exec -e PGPASSWORD=%PGPASSWORD_DOCKER% %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% -f /tmp/restore_target.sql
    set RESTORE_ERR=%ERRORLEVEL%

    REM Bersihkan file temp di container
    docker exec %CONTAINER_NAME% rm -f /tmp/restore_target.sql >nul 2>&1

    if !RESTORE_ERR! neq 0 (
        echo.
        echo [GAGAL] Terjadi kesalahan saat memuat data.
        echo Cek pesan error di atas. Error kecil seperti 'already exists' bisa diabaikan.
        goto :check_end
    )

) else (
    echo Mode: LOKAL ^(Host: %DB_HOST%, Port: %DB_PORT%^)
    echo.

    REM Cek apakah psql.exe ada
    if not exist "%PG_PSQL_EXE%" (
        echo [ERROR] psql.exe tidak ditemukan di:
        echo   %PG_PSQL_EXE%
        echo.
        echo Coba cari psql di PATH sistem...
        where psql >nul 2>&1
        if %ERRORLEVEL% equ 0 (
            echo Ditemukan psql di PATH. Menggunakan versi tersebut...
            set PG_PSQL_EXE=psql
        ) else (
            echo [GAGAL] psql tidak ditemukan. Install PostgreSQL client tools.
            goto :error_end
        )
    )

    set PGPASSWORD=%PGPASSWORD_LOCAL%
    echo [1/1] Memuat data backup ke database...
    "%PG_PSQL_EXE%" -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_PATH%"
    if %ERRORLEVEL% neq 0 (
        goto :error_end
    )
)

:check_end
echo.
echo =======================================================
echo  [SELESAI] Proses restore selesai!
echo  File  : !TARGET_FILE!
echo =======================================================
echo.
echo  PENTING: Restart backend agar data terbaru aktif.
if "!USE_DOCKER!"=="yes" (
    echo  Jalankan perintah berikut:
    echo    docker restart voc_backend
)
echo.
pause
exit /b

:error_end
echo.
echo =======================================================
echo  [GAGAL] Terjadi kesalahan saat proses restore!
echo =======================================================
echo.
echo Kemungkinan penyebab:
if "!USE_DOCKER!"=="yes" (
    echo  1. Container '%CONTAINER_NAME%' tidak berjalan
    echo     Solusi: Buka Docker Desktop, pastikan voc_postgres Running
    echo     Atau jalankan: docker start %CONTAINER_NAME%
    echo  2. Password Docker salah
    echo     Cek: file .env di folder instalasi (DB_PASSWORD)
    echo  3. File backup rusak atau tidak kompatibel
) else (
    echo  1. PostgreSQL tidak berjalan di port %DB_PORT%
    echo  2. Password salah (cek file .env)
    echo  3. psql.exe tidak ditemukan atau versi tidak sesuai
    echo  4. File backup rusak
)
echo.
pause
endlocal
