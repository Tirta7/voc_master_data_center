@echo off
echo ========================================================
echo        MENGHENTIKAN SEMUA AKTIVITAS NODE.JS (PORT)
echo ========================================================
echo.
echo Mencari dan mematikan semua proses Node.js yang nyangkut...
taskkill /F /IM node.exe /T

echo.
echo Mencari proses spesifik di Port 3000 (Frontend)...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3000') DO (
  echo Mematikan PID %%T yang menggunakan Port 3000
  taskkill /F /PID %%T
)

echo.
echo Mencari proses spesifik di Port 3001 (Backend)...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3001') DO (
  echo Mematikan PID %%T yang menggunakan Port 3001
  taskkill /F /PID %%T
)

echo.
echo ========================================================
echo SELESAI! Semua port dan proses telah dibersihkan.
echo Anda sekarang bisa menjalankan npm run dev kembali.
echo ========================================================
pause
