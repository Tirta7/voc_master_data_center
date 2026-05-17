# ═══════════════════════════════════════════════════════════════════════════════════════
# PANDUAN INSTALASI VOC BILLIARD SYSTEM
# Multi-Location Ready - Deployment via GitHub
# ═══════════════════════════════════════════════════════════════════════════════════════

## 📋 PERGUNTAN UMUM

### Q: Berapa lama instalasi?
**A:** ~5 menit (setelah Docker terinstall)

### Q: Apakah perlu install satu-satu seperti Redis, PostgreSQL, dll?
**A:** Tidak! Docker Compose sudah otomatis menginstal semua dependency.

### Q: Berapa biaya untuk setup?
**A:** Tidak ada biaya untuk software open source. Yang perlu dipertimbangkan:
- Server/PC untuk menjalankan aplikasi
- Domain opsional untuk akses dari luar
- Koneksi internet stabil

---

## 🖥️ PERSYARATAN SISTEM

### Hardware Minimum:
| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| CPU | 2 Core | 4 Core |
| RAM | 4 GB | 8 GB |
| Storage | 20 GB | 50 GB SSD |
| OS | Windows 10/11, Ubuntu 20.04+, macOS 12+ |

### Software Wajib:
- **Docker Desktop** (https://docker.com/get-started)
- **Git** (https://git-scm.com)

---

## 🚀 LANGKAH INSTALASI

### ════════════════════════════════════════════════
### LANGKAH 1: Install Docker Desktop
### ════════════════════════════════════════════════

#### Windows:
```
1. Download Docker Desktop:
   https://docs.docker.com/desktop/install/windows-install/

2. Jalankan installer (.exe)
3. Ikuti instruksi di layar
4. Restart komputer (WAJIB)
5. Pastikan Docker icon muncul di system tray
6. Klik kanan Docker > Settings > Resources
   - Set Memory: minimal 4GB
   - Set CPUs: minimal 2
```

#### Ubuntu/Linux:
```bash
# Install Docker
sudo apt update
sudo apt install docker.io docker-compose

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (optional)
sudo usermod -aG docker $USER
```

#### macOS:
```
1. Download Docker Desktop:
   https://docs.docker.com/desktop/install/mac-install/

2. Jalankan installer (.dmg)
3. Drag Docker ke Applications
4. Buka Docker dari Applications
5. Tunggu sampai "Docker is running" muncul
```

---

### ════════════════════════════════════════════════
### LANGKAH 2: Clone Repository dari GitHub
### ════════════════════════════════════════════════

#### Jika belum punya repository lokal:
```bash
# Buka Terminal/Command Prompt
git clone https://github.com/Tirta7/voc_master_data_center.git
cd voc_master_data_center
```

#### Jika sudah punya repository lokal:
```bash
# Buka folder project
cd path/to/voc_master_data_center

# Update ke versi terbaru
git pull origin main
```

---

### ════════════════════════════════════════════════
### LANGKAH 3: Setup Konfigurasi
### ════════════════════════════════════════════════

```bash
# Buat file .env dari template
cp .env.example .env

# Edit .env dengan text editor favorit
# Windows: notepad .env
# Linux/Mac: nano .env atau code .env
```

#### Konfigurasi WAJIB di .env:

```env
# 1. IDENTITAS LOKASI (UNIK untuk setiap client!)
LOCATION_ID=LOKASI_ANDA_01
LOCATION_NAME=Nama Tempat Billiard Anda
LOCATION_CODE=LOK01

# 2. IP ADDRESS SERVER (cek dengan ipconfig/ip addr)
# GUNAKAN IP LOKAL, BUKAN localhost
SERVER_IP=192.168.1.100

# 3. PASSWORD DATABASE (ganti dengan password kuat!)
DB_PASSWORD=PasswordSuperRahasia2024!

# 4. MQTT CLIENT ID (harus unik per lokasi)
MQTT_CLIENT_ID=billiard_server_lokasi_anda

# 5. GOOGLE APPS SCRIPT (isi setelah setup GAS)
GAS_WEBAPP_URL=https://script.google.com/macros/s/YOUR_ID/exec
GAS_SECRET=secret_rahasia_anda
```

---

### ════════════════════════════════════════════════
### LANGKAH 4: Jalankan Installer
### ════════════════════════════════════════════════

#### Windows:
```
# Double-click file INSTALL.bat
# ATAU buka Command Prompt dan jalankan:
.\INSTALL.bat
```

#### Linux/Mac:
```bash
# Beri permission execution
chmod +x INSTALL.sh

# Jalankan installer
./INSTALL.sh
```

#### Manual (Semua OS):
```bash
# Start semua services
docker compose up -d

# Tunggu services ready
docker compose ps
```

---

### ════════════════════════════════════════════════
### LANGKAH 5: Verifikasi Instalasi
### ════════════════════════════════════════════════

```bash
# Cek status services
docker compose ps

# Cek log untuk error
docker compose logs --tail=50
```

#### Jika berhasil, Anda akan melihat:
```
NAME                STATUS
voc_postgres        healthy
voc_redis          healthy
voc_mosquitto      running
voc_backend        healthy
voc_frontend       healthy
```

#### Akses Sistem:
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:4000
- **Health Check:** http://localhost:4000/health

---

### ════════════════════════════════════════════════
### LANGKAH 6: Setup Google Apps Script
### ════════════════════════════════════════════════

Ikuti panduan lengkap di: `GAS_SETUP_GUIDE.md`

Ringkasan:
1. Buat Google Spreadsheet baru
2. Buat 4 sheet: Reports, Stock, Approvals, Decisions
3. Buka Apps Script (Extensions > Apps Script)
4. Copy kode dari `backend/src/external-sync/`
5. Edit SECRET_TOKEN
6. Deploy sebagai Web App
7. Copy URL ke `.env` > `GAS_WEBAPP_URL`
8. Samakan secret di `.env` > `GAS_SECRET`

---

## 🔧 KONFIGURASI TAMBAHAN

### ════════════════════════════════════════════════
### Konfigurasi ESP32 Firmware
### ════════════════════════════════════════════════

Untuk setiap lokasi billiard, firmware ESP32 perlu dikonfigurasi:

```cpp
// File: esp32_mqtt_client.ino

// Edit konfigurasi WiFi
const char* ssid = "Nama_WiFi_Lokasi";
const char* password = "Password_WiFi";

// Edit IP server MQTT (IP PC Server lokasi tersebut)
const char* mqtt_server = "192.168.1.100";  // SERVER_IP dari .env
```

### Konfigurasi Komandan ESP32 (Multi-Lantai):

```cpp
// File: espnow_gateway_komandan.ino

// Default MQTT Server IP
#define MQTT_DEFAULT_SERVER "192.168.1.100"

// Floor ID (1, 2, 3, dst)
#define FLOOR_DEFAULT 1
```

---

## 🔄 UPDATE APLIKASI

### Update ke Versi Terbaru:

```bash
# 1. Pull perubahan dari GitHub
git pull origin main

# 2. Rebuild dan restart
docker compose down
docker compose build --no-cache
docker compose up -d

# 3. Cek status
docker compose ps
```

---

## 🆘 TROUBLESHOOTING

### Error: "Port is already allocated"

```bash
# Cek port yang digunakan
netstat -an | grep 3001

# Ubah port di .env
FRONTEND_PORT=3002
```

### Error: "Connection refused" ke PostgreSQL

```bash
# Cek container postgres
docker compose logs postgres

# Reset database
docker compose down -v  # HAPUS SEMUA DATA!
docker compose up -d
```

### Error: "Docker is not running"

```bash
# Windows
Restart Docker Desktop dari system tray

# Linux
sudo systemctl start docker

# Mac
Buka Docker dari Applications
```

### Error: ESP32 tidak bisa connect ke MQTT

```
1. Cek IP server MQTT di firmware
2. Cek firewall Windows mengijinkan port 1883
3. Cek ESP32 sudah konek ke WiFi yang benar
4. Cek topik MQTT sesuai dengan MAC address
```

---

## 📞 PERMINTAAN BANTUAN

Jika menemukan error yang tidak bisa diselesaikan:
1. Buka issue di GitHub
2. Sertakan log error: `docker compose logs --tail=100`
3. Sertakan konfigurasi .env (hapus password!)

---

## ✅ CHECKLIST INSTALASI

```
Persiapan:
[ ] Komputer dengan OS supported
[ ] Docker Desktop terinstall
[ ] Git terinstall
[ ] Akses ke GitHub repository

Clone & Setup:
[ ] Clone repository dari GitHub
[ ] Buat .env dari .env.example
[ ] Edit LOCATION_ID unik per client
[ ] Edit SERVER_IP dengan IP lokal
[ ] Edit DB_PASSWORD kuat
[ ] Setup GAS dan catat URL
[ ] Update GAS_WEBAPP_URL dan GAS_SECRET

Instalasi:
[ ] Jalankan INSTALL.bat/.sh
[ ] Cek semua service healthy
[ ] Akses http://localhost:3001
[ ] Login ke sistem

Verifikasi:
[ ] Create test transaction
[ ] Cek data sync ke GAS
[ ] Test ESP32 connectivity
[ ] Test dari HP/client lain
```

---

## 📚 DOKUMENTASI LAINNYA

| Dokumen | Deskripsi |
|--------|-----------|
| `docker-compose.yml` | Konfigurasi deployment Docker |
| `.env.example` | Template environment variables |
| `GAS_SETUP_GUIDE.md` | Panduan setup Google Apps Script |
| `backend/README.md` | Dokumentasi Backend |
| `frontend/README.md` | Dokumentasi Frontend |
| `esp32_mqtt_client/README.md` | Dokumentasi ESP32 |