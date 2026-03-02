@echo off
title VOC BILLIARD - SEED DUMMY DATA
color 1F

echo ========================================================
echo        MEMASUKKAN DATA DUMMY (PURAT-PURA)
echo ========================================================
echo Aksi ini akan menambahkan data berikut ke sistem Anda:
echo - 2 Paket Billiard (Hemat 2 Jam & Puas 3 Jam)
echo - 3 Kategori Menu (FOOD, DRINK, SNACK)
echo - 8 Menu Cafe (Nasi Goreng, French Fries, dll)
echo - 2 Tingkat Member (PLATINUM & GOLD)
echo - 2 Member Mock (Budi & Dian) beserta Saldo
echo.
echo Pastikan Anda sudah menjalankan Reset Database sebelumnya.
echo ========================================================
echo.
pause

echo.
echo [1/2] Sedang menyuntikkan data dummy ke database...
cd d:\Billiard_APPS\backend
call npx ts-node -r tsconfig-paths/register seed-dummy.ts

echo.
echo ========================================================
echo [2/2] INJEKSI DATA BERHASIL!
echo ========================================================
echo Anda sekarang bisa membuka sistem kasir dan langsung
echo menemukan menu cafe serta member siap pakai.
echo.
pause
