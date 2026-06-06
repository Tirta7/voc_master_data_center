@echo off
setlocal enabledelayedexpansion

REM ==========================================
REM KONFIGURASI RESTORE POSTGRESQL
REM ==========================================
REM Kredensial ini sudah saya sesuaikan dengan yang ada di aplikasi Anda
set DB_USER=postgres
set DB_NAME=billiard_db
set PGPASSWORD=1

REM Jika menggunakan PostgreSQL lokal (bukan Docker), isi HOST dan PORT
set DB_HOST=localhost
set DB_PORT=4538

REM ==========================================
REM LOKASI APLIKASI PSQL LOKAL
REM ==========================================
set PG_PSQL_EXE="C:\Program Files\PostgreSQL\18\bin\psql.exe"

REM ==========================================
REM KONFIGURASI DOCKER
REM ==========================================
REM Set USE_DOCKER=yes jika menggunakan Docker, set USE_DOCKER=no jika lokal
set USE_DOCKER=no
REM Nama container Docker PostgreSQL Anda (hanya dipakai jika USE_DOCKER=yes)
set CONTAINER_NAME=postgres_db

REM Folder tempat backup tersimpan
set BACKUP_DIR=.\backups

echo =======================================================
echo              MENU RESTORE DATABASE
echo =======================================================
echo.
echo DAFTAR FILE BACKUP YANG TERSEDIA:
echo -------------------------------------------------------

if not exist "%BACKUP_DIR%" (
    echo Folder backups tidak ditemukan! Belum ada backup yang dibuat.
    echo.
    pause
    exit /b
)

dir /b "%BACKUP_DIR%\*.sql"

echo -------------------------------------------------------
echo.
set /p TARGET_FILE="Ketik/Paste nama file yang ingin di-restore (lengkap dengan .sql) : "

set BACKUP_PATH=%BACKUP_DIR%\%TARGET_FILE%

if not exist "%BACKUP_PATH%" (
    echo.
    echo [ERROR] File '%TARGET_FILE%' tidak ditemukan di dalam folder backups!
    echo.
    pause
    exit /b
)

echo.
echo ===================== PERINGATAN ======================
echo Proses ini akan menjalankan perintah dari file backup 
echo ke dalam database '%DB_NAME%'.
echo Pastikan Anda memilih file yang benar!
echo =======================================================
pause

echo.
echo Sedang memproses load database... Mohon tunggu...

if "%USE_DOCKER%"=="yes" (
    echo Mode: DOCKER ^(Container: %CONTAINER_NAME%^)
    REM Menjalankan psql dengan memasukkan isi file backup (operator '<' di Windows CMD)
    docker exec -i -e PGPASSWORD="%PGPASSWORD%" %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% < "%BACKUP_PATH%"
) else (
    echo Mode: LOKAL ^(Host: %DB_HOST%, Port: %DB_PORT%^)
    set PGPASSWORD=%PGPASSWORD%
    %PG_PSQL_EXE% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_PATH%"
)

if %ERRORLEVEL% equ 0 (
    echo.
    echo [BERHASIL] Database berhasil di-restore/diload dari:
    echo %TARGET_FILE%
) else (
    echo.
    echo [GAGAL] Terjadi kesalahan saat proses restore.
    echo Cek pesan error di atas.
)

echo.
echo =======================================================
pause
endlocal
