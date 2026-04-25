# 🎱 Panduan Topologi Hybrid: MQTT + ESP-NOW
## VOC Billiard System — Skala 100+ Meja

---

## Arsitektur Sistem

```
┌─────────────────┐     MQTT      ┌──────────────┐
│  Aplikasi POS   │ ──────────── │  Server Node │
│  (Next.js)      │              │  (NestJS)    │
└─────────────────┘              └──────┬───────┘
                                         │ MQTT
                                         │ billiard/meja/5/control
                                  ┌──────▼───────────────┐
                                  │  ESP32 GATEWAY        │
                                  │  (SI KOMANDAN)        │
                                  │  ✅ Satu-satunya      │
                                  │     connect WiFi      │
                                  └──────┬───────────────┘
                                   ESP-NOW│ (2.4GHz, instan)
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
             ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
             │  ESP32 Meja1 │       │  ESP32 Meja2 │  ...  │ ESP32 Meja N│
             │  (PRAJURIT)  │       │  (PRAJURIT)  │       │  (PRAJURIT) │
             │  ❌ No WiFi  │       │  ❌ No WiFi  │       │  ❌ No WiFi │
             │  MOC3062     │       │  MOC3062     │       │  MOC3062    │
             │  → TRIAC     │       │  → TRIAC     │       │  → TRIAC    │
             │  → Lampu     │       │  → Lampu     │       │  → Lampu    │
             └─────────────┘       └─────────────┘       └─────────────┘
```

---

## File Firmware

| File | Chip | Peran |
|------|------|-------|
| `espnow_gateway_komandan.ino` | ESP32 WROOM-32 | Gateway — connect WiFi + MQTT, forward ke ESP-NOW |
| `espnow_node_prajurit.ino`    | ESP32 / ESP32-C3 | Node — hanya listen ESP-NOW, kontrol relay |

---

## Langkah Deployment

### Tahap 1 — Flash Gateway (Komandan)

1. Buka `espnow_gateway_komandan.ino` di Arduino IDE
2. Edit konfigurasi di bagian atas file:
   ```cpp
   const char *WIFI_SSID     = "Tirtaaa";       // ← SSID WiFi Anda
   const char *WIFI_PASSWORD = "4DItya79!";     // ← Password WiFi
   const char *MQTT_SERVER   = "192.168.1.24";  // ← IP Server MQTT
   ```
3. Flash ke ESP32
4. Buka Serial Monitor (115200 baud)
5. **Catat dua informasi penting:**
   ```
   [DEVICE] Gateway MAC : AA:BB:CC:DD:EE:FF   ← CATAT! (untuk GATEWAY_MAC di Prajurit)
   [WiFi] Terhubung! IP: 192.168.x.x | CH: 6  ← CATAT! kanal WiFi (untuk ESPNOW_CHANNEL)
   ```

### Tahap 2 — Flash Prajurit (Satu per Meja)

1. Buka `espnow_node_prajurit.ino` di Arduino IDE
2. **Ubah bagian konfigurasi untuk SETIAP meja:**
   ```cpp
   #define MESA_ID 1   // ← Ganti untuk setiap meja (1, 2, 3, ...)
   
   // ← Ganti dengan MAC Gateway yang dicatat di Tahap 1
   uint8_t GATEWAY_MAC[] = { 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF };
   
   #define ESPNOW_CHANNEL 6  // ← Ganti dengan kanal yang dicatat di Tahap 1
   ```
3. Flash ke ESP32 meja tersebut
4. Buka Serial Monitor — akan muncul:
   ```
   ┌────────────────────────────────────┐
   │  MAC Address Prajurit Meja-1
   │  11:22:33:44:55:66
   │
   │  Daftarkan ke Gateway via MQTT:
   │  Topic: billiard/gateway/register
   │  Payload:
   │  { "mesaId": 1,
   │    "mac": "11:22:33:44:55:66" }
   └────────────────────────────────────┘
   ```
5. **CATAT MAC ini** — akan didaftarkan ke Gateway di langkah berikut

### Tahap 3 — Daftarkan Prajurit ke Gateway

Kirim pesan MQTT via MQTT Explorer / server backend:

```
Topic  : billiard/gateway/register
Payload: { "mesaId": 1, "mac": "11:22:33:44:55:66" }
```

> Ulangi untuk setiap meja. Data disimpan otomatis ke SPIFFS Gateway.
> Setelah didaftarkan, Gateway akan langsung bisa berkomunikasi dengan Prajurit tersebut.

---

## Topik MQTT (Referensi Server)

### Server → Gateway (Perintah)

| Topic | Payload | Fungsi |
|-------|---------|--------|
| `billiard/meja/{id}/control` | `{"status":"ON","extend":false,"force":false}` | Nyalakan/matikan lampu meja |
| `billiard/gateway/register` | `{"mesaId":5,"mac":"AA:BB:CC:DD:EE:FF"}` | Daftarkan prajurit baru |
| `billiard/gateway/unregister` | `{"mesaId":5}` | Hapus prajurit |
| `billiard/gateway/poll` | `{}` atau `{"mesaId":5}` | Minta status semua/satu meja |
| `billiard/gateway/reboot` | `{"mesaId":5}` atau `{}` | Reboot prajurit / gateway |

### Gateway → Server (Status)

| Topic | Payload | Keterangan |
|-------|---------|------------|
| `billiard/meja/{id}/status` | `{"mesaId":5,"lightState":true,"status":"ON",...}` | Status meja (retain=true) |
| `billiard/gateway/status` | `{"status":"online","peerCount":10,"peersOnline":9,...}` | Status gateway |
| `billiard/gateway/register/ack` | `{"ok":true,"mesaId":5,"mac":"..."}` | Konfirmasi registrasi |

---

## Perbandingan Arsitektur

| Fitur | Lama (WiFi MQTT langsung) | Baru (MQTT + ESP-NOW) |
|-------|--------------------------|----------------------|
| Perangkat WiFi | 100+ ESP32 | **1 Gateway saja** |
| Beban Router | Kritis (>30 device = tidak stabil) | **Minimal** |
| Kecepatan respons | 100-500ms (tergantung traffic) | **<10ms** |
| Konfigurasi per meja | SSID + Password | **ID meja + MAC Gateway** |
| Keamanan | IP publik tiap meja | **Tanpa IP, tidak bisa di-hack** |
| Stabilitas hardware | MOC sering connect/disconnect | **Tidak pernah connect WiFi** |
| Jangkauan | = Jangkauan router | **Bisa perluas dengan Long Range** |

---

## Troubleshooting

### ❌ Prajurit tidak merespons
1. Pastikan `ESPNOW_CHANNEL` di Prajurit = kanal WiFi Gateway (cek Serial Monitor Gateway)
2. Pastikan `GATEWAY_MAC` sudah benar (format `{ 0xAA, 0xBB, ... }`)
3. Pastikan MAC Prajurit sudah didaftarkan ke Gateway via MQTT `/register`
4. Jarak: ESP-NOW efektif ~200m open air, 50-100m dalam ruangan

### ❌ Gateway tidak terima ACK dari Prajurit
1. Cek Serial Monitor Prajurit — apakah ada log `[ESP-NOW] ↑ ACK`?
2. Pastikan Gateway juga sudah terdaftar sebagai peer di Prajurit (otomatis saat boot)
3. Coba poll manual: MQTT `billiard/gateway/poll` → `{"mesaId":1}`

### ❌ Lampu tidak menyala tapi log ESP-NOW OK
1. Cek `MOC_ACTIVE_LOW` di Prajurit — sama dengan firmware lama Anda (`true`)
2. Cek `mocPin` — default `GPIO4`
3. Cek wiring MOC3062 → TRIAC → Lampu

### ✅ Cek kanal WiFi yang benar
```
Serial Monitor Gateway akan cetak:
[WiFi] Terhubung! IP: 192.168.x.x | CH: 6
                                       ↑ ini ESPNOW_CHANNEL yang harus dipakai
```

---

## Perluasan Jangkauan

Jika ruangan billiard Anda besar, gunakan **Long Range Mode** di Gateway:

```cpp
// Tambahkan di setup() Gateway, setelah WiFi.begin():
esp_wifi_set_protocol(WIFI_IF_STA,
    WIFI_PROTOCOL_LR |
    WIFI_PROTOCOL_11B |
    WIFI_PROTOCOL_11G);
```

> ⚠ Long Range Mode harus diaktifkan di Gateway DAN semua Prajurit.

---

## Tips Scaling 100 Meja

- **1 Gateway** bisa handle **250 Prajurit** (batas hardware ESP-NOW)
- Jika perlu lebih dari 250 meja → gunakan **2 Gateway** dengan channel berbeda
- Tempatkan Gateway di **tengah ruangan** untuk jangkauan optimal
- Gunakan ESP32 berkualitas (bukan ESP-01) untuk Gateway — lebih stabil untuk WiFi+ESP-NOW bersamaan
