================================================================
  VOC BILLIARD MANAGEMENT SYSTEM
  Panduan Instalasi Client (Docker Edition)
  Dibuat: 2026
================================================================

DAFTAR FILE DALAM FOLDER INI:
────────────────────────────────────────────────────────────────
  INSTALL.bat          ← INSTALLER UTAMA (klik ini pertama kali)
  MULAI.bat            ← Jalankan aplikasi setelah install
  STOP.bat             ← Matikan semua layanan
  UPDATE.bat           ← Update ke versi terbaru
  STATUS.bat           ← Cek status semua layanan
  docker-compose.yml   ← Konfigurasi Docker (jangan diubah)
  mosquitto.conf       ← Konfigurasi MQTT Broker (jangan diubah)
  .token.example       ← Template token (salin & rename ke .token)
  .token               ← File token RAHASIA (dibuat teknisi)
  .env                 ← Konfigurasi otomatis (dibuat saat install)
================================================================


LANGKAH INSTALASI PC CLIENT BARU:
────────────────────────────────────────────────────────────────

PERSIAPAN (oleh Teknisi VOC):
  1. Copy seluruh folder INSTALLER_CLIENT ke PC client
     (via USB, Google Drive, atau transfer langsung)

  2. Siapkan file .token:
     a. Salin file .token.example
     b. Rename menjadi .token (tanpa .example)
     c. Isi GITHUB_TOKEN dengan token dari GitHub:
        → Buka: https://github.com/settings/tokens/new
        → Token type: Classic
        → Scope: centang "read:packages"
        → Copy token yang dihasilkan
     d. Isi LOCATION_NAME dengan nama lokasi client
        Contoh: LOCATION_NAME=Ballistic Billiard Surabaya

INSTALASI (di PC Client):
  3. Pastikan PC terkoneksi internet (min. 5 Mbps, stabil)
  4. Klik kanan INSTALL.bat → Run as administrator
     (atau double-click, lalu klik YES pada popup UAC)
  5. Tunggu proses selesai (10-30 menit pertama kali)
     - Docker Desktop akan diinstall otomatis jika belum ada
     - Semua image diunduh dari cloud (PostgreSQL, Redis, MQTT, dll)
  6. Setelah selesai, browser otomatis terbuka ke aplikasi

SELESAI! Shortcut VOC Billiard sudah ada di Desktop.

================================================================


PENGGUNAAN SEHARI-HARI:
────────────────────────────────────────────────────────────────

  MENJALANKAN APLIKASI:
    → Klik shortcut "VOC Billiard" di Desktop
    → atau jalankan MULAI.bat

  MEMATIKAN APLIKASI:
    → Klik shortcut "VOC Billiard - STOP" di Desktop
    → atau jalankan STOP.bat

  CEK STATUS:
    → Jalankan STATUS.bat

  UPDATE KE VERSI TERBARU:
    → Jalankan UPDATE.bat (perlu koneksi internet)


LAYANAN YANG BERJALAN:
────────────────────────────────────────────────────────────────

  PostgreSQL  → Database utama           (port 5432)
  Redis       → Cache & session          (port 6379)
  Mosquitto   → MQTT Broker (ESP32)      (port 1883 TCP)
                                         (port 8083 WebSocket)
  Backend     → API NestJS               (port 4000)
  Frontend    → Antarmuka Next.js        (port 3000)


AKSES APLIKASI:
────────────────────────────────────────────────────────────────

  Dari PC tempat install:
    http://localhost:3000

  Dari HP / PC lain di jaringan yang sama:
    http://<IP-PC-SERVER>:3000
    (IP ditampilkan saat INSTALL.bat selesai)

  Halaman Kasir / Billing:
    http://<IP-PC-SERVER>:3000/billing


TROUBLESHOOTING:
────────────────────────────────────────────────────────────────

  Aplikasi tidak bisa dibuka?
    1. Jalankan STATUS.bat untuk cek status layanan
    2. Pastikan Docker Desktop berjalan (ikon di system tray)
    3. Jalankan MULAI.bat untuk restart semua layanan

  Gagal install Docker?
    → Pastikan Windows 10/11 64-bit
    → Pastikan fitur "Hyper-V" dan "WSL 2" aktif di Windows Features
    → Restart komputer, lalu jalankan INSTALL.bat lagi

  Gagal download (token error)?
    → Token mungkin expired. Buat token baru di GitHub:
      https://github.com/settings/tokens/new (scope: read:packages)
    → Update isi file .token dengan token baru
    → Jalankan INSTALL.bat lagi

  Error port sudah dipakai?
    → Cek apakah ada aplikasi lain yang menggunakan port 3000/4000/1883
    → Matikan aplikasi tersebut, lalu jalankan MULAI.bat

================================================================

KONTAK TEKNISI VOC:
  GitHub: https://github.com/Tirta7/voc_master_data_center

================================================================
