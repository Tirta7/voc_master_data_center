# 🏢 PANDUAN INSTALASI MULTI-CABANG DI 1 PC (SERVER PUSAT)
# VOC BILLIARD MANAGEMENT SYSTEM

> **Tujuan:** Panduan ini menjelaskan cara menginstall dan menjalankan **lebih dari 1 cabang (misal: 3 cabang)** di dalam 1 PC fisik yang sama.
> **Syarat:** PC Server memiliki spesifikasi yang mumpuni (Rekomendasi: Minimal 8 Core, 16GB/32GB RAM).

---

## 🏗️ KONSEP DASAR

Secara default, VOC Billiard menggunakan port standar (Frontend: 3000, Backend: 4000, dll). Jika Anda menginstall cabang kedua di PC yang sama tanpa modifikasi, akan terjadi **"Port Conflict" (Bentrok)** dan aplikasi cabang kedua akan gagal berjalan.

Solusinya adalah mengisolasi setiap cabang dengan:
1. **Folder Instalasi Berbeda**
2. **Port Publik Berbeda**
3. **Nama Container & Volume Docker Berbeda**
4. **Cloudflare Tunnel Berbeda**

---

## 📊 TABEL PEMBAGIAN PORT (CONTOH UNTUK 3 CABANG)

Gunakan tabel ini sebagai acuan standar agar port tidak saling tumpang tindih.

| Layanan | Cabang 1 (Default) | Cabang 2 | Cabang 3 |
|---------|-------------------|----------|----------|
| **Akses Lokal (Browser)** | `http://localhost:3000` | `http://localhost:3001` | `http://localhost:3002` |
| **Frontend Port** | `3000` | `3001` | `3002` |
| **Backend Port** | `4000` | `4001` | `4002` |
| **Database Port** | `5432` | `5433` | `5434` |
| **Redis Port** | `6379` | `6380` | `6381` |
| **MQTT TCP Port** | `1883` | `1884` | `1885` |
| **MQTT WS Port** | `8083` | `8084` | `8085` |

---

## 🛠️ LANGKAH-LANGKAH IMPLEMENTASI

### 📌 STEP 1: Buat Folder Terpisah untuk Setiap Cabang

Gunakan script `BUKA_CABANG_BARU.bat` dari kantor pusat seperti biasa untuk meng-generate installer tiap cabang.
Setelah digenerate, letakkan di folder terstruktur, misalnya di PC Server tersebut:
- `D:\VOC_Server\Cabang_Gresik\` (Cabang 1)
- `D:\VOC_Server\Cabang_Surabaya\` (Cabang 2)
- `D:\VOC_Server\Cabang_Sidoarjo\` (Cabang 3)

### 📌 STEP 2: Modifikasi `docker-compose.yml` (Cabang 2 & Seterusnya)

> [!CAUTION]
> Langkah ini sangat krusial. Anda harus mengganti mapping port di sebelah **KIRI** titik dua (`:`). **Jangan ubah port di sebelah kanan** karena itu adalah port internal container.

Buka file `docker-compose.yml` di folder **Cabang 2 (Surabaya)** dan ubah portnya:

**1. Database (Postgres):**
```yaml
ports:
  - "5433:5432" # Ubah port kiri menjadi 5433
```

**2. Redis:**
```yaml
ports:
  - "6380:6379" # Ubah port kiri menjadi 6380
```

**3. Mosquitto (MQTT):**
```yaml
ports:
  - "1884:1883" # Ubah port kiri
  - "8084:8083" # Ubah port kiri
```

**4. Backend:**
```yaml
ports:
  - "4001:4000" # Ubah port kiri
```

**5. Frontend:**
```yaml
ports:
  - "3001:3000" # Ubah port kiri
```

**6. Ubah Nama Container (Opsional tapi disarankan):**
Agar mudah dipantau di Docker Desktop dan tidak bingung, tambahkan `container_name` di setiap service. Contoh pada backend:
```yaml
  backend:
    container_name: voc_backend_surabaya
    image: ghcr.io/tirta7/voc-backend:latest
    # ...
```

*(Lakukan hal serupa untuk Cabang 3 dengan Port sesuai tabel di atas).*

### 📌 STEP 3: Modifikasi Cloudflare Tunnel

Karena Cloudflare Tunnel bertugas mengekspos localhost ke internet, Anda harus mengarahkannya ke port yang baru.

Buka file `cloudflare/config.yml` di folder **Cabang 2 (Surabaya)**. Ubah port di bagian `service`:

```yaml
ingress:
  # Frontend mengarah ke 3001
  - hostname: surabaya.vocbilliard.online
    service: http://host.docker.internal:3001
  
  # Backend mengarah ke 4001
  - hostname: api.surabaya.vocbilliard.online
    service: http://host.docker.internal:4001
    
  # MQTT mengarah ke 8084
  - hostname: mqtt.surabaya.vocbilliard.online
    service: http://host.docker.internal:8084
```

> [!NOTE]
> Gunakan `host.docker.internal` agar container cloudflared di dalam Docker bisa mengakses port localhost dari PC Host (Windows). Jangan menggunakan `localhost:3001` di sini.

### 📌 STEP 4: Modifikasi Konfigurasi Ekstra (.env)

Setiap cabang tetap dianggap sebagai entitas independen. Buka file `.env` di masing-masing cabang (setelah instalasi) atau masukkan data ini saat inisiasi awal:
1. `LOCATION_NAME=Billiard Surabaya`
2. `MACHINE_ID=VOC-XXXX-SBY` (Tambahkan akhiran `-SBY` atau kode cabang agar tidak bentrok di server lisensi pusat, karena PC aslinya memiliki Machine ID yang sama).
3. `LICENSE_KEY=` (Isi dengan lisensi khusus cabang Surabaya).

### 📌 STEP 5: Penyesuaian Script `.bat` (INSTALL / MULAI)

Beberapa script `.bat` (seperti `INSTALL.bat` atau `MULAI.bat`) memiliki perintah untuk mengecek apakah aplikasi sudah berjalan (Health Check), yang secara default mengecek port `3000`.

Buka file `INSTALL.bat` dan `MULAI.bat` cabang ke-2 dengan Notepad, cari baris yang mengecek URL:
```bat
curl -s http://localhost:3000 > nul
```
Ubah menjadi port cabang tersebut:
```bat
curl -s http://localhost:3001 > nul
```
Ubah juga baris yang otomatis membuka browser agar mengarah ke port yang benar:
```bat
start http://localhost:3001
```

---

## 🚀 MENJALANKAN APLIKASI

Setelah semua modifikasi selesai:
1. Jalankan `INSTALL.bat` untuk Cabang 1 (Tunggu sampai selesai & sukses).
2. Jalankan `INSTALL.bat` untuk Cabang 2 (Tunggu sampai selesai & sukses).
3. Jalankan `INSTALL.bat` untuk Cabang 3 (Tunggu sampai selesai & sukses).

**Cara Akses:**
- **Cabang 1:** Buka `http://localhost:3000` di PC Server, atau `https://gresik.vocbilliard.online`.
- **Cabang 2:** Buka `http://localhost:3001` di PC Server, atau `https://surabaya.vocbilliard.online`.
- **Cabang 3:** Buka `http://localhost:3002` di PC Server, atau `https://sidoarjo.vocbilliard.online`.

---

## 🚨 TROUBLESHOOTING

### 1. Error: `bind: address already in use`
**Penyebab:** Ada port yang lupa diubah di `docker-compose.yml` sehingga bentrok dengan cabang lain.
**Solusi:** Cek kembali Langkah 2. Pastikan port kiri (sebelum titik dua) unik untuk setiap cabang.

### 2. Website Online Cabang 2 Error "Bad Gateway 502"
**Penyebab:** Cloudflare tunnel mengarah ke port yang salah (misal masih default mengarah ke 3000 atau 4000).
**Solusi:** Cek file `cloudflare/config.yml` di folder cabang tersebut. Pastikan sudah diubah mengarah ke `3001` dan `4001`. Restart container cloudflared cabang tersebut.

### 3. Container Saling Menimpa/Terhapus Saat Menjalankan Cabang Lain
**Penyebab:** Nama project docker (yang didapat dari nama folder utama) sama. Docker mengira itu adalah project yang sama dan akan melakukan overwrite.
**Solusi:** Pastikan nama folder utama berbeda (contoh: `Cabang_Gresik` dan `Cabang_Surabaya`). Docker Compose membaca nama folder sebagai prefix project.
