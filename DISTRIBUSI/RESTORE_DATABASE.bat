@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title VOC Billiard - Pulihkan Database
color 0B

echo.
echo =====================================================
echo    VOC BILLIARD - RESTORE DATABASE (Docker)
echo =====================================================
echo.

:: --- 1. Pastikan container postgres berjalan ---
echo [>>] Memeriksa kesiapan mesin database...
docker exec voc_postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Container database (voc_postgres) tidak aktif!
    echo         Silakan jalankan DEPLOY.bat terlebih dahulu.
    echo.
    pause
    exit /b 1
)

:: --- 2. Cari file backup .sql di folder saat ini ---
set count=0
for %%f in (backup_billiard_*.sql) do (
    set /a count+=1
    set "file[!count!]=%%f"
)

if %count% equ 0 (
    echo [!] Tidak ada file backup (backup_billiard_*.sql) ditemukan di folder ini.
    echo     Pastikan file backup diletakkan di satu folder dengan script ini.
    echo.
    pause
    exit /b 1
)

echo Daftar file backup yang ditemukan:
for /l %%i in (1,1,%count%) do (
    echo   [%%i] !file[%%i]!
)
echo.

:: --- 3. Meminta input pilihan ---
set /p choice="Pilih nomor file backup yang ingin di-restore (1-%count%): "

:: Validasi input
if not defined file[%choice%] (
    echo [ERROR] Pilihan nomor tidak valid!
    echo.
    pause
    exit /b 1
)

set "SELECTED_BACKUP=!file[%choice%]!"
echo.
echo =====================================================
echo  ⚠️  PERINGATAN KESELAMATAN DATA
echo =====================================================
echo  Memulihkan database akan menghapus dan menimpa
echo  seluruh transaksi dan data yang berjalan saat ini!
echo =====================================================
echo.

set /p confirm="Apakah Anda yakin ingin memulihkan %SELECTED_BACKUP%? (Y/N): "
if /i "%confirm%" neq "Y" (
    echo [!] Restorasi dibatalkan oleh pengguna.
    echo.
    pause
    exit /b 0
)

echo.
echo [>>] Sedang memulihkan database dari %SELECTED_BACKUP%...
echo     (Harap tunggu beberapa saat...)

:: --- 4. Proses pemulihan database ---
docker exec -i voc_postgres psql -U postgres -d billiard_db < "%SELECTED_BACKUP%"

if %errorlevel% equ 0 (
    echo.
    echo =====================================================
    echo    🎉 RESTORE SELESAI!
    echo    Database berhasil dipulihkan ke kondisi cadangan.
    echo =====================================================
    echo.
    echo  [i] Disarankan melakukan hard restart database agar sinkronisasi
    echo      berjalan mulus dengan mengeklik RESTART_DATABASE.bat
) else (
    echo.
    echo [ERROR] Terjadi kegagalan saat menyuntikkan data backup.
)

echo.
pause
endlocal
