@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title VOC Billiard - Pulihkan Database
color 0B

echo.
echo =====================================================
echo    VOC BILLIARD - RESTORE DATABASE
echo =====================================================
echo.

:: --- 1. Deteksi apakah psql.exe terinstal di Windows Host ---
set "PSQL_PATH="
where psql >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PSQL_PATH=psql"
    goto PSQL_FOUND
) else (
    :: Cek lokasi instalasi standar PostgreSQL di Windows
    for %%v in (18 17 16 15 14) do (
        if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
            set "PSQL_PATH=C:\Program Files\PostgreSQL\%%v\bin\psql.exe"
            goto PSQL_FOUND
        )
    )
)

:PSQL_FOUND
:: --- 2. Cari file backup .sql di folder saat ini ---
echo Daftar file backup yang ditemukan:
set "count=0"
for %%f in (backup_billiard_*.sql) do (
    set /a count+=1
    set "file[!count!]=%%f"
    echo   [!count!] %%f
)

if !count! equ 0 (
    echo [!] Tidak ada file backup (backup_billiard_*.sql) ditemukan di folder ini.
    echo     Pastikan file backup diletakkan di satu folder dengan script ini.
    echo.
    pause
    exit /b 1
)
echo.

:: --- 3. Meminta input pilihan ---
set "choice="
set /p choice="Pilih nomor file backup yang ingin di-restore (1-!count!): "

:: Validasi input
if "!choice!"=="" (
    echo [ERROR] Pilihan tidak boleh kosong!
    echo.
    pause
    exit /b 1
)

if not defined file[!choice!] (
    echo [ERROR] Pilihan nomor !choice! tidak valid!
    echo.
    pause
    exit /b 1
)

:: Mengambil nama file dengan aman menggunakan delayed expansion
for %%v in (!choice!) do set "SELECTED_BACKUP=!file[%%v]!"

echo.
echo =====================================================
echo  PERINGATAN KESELAMATAN DATA
echo =====================================================
echo  Memulihkan database akan menghapus dan menimpa
echo  seluruh transaksi dan data yang berjalan saat ini!
echo =====================================================
echo.

set "confirm="
set /p confirm="Apakah Anda yakin ingin memulihkan !SELECTED_BACKUP!? (Y/N): "
if /i "!confirm!" neq "Y" (
    echo [!] Restorasi dibatalkan oleh pengguna.
    echo.
    pause
    exit /b 0
)

echo.
echo [>>] Sedang memulihkan database dari !SELECTED_BACKUP!...
echo     (Harap tunggu beberapa saat...)

:: --- 4. Proses pemulihan database ---
if not "!PSQL_PATH!"=="" (
    echo [INFO] Menggunakan psql lokal untuk pemulihan...
    set "PGPASSWORD=1"
    if "!PSQL_PATH!"=="psql" (
        psql -h 127.0.0.1 -p 4538 -U postgres -d billiard_db < "!SELECTED_BACKUP!"
    ) else (
        "!PSQL_PATH!" -h 127.0.0.1 -p 4538 -U postgres -d billiard_db < "!SELECTED_BACKUP!"
    )
) else (
    echo [INFO] Menggunakan psql Docker untuk pemulihan...
    docker exec -i voc_postgres psql -U postgres -d billiard_db < "!SELECTED_BACKUP!"
)

if !errorlevel! equ 0 (
    echo.
    echo =====================================================
    echo    RESTORE SELESAI!
    echo    Database berhasil dipulihkan ke kondisi cadangan.
    echo =====================================================
) else (
    echo.
    echo [ERROR] Terjadi kegagalan saat menyuntikkan data backup.
    echo Pastikan PostgreSQL (Service Windows / Docker) aktif dan password/port sudah sesuai.
)

echo.
pause
endlocal
