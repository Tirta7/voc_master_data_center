# ═══════════════════════════════════════════════════════════════════════════════════════
# PANDUAN KONFIGURASI ESP32 FIRMWARE - VOC BILLIARD SYSTEM
# Multi-Location Ready - Setiap Lokasi Butuh Konfigurasi Berbeda
# ═══════════════════════════════════════════════════════════════════════════════════════

## 📋 ARSITEKTUR ESP32 MULTI-LOKASI

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           ARSITEKTUR ESP32 PER LOKASI                            │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  LOKASI A (PIK)                           LOKASI B (BANDUNG)                   │
│  ┌─────────────────────────────────┐      ┌─────────────────────────────────┐   │
│  │ JENDRAL (ESP32 DevKit)          │      │ JENDRAL (ESP32 DevKit)          │   │
│  │ - MQTT IP: 192.168.1.101        │      │ - MQTT IP: 192.168.1.102        │   │
│  │ - Device Title: SPOT_ON_PIK     │      │ - Device Title: SPOT_ON_BDG      │   │
│  └──────────────┬──────────────────┘      └──────────────┬──────────────────┘   │
│                 │                                              │                    │
│         ESP-NOW │                                      ESP-NOW │                  │
│                 ▼                                              ▼                    │
│  ┌─────────────────────────────────┐      ┌─────────────────────────────────┐   │
│  │ KOMANDAN (ESP32 DevKit)         │      │ KOMANDAN (ESP32 DevKit)         │   │
│  │ Lantai 1                        │      │ Lantai 1                        │   │
│  │ - WiFi: SSID_LokasiA           │      │ - WiFi: SSID_LokasiB            │   │
│  │ - MQTT IP: 192.168.1.101       │      │ - MQTT IP: 192.168.1.102        │   │
│  └──────────────┬──────────────────┘      └──────────────┬──────────────────┘   │
│                 │                                              │                    │
│         ESP-NOW │                                      ESP-NOW │                  │
│     ┌──────────┴───────┐                          ┌──────────┴───────┐           │
│     ▼                  ▼                          ▼                  ▼           │
│  ┌────────┐       ┌────────┐                 ┌────────┐       ┌────────┐        │
│  │Prajurit│       │Prajurit│                 │Prajurit│       │Prajurit│        │
│  │Meja 1  │       │Meja 2  │                 │Meja 1  │       │Meja 2  │        │
│  │MAC:..A1│       │MAC:..A2│                 │MAC:..B1│       │MAC:..B2│        │
│  └────────┘       └────────┘                 └────────┘       └────────┘        │
│                                                                                 │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 FILE FIRMWARE YANG PERLU DIKONFIGURASI

| File | Chip | Fungsi | Konfigurasi per Lokasi |
|------|------|--------|----------------------|
| `jendralEsp.ino` | ESP32 DevKit | MQTT Gateway ke Backend | MQTT Server IP |
| `komandanEsp.ino` | ESP32 DevKit | WiFi→ESP-NOW Gateway | WiFi SSID/Pass + MQTT IP |
| `prajuritEsp.ino` | ESP32-C3 | Kontrol Relay/Meja | MAC Komandan + Mesa ID |

---

## 📝 KONFIGURASI PER FILE

### ════════════════════════════════════════════════════════════════
### 1. JENDRAL ESP32 (MQTT Gateway)
### ════════════════════════════════════════════════════════════════

**File:** `jendralEsp.ino`
**Lokasi:** Hubungkan langsung ke MQTT broker di server

**Konfigurasi yang perlu diubah:**

```cpp
// ─── PADA BAGIAN ATAS FILE ───

// 1. MQTT Server Configuration
#define MQTT_IP "192.168.1.100"  // ← IP server (BERBEDA PER LOKASI!)

// 2. Device Title (untuk display di portal)
char deviceTitle[] = "SPOT_ON_PIK";  // ← Nama unik lokasi (BERBEDA PER LOKASI!)

// 3. Block ID (jika lebih dari 20 meja per lantai)
char block_id = 'A';  // A, B, C, dst (BERBEDA PER LANTAI/BLOK!)

// 4. Table List (daftar meja)
char tableList[] = "1,2,3,4,5,6,7,8,9,10";  // ← Nomor meja di lantai ini

// 5. Admin Password (default)
char adminPass[] = "admin123";  // ← Ganti password default!
```

**Contoh Konfigurasi per Lokasi:**

```cpp
// LOKASI A - PIK
#define MQTT_IP "192.168.1.100"
char deviceTitle[] = "SPOT_ON_PIK";
char block_id = 'A';
char tableList[] = "1,2,3,4,5,6,7,8,9,10,11,12";

// LOKASI B - BANDUNG
#define MQTT_IP "192.168.1.101"
char deviceTitle[] = "SPOT_ON_BANDUNG";
char block_id = 'A';
char tableList[] = "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15";

// LOKASI C - BEKASI
#define MQTT_IP "192.168.1.102"
char deviceTitle[] = "SPOT_ON_BEKASI";
char block_id = 'A';
char tableList[] = "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20";
```

---

### ════════════════════════════════════════════════════════════════
### 2. KOMANDAN ESP32 (WiFi→ESP-NOW Gateway)
### ════════════════════════════════════════════════════════════════

**File:** `komandanEsp.ino`
**Lokasi:** Hubungkan WiFi lokal ke MQTT, broadcast ESP-NOW ke Prajurit

**Konfigurasi yang perlu diubah:**

```cpp
// ─── PADA BAGIAN ATAS FILE ───

// 1. Default WiFi Configuration
char ssid[] = "WiFi_LokasiA";        // ← SSID WiFi lokal
char pass[] = "PasswordWiFi123";     // ← Password WiFi
char mqtt_ip[] = "192.168.1.100";     // ← IP MQTT Server

// 2. Floor ID (nomor lantai)
int floor_id = 1;  // ← 1, 2, 3, dst (BERBEDA PER LANTAI!)

// 3. Block ID (jika lebih dari 20 meja)
char block_id = 'A';  // A, B, C, dst
```

**Konfigurasi per Lokasi:**

```cpp
// LOKASI A - PIK, LANTAI 1
char ssid[] = "WiFi_SpotOnPIK";
char pass[] = "SpotOnPIK2024";
char mqtt_ip[] = "192.168.1.100";
int floor_id = 1;
char block_id = 'A';

// LOKASI A - PIK, LANTAI 2
char ssid[] = "WiFi_SpotOnPIK";
char pass[] = "SpotOnPIK2024";
char mqtt_ip[] = "192.168.1.100";
int floor_id = 2;
char block_id = 'A';

// LOKASI B - BANDUNG, LANTAI 1
char ssid[] = "WiFi_SpotOnBDG";
char pass[] = "SpotOnBDG2024";
char mqtt_ip[] = "192.168.1.101";
int floor_id = 1;
char block_id = 'A';
```

---

### ════════════════════════════════════════════════════════════════
### 3. PRAJURIT ESP32-C3 (Node Meja)
### ════════════════════════════════════════════════════════════════

**File:** `prajuritEsp.ino`
**Lokasi:** Di setiap meja billiard

**Konfigurasi yang perlu diubah (via Portal Web):**

```
⚠️ PRAJURIT TIDAK PERLU DIKONFIGURASI SAAT FLASHING!
Konfigurasi dilakukan via Portal Web saat instalasi:

1. Buka WiFi HP ke "VOC-PRAJURIT-XXXXX"
2. Password: 12345678
3. Buka browser: 192.168.4.1
4. Isi:
   - Mesa ID: Nomor meja (1-100)
   - Komandan MAC: MAC address Komandan di lantai tersebut
5. Klik Simpan & Konfigurasi
```

**Konfigurasi dalam kode (jika manual):**

```cpp
// ─── TIDAK PERLU DIUBAH SAAT FLASHING ───
// Semua konfigurasi dilakukan via portal web!
```

**Tapi jika ingin pre-configure sebelum flash:**

```cpp
// Cari bagian ini di kode:
struct PrajuritConfig {
  char commander_mac[18];  // "70:4B:CA:8F:72:54"
  int32_t mesa_id;         // Nomor meja
  int32_t saved_channel;
  bool isLightOn;
};

// Pre-configure:
cfg.mesa_id = 1;  // Nomor meja
strcpy(cfg.commander_mac, "70:4B:CA:8F:72:54");  // MAC Komandan lantai ini
```

---

## 🔄 ALUR KONFIGURASI PER LOKASI

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                   ALUR KONFIGURASI ESP32 PER LOKASI                      ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  [STEP 1] - Kumpulkan MAC Address                                          ║
║  ┌────────────────────────────────────────────────────────────────────────┐    ║
║  │ 1. Flash Jendral → catat MAC Jendral                                │    ║
║  │ 2. Flash Komandan per lantai → catat MAC Komandan                    │    ║
║  │ 3. MAC akan muncul di Serial Monitor saat boot                     │    ║
║  │                                                                    │    ║
║  │ Contoh Serial Monitor:                                             │    ║
║  │ [DEVICE] MAC Komandan  : 70:4B:CA:8F:72:54    ← ← ← CATAT INI!    │    ║
║  │ [DEVICE] MAC Jendral   : AA:BB:CC:DD:EE:FF    ← ← ← CATAT INI!    │    ║
║  └────────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  [STEP 2] - Konfigurasi Prajurit per Meja                                  ║
║  ┌────────────────────────────────────────────────────────────────────────┐    ║
║  │                                                                          │    ║
║  │  Lantai 1:                    Lantai 2:                                │    ║
║  │  ┌──────────────┐           ┌──────────────┐                           │    ║
║  │  │ Meja 1       │           │ Meja 11      │                           │    ║
║  │  │ MAC Komandan │           │ MAC Komandan │                           │    ║
║  │  │ 70:4B:..:54  │           │ 70:4B:..:55  │                           │    ║
║  │  │ Mesa ID: 1   │           │ Mesa ID: 11  │                           │    ║
║  │  └──────────────┘           └──────────────┘                           │    ║
║  │                                                                          │    ║
║  │  Setiap Prajurit perlu tahu MAC Komandan di lantai yang sama!          │    ║
║  └────────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║  [STEP 3] - Update Konfigurasi Backend                                      ║
║  ┌────────────────────────────────────────────────────────────────────────┐    ║
║  │                                                                          │    ║
║  │  Database tables:                                                       │    ║
║  │  ┌────────┬─────────────┬──────────────┬──────────────┐                 │    ║
║  │  │ meja_id│ macAddress │ floor_id     │ location_id  │                 │    ║
║  │  ├────────┼─────────────┼──────────────┼──────────────┤                 │    ║
║  │  │ 1      │ 70:4B:..:01│ 1            │ PIK_01       │                 │    ║
║  │  │ 2      │ 70:4B:..:02│ 1            │ PIK_01       │                 │    ║
║  │  │ 11     │ 70:4B:..:11│ 2            │ PIK_01       │                 │    ║
║  │  └────────┴─────────────┴──────────────┴──────────────┘                 │    ║
║  └────────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 🛠️ SCRIPT KONFIGURASI OTOMATIS

### Template Konfigurasi per Lokasi

Buat file `configs/lokasi_pik.json`:

```json
{
  "location": {
    "id": "PIK_01",
    "name": "Spot On Billiard PIK",
    "code": "PIK"
  },
  "network": {
    "server_ip": "192.168.1.100",
    "mqtt_port": 1883,
    "wifi_ssid": "WiFi_SpotOnPIK",
    "wifi_password": "SpotOnPIK2024"
  },
  "jendral": {
    "device_title": "SPOT_ON_PIK",
    "admin_password": "admin_pik_2024",
    "table_list": "1,2,3,4,5,6,7,8,9,10,11,12"
  },
  "komandan": [
    {
      "floor_id": 1,
      "block_id": "A",
      "mac_address": "AA:BB:CC:DD:EE:01",
      "tables": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    }
  ],
  "prajurit": [
    { "mesa_id": 1, "komandan_mac": "AA:BB:CC:DD:EE:01" },
    { "mesa_id": 2, "komandan_mac": "AA:BB:CC:DD:EE:01" },
    { "mesa_id": 3, "komandan_mac": "AA:BB:CC:DD:EE:01" }
  ]
}
```

Buat file `configs/lokasi_bandung.json`:

```json
{
  "location": {
    "id": "BDG_01",
    "name": "Spot On Billiard Bandung",
    "code": "BDG"
  },
  "network": {
    "server_ip": "192.168.1.101",
    "mqtt_port": 1883,
    "wifi_ssid": "WiFi_SpotOnBDG",
    "wifi_password": "SpotOnBDG2024"
  },
  "jendral": {
    "device_title": "SPOT_ON_BANDUNG",
    "admin_password": "admin_bdg_2024",
    "table_list": "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15"
  },
  "komandan": [
    {
      "floor_id": 1,
      "block_id": "A",
      "mac_address": "AA:BB:CC:DD:EE:02",
      "tables": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    }
  ]
}
```

---

## 📋 CHECKLIST KONFIGURASI PER LOKASI

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                  CHECKLIST KONFIGURASI ESP32 PER LOKASI                   ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  JENDRAL:                                                                    ║
║  [ ] MQTT IP: _______________                                              ║
║  [ ] Device Title: _______________                                         ║
║  [ ] Admin Password: _______________                                       ║
║  [ ] Table List: _______________                                           ║
║  [ ] MAC Address: _______________ (catat untuk referensi)                   ║
║                                                                              ║
║  KOMANDAN (per lantai):                                                    ║
║  [ ] WiFi SSID: _______________                                           ║
║  [ ] WiFi Password: _______________                                       ║
║  [ ] MQTT IP: _______________                                              ║
║  [ ] Floor ID: _______________                                           ║
║  [ ] Block ID: _______________                                           ║
║  [ ] MAC Address: _______________ (catat untuk referensi)                   ║
║                                                                              ║
║  PRAJURIT (per meja):                                                     ║
║  [ ] Mesa ID: _______________                                            ║
║  [ ] Komandan MAC: _______________                                       ║
║  [ ] Lokasi Floor: _______________                                       ║
║                                                                              ║
║  BACKEND:                                                                  ║
║  [ ] Update macAddress di tabel meja                                      ║
║  [ ] Update floor_id di database                                          ║
║  [ ] Update location_id di database                                       ║
║                                                                              ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 🔧 CARA UPDATE MAC DI DATABASE

### Lewat SQL:

```sql
-- Update MAC address untuk meja di Lokasi PIK
UPDATE tables
SET mac_address = '70:4B:CA:8F:72:01'
WHERE id = 1 AND location_id = 'PIK_01';

-- Update MAC address batch
UPDATE tables
SET mac_address = CONCAT('70:4B:CA:8F:72:', LPAD(id, 2, '0'))
WHERE location_id = 'PIK_01';

-- Update floor_id
UPDATE tables
SET floor_id = 1
WHERE location_id = 'PIK_01';
```

### Lewat Backend API:

```
POST /api/tables/update-mac
{
  "tableId": 1,
  "macAddress": "70:4B:CA:8F:72:01",
  "locationId": "PIK_01"
}
```

---

## ⚠️ HAL PENTING YANG PERLU DIPAHAMI

### 1. MAC Komandan Harus Unik per Lokasi/Lantai
```
PIK Lantai 1: 70:4B:CA:8F:72:54
PIK Lantai 2: 70:4B:CA:8F:72:55
BDG Lantai 1: 70:4B:CA:8F:72:64
```

### 2. Prajurit Hanya Bisa Terhubung ke Komandan di Lantai yang Sama
```
Prajurit Meja 1 (Lantai 1) → Komandan Lantai 1 ✅
Prajurit Meja 11 (Lantai 2) → Komandan Lantai 2 ✅
Prajurit Meja 1 → Komandan Lantai 2 ❌ (Tidak akan bekerja!)
```

### 3. MQTT IP Harus Sesuai dengan Server PC Lokasi Tersebut
```
PIK: MQTT ke 192.168.1.100 (PC Server PIK)
BDG: MQTT ke 192.168.1.101 (PC Server Bandung)
```

---

## 📞 TROUBLESHOOTING

### ESP32 tidak bisa konek WiFi
```
1. Cek SSID dan Password benar
2. Pastikan WiFi 2.4GHz (ESP32 tidak support 5GHz)
3. Cek sinyal WiFi cukup kuat
```

### ESP32 tidak bisa konek MQTT
```
1. Ping ke IP server: ping 192.168.1.100
2. Cek port 1883 terbuka di firewall
3. Pastikan MQTT broker running
```

### Prajurit tidak bisa konek ke Komandan
```
1. Cek MAC Komandan benar di konfigurasi Prajurit
2. Pastikan jarak tidak lebih dari 100m
3. Cek LED indikator di Komandan
4. Reset dan ulangi pairing
```

### Meja tidak mau nyala/mati
```
1. Cek relay wiring benar
2. Cek MAC address di database cocok dengan Prajurit
3. Cek token tidak duplikat
4. Cek log di Serial Monitor
```

---

## 📚 DOKUMENTASI LAINNYA

| Dokumen | Deskripsi |
|---------|-----------|
| `esp32_mqtt_client/README.md` | Panduan dasar ESP32 |
| `esp32_mqtt_client/ARSITEKTUR_MULTI_LANTAI.md` | Arsitektur multi-lantai |
| `esp32_mqtt_client/architecture_recommendation.md` | Rekomendasi skala 100+ meja |