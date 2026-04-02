# Cara Pindah ke Komputer Baru

## Yang Perlu Dikopi ke Komputer Baru

Cukup salin folder `Billiard_APPS` ke komputer baru.
**Yang TIDAK perlu dikopi** (berat, akan di-generate otomatis):
- `backend/node_modules/`
- `frontend/node_modules/`
- `frontend/.next/`
- `backend/dist/`

### Cara cepat buat ZIP tanpa node_modules:
Klik kanan folder `Billiard_APPS` → 7-Zip → "Add to archive"
Atau jalankan di PowerShell:
```powershell
Compress-Archive -Path D:\Billiard_APPS\* `
  -DestinationPath D:\VOC_Billiard_APPS.zip `
  -CompressionLevel Optimal `
  # (Exclude node_modules manual via robocopy lebih baik)
```

**Cara terbaik - pakai robocopy** (otomatis exclude folder berat):
```bat
robocopy D:\Billiard_APPS D:\Billiard_APPS_COPY /E /XD node_modules .next dist .git
```

---

## Langkah di Komputer Baru

### 1. Salin folder
Copy folder `Billiard_APPS` ke komputer baru (USB/LAN/Google Drive)

### 2. Jalankan INSTALL.bat (sekali saja)
- Klik kanan `INSTALL.bat`
- Pilih **"Run as administrator"**
- Tunggu hingga selesai (~15-20 menit, tergantung internet)

### 3. Jalankan aplikasi
- Klik shortcut **"VOC Billiard"** di Desktop (dibuat otomatis saat install)
- Atau jalankan `DEPLOY.bat`

---

## Yang Diinstall Otomatis oleh INSTALL.bat

| Software | Fungsi |
|----------|--------|
| Node.js LTS | Runtime backend & frontend |
| PostgreSQL | Database utama |
| Redis/Memurai | Cache & session |
| Mosquitto | MQTT broker untuk ESP32 |
| PM2 | Process manager |

---

## Konfigurasi Database Baru

Saat instalasi pertama di komputer baru, database `billiard_db` akan dibuat kosong.
Jika ingin **membawa data dari komputer lama**:

### Export di komputer lama:
```bat
"C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -U postgres -p 4538 -h 127.0.0.1 billiard_db > backup_billiard.sql
```

### Import di komputer baru (setelah INSTALL.bat selesai):
```bat
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -p 4538 -h 127.0.0.1 billiard_db < backup_billiard.sql
```

---

## Troubleshooting

**PostgreSQL tidak mau connect:**
- Buka "pgAdmin" atau "psql"
- Pastikan port 4538 sudah dikonfigurasi saat install
- Atau ubah `DB_PORT` di `backend/.env` ke port aktual (default PostgreSQL: 5432)

**Frontend tidak bisa akses dari HP:**
- Jalankan `DEPLOY.bat` → akan update IP otomatis
- Pastikan PC dan HP dalam WiFi yang sama

**PM2 tidak mau start:**
- Jalankan sebagai Administrator
- Atau jalankan `pm2 kill` lalu `DEPLOY.bat` lagi
