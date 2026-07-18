# 🎱 Arsitektur Sistem Billiard IoT — Rekomendasi Skala 100+ Meja

## Diagnosis Masalah Saat Ini

### Arsitektur Sekarang (v6.x — Hybrid MQTT + ESP-NOW)

```
[Software/Frontend]
       ↕ WebSocket
[Backend NestJS]
       ↕ MQTT (QoS 1, Retained)
[Komandan ESP32] ←———→ [Komandan ESP32]  (per lantai)
       ↕ ESP-NOW Broadcast
  [Prajurit C3] [Prajurit C3] ... (per meja)
```

### ⚠️ Masalah Kritis yang Teridentifikasi

| # | Masalah | Dampak | Keparahan |
|---|---------|--------|-----------|
| 1 | **Heartbeat dan Perintah di jalur yang sama** — Komandan menggunakan 1 queue untuk semua data, baik heartbeat status maupun perintah ON/OFF | Perintah antri di belakang heartbeat, bisa terlambat 10–30 detik | 🔴 KRITIS |
| 2 | **ESP-NOW Broadcast ke semua Prajurit** — Saat perintah ON/OFF dikirim, SEMUA Prajurit menerima broadcast, lalu masing-masing menyaring sendiri | Semua Prajurit bangun dan memproses, boros energi, potensi collision naik dengan jumlah meja | 🟡 SEDANG |
| 3 | **Timeout Prajurit terlalu agresif (lama 15 detik, sekarang 60 detik)** — Prajurit reset channel saat Komandan sibuk | Meja hilang koneksi tepat saat ada perintah penting | 🔴 KRITIS |
| 4 | **MQTT Retain Perintah ON/OFF** — Perintah lama tersimpan di broker, saat Komandan restart akan langsung eksekusi perintah kadaluarsa | Ghost command: meja yang OFF tiba-tiba nyala sendiri | 🔴 KRITIS |
| 5 | **Single-threaded `loop()` di Komandan** — Web portal, MQTT `client.loop()`, dan pengiriman ESP-NOW berjalan serial | Jika salah satu lambat, semua terhenti | 🟡 SEDANG |
| 6 | **Cron Backend terlalu sering (15s, sekarang 30s)** — DB query setiap tick meski tidak ada yang berubah | Beban DB naik, potensi query lock saat ada transaksi aktif | 🟡 SEDANG |

---

## ✅ Rekomendasi Arsitektur — 3 Level Prioritas

---

### 🔴 PRIORITAS 1 — Perbaiki Sekarang (Tanpa Perubahan Hardware)

Ini perbaikan firmware dan backend yang bisa langsung diterapkan ke sistem yang sudah ada.

#### 1.1 — Pisahkan Jalur Perintah dan Heartbeat di Komandan

> **Prinsip**: Perintah ON/OFF harus selalu lebih prioritas dari heartbeat. Jangan antri bersama.

**Implementasi di `komandanEsp.ino`:**
```cpp
// Buat 2 queue terpisah
QueuedReport reportQueue[REPORT_QUEUE_SIZE];   // Heartbeat biasa
QueuedCommand cmdQueue[CMD_QUEUE_SIZE];        // Perintah ON/OFF (prioritas tinggi)

// Di loop():
// 1. SELALU proses perintah dulu
while (cmdHead != cmdTail) {
  // kirim langsung ke MQTT dengan QoS 2 (exactly-once)
}

// 2. Baru proses heartbeat (dengan filter change-based)
while (qHead != qTail) {
  // filter: hanya kirim jika ada perubahan
}
```

#### 1.2 — Hapus RETAIN pada Perintah ON/OFF

> **Ini salah satu bug paling berbahaya.** Perintah `retain=true` untuk command berarti Komandan yang baru nyala / reconnect akan langsung menerima perintah lama dan mengeksekusinya.

**Di `mqtt.service.ts` baris 247:**
```diff
- true, // Always retain light commands for hardware recovery
+ false, // JANGAN RETAIN: perintah ON/OFF tidak boleh tersimpan di broker
```

**Hanya Status Lampu yang boleh di-retain**, bukan perintahnya.

#### 1.3 — Tambahkan Timestamp Expiry pada Perintah

Di Komandan, tambahkan filter: perintah yang lebih dari 10 detik lama **diabaikan**.

```cpp
// Di callback() Komandan:
void callback(char *topic, byte *payload, unsigned int length) {
  // ... parse doc
  
  // FILTER: Abaikan perintah kadaluarsa (>10 detik)
  const char* ts = doc["timestamp"] | "";
  // Jika timestamp ada dan sudah >10 detik lalu, skip
  unsigned long cmdAge = /* hitung dari timestamp */ 0;
  if (cmdAge > 10000) {
    Serial.println("[CMD] Perintah kadaluarsa (>10s), diabaikan.");
    return;
  }
}
```

#### 1.4 — QoS 2 untuk Perintah Kritis

Backend saat ini menggunakan QoS 1 untuk semua pesan. Untuk perintah ON/OFF:

```typescript
// Di mqtt.service.ts — publishLightCommand:
this.client.publish(topic, payload, { qos: 2, retain: false }, (err) => { ... });
//                                    ^^^ QoS 2 = exactly-once delivery
```

---

### 🟡 PRIORITAS 2 — Optimasi Skala Menengah (50–100 Meja)

#### 2.1 — Arsitektur Topik MQTT Berbasis Lantai

Ubah struktur topik MQTT dari flat menjadi hierarki lantai:

```
SAAT INI:
billiard/table/{MAC_KOMANDAN}/light/set

REKOMENDASI:
billiard/floor/{floor_id}/table/{relayPin}/light/set
billiard/floor/{floor_id}/table/{relayPin}/status
```

**Keuntungan:**
- Backend bisa subscribe per lantai: `billiard/floor/1/#`
- Mudah di-filter, debug, dan monitor per lantai
- Tidak perlu mapping MAC untuk routing perintah

#### 2.2 — Komandan Mengirim ESP-NOW UNICAST, Bukan Broadcast

Saat ini Komandan selalu broadcast ke `0xFF:FF:FF:FF:FF:FF`. Untuk 100+ meja ini tidak efisien.

**Ubah ke Unicast setelah Prajurit terdaftar:**

```cpp
// Komandan menyimpan daftar MAC Prajurit yang sudah pairing:
struct PrajuritInfo {
  uint8_t mac[6];
  int32_t mesaId;
  unsigned long lastSeen;
};
PrajuritInfo prajuritList[MAX_PRAJURIT]; // max 20 per Komandan

// Saat kirim perintah, kirim UNICAST ke MAC spesifik:
esp_now_send(prajuritList[targetIdx].mac, (uint8_t*)&myData, sizeof(myData));
```

**Keuntungan:**
- Mengurangi "wakeup" semua Prajurit saat ada 1 perintah
- Mengurangi collision di udara
- Komandan tahu mana Prajurit yang online / offline (pakai `lastSeen`)

#### 2.3 — ACK dari Prajurit ke Komandan

Saat ini Komandan tidak tahu apakah perintah diterima Prajurit. Tambahkan mekanisme ACK:

```cpp
// Prajurit, setelah eksekusi perintah:
struct_message ack;
ack.mesaId = currentMesaId;
ack.cmd = 98;  // Kode ACK
ack.token = cmd.token;  // Echo token perintah
esp_now_send(CURRENT_COMMANDER_MAC, (uint8_t*)&ack, sizeof(ack));

// Komandan, saat terima ACK (cmd==98):
// Hapus dari pendingVerification, tidak perlu kirim ulang
```

---

### 🟢 PRIORITAS 3 — Arsitektur Ideal untuk 100+ Meja Multi-Lantai

Ini adalah target arsitektur yang sebaiknya Anda capai dalam 3–6 bulan ke depan.

#### 3.1 — Topologi Star per Lantai (Sudah Benar)

```
[Backend Server]
      ↕ MQTT (Dedicated Broker, min. Mosquitto 2.0)
      |
  ┌───┴───┬───────────────┐
  │       │               │
[Komandan│Lantai 1] [Komandan Lantai 2] [Komandan Lantai N]
  │       │                │
[Pr.1][Pr.2]...[Pr.20]  [Pr.21]...[Pr.40]
```

> ✅ **Ini topologi yang BENAR.** Setiap Komandan bertanggung jawab atas 1 lantai / zona. Sudah ada `floor_id` di Config, ini tinggal diaktifkan.

**Batasan per Komandan:**
- ESP-NOW: Maksimal **20 peer** yang terdaftar secara resmi
- Practical limit: **15–20 Prajurit** per Komandan untuk headroom
- Untuk 100 meja: minimal **5–7 Komandan**

#### 3.2 — Dedicated Command Topic vs Status Topic

```
# Jalur Perintah (Backend → Komandan → Prajurit)
billiard/floor/{fid}/cmd/table/{mesaId}     ← Backend publish ke sini
                                             ← Komandan subscribe dan forward ESP-NOW

# Jalur Status (Prajurit → Komandan → Backend)  
billiard/floor/{fid}/status/table/{mesaId}  ← Komandan publish ke sini
                                             ← Backend subscribe dari sini

# Jalur Heartbeat (terpisah dari status)
billiard/floor/{fid}/heartbeat              ← Komandan publish ringkasan per 30s
```

#### 3.3 — Dedicated MQTT QoS Policy

| Tipe Pesan | QoS | Retain | Alasan |
|------------|-----|--------|--------|
| Perintah ON/OFF | **QoS 2** | **false** | Harus exactly-once, tidak boleh replay |
| Status Meja | QoS 1 | true | Boleh tersimpan, dibutuhkan saat reconnect |
| Heartbeat | QoS 0 | false | Tidak kritis, boleh hilang |
| Ping | QoS 1 | false | Perlu sampai tapi tidak perlu persist |

#### 3.4 — Mosquitto Broker Tuning untuk 100+ Meja

Edit `mosquitto.conf`:

```conf
# Tingkatkan batas koneksi
max_connections 500

# Batas pesan per client (cegah flood dari 1 Komandan)
max_inflight_messages 10
max_queued_messages 100

# Persistence (pastikan perintah tidak hilang saat broker restart)
persistence true
persistence_location /var/lib/mosquitto/

# Logging hanya warn ke atas (tidak debug) untuk performa
log_type warning
log_type error

# Heartbeat connection MQTT
keepalive_interval 60
```

---

## 📊 Perbandingan Skenario

| Kriteria | Saat Ini | Setelah P1 | Setelah P2 | Setelah P3 |
|----------|----------|------------|------------|------------|
| Meja Supported | ~20 | ~30 | ~60 | 100+ |
| Latency Perintah | 1–5 detik | <500ms | <300ms | <200ms |
| Ketahanan Ghost Command | ❌ Berbahaya | ✅ Aman | ✅ Aman | ✅ Aman |
| Scalability Multi-Lantai | ⚠️ Manual | ⚠️ Manual | ✅ Struktur | ✅ Optimal |
| Monitoring per Lantai | ❌ | ⚠️ | ✅ | ✅ |
| ACK / Konfirmasi Prajurit | ❌ | ❌ | ✅ | ✅ |

---

## 🚀 Roadmap Implementasi

### Minggu Ini (Darurat)
- [ ] **Fix RETAIN = false** untuk perintah ON/OFF di `mqtt.service.ts`
- [ ] **Pisahkan queue perintah dan heartbeat** di Komandan
- [ ] **Tambah timestamp expiry** pada perintah (abaikan jika >10 detik)

### Bulan Ini (Stabilisasi)
- [ ] Ubah topik MQTT ke hierarki berbasis `floor_id`
- [ ] Implementasi ACK dari Prajurit ke Komandan
- [ ] Ubah ESP-NOW Broadcast menjadi Unicast setelah pairing
- [ ] Mosquitto tuning untuk performa

### Bulan Depan (Skalabilitas)
- [ ] Dedicated Command Topic vs Status Topic
- [ ] QoS Policy yang benar per jenis pesan
- [ ] Dashboard monitoring per lantai di Frontend

---

## ⚡ Action Item Mendesak — Bisa Dilakukan Sekarang

**Yang paling berbahaya dan harus diperbaiki SEGERA:**

```typescript
// mqtt.service.ts baris 247 — UBAH INI SEKARANG
// DARI:
true, // Always retain light commands for hardware recovery
// MENJADI:
false, // TIDAK BOLEH RETAIN: perintah ON/OFF kadaluarsa berbahaya
```

> [!CAUTION]
> Selama `retain: true` masih ada untuk perintah ON/OFF, setiap kali Komandan restart atau reconnect, lampu bisa nyala/mati sendiri berdasarkan perintah lama yang tersimpan di broker. Ini adalah **ghost command** yang sangat berbahaya di lingkungan billiard yang ramai.
