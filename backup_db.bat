@echo off
REM =========================================================
REM  backup_db.bat — Auto Database Backup untuk Billiard App
REM  Setup: Windows Task Scheduler → jalankan setiap malam jam 02:00
REM =========================================================

SET MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin
SET DB_HOST=localhost
SET DB_PORT=3306
SET DB_USER=root
SET DB_PASS=your_password_here
SET DB_NAME=billiard_db
SET BACKUP_DIR=D:\Billiard_APPS\backups

REM Buat folder backup jika belum ada
IF NOT EXIST "%BACKUP_DIR%" MKDIR "%BACKUP_DIR%"

REM Format tanggal: YYYY-MM-DD
FOR /F "tokens=2-4 delims=/ " %%a IN ('date /t') DO (
    SET MM=%%a
    SET DD=%%b
    SET YYYY=%%c
)
SET DATE_STR=%YYYY%-%MM%-%DD%
SET FILENAME=%BACKUP_DIR%\billiard_backup_%DATE_STR%.sql

REM Buat backup
"%MYSQL_PATH%\mysqldump.exe" ^
    -h%DB_HOST% ^
    -P%DB_PORT% ^
    -u%DB_USER% ^
    -p%DB_PASS% ^
    --single-transaction ^
    --routines ^
    --triggers ^
    %DB_NAME% > "%FILENAME%"

IF %ERRORLEVEL% EQU 0 (
    echo [%DATE% %TIME%] Backup berhasil: %FILENAME% >> "%BACKUP_DIR%\backup_log.txt"
    echo Backup berhasil: %FILENAME%
) ELSE (
    echo [%DATE% %TIME%] BACKUP GAGAL! >> "%BACKUP_DIR%\backup_log.txt"
    echo BACKUP GAGAL! Cek koneksi database.
    EXIT /B 1
)

REM Hapus backup lebih dari 30 hari (hemat disk)
FORFILES /P "%BACKUP_DIR%" /S /M *.sql /D -30 /C "cmd /c del @path" 2>NUL
IF %ERRORLEVEL% EQU 0 (
    echo [%DATE% %TIME%] File lama berhasil dibersihkan >> "%BACKUP_DIR%\backup_log.txt"
)

echo.
echo === Backup selesai! ===
echo File: %FILENAME%
echo Backup disimpan di: %BACKUP_DIR%
