@echo off
setlocal enabledelayedexpansion

title VOC Billiard - Reset Lisensi
color 0E
echo.
echo  ============================================================
echo    MERESET CACHE LISENSI APLIKASI
echo  ============================================================
echo.
echo  [1/3] Menghapus data lisensi lama di dalam backend...
docker exec voc_backend rm -f /app/storage/machine-id.txt /app/storage/license-state.json /app/storage/license-key.txt

echo  [2/3] Merestart layanan backend...
docker restart voc_backend

echo  [3/3] Selesai!
echo.
echo  Silakan refresh browser Anda. Aplikasi seharusnya sudah terkunci kembali.
echo.
pause >nul
endlocal
