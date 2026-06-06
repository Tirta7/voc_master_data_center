@echo off
setlocal enabledelayedexpansion

REM ==========================================
REM KONFIGURASI BACKUP POSTGRESQL
REM ==========================================

REM Kredensial Database
set DB_USER=postgres
set DB_NAME=billiard_db
set PGPASSWORD=1

REM Jika menggunakan PostgreSQL lokal (bukan Docker), isi HOST dan PORT
set DB_HOST=localhost
set DB_PORT=4538

REM ==========================================
REM LOKASI APLIKASI PG_DUMP LOKAL
REM ==========================================
REM Jika muncul error 'pg_dump is not recognized', berarti PostgreSQL belum masuk ke PATH Windows.
REM Silakan ganti path di bawah ini sesuai dengan versi PostgreSQL yang ter-install di laptop Anda.
REM (Contoh versi 15: "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe")
set PG_DUMP_EXE="C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"


REM ==========================================
REM KONFIGURASI DOCKER
REM ==========================================
REM Set USE_DOCKER=yes jika menggunakan Docker, set USE_DOCKER=no jika lokal
set USE_DOCKER=no
REM Nama container Docker PostgreSQL Anda (hanya dipakai jika USE_DOCKER=yes)
set CONTAINER_NAME=postgres_db

REM ==========================================
REM KONFIGURASI FILE OUTPUT
REM ==========================================
set BACKUP_DIR=.\backups

REM Mendapatkan format waktu yang aman (YYYYMMDD_HHMMSS)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set mydate=%datetime:~0,8%
set mytime=%datetime:~8,6%
set FILENAME=%DB_NAME%_backup_%mydate%_%mytime%.sql
set BACKUP_PATH=%BACKUP_DIR%\%FILENAME%

REM Buat folder jika belum ada
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo ========================================
echo Memulai Backup Database: %DB_NAME%
echo ========================================

if "%USE_DOCKER%"=="yes" (
    echo Mode: DOCKER ^(Container: %CONTAINER_NAME%^)
    REM Menjalankan pg_dump di dalam container dan mengarahkan outputnya ke file lokal
    docker exec -e PGPASSWORD="%PGPASSWORD%" %CONTAINER_NAME% pg_dump -U %DB_USER% %DB_NAME% > "%BACKUP_PATH%"
) else (
    echo Mode: LOKAL ^(Host: %DB_HOST%, Port: %DB_PORT%^)
    set PGPASSWORD=%PGPASSWORD%
    %PG_DUMP_EXE% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME% > "%BACKUP_PATH%"
)

if %ERRORLEVEL% equ 0 (
    echo.
    echo [BERHASIL] Backup tersimpan di: %BACKUP_PATH%
) else (
    echo.
    echo [GAGAL] Terjadi kesalahan saat proses backup! 
    echo Pastikan kredensial benar dan file pg_dump.exe ditemukan.
    REM Hapus file backup jika kosong
    if exist "%BACKUP_PATH%" (
        for %%A in ("%BACKUP_PATH%") do if %%~zA equ 0 del "%BACKUP_PATH%"
    )
)

echo ========================================
pause
endlocal
