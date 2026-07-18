# 🏢 Arsitektur Multi-Lantai — VOC Billiard System
> **Spot On Billiard** | Hybrid MQTT + ESP-NOW | Versi 5 — Async-Discovery

---

## 📐 Topologi Jaringan

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          SERVER & INTERNET                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║                    ┌─────────────────────────────┐                          ║
║                    │     SERVER PUSAT (NestJS)    │                          ║
║                    │   + MQTT Broker (Mosquitto)  │                          ║
║                    │   IP: 192.168.0.120:1883     │                          ║
║                    └──────────────┬──────────────┘                          ║
║                                   │ MQTT (TCP/IP)                            ║
║          ┌────────────────────────┼────────────────────────┐                ║
║          │                        │                        │                ║
║   ┌──────▼──────┐          ┌──────▼──────┐          ┌──────▼──────┐        ║
║   │ KOMANDAN L1 │          │ KOMANDAN L2 │          │ KOMANDAN L3 │        ║
║   │ floor_id=1  │          │ floor_id=2  │          │ floor_id=3  │        ║
║   │ WiFi: Auto  │          │ WiFi: Auto  │          │ WiFi: Auto  │        ║
║   │ (via Portal)│          │ (via Portal)│          │ (via Portal)│        ║
║   └──────┬──────┘          └──────┬──────┘          └──────┬──────┘        ║
║          │ ESP-NOW (MAC)          │ ESP-NOW (MAC)          │ ESP-NOW (MAC)  ║
║     ┌────┴────┐              ┌────┴────┐              ┌────┴────┐           ║
║   [M1][M2][M3]            [M4][M5]               [M6][M7][M8]              ║
║  Prajurit Lt.1           Prajurit Lt.2           Prajurit Lt.3             ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🚀 Alur Instalasi Client (Zero-Config Deployment)

### Tidak perlu laptop, tidak perlu Arduino IDE, tidak perlu tau SSID sebelumnya!

```
╔══════════════════════════════════════════════════════════════╗
║              WORKFLOW INSTALASI CLIENT                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  [Developer — sebelum kirim]                                ║
║       │                                                      ║
║       ├─ Flash Komandan (firmware sudah jadi, kosongan)      ║
║       ├─ Flash Prajurit + isi MESA_ID sesuai nomor meja     ║
║       ├─ Boot Komandan → catat MAC di Serial Monitor        ║
║       ├─ Isi GATEWAY_MAC di tiap Prajurit → flash           ║
║       └─ Kemas & kirim ke client ✅                          ║
║                                                              ║
║  [Client — saat instalasi di lokasi]                        ║
║       │                                                      ║
║       ├─ 1. Colokkan Komandan ke listrik                     ║
║       │       LED berkedip cepat = mode setup aktif         ║
║       │                                                      ║
║       ├─ 2. Buka WiFi di HP                                  ║
║       │       Pilih hotspot: "KOMANDAN-SETUP-L1"            ║
║       │       (tidak ada password)                           ║
║       │                                                      ║
║       ├─ 3. Browser otomatis terbuka (captive portal)        ║
║       │       atau buka manual: http://192.168.4.1          ║
║       │                                                      ║
║       ├─ 4. Isi form konfigurasi:                            ║
║       │       • Klik 🔍 Scan → pilih WiFi dari daftar       ║
║       │       • Masukkan password WiFi                       ║
║       │       • Masukkan IP Server MQTT                      ║
║       │       • Pilih Nomor Lantai                           ║
║       │                                                      ║
║       ├─ 5. Klik "Simpan & Sambungkan"                       ║
║       │       Komandan restart otomatis                      ║
║       │       LED menyala solid = terhubung WiFi ✅          ║
║       │                                                      ║
║       └─ 6. Colokkan semua Prajurit                          ║
║               Prajurit auto-cari Komandan via MAC           ║
║               Selesai! Sistem berjalan ✅                    ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 📱 Tampilan Portal Konfigurasi (di HP Client)

```
┌──────────────────────────────┐
│         ⚡ KOMANDAN Setup    │
│   VOC Billiard Management    │
│                              │
│  📡 MAC: 704BCA8F7255        │
│    (Salin untuk Prajurit)    │
│                              │
│  ━━━ 🔌 Koneksi WiFi ━━━    │
│  Nama WiFi: [________] 🔍   │
│  Password:  [________]      │
│                              │
│  ━━━ 🖥️ Server MQTT ━━━    │
│  IP Server: [192.168.0.120] │
│  Port:      [1883]          │
│                              │
│  ━━━ 🏢 Lantai ━━━━━━━━━   │
│  Nomor:     [Lantai 1 ▼]   │
│                              │
│  [💾 Simpan & Sambungkan]   │
└──────────────────────────────┘
```

---

## 🔧 Konfigurasi Per Perangkat

### Komandan — Hanya 2 hal yang diubah developer sebelum flash:

```cpp
// espnow_gateway_komandan.ino
#define MQTT_DEFAULT_SERVER "192.168.0.120"  // ← IP server (bisa diubah client via portal)
#define FLOOR_DEFAULT 1                       // ← Default lantai (bisa diubah client via portal)

// WiFi SSID/Password TIDAK ada di sini — diisi client saat instalasi!
```

### Prajurit — Hanya 2 hal yang diubah per meja:

```cpp
// espnow_node_prajurit.ino
#define MESA_ID 1                                                  // ← Nomor meja unik
uint8_t GATEWAY_MAC[] = {0x70, 0x4B, 0xCA, 0x8F, 0x72, 0x55};  // ← MAC Komandan lantai ini
```

> ✅ **Prajurit TIDAK perlu tahu SSID/Password WiFi apapun!**
> ✅ **Prajurit TIDAK perlu konfigurasi channel!** (auto-discover + cache SPIFFS)
> ✅ **Komandan TIDAK perlu re-flash saat pindah lokasi!** (reset via tombol BOOT)

---

## 🛡️ Sistem 3 Lapis Keamanan Channel

Masalah paling umum: **router ganti channel saat runtime atau saat restart**.

```
╔══════════════════════════════════════════════════════════════╗
║  LAPIS 1 — ASYNC BOOT SCAN (Anti-Stack-Overflow)            ║
╠══════════════════════════════════════════════════════════════╣
║  Setup() selesai dalam < 200ms (tidak blocking).            ║
║  Scan WiFi berjalan di background (async) di loop():         ║
║  • Cache ada? Scan 1 channel (L1) → Ketemu? Selesai ✅       ║
║  • Tidak ada/Gagal? Full scan 13 ch (L2) → Ketemu? Selesai ✅ ║
║  • Masih Gagal? Probe backup per channel → Selesai ✅        ║
║                                                              ║
║  🎯 Fix: Menghilangkan Crash Stack Memory pada ESP32-C3.     ║
╠══════════════════════════════════════════════════════════════╣
║  LAPIS 2 — RUNTIME BEACON MONITORING                        ║
╠══════════════════════════════════════════════════════════════╣
║  Komandan broadcast beacon setiap 30 detik berisi channel.  ║
║  Prajurit update channel secara real-time TANPA restart.    ║
║                                                              ║
║  🎯 Handles: router ganti channel saat sistem sedang jalan.  ║
╠══════════════════════════════════════════════════════════════╣
║  LAPIS 3 — AUTO-RESYNC (Jaring Pengaman Akhir)              ║
╠══════════════════════════════════════════════════════════════╣
║  3 menit tanpa sinyal Komandan:                             ║
║  → Loop() restart Async Discovery dari nol secara otomatis.  ║
║                                                              ║
║  ⏱ Downtime maksimal: 3 menit.                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 🔄 Reset Konfigurasi Komandan (Pindah Lokasi)

Jika Komandan dipindah ke lokasi baru dengan WiFi berbeda:

```
1. Tahan tombol BOOT (GPIO0) selama 5 detik
      LED berkedip makin cepat → lepas tombol
      Buzzer bunyi 5x → konfigurasi terhapus

2. Komandan restart → masuk mode SETUP
   Hotspot "KOMANDAN-SETUP-Lx" aktif kembali

3. Isi konfigurasi baru via portal
```

> Tidak perlu laptop atau upload ulang firmware!

---

## 🛠️ Fitur Kontrol MQTT (Lantai Management)

Dashboard software dapat mengirim perintah ke Komandan via MQTT untuk mengelola seluruh Prajurit di lantai tersebut:

| Topic | Fungsi | Deskripsi |
|-------|--------|-----------|
| `.../beacon/force` | **Paksa Beacon** | Komandan langsung broadcast channel info ke semua Prajurit. |
| `.../channel/get` | **Query Info** | Komandan membalas dengan info channel, jumlah peer, IP, dll. |
| `.../resync` | **Force Resynchronize** | Komandan kirim N beacon berturut-turut untuk recover Prajurit offline. |
| `.../reboot` | **Restart Hardware** | Me-restart Komandan atau Prajurit tertentu. |

---

## 📡 Topik MQTT per Lantai

| Lantai | Komandan Subscribe | Komandan Publish |
|--------|-------------------|-----------------|
| Lt. 1  | `billiard/table/{MAC_L1}/#` | `billiard/table/{MAC_L1}/status` |
| Lt. 2  | `billiard/table/{MAC_L2}/#` | `billiard/table/{MAC_L2}/status` |
| Lt. 3  | `billiard/table/{MAC_L3}/#` | `billiard/table/{MAC_L3}/status` |

> **MAC** = MAC STA Komandan (dibaca otomatis, tercetak di Serial Monitor saat boot)

---

## 🔑 Cara Menemukan MAC Komandan (untuk konfigurasi Prajurit)

### Metode 1: Serial Monitor (saat assembling)
```
[BOOT] Komandan v3 — SmartDeploy
[DEVICE] MAC Komandan  : AA:BB:CC:DD:EE:01   ← ← ← CATAT INI
[WiFi] ✔ IP: 192.168.1.100 | Channel: 6
```

### Metode 2: Portal Provisioning
Saat mode setup aktif, MAC tertera di bagian atas halaman konfigurasi:
```
📡 MAC: AA:BB:CC:DD:EE:01
(Salin kode ini untuk konfigurasi Prajurit)
```

Copy MAC tersebut ke firmware Prajurit:
```cpp
uint8_t GATEWAY_MAC[] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0x01};
```

---

## 📋 Checklist Lengkap Setup Per Lantai

### Developer (sebelum kirim):
- [ ] 1. Flash `espnow_gateway_komandan.ino` ke ESP32 Komandan
- [ ] 2. Ubah `MQTT_DEFAULT_SERVER` dan `FLOOR_DEFAULT` sesuai lantai
- [ ] 3. Boot Komandan → buka Serial Monitor → catat MAC Komandan
- [ ] 4. Untuk setiap meja: flash `espnow_node_prajurit.ino`
- [ ] 5. Ubah `MESA_ID` (nomor unik per meja)
- [ ] 6. Ubah `GATEWAY_MAC` = MAC Komandan lantai ini
- [ ] 7. Kemas 1 set (1 Komandan + N Prajurit) per lantai

### Client / Teknisi Instalasi:
- [ ] 1. Sambungkan Komandan ke listrik
- [ ] 2. Tunggu LED berkedip cepat (mode setup)
- [ ] 3. Sambungkan HP ke WiFi "KOMANDAN-SETUP-Lx"
- [ ] 4. Buka browser → 192.168.4.1 (atau otomatis muncul)
- [ ] 5. Scan & pilih WiFi lokal → masukkan password
- [ ] 6. Masukkan IP server MQTT
- [ ] 7. Pilih nomor lantai → Klik Simpan
- [ ] 8. Tunggu Komandan restart → LED solid = sukses
- [ ] 9. Sambungkan semua Prajurit ke listrik
- [ ] 10. Tunggu 60 detik → semua Prajurit online ✅

---

## ❓ FAQ

**Q: Apakah perlu re-flash jika pindah lokasi?**
> ❌ Tidak. Tahan tombol BOOT 5 detik → reset → isi config baru via portal.

**Q: Client tidak bisa buka 192.168.4.1?**
> Pastikan HP sudah konek ke "KOMANDAN-SETUP-Lx". Di Android biasanya portal muncul otomatis. Di iOS mungkin perlu buka Safari manual ke 192.168.4.1.

**Q: Prajurit tidak bisa konek ke Komandan?**
> Pastikan `GATEWAY_MAC` di Prajurit sudah diisi dengan MAC Komandan yang benar. Prajurit akan auto-resync dalam maksimal 3 menit.

**Q: Berapa meja maksimal per lantai?**
> 100 meja per Komandan.

**Q: Jika router ganti channel, apakah Prajurit perlu di-restart?**
> ❌ Tidak. Sistem 3 lapis otomatis menangani ini. Paling lambat 30 detik (via beacon), paling lama 3 menit (via auto-resync).

**Q: Komandan Lt.1 bisa kendalikan Prajurit Lt.2?**
> ❌ Tidak. Setiap Komandan hanya melayani Prajurit di lantainya sendiri (jangkauan ESP-NOW ~100m).

**Q: Jika Server MQTT mati, apakah Prajurit tetap berfungsi?**
> ✅ Command via ESP-NOW tetap berjalan. Yang tidak bisa: kontrol dari dashboard web.

---

## 🗂️ File Firmware

| File | Peran | Chip |
|------|-------|------|
| `espnow_gateway_komandan.ino` | Gateway WiFi↔ESP-NOW, MQTT client, Provisioning Portal | ESP32 WROOM-32 |
| `espnow_node_prajurit.ino` | Prajurit meja, kontrol relay/MOC3062 | ESP32 / ESP32-C3 |

---

*Dokumen ini dibuat otomatis oleh sistem VOC Billiard. Versi: 2026-04-15 v5 — Async-Discovery*
