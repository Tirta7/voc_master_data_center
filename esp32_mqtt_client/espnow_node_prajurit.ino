/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║        ESP-NOW NODE — SI PRAJURIT (Billiard System)              ║
 * ║        VOC SYSTEM (Spot On Billiard)                             ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Arsitektur : HYBRID MQTT + ESP-NOW  [v3 — Smart Channel Cache]  ║
 * ║  Peran      : Node / Prajurit (1 per meja billiard)              ║
 * ║  Chip       : ESP32 / ESP32-C3                                   ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  PRINSIP KERJA:                                                  ║
 * ║  • TIDAK terhubung ke WiFi sama sekali                           ║
 * ║  • TIDAK perlu SSID/Password apapun                              ║
 * ║  • Channel ditemukan via MAC Discovery → disimpan ke SPIFFS      ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  SISTEM 3 LAPIS KEAMANAN CHANNEL:                                ║
 * ║                                                                  ║
 * ║  LAPIS 1 — BOOT VALIDATION:                                      ║
 * ║    Saat boot, coba channel dari SPIFFS (3x probe, 600ms).        ║
 * ║    Jika GAGAL → langsung hopping ulang → simpan channel baru.    ║
 * ║    Restart aman bahkan jika router sudah ganti channel.          ║
 * ║                                                                  ║
 * ║  LAPIS 2 — RUNTIME BEACON MONITORING:                            ║
 * ║    Komandan menyertakan info channel di setiap beacon.           ║
 * ║    Jika channel di beacon berbeda dengan cache → update          ║
 * ║    SPIFFS dan pindah channel REAL-TIME tanpa restart!            ║
 * ║                                                                  ║
 * ║  LAPIS 3 — AUTO-RESYNC (Jaring Pengaman Akhir):                  ║
 * ║    Jika 3 menit tidak dengar dari Komandan → hapus cache         ║
 * ║    → lakukan full channel hopping → simpan channel baru.         ║
 * ║    Downtime maksimal: 3 menit.                                   ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  KONFIGURASI WAJIB (hanya 2 hal per meja):                       ║
 * ║  1. MESA_ID      — ID unik meja ini (1-100)                      ║
 * ║  2. GATEWAY_MAC  — MAC Address STA ESP32 Komandan                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * CARA DAPAT MAC KOMANDAN:
 *   Flash Komandan → buka Serial Monitor → catat baris:
 *   "[DEVICE] MAC Komandan  : AA:BB:CC:DD:EE:FF"
 *   Masukkan ke GATEWAY_MAC di bawah.
 */

#include <Arduino.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>
#include <WiFi.h>
#include <esp_mac.h> // 🛡️ Fix for ESP32 Core v3.x
#include <esp_now.h>
#include <esp_task_wdt.h>
#include <esp_wifi.h>

// ╔═══════════════════════════════════════════════════════════╗
// ║       ⚙ KONFIGURASI — UBAH HANYA 2 BARIS INI ⚙          ║
// ╚═══════════════════════════════════════════════════════════╝

#define MESA_ID 1
uint8_t GATEWAY_MAC[] = {0x78, 0x1C, 0x3C,
                         0xCC, 0x07, 0x44}; // 🔄 Rollback ke nilai asal
uint8_t BROADCAST_MAC[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
bool heartbeatPendingRetry = false; // 🔄 Tetap dipertahankan (v15.3.1)
uint32_t lastRetryAttempt = 0;
// 🎯 DYNAMIC LEARNING
uint8_t learnedGatewayMAC[6];
bool gatewayDiscovered = false;

// ╔═══════════════════════════════════════════════════════════╗
// ║             PIN HARDWARE                                  ║
// ╚═══════════════════════════════════════════════════════════╝
#define PIN_MOC 7
#define PIN_LED 8
#define PIN_BUZZER 6

#define MOC_ACTIVE_LOW true
#define BUZZER_ACTIVE_LOW true

// ╔═══════════════════════════════════════════════════════════╗
// ║             KONSTANTA PROTOKOL                            ║
// ╚═══════════════════════════════════════════════════════════╝
#define ESPNOW_CMD_ON 1
#define ESPNOW_CMD_OFF 0
#define ESPNOW_CMD_STATUS 2
#define ESPNOW_CMD_REBOOT 9

// ── TIMING CHANNEL SAFETY ─────────────────────────────────────────────────
// LAPIS 3: Jika N menit tidak dengar Komandan → paksa resync
// 3 menit = downtime maksimal saat router ganti channel di tengah operasi
#define MAX_GAPS_BEFORE_RESYNC 180000UL // 3 menit (bukan 10 menit)
// Minimal jeda antar auto-resync agar tidak flood (1 menit)
#define MIN_RESYNC_INTERVAL 60000UL
// Timeout validasi cache saat boot (per probe): 200ms × 3 = 600ms maks
#define CHANNEL_PROBE_TIMEOUT_MS 200
#define CHANNEL_PROBE_ATTEMPTS 3
// ─────────────────────────────────────────────────────────────────────────

#define CHANNEL_CACHE_FILE "/channel.json"
#define CONFIG_FILE "/node_config.json"

// ╔═══════════════════════════════════════════════════════════╗
// ║    STRUKTUR DATA ESP-NOW                                  ║
// ║                                                           ║
// ║  EspNowPacket : Komandan → Prajurit (perintah)           ║
// ║  EspNowAck    : Prajurit → Komandan (balasan/heartbeat)  ║
// ║  EspNowBeacon : Komandan → Semua    (info channel, broadcast)║
// ╚═══════════════════════════════════════════════════════════╝
typedef struct __attribute__((packed)) {
  uint8_t mesaId;
  uint8_t cmd;
  uint8_t extend; // 🛡️ v17.0
  uint8_t force;
  uint16_t durationMin;
  uint32_t token;
} EspNowPacket;

typedef struct __attribute__((packed)) {
  uint8_t mesaId;
  uint8_t lightState; // 🛡️ v17.0
  uint8_t rssi;       // 🛡️ v17.0: Moved up to match Gateway
  uint32_t uptime;
  uint8_t errorCode;
  uint16_t remainingMin;
  uint32_t activeToken;
} EspNowAck;

/**
 * Beacon dari Komandan — dikirim broadcast setiap 30 detik.
 * Berisi channel aktif Komandan. Jika Prajurit menerima beacon ini
 * dan channel berbeda dengan cache → update otomatis! (LAPIS 2)
 */
typedef struct __attribute__((packed)) {
  uint8_t type;       // 0xBC = beacon identifier
  uint8_t floorId;    // FLOOR_ID Komandan
  uint8_t channel;    // Channel aktif Komandan saat ini
  uint32_t timestamp; // millis() Komandan (deteksi stale beacon)
} EspNowBeacon;

#define BEACON_TYPE 0xFD // 🛡️ SINKRONISASI (v17.0): Sebelumnya 0xBC

// ╔═══════════════════════════════════════════════════════════╗
// ║             STATE GLOBAL                                  ║
// ╚═══════════════════════════════════════════════════════════╝
bool lightState = false;
bool storageDirty = false;
unsigned long lastStateChange = 0;
const unsigned long STORAGE_SAVE_DELAY = 3000;
unsigned long lightProtectedUntil = 0;
unsigned long autoOffAt = 0; // Epoch millis untuk mati otomatis
bool hasAutoOff = false;

int buzzerBeeps = 0;
bool buzzerState = false;
unsigned long buzzerNext = 0;

uint8_t ledState = 0;
unsigned long ledNext = 0;

unsigned long lastAckSent = 0;
unsigned long lastPinVerify = 0;
unsigned long lastGatewaySeen = 0;
unsigned long lastAutoSync = 0;
bool gatewayRegistered = false;

int mocPin = PIN_MOC;
int savedChannel = 0;                 // Channel di cache SPIFFS (0 = belum ada)
int activeChannel = 0;                // Channel yang sedang dipakai saat ini
unsigned long lastProactiveProbe = 0; // Jeda antar probe otomatis

// 🛡️ SESSION & HANDSHAKE (v15.2)
uint32_t activeToken = 0;
bool pendingHandshake = false;
unsigned long lastHandshakeAttempt = 0;

// 🎯 JITTER / ACK SYSTEM (v16.0)
bool pendingAck = false;
unsigned long ackDeadline = 0;
uint8_t pendingErrorCode = 0;
unsigned long lastHeartbeat = 0;
unsigned long nextHeartbeatDelay = 3000; // Will be randomized
// INTERVAL DASAR: 2.5s + random(2s) = 2.5s s/d 4.5s
#define HEARTBEAT_BASE_MS 2500
#define HEARTBEAT_JITTER_MS 2000

// ╔═══════════════════════════════════════════════════════════╗
// ║  ASYNC DISCOVERY STATE MACHINE                             ║
// ║                                                           ║
// ║  Setup() TIDAK BLOCKING. WiFi scan jalan di background.  ║
// ║  Loop() cek hasilnya tiap iterasi → tidak ada stack       ║
// ║  overflow karena WiFi.scanNetworks(true) tidak blocking.  ║
// ╔═══════════════════════════════════════════════════════════╗
enum DiscState {
  DS_IDLE,
  DS_SCAN_CACHED, // Scan hanya 1 channel (channel dari cache SPIFFS)
  DS_SCAN_FULL,   // Scan semua channel 1..13
  DS_WAIT_RETRY,  // Tunggu sebelum coba scan lagi (Komandan belum boot)
  DS_PROBE,       // Fallback: probe manual per channel jika scan gagal
  DS_DONE         // Discovery selesai, operasi normal berjalan
};

DiscState discState = DS_IDLE;
int discAttempt = 0;             // Hitungan percobaan scan
int discProbeCh = 1;             // Channel probe saat ini (untuk DS_PROBE)
unsigned long discWaitUntil = 0; // Deadline DS_WAIT_RETRY

// Target SSID Komandan (diisi di startDiscovery())
static char gTargetSSID[32];

// ╔═══════════════════════════════════════════════════════════╗
// ║             FORWARD DECLARATIONS                          ║
// ╚═══════════════════════════════════════════════════════════╝
void setLight(bool on);
void sendAck(uint8_t errorCode);
#if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
void onEspNowRecv(const esp_now_recv_info_t *recv_info, const uint8_t *data,
                  int len);
#else
void onEspNowRecv(const uint8_t *mac_addr, const uint8_t *data, int len);
#endif
void onEspNowSend(const uint8_t *mac_addr, esp_now_send_status_t status);
void saveConfig();
void loadConfig();
void saveChannel(int ch);
int loadChannel();
void clearChannelCache();
void startBuzzer(int beeps);
void updateBuzzer();
void switchChannel(int newCh, const char *reason);
void registerGatewayPeer();
void startDiscovery();
bool tickDiscovery();

// ╔═══════════════════════════════════════════════════════════╗
// ║             BUZZER HELPER                                 ║
// ╚═══════════════════════════════════════════════════════════╝
void startBuzzer(int beeps) {
  buzzerBeeps = beeps * 2;
  buzzerState = true;
  digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_LOW ? LOW : HIGH);
  buzzerNext = millis() + 80;
}

void updateBuzzer() {
  if (buzzerBeeps > 0 && millis() >= buzzerNext) {
    buzzerBeeps--;
    buzzerState = !buzzerState;
    digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_LOW ? (buzzerState ? LOW : HIGH)
                                               : (buzzerState ? HIGH : LOW));
    buzzerNext = millis() + 80;
  }
}

// ╔═══════════════════════════════════════════════════════════╗
// ║             KONTROL LAMPU                                 ║
// ╚═══════════════════════════════════════════════════════════╝
void setLight(bool on) {
  bool pinLevel = MOC_ACTIVE_LOW ? !on : on;
  digitalWrite(mocPin, pinLevel ? HIGH : LOW);
  lightState = on;

  if (on) {
    Serial.println("\n[LIGHT] 💡 LAMPU MENYALA");
  } else {
    Serial.println("\n[LIGHT] 🌑 LAMPU MATI");
  }

  digitalWrite(PIN_LED, on ? HIGH : LOW);
}

void sendAck(uint8_t errorCode) {
  // 🎯 ANTI-COLLISION JITTER
  delay(random(10, 80));

  EspNowAck ack;
  ack.mesaId = MESA_ID;
  ack.lightState = lightState ? 1 : 0;

  // Ambil RSSI terakhir dari paket wifi yang diterima (jika ada)
  // Untuk sementara kita set 255 atau nilai dummy jika API tidak tersedia di
  // sini
  ack.rssi = (uint8_t)WiFi.RSSI();

  ack.uptime = (uint32_t)(millis() / 1000);
  ack.errorCode = errorCode;

  // 🎯 DURATION SYNC
  if (hasAutoOff && lightState && autoOffAt > millis()) {
    ack.remainingMin = (uint16_t)((autoOffAt - millis()) / 60000);
  } else {
    ack.remainingMin = 0;
  }
  ack.activeToken = activeToken;

  if (errorCode != 0 && errorCode != 0xFF) {
    Serial.printf("\n[ALERT] Status | Meja:%d | Dur:%dm | Code:0x%X\n",
                  ack.mesaId, ack.remainingMin, errorCode);
  } else {
    Serial.print(".");
  }

  // 🚀 SMART ROUTING
  if (gatewayDiscovered) {
    esp_now_send(learnedGatewayMAC, (uint8_t *)&ack, sizeof(ack));
  } else {
    esp_now_send(GATEWAY_MAC, (uint8_t *)&ack, sizeof(ack));
  }
}

// ╔═══════════════════════════════════════════════════════════╗
// ║             STORAGE — CHANNEL CACHE                       ║
// ╚═══════════════════════════════════════════════════════════╝

void saveChannel(int ch) {
  DynamicJsonDocument doc(128);
  doc["channel"] = ch;
  doc["savedAt"] = millis() / 1000; // Timestamp (detik sejak boot)
  File f = SPIFFS.open(CHANNEL_CACHE_FILE, FILE_WRITE);
  if (f) {
    serializeJson(doc, f);
    f.close();
    Serial.printf("[SPIFFS] 💾 Channel %d disimpan ke flash.\n", ch);
  } else {
    Serial.println("[SPIFFS] ⚠ Gagal simpan channel!");
  }
}

int loadChannel() {
  if (!SPIFFS.exists(CHANNEL_CACHE_FILE)) {
    Serial.println("[SPIFFS] Belum ada cache channel.");
    return 0;
  }
  File f = SPIFFS.open(CHANNEL_CACHE_FILE, FILE_READ);
  if (!f)
    return 0;
  DynamicJsonDocument doc(128);
  if (deserializeJson(doc, f)) {
    f.close();
    return 0;
  }
  f.close();
  int ch = doc["channel"] | 0;
  if (ch >= 1 && ch <= 13) {
    Serial.printf("[SPIFFS] 📖 Cache channel ditemukan: Ch.%d\n", ch);
    return ch;
  }
  return 0;
}

void clearChannelCache() {
  if (SPIFFS.exists(CHANNEL_CACHE_FILE)) {
    SPIFFS.remove(CHANNEL_CACHE_FILE);
    Serial.println("[SPIFFS] 🗑 Cache channel dihapus → akan scan ulang.");
  }
  savedChannel = 0;
  activeChannel = 0;
}

// ╔═══════════════════════════════════════════════════════════╗
// ║             STORAGE — KONFIGURASI NODE                    ║
// ╚═══════════════════════════════════════════════════════════╝
void saveConfig() {
  DynamicJsonDocument doc(256);
  doc["mocPin"] = mocPin;
  doc["lightState"] = lightState;

  // 🎯 SIMPAN TIMER (Persistensi Failsafe)
  doc["hasAutoOff"] = hasAutoOff;
  if (hasAutoOff && lightState) {
    long remaining = (long)(autoOffAt - millis());
    doc["remSec"] = (remaining > 0) ? (remaining / 1000) : 0;
  } else {
    doc["remSec"] = 0;
  }

  File f = SPIFFS.open(CONFIG_FILE, FILE_WRITE);
  if (f) {
    serializeJson(doc, f);
    f.close();
  }
}

void loadConfig() {
  if (!SPIFFS.exists(CONFIG_FILE))
    return;
  File f = SPIFFS.open(CONFIG_FILE, FILE_READ);
  if (!f)
    return;
  DynamicJsonDocument doc(256);
  if (!deserializeJson(doc, f)) {
    if (doc.containsKey("mocPin"))
      mocPin = doc["mocPin"].as<int>();
    if (doc.containsKey("lightState"))
      lightState = doc["lightState"].as<bool>();

    // 🎯 RESTORE TIMER
    hasAutoOff = doc["hasAutoOff"] | false;
    if (hasAutoOff && lightState) {
      uint32_t remSec = doc["remSec"] | 0;
      autoOffAt = millis() + (remSec * 1000UL);
      Serial.printf("[SPIFFS] ⏰ Timer dipulihkan: Sisa %d detik.\n", remSec);
    }
  }
  f.close();
}

// registerGatewayPeer — SELALU channel=0 (ikuti radio)
void registerGatewayPeer() {
  if (esp_now_is_peer_exist(GATEWAY_MAC))
    esp_now_del_peer(GATEWAY_MAC);
  esp_now_peer_info_t gw = {};
  memcpy(gw.peer_addr, GATEWAY_MAC, 6);
  gw.channel = activeChannel; // 🎯 Pastikan channel sinkron (jangan 0)
  gw.ifidx = WIFI_IF_STA;
  gw.encrypt = false;
  if (esp_now_add_peer(&gw) == ESP_OK)
    gatewayRegistered = true;
}

// switchChannel — pindah channel atomik & simpan SPIFFS
void switchChannel(int newCh, const char *reason) {
  if (newCh < 1 || newCh > 13)
    return;

  Serial.printf("[CH] 🔄 Ch.%d→Ch.%d (%s)\n", activeChannel, newCh, reason);

  // Set Physical Radio Channel
  esp_wifi_set_channel(newCh, WIFI_SECOND_CHAN_NONE);
  delay(10);

  // 🎯 REGISTRASI PEER DUAL PATH
  // Kita daftarkan Broadcast DAN MAC Spesifik Komandan agar radio siap 'dua
  // arah'

  // 🎯 CLEAN BROADCAST ONLY (Single Path)
  esp_now_peer_info_t bc = {};
  memcpy(bc.peer_addr, BROADCAST_MAC, 6);
  bc.channel = newCh;
  bc.ifidx = WIFI_IF_STA;
  bc.encrypt = false;
  if (!esp_now_is_peer_exist(bc.peer_addr)) {
    esp_now_add_peer(&bc);
  } else {
    // If channel changed, update peer info
    esp_now_mod_peer(&bc);
  }

  activeChannel = newCh;
  savedChannel = newCh;
  saveChannel(newCh);
  startBuzzer(1);
}

// (Fungsi sendAck duplikat dihapus, versi stabil ada di baris 238)

#if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
void onEspNowSend(const esp_now_send_info_t *tx_info,
                  esp_now_send_status_t status) {
  const uint8_t *mac_addr = tx_info->des_addr;
#else
void onEspNowSend(const uint8_t *mac_addr, esp_now_send_status_t status) {
#endif
  lastAckSent = millis();
  if (status == ESP_NOW_SEND_SUCCESS) {
    lastGatewaySeen = millis();
    heartbeatPendingRetry = false; // Reset retry on success
    Serial.println("[DEBUG] Radio Send OK ✔ (Pesan diterima driver radio)");
  } else {
    heartbeatPendingRetry = true; // Trigger quick retry
    lastRetryAttempt = millis();
    Serial.println("[DEBUG] Radio Send FAIL ✘ (Pesan tidak terkirim!)");
  }
}

// ╔═══════════════════════════════════════════════════════════╗
// ║             ESP-NOW — TERIMA PERINTAH & BEACON            ║
// ║                                                           ║
// ║  LAPIS 2 diimplementasikan di sini:                       ║
// ║  Jika received beacon dengan channel berbeda dari cache   ║
// ║  → langsung switchChannel() tanpa perlu restart!          ║
// ╚═══════════════════════════════════════════════════════════╝
// 🎯 HELPER: Cek apakah MAC pengirim adalah Komandan kita (Toleransi Drift 1
// byte)
bool isGatewayMAC(const uint8_t *mac) {
  // Cek 5 byte pertama (harus identik)
  for (int i = 0; i < 5; i++) {
    if (mac[i] != GATEWAY_MAC[i])
      return false;
  }
  // Cek byte terakhir (toleransi selisih 1 untuk akomodasi STA vs AP)
  int diff = abs((int)mac[5] - (int)GATEWAY_MAC[5]);
  return (diff <= 1);
}

#if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
void onEspNowRecv(const esp_now_recv_info_t *recv_info, const uint8_t *data,
                  int len) {
  // ⚡ [RADIO-IRQ] DATA ARRIVED ⚡
  Serial.printf("\n[RADIO-IRQ] Packet captured! Len: %d\n", len);

  const uint8_t *mac_addr = recv_info->src_addr;
#else
void onEspNowRecv(const uint8_t *mac_addr, const uint8_t *data, int len) {
#endif

  // ── Verifikasi Pengirim (Toleransi AP/STA) ────────────────
  if (!isGatewayMAC(mac_addr))
    return;

  // 🎯 DYNAMIC LEARNING: Capture MAC asli pengirim
  if (!gatewayDiscovered || memcmp(learnedGatewayMAC, mac_addr, 6) != 0) {
    memcpy(learnedGatewayMAC, mac_addr, 6);
    gatewayDiscovered = true;
    Serial.printf(
        "[REG] 🎓 Learned Gateway MAC: %02X:%02X:%02X:%02X:%02X:%02X\n",
        mac_addr[0], mac_addr[1], mac_addr[2], mac_addr[3], mac_addr[4],
        mac_addr[5]);

    // Daftarkan ulang peer agar hardware siap membalas ke MAC baru ini
    // 1. Jalur STA
    esp_now_peer_info_t gw = {};
    memcpy(gw.peer_addr, learnedGatewayMAC, 6);
    gw.channel = activeChannel;
    gw.ifidx = WIFI_IF_STA;
    gw.encrypt = false;
    if (esp_now_is_peer_exist(gw.peer_addr))
      esp_now_del_peer(gw.peer_addr);
    esp_now_add_peer(&gw);

    // 2. Jalur AP (Sebagai cadangan)
    gw.ifidx = WIFI_IF_AP;
    if (!esp_now_is_peer_exist(gw.peer_addr))
      esp_now_add_peer(&gw);
  }

  // ── LAPIS 2: Proses Beacon dari Komandan ──────────────────
  // Beacon berisi channel aktif Komandan. Jika berbeda → switchChannel()
  if (len == sizeof(EspNowBeacon)) {
    EspNowBeacon beacon;
    memcpy(&beacon, data, sizeof(beacon));

    if (beacon.type == BEACON_TYPE) {
      // 🎯 PELAJARI MAC KOMANDAN: Gunakan alamat asal beacon/perintah
      if (!gatewayDiscovered ||
          memcmp(learnedGatewayMAC, recv_info->src_addr, 6) != 0) {
        memcpy(learnedGatewayMAC, recv_info->src_addr, 6);
        gatewayDiscovered = true;
        Serial.printf(
            "[DISC] 🎓 Belajar MAC Komandan: %02X:%02X:%02X:%02X:%02X:%02X\n",
            learnedGatewayMAC[0], learnedGatewayMAC[1], learnedGatewayMAC[2],
            learnedGatewayMAC[3], learnedGatewayMAC[4], learnedGatewayMAC[5]);
      }

      if (beacon.channel >= 1 && beacon.channel <= 13 &&
          beacon.channel != activeChannel) {
        // Komandan berada di channel berbeda! Ikuti segera.
        Serial.printf(
            "[BEACON] ⚡ Komandan di Ch.%d, kita di Ch.%d → pindah!\n",
            beacon.channel, activeChannel);
        switchChannel(beacon.channel, "beacon update");
      } else {
        // Channel sudah sama → konfirmasi koneksi masih oke
        Serial.printf("[BEACON] ✔ Komandan aktif di Ch.%d (OK)\n",
                      beacon.channel);

        // 🎯 PROAKTIF: Laporkan status ke Komandan jika sudah lama tidak kirim
        // Ini memastikan Komandan "ngeh" ada Prajurit meskipun tidak ada
        // perintah.
        if (millis() - lastProactiveProbe > 15000) {
          lastProactiveProbe = millis();
          Serial.println(
              "[DISC] 📢 Proaktif: Setor muka ke Komandan via Beacon.");
          sendAck(0xFF); // Discovery Probe
        }
      }
      lastGatewaySeen =
          millis(); // Pastikan variabel diperbarui SETELAH print log
      return;
    }
  }

  // ── Proses Paket Perintah Normal ─────────────────────────
  if (len != sizeof(EspNowPacket))
    return;

  EspNowPacket pkt;
  memcpy(&pkt, data, sizeof(pkt));
  lastGatewaySeen = millis();
  discState = DS_DONE; // ⚡ Perintah diterima = Komandan ditemukan!

  if (pkt.mesaId != MESA_ID && pkt.mesaId != 0)
    return;

  unsigned long now = millis();
  uint8_t errorCode = 0;

  switch (pkt.cmd) {
  case ESPNOW_CMD_ON:
    // 🛡️ SESSION LOCK (v15.1): Ikat meja dengan token sesi biling
    activeToken = pkt.token;
    pendingHandshake = false; // Batalkan pending handshake jika ada sesi baru

    if (pkt.durationMin > 0) {
      if (pkt.extend && hasAutoOff) {
        autoOffAt += (uint32_t)pkt.durationMin * 60000;
        Serial.printf("[TIME] ➕ Tambah waktu %d menit. Sisa baru: %d m\n",
                      pkt.durationMin, (int)((autoOffAt - now) / 60000));
      } else {
        autoOffAt = now + ((uint32_t)pkt.durationMin * 60000);
        hasAutoOff = true;
        Serial.printf("[TIME] 🕒 Set durasi %d menit.\n", pkt.durationMin);
      }
    } else {
      hasAutoOff = false;
      Serial.println("[TIME] 🕒 Set Open Table (Tanpa batasan waktu)");
    }

    setLight(true);
    saveConfig(); // Simpan segera agar timer tercatat di flash
    storageDirty = false;
    lastStateChange = now;
    break;

  case ESPNOW_CMD_OFF:
    // 🛡️ SESSION VALIDATION (v15.1): Cegah "Ghost Command" dari biling lama
    if (activeToken != 0 && pkt.token != 0 && pkt.token != activeToken &&
        !pkt.force) {
      Serial.printf("[SECURITY] 🛡️ Perintah OFF diabaikan. Token mismatch "
                    "(Aktif:%u, Input:%u)\n",
                    activeToken, pkt.token);
      errorCode = 0xFD; // Security Error Code
    } else {
      hasAutoOff = false; // Hentikan timer lokal jika dimatikan manual
      if (lightProtectedUntil > now && !pkt.force) {
        errorCode = 1;
      } else {
        setLight(false);
        activeToken = 0; // Clear token saat meja mati
        pendingHandshake = false;
        lightProtectedUntil = 0;
        storageDirty = true;
        lastStateChange = now;
        startBuzzer(1);
        saveConfig(); // Simpan status OFF
      }
    }
    break;

  case 0xAC: // CMD_ACK dari Komandan (v15.1)
    if (pendingHandshake) {
      Serial.println("[HANDSHAKE] ✅ Laporan diterima Komandan. Selesai.");
      pendingHandshake = false;
    }
    return; // Tidak perlu balas ACK

  case ESPNOW_CMD_STATUS:
    break;

  case ESPNOW_CMD_REBOOT:
    sendAck(0);
    delay(200);
    ESP.restart();
    break;
  }
  // 🎯 JITTER: Jangan balas seketika (Collision Avoidance)
  // Berikan waktu Komandan (20-50ms) untuk beralih kembali ke mode RX
  pendingAck = true;
  pendingErrorCode = errorCode;
  ackDeadline = millis() + (20 + random(30));
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║    CHANNEL DISCOVERY v5 — ASYNC (Anti-Stack-Overflow)         ║
// ║                                                               ║
// ║  FIX FATAL: WiFi.scanNetworks() blocking di setup()          ║
// ║  menyebabkan STACK OVERFLOW (0x5a5a5a5a canary).             ║
// ║                                                               ║
// ║  Solusi: scanNetworks(async=TRUE) — scan jalan di WiFi       ║
// ║  background task. Main task TIDAK PERNAH blocking.           ║
// ║  Loop() hanya cek WiFi.scanComplete() tiap iterasi.          ║
// ║                                                               ║
// ║  STATE MACHINE:                                               ║
// ║  DS_IDLE → DS_SCAN_CACHED → [found] → DS_DONE               ║
// ║           → DS_SCAN_FULL  → [found] → DS_DONE               ║
// ║           → DS_WAIT_RETRY → DS_SCAN_FULL (retry 3x)         ║
// ║           → DS_PROBE      → [found] → DS_DONE               ║
// ║                          → fallback ch.6 → DS_DONE           ║
// ╚═══════════════════════════════════════════════════════════════╝

/**
 * startDiscovery() — dipanggil dari setup(), selesai dalam < 1ms.
 * Mulai scan WiFi async (background). Hasilnya dicek oleh tickDiscovery()
 * yang dipanggil dari loop() setiap iterasi.
 */
void startDiscovery() {
  // Build target SSID sekali, disimpan di global gTargetSSID
  // v15.3.2: Sesuaikan dengan prefix Komandan yang baru
  snprintf(gTargetSSID, sizeof(gTargetSSID), "KOMANDAN-SETUP-");
  // Notes: Kita hanya cari prefix-nya saja agar lebih universal.

  discAttempt = 1;
  discProbeCh = 1;

  if (savedChannel >= 1 && savedChannel <= 13) {
    Serial.printf("[DISC] Step1: Quick scan Ch.%d (cache)...\n", savedChannel);
    WiFi.scanNetworks(true, true, false, 300, (uint8_t)savedChannel);
    discState = DS_SCAN_CACHED;
  } else {
    Serial.println("[DISC] Step2: Full scan (start)...");
    WiFi.scanNetworks(true, true, false, 300, 0);
    discState = DS_SCAN_FULL;
  }
}

/**
 * tickDiscovery() — dipanggil dari loop() setiap iterasi.
 * TIDAK BLOCKING. Hanya cek status scan & proses hasilnya.
 * Return true jika discovery sudah selesai (DS_DONE).
 */
bool tickDiscovery() {
  if (discState == DS_DONE)
    return true;
  if (discState == DS_IDLE)
    return false;

  // Tunggu jika masih dalam mode WAIT_RETRY
  if (discState == DS_WAIT_RETRY) {
    if (millis() < discWaitUntil) {
      // LED berkedip cepat saat menunggu
      static unsigned long ledT = 0;
      if (millis() - ledT > 200) {
        ledT = millis();
        digitalWrite(PIN_LED, !digitalRead(PIN_LED));
      }
      esp_task_wdt_reset();
      return false;
    }
    // Waktu tunggu habis → mulai scan penuh lagi
    discAttempt++;
    Serial.printf("[DISC] Full scan percobaan %d/3...\n", discAttempt);
    WiFi.scanNetworks(true, true, false, 300, 0);
    discState = DS_SCAN_FULL;
    return false;
  }

  // Pada state DS_PROBE: kirim probe ke discProbeCh secara iteratif
  if (discState == DS_PROBE) {
    if (discProbeCh > 13) {
      Serial.println("[DISC] ✘ Semua metode gagal → fallback Ch.6");
      activeChannel = 6;
      esp_wifi_set_channel(6, WIFI_SECOND_CHAN_NONE);
      registerGatewayPeer();
      discState = DS_DONE;
      startBuzzer(1);
      return true;
    }

    Serial.printf("[DISC] Probe Ch.%d... ", discProbeCh);
    esp_wifi_set_channel(discProbeCh, WIFI_SECOND_CHAN_NONE);
    delay(40); // Beri waktu radio stabil
    registerGatewayPeer();

    // Kirim probe 3x untuk memastikan Komandan mendengar
    for (int p = 0; p < 3; p++) {
      EspNowAck probe;
      probe.mesaId = MESA_ID;
      probe.lightState = lightState;
      probe.rssi = 0;
      probe.uptime = (uint32_t)(millis() / 1000);
      probe.errorCode = 0xFF; // Identitas paket PROBE
      esp_now_send(GATEWAY_MAC, (uint8_t *)&probe, sizeof(probe));
      delay(10);
    }

    // Tunggu balasan Beacon (Interactive Discovery)
    // Komandan akan membalas dengan beacon instan saat menerima probe.
    unsigned long deadline = millis() + 600;
    while (millis() < deadline) {
      if (discState == DS_DONE)
        return true; // Sudah diselesaikan oleh onEspNowRecv (beacon)

      // LED berkedip sangat cepat saat probing
      digitalWrite(PIN_LED, (millis() % 100 < 50));

      updateBuzzer();
      esp_task_wdt_reset();

      unsigned long now = millis();

      // ── 1. RANDOMIZED HEARTBEAT (v16.0) ──────────────────
      // Mencegah tabrakan radio saat banyak meja aktif bersamaan
      if (now - lastHeartbeat > nextHeartbeatDelay) {
        lastHeartbeat = now;
        sendAck(0); // Kirim heartbeat rutin
        // Tentukan delay berikutnya secara acak
        nextHeartbeatDelay = HEARTBEAT_BASE_MS + random(HEARTBEAT_JITTER_MS);
      }

      // ── 2. PENDING ACK (Collision Avoidance) ─────────────
      if (pendingAck && now >= ackDeadline) {
        pendingAck = false;
        sendAck(pendingErrorCode);
      }

      // ── 3. SAFETY: SESSION FAILSAFE ──────────────────────
      if (hasAutoOff && lightState && now > autoOffAt) {
        setLight(false);
        hasAutoOff = false;
        activeToken = 0;
        saveConfig();
        sendAck(0x10); // Status: Timeout/Selesai (Handshake)
      }

      // ── 4. QUICK RETRY (Radio Fail Handling) ─────────────
      if (heartbeatPendingRetry && (now - lastRetryAttempt > 500)) {
        heartbeatPendingRetry = false;
        sendAck(0xEE); // Retry code
      }

      // ── 5. AUTO-RESYNC (Lost Connection) ─────────────────
      if (now - lastGatewaySeen > MAX_GAPS_BEFORE_RESYNC) {
        if (now - lastAutoSync > MIN_RESYNC_INTERVAL) {
          lastAutoSync = now;
          startDiscovery();
        }
      }
    }
    Serial.println("❌");
    discProbeCh++;
    return false;
  }

  // DS_SCAN_CACHED atau DS_SCAN_FULL: cek apakah scan async sudah selesai
  int n = WiFi.scanComplete();
  if (n == WIFI_SCAN_RUNNING) {
    // Scan masih berjalan → LED berkedip, tunggu
    static unsigned long ledT = 0;
    if (millis() - ledT > 300) {
      ledT = millis();
      digitalWrite(PIN_LED, !digitalRead(PIN_LED));
    }
    esp_task_wdt_reset();
    return false;
  }

  // Scan selesai (n = jumlah network ditemukan, atau error jika < 0)
  bool found = false;
  if (n > 0) {
    for (int i = 0; i < n; i++) {
      // 🎯 v15.3.2 Fix: Cek apakah SSID dimulai dengan prefix KOMANDAN
      if (WiFi.SSID(i).startsWith("KOMANDAN-SETUP-") ||
          WiFi.SSID(i).startsWith("VOC_GW_")) {
        int ch = WiFi.channel(i);
        int rssi = WiFi.RSSI(i);
        uint8_t *bssid = WiFi.BSSID(i);

        // 🎯 DYNAMIC BSSID: Gunakan MAC fisik yang benar-benar memancarkan SSID
        // ini
        memcpy(GATEWAY_MAC, bssid, 6);

        WiFi.scanDelete();
        Serial.printf("[DISC] ✅ Komandan '%s' Ch.%d RSSI:%d dBm | BSSID: "
                      "%02X:%02X:%02X:%02X:%02X:%02X\n",
                      gTargetSSID, ch, rssi, GATEWAY_MAC[0], GATEWAY_MAC[1],
                      GATEWAY_MAC[2], GATEWAY_MAC[3], GATEWAY_MAC[4],
                      GATEWAY_MAC[5]);

        switchChannel(ch, "wifi-scan");
        discState = DS_DONE;
        lastGatewaySeen = millis();
        startBuzzer(3);
        found = true;
        break;
      }
    }
  }
  if (!found)
    WiFi.scanDelete();

  if (found)
    return true;

  // Belum ketemu — tentukan langkah berikutnya
  if (discState == DS_SCAN_CACHED) {
    // Cache channel tidak cocok → hapus cache, mulai full scan
    Serial.println("[DISC] Cache tidak valid → hapus & full scan.");
    clearChannelCache();
    WiFi.scanNetworks(true, true, false, 300, 0);
    discState = DS_SCAN_FULL;
    discAttempt = 1;
    return false;
  }

  // DS_SCAN_FULL — belum ketemu, perlu retry?
  if (discAttempt < 3) {
    // Tunggu 5 detik (Komandan mungkin masih booting)
    Serial.printf(
        "[DISC] Komandan belum ketemu (percobaan %d/3), tunggu 5 detik...\n",
        discAttempt);
    discWaitUntil = millis() + 5000;
    discState = DS_WAIT_RETRY;
    return false;
  }

  // WiFi scan 3x gagal → fallback ke probe per channel
  Serial.println("[DISC] WiFi scan gagal 3x → probe backup Ch.1..13...");
  discProbeCh = 1;
  discState = DS_PROBE;
  return false;
}

// ╔═══════════════════════════════════════════════════════════╗
// ║             SETUP                                         ║
// ╚═══════════════════════════════════════════════════════════╝
void setup() {
  // Hardware init sebelum Serial
  pinMode(PIN_MOC, OUTPUT);
  digitalWrite(PIN_MOC, MOC_ACTIVE_LOW ? HIGH : LOW); // Relay OFF saat boot

  Serial.begin(115200);
  delay(500); // 💡 Lebih lama agar C3 tidak kehilangan log awal

  // Log Ukuran Struct (Debugging Alignment)
  Serial.printf("[DEBUG] Sizeof EspNowAck: %d bytes\n", (int)sizeof(EspNowAck));
  Serial.printf("[DEBUG] Sizeof EspNowPacket: %d bytes\n",
                (int)sizeof(EspNowPacket));
  Serial.println("\n\n╔══════════════════════════════════════╗");
  Serial.println("║  ESP-NOW NODE v5 (Async Discovery)   ║");
  Serial.println("╠══════════════════════════════════════╣");
  Serial.printf("║  Meja ID  : %d\n", MESA_ID);
  Serial.printf("║  GW MAC   : %02X:%02X:%02X:%02X:%02X:%02X\n", GATEWAY_MAC[0],
                GATEWAY_MAC[1], GATEWAY_MAC[2], GATEWAY_MAC[3], GATEWAY_MAC[4],
                GATEWAY_MAC[5]);
  Serial.println("╠══════════════════════════════════════╣");
  Serial.println("║  FIX: Async scan → no stack overflow ║");
  Serial.println("║  Setup selesai < 200ms               ║");
  Serial.println("║  Discovery di loop() non-blocking    ║");
  Serial.println("╚══════════════════════════════════════╝");

  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_LOW ? HIGH : LOW);

  // ── Watchdog DULU sebelum apapun ─────────────────────────
  // Penting: init WDT di awal agar bisa di-reset selama discovery
  esp_task_wdt_config_t wdt_cfg = {120000, 0, true}; // 120 detik (Lebih santai)
  esp_task_wdt_init(&wdt_cfg);
  esp_task_wdt_add(NULL);

  // ── SPIFFS ──────────────────────────────────────────────
  if (SPIFFS.begin(true)) {
    loadConfig();
    savedChannel = loadChannel();
  } else {
    Serial.println("[SPIFFS] ⚠ Mount GAGAL! Akan scan tiap boot.");
  }

  setLight(lightState); // Restore state lampu dari config
  Serial.printf("[BOOT] 💡 Cahaya dipulihkan ke: %s\n",
                lightState ? "ON" : "OFF");

  // ── WiFi — Mode STA (Clean Protocol) ────────────────────
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  // ⚡ FORCE RADIO POWER (Anti-Sleep)
  esp_wifi_set_ps(WIFI_PS_NONE);

#ifdef ARDUINO_ARCH_ESP32C3
  Serial.println("[RADIO] 💡 Mode ESP32-C3: Enforcing High Power + No Sleep");
  WiFi.setTxPower(WIFI_POWER_20dBm); // Max power for C3
#else
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
#endif
  delay(100);

  // 🎯 SETUP ESP-NOW INITIAL
  if (esp_now_init() != ESP_OK) {
    Serial.println("[ESP-NOW] ✘ Init GAGAL!");
    delay(1000);
    ESP.restart();
  }

  // ⚡ FORCE 1Mbps PHY RATE (Meningkatkan stabilitas antar chipset)
  esp_wifi_config_espnow_rate(WIFI_IF_STA, WIFI_PHY_RATE_1M_L);
  Serial.println("[RADIO] ⚡ PHY Rate: 1Mbps (High Stability Mode)");

  esp_now_register_send_cb((esp_now_send_cb_t)onEspNowSend);
  esp_now_register_recv_cb((esp_now_recv_cb_t)onEspNowRecv);

  Serial.println("[RADIO] Clean STA Mode Ready.");

  // Jika ada channel tersimpan, langsung aktifkan
  if (savedChannel >= 1 && savedChannel <= 13) {
    activeChannel = savedChannel;
    switchChannel(savedChannel, "boot-cache");
    discState = DS_DONE;
  }

  // ── Mulai Async Discovery (TIDAK BLOCKING) ───────────────
  // Tidak ada loop/delay panjang di setup(). Setup selesai dalam < 200ms.
  // tickDiscovery() akan menyelesaikan proses ini di loop().
  Serial.println("[BOOT] Memulai async discovery (loop akan proses)...");
  startDiscovery();
}

// ╔═══════════════════════════════════════════════════════════╗
// ║             LOOP                                          ║
// ╚═══════════════════════════════════════════════════════════╝
void loop() {
  esp_task_wdt_reset();
  unsigned long now = millis();

  // ── Failsafe Local Timer Check (PRIORITAS TINGGI) ──────────
  // Ditempatkan paling atas agar tidak terhambat oleh proses radio/discovery
  if (lightState && hasAutoOff && (long)(now - autoOffAt) >= 0) {
    Serial.println(
        "[AUTO-OFF] ⏰ Waktu habis! Mematikan lampu mandiri (Failsafe).");
    setLight(false);
    hasAutoOff = false;
    storageDirty = true;
    lastStateChange = now;
    saveConfig();   // Langsung save agar state tersimpan permanen
    startBuzzer(3); // 3x beep saat waktu habis
  }

  // ── Auto-Save Berkala (Tiap menit jika timer aktif) ────────
  static unsigned long lastMinuteSave = 0;
  if (hasAutoOff && lightState && (now - lastMinuteSave > 60000)) {
    lastMinuteSave = now;
    saveConfig();
    Serial.println("[STORAGE] 💾 Sisa waktu timer diperbarui ke flash.");
  }

  // 🎯 PROSES DEFERRED ACK (Collision Avoidance)
  if (pendingAck && now >= ackDeadline) {
    pendingAck = false;
    sendAck(pendingErrorCode);
  }
  updateBuzzer();

  // ── DISCOVERY PHASE (sebelum operasi normal) ───────────────
  // Jalankan tickDiscovery() jika belum DONE.
  // Tidak menggunakan 'return' agar logika operasional tetap jalan.
  if (discState != DS_DONE) {
    tickDiscovery();
  }

  // ════════════════════════════════════════════════════
  // NORMAL OPERATION (hanya jika discovery selesai)
  // ════════════════════════════════════════════════════

  // ── LAPIS 3: Auto-Resync ─────────────────────────────────
  // 3 menit tanpa beacon dari Komandan → restart discovery async
  // FIX: Gunakan (long) untuk mencegah integer underflow jika variabel diupdate
  // oleh core lain
  if (lastGatewaySeen > 0 &&
      ((long)(now - lastGatewaySeen) > (long)MAX_GAPS_BEFORE_RESYNC) &&
      ((long)(now - lastAutoSync) > (long)MIN_RESYNC_INTERVAL)) {

    lastAutoSync = now;
    Serial.println("[LAPIS-3] ⚠ 3 menit tanpa sinyal Komandan!");
    Serial.println("[LAPIS-3] Restart async discovery...");
    clearChannelCache();
    startDiscovery(); // Async, tidak blocking!
  }

  // 🚀 RANDOMIZED HEARTBEAT (v15.3.1): Mengurangi tabrakan radio massal
  // Melapor setiap 10-15 detik secara acak agar Gateway tetap Online (Timeout
  // 45s)
  bool timeForHeartbeat = (now - lastHeartbeat > HEARTBEAT_INTERVAL);
  bool timeForRetry =
      (heartbeatPendingRetry && (now - lastRetryAttempt > 1500));

  if (discState == DS_DONE && (timeForHeartbeat || timeForRetry)) {
    lastHeartbeat = now;
    if (!heartbeatPendingRetry) {
      HEARTBEAT_INTERVAL = random(10000, 15000);
    } else {
      Serial.println(
          "[RETRY] 🔄 Mencoba kirim ulang Heartbeat (Quick Retry)...");
    }
    sendAck(0); // Regular Heartbeat
  }

  // ── LED Indikator Status ───────────────────────────────────
  unsigned long silenceDuration =
      (lastGatewaySeen > 0) ? (now - lastGatewaySeen) : 0;

  if (silenceDuration > 180000) {
    // > 3 menit: kedip cepat (sedang resync)
    if (now - ledNext > 150) {
      ledNext = now;
      ledState = !ledState;
      digitalWrite(PIN_LED, ledState);
    }
  } else if (silenceDuration > 60000) {
    // > 1 menit: kedip lambat (peringatan)
    if (now - ledNext > 600) {
      ledNext = now;
      ledState = !ledState;
      digitalWrite(PIN_LED, ledState);
    }
  } else {
    // Komandan terlihat → LED sesuai status lampu
    digitalWrite(PIN_LED, lightState ? HIGH : LOW);
    ledState = lightState;
  }

  // ── Failsafe Local Timer Check ────────────────────────────
  if (lightState && hasAutoOff && (long)(now - autoOffAt) >= 0) {
    Serial.println(
        "[AUTO-OFF] ⏰ Waktu habis! Mematikan lampu mandiri (Failsafe).");
    setLight(false);
    hasAutoOff = false;
    storageDirty = true;
    lastStateChange = now;
    startBuzzer(3); // 3x beep saat waktu habis

    // 🛡️ SAFE-SYNC HANDSHAKE (v15.1): Lapor terus sampai di-ACK Komandan
    pendingHandshake = true;
    lastHandshakeAttempt = now;
    sendAck(0x10);
  }

  // 🛡️ PERSISTENT HANDSHAKE LOOP (v15.1)
  if (pendingHandshake && (now - lastHandshakeAttempt > 3000)) {
    lastHandshakeAttempt = now;
    Serial.println("[HANDSHAKE] 🔄 Mencoba lapor Sesi Berakhir ke Komandan...");
    sendAck(0x10);
  }

  // ── Simpan config jika ada perubahan ──────────────────────
  if (storageDirty && (now - lastStateChange > STORAGE_SAVE_DELAY)) {
    saveConfig();
    storageDirty = false;
  }

  // ── Verifikasi pin relay setiap 10 detik ──────────────────
  if (now - lastPinVerify > 10000) {
    lastPinVerify = now;
    bool expectedLevel = MOC_ACTIVE_LOW ? !lightState : lightState;
    if (digitalRead(mocPin) != (expectedLevel ? HIGH : LOW)) {
      Serial.println("[VERIFY] ⚠ Relay drift terdeteksi, diperbaiki.");
      digitalWrite(mocPin, expectedLevel ? HIGH : LOW);
    }
  }
}
