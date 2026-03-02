@echo off
title VOC BILLIARD - FACTORY RESET DATABASE
color 4F

echo ========================================================
echo        PERINGATAN: FACTORY RESET DATABASE
echo ========================================================
echo Aksi ini akan MENGHAPUS SEMUA DATA:
echo - Semua Transaksi Kasir, Billiard % Cafe
echo - Semua Log Harian % Kas
echo - Semua Data Member
echo.
echo Jika Anda melanjutkan, sistem akan di-reset murni dari 0.
echo ========================================================
echo.
pause

echo.
echo [1/2] Sedang menghapus dan menyetel ulang database...
cd d:\Billiard_APPS\backend
call npx ts-node -r tsconfig-paths/register factory-reset.ts

echo.
echo ========================================================
echo [2/2] DATABASE BERHASIL DIRESET!
echo ========================================================
echo.
echo PENTING: Untuk memastikan akun Admin bawaan terbuat kembali,
echo silakan matikan Server Backend Anda saat ini (tekan Ctrl+C di terminal),
echo lalu nyalakan ulang server backend (npm run start:dev).
echo.
echo Akun Bawaan:
echo Username: admin
echo Password: 123
echo.
pause
