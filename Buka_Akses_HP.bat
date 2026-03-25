@echo off
setlocal
title MEMBUKA AKSES FIREWALL UNTUK HP
color 0E

echo ========================================================
echo    MENGIZINKAN AKSES HP KE SERVER (FIREWALL SETUP)
echo ========================================================
echo.
echo Pastikan Anda MENJALANKAN FILE INI SEBAGAI ADMINISTRATOR!
echo (Klik kanan file ini -> Run as Administrator)
echo.
pause

echo - Mengizinkan Port 3000 (Frontend)
netsh advfirewall firewall add rule name="VOC_BILLIARD_FRONTEND" dir=in action=allow protocol=TCP localport=3000

echo - Mengizinkan Port 4000 (Backend)
netsh advfirewall firewall add rule name="VOC_BILLIARD_BACKEND" dir=in action=allow protocol=TCP localport=4000

echo - Mengizinkan Port 8083 (MQTT Websocket)
netsh advfirewall firewall add rule name="VOC_BILLIARD_MQTT" dir=in action=allow protocol=TCP localport=8083

echo.
echo ========================================================
echo   SELESAI! Akses HP seharusnya sudah terbuka.
echo ========================================================
echo.
echo IP Server Anda: 192.168.1.22
echo Buka di HP: http://192.168.1.22:3000
echo.
pause
