@echo off
color 0B
echo =======================================================
echo     PEMBERSIHAN CACHE DOCKER - PC CLIENT BILLIARD
echo =======================================================
echo.
echo Script ini akan menjalankan perintah untuk:
echo 1. Mencari container Redis yang sedang berjalan
echo 2. Menghapus (FLUSHALL) semua cache transaksi yang nyangkut
echo 3. Merestart container Backend jika diperlukan
echo.
echo PERINGATAN: Pastikan Docker Desktop / Engine sudah berjalan.
echo.
pause

echo.
echo [*] Mencari dan membersihkan Cache Redis...
set REDIS_FOUND=0
FOR /F "tokens=*" %%i IN ('docker ps -q -f "name=redis"') DO (
    set REDIS_FOUND=1
    echo   - Ditemukan Redis Container: %%i
    docker exec %%i redis-cli FLUSHALL
    echo   - Cache Redis (FLUSHALL) berhasil dieksekusi!
)

IF %REDIS_FOUND%==0 (
    echo   [!] Container dengan nama "redis" tidak ditemukan. 
    echo       Mencoba mencari dengan container bawaan lain...
    FOR /F "tokens=*" %%i IN ('docker ps -q -f "ancestor=redis"') DO (
        set REDIS_FOUND=1
        echo   - Ditemukan Redis (Image): %%i
        docker exec %%i redis-cli FLUSHALL
        echo   - Cache Redis (FLUSHALL) berhasil dieksekusi!
    )
)

IF %REDIS_FOUND%==0 (
    echo   [X] Gagal menemukan container Redis. Pastikan docker sedang aktif.
)

echo.
echo [*] Merestart service backend...
FOR /F "tokens=*" %%i IN ('docker ps -q -f "name=backend"') DO (
    echo   - Merestart Backend Container: %%i
    docker restart %%i
)
FOR /F "tokens=*" %%i IN ('docker ps -q -f "name=api"') DO (
    echo   - Merestart API Container: %%i
    docker restart %%i
)

echo.
echo =======================================================
echo SELESAI!
echo Silakan refresh browser (tekan F5) pada aplikasi PC Client.
echo =======================================================
echo.
pause
