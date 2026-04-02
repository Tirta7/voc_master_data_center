@echo off
setlocal enabledelayedexpansion
title VOC Billiard — FACTORY RESET
color 0C
chcp 65001 > nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║            ⚠  VOC BILLIARD — FACTORY RESET  ⚠              ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                              ║
echo ║  Script ini akan MENGHAPUS SEMUA DATA:                      ║
echo ║   ✗ Semua data meja, transaksi, session                     ║
echo ║   ✗ Semua data member, karyawan, laporan                    ║
echo ║   ✗ Semua data menu, inventory, promo                       ║
echo ║   ✗ Semua setting aplikasi                                  ║
echo ║                                                              ║
echo ║  Yang akan tersisa setelah reset:                           ║
echo ║   ✓ Login: admin / 123  (dibuat ulang otomatis)             ║
echo ║   ✓ Semua tabel kosong, siap diisi dari awal                ║
echo ║                                                              ║
echo ║  TIDAK BISA DIKEMBALIKAN setelah dijalankan!                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: ─────────────────────────────────────────────────────────────
:: KONFIRMASI 1
:: ─────────────────────────────────────────────────────────────
set /p CONFIRM1="Ketik HAPUS untuk konfirmasi (atau Enter untuk batal): "
if /i not "%CONFIRM1%"=="HAPUS" (
    echo.
    echo [BATAL] Tidak ada yang dihapus. Terima kasih.
    pause
    exit /b 0
)

echo.
echo [!!] Konfirmasi kedua diperlukan.
set /p CONFIRM2="Apakah Anda YAKIN? Ketik YA untuk lanjut: "
if /i not "%CONFIRM2%"=="YA" (
    echo.
    echo [BATAL] Tidak ada yang dihapus.
    pause
    exit /b 0
)

echo.
echo [>>] Memulai proses Factory Reset...
echo.

:: ─────────────────────────────────────────────────────────────
:: STEP 1 — STOP APLIKASI
:: ─────────────────────────────────────────────────────────────
echo ── STEP 1: Stop Aplikasi ─────────────────────────────────────
pm2 stop all >nul 2>&1
pm2 delete all >nul 2>&1
echo [OK] Semua proses PM2 dihentikan.

:: ─────────────────────────────────────────────────────────────
:: STEP 2 — BACKUP OTOMATIS SEBELUM HAPUS
:: ─────────────────────────────────────────────────────────────
echo.
echo ── STEP 2: Backup Otomatis (jaga-jaga) ──────────────────────
set TIMESTAMP=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%~dp0backup_before_reset_%TIMESTAMP%.sql

:: Cari psql & pg_dump
set PSQL_DIR=""
for %%v in (17 16 15 14) do (
    if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
        set "PSQL_DIR=C:\Program Files\PostgreSQL\%%v\bin"
    )
)

set PGPASSWORD=1

if not %PSQL_DIR%=="" (
    echo [>>] Membuat backup: %BACKUP_FILE%
    "%PSQL_DIR%\pg_dump.exe" -U postgres -p 4538 -h 127.0.0.1 billiard_db > "%BACKUP_FILE%" 2>nul
    if exist "%BACKUP_FILE%" (
        for %%A in ("%BACKUP_FILE%") do set FSIZE=%%~zA
        if !FSIZE! gtr 100 (
            echo [OK] Backup berhasil: %BACKUP_FILE%
            echo [OK] Ukuran: !FSIZE! bytes
        ) else (
            echo [!] Backup mungkin kosong, lanjutkan...
        )
    )
) else (
    echo [!] pg_dump tidak ditemukan, backup dilewati.
)

:: ─────────────────────────────────────────────────────────────
:: STEP 3 — DROP & RECREATE DATABASE
:: ─────────────────────────────────────────────────────────────
echo.
echo ── STEP 3: Hapus dan Buat Ulang Database ─────────────────────

if %PSQL_DIR%=="" (
    where psql >nul 2>&1
    if %errorLevel% equ 0 (
        set "PSQL_DIR="
        set PSQL_CMD=psql
        set PGDUMP_CMD=pg_dump
    ) else (
        echo [ERROR] psql tidak ditemukan!
        echo         Pastikan PostgreSQL terinstall dan ada di PATH.
        pause
        exit /b 1
    )
) else (
    set PSQL_CMD="%PSQL_DIR%\psql.exe"
)

set PGPASSWORD=1

echo [>>] Menghapus database lama (billiard_db)...
%PSQL_CMD% -U postgres -p 4538 -h 127.0.0.1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'billiard_db' AND pid <> pg_backend_pid();" postgres >nul 2>&1
%PSQL_CMD% -U postgres -p 4538 -h 127.0.0.1 -c "DROP DATABASE IF EXISTS billiard_db;" postgres
if %errorLevel% neq 0 (
    echo [ERROR] Gagal menghapus database!
    echo         Pastikan tidak ada koneksi yang masih aktif.
    pause
    exit /b 1
)
echo [OK] Database lama dihapus.

echo [>>] Membuat database baru (kosong)...
%PSQL_CMD% -U postgres -p 4538 -h 127.0.0.1 -c "CREATE DATABASE billiard_db ENCODING 'UTF8';" postgres
if %errorLevel% neq 0 (
    echo [ERROR] Gagal membuat database baru!
    pause
    exit /b 1
)
echo [OK] Database baru berhasil dibuat.

:: ─────────────────────────────────────────────────────────────
:: STEP 4 — HAPUS CACHE REDIS
:: ─────────────────────────────────────────────────────────────
echo.
echo ── STEP 4: Hapus Cache Redis ─────────────────────────────────
where redis-cli >nul 2>&1
if %errorLevel% equ 0 (
    redis-cli FLUSHALL >nul 2>&1
    echo [OK] Cache Redis dihapus.
) else (
    echo [!] redis-cli tidak ditemukan, cache skip.
)

:: ─────────────────────────────────────────────────────────────
:: STEP 5 — HAPUS SESI WHATSAPP (jika ada)
:: ─────────────────────────────────────────────────────────────
echo.
echo ── STEP 5: Hapus Sesi WhatsApp ───────────────────────────────
if exist "%~dp0backend\auth_info_baileys\" (
    rd /s /q "%~dp0backend\auth_info_baileys" >nul 2>&1
    mkdir "%~dp0backend\auth_info_baileys" >nul 2>&1
    echo [OK] Sesi WhatsApp dihapus (perlu scan QR ulang).
) else (
    echo [OK] Tidak ada sesi WhatsApp.
)

:: ─────────────────────────────────────────────────────────────
:: STEP 6 — HAPUS LOG LAMA
:: ─────────────────────────────────────────────────────────────
echo.
echo ── STEP 6: Hapus Log Lama ────────────────────────────────────
if exist "%~dp0logs\" (
    del /q "%~dp0logs\*.log" >nul 2>&1
    echo [OK] Log lama dihapus.
) else (
    echo [OK] Tidak ada log.
)

:: ─────────────────────────────────────────────────────────────
:: STEP 7 — JALANKAN ULANG APLIKASI
:: ─────────────────────────────────────────────────────────────
echo.
echo ── STEP 7: Jalankan Ulang Aplikasi ───────────────────────────
echo [>>] Backend akan start dan auto-create semua tabel...
echo [>>] Seeder akan otomatis buat akun admin default.
echo.
call "%~dp0DEPLOY.bat"

:: ─────────────────────────────────────────────────────────────
:: SELESAI
:: ─────────────────────────────────────────────────────────────
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║               FACTORY RESET SELESAI! ✓                     ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║                                                              ║
echo ║  Database sudah KOSONG dan BARU                             ║
echo ║                                                              ║
echo ║  Login pertama:                                             ║
echo ║   URL      : http://localhost:3000                          ║
echo ║   Username : admin                                          ║
echo ║   Password : 123                                            ║
echo ║                                                              ║
echo ║  Langkah selanjutnya:                                       ║
echo ║   1. Login dengan admin / 123                               ║
echo ║   2. Ganti password di Settings                             ║
echo ║   3. Input data meja, tarif, karyawan, menu                 ║
echo ║   4. Daftarkan ESP32 di Manajemen Meja                      ║
echo ║                                                              ║
if exist "%BACKUP_FILE%" (
echo ║  Backup data lama tersimpan di:                             ║
echo ║  %BACKUP_FILE%
echo ║  (Simpan jika suatu saat dibutuhkan)                        ║
)
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
endlocal
