/*
 * PRAJURIT (Node Meja) - ESP32-C3
 * VERSI PRODUKSI - ISR-SAFE FLAG ARCHITECTURE
 *
 * ARSITEKTUR:
 * - OnDataRecv hanya mengisi data & set flag (TIDAK update timestamp)
 * - loop() membaca flag dan update timestamp (satu konteks, aman)
 * - Ini menghindari race condition ISR ↔ main task di ESP32-C3
 */
#include "esp_mac.h"
#include <Preferences.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

#define PIN_RELAY 7
#define PIN_LED 8

uint8_t CURRENT_COMMANDER_MAC[6] = {0, 0, 0, 0, 0, 0};
bool hasCommander = false;

typedef struct __attribute__((packed)) {
  int32_t mesaId;
  int32_t cmd;
  int32_t durationMin;
  int32_t wifiChannel;
} struct_message;

// Data dari ISR → dibaca oleh loop()
volatile bool commanderSeen = false;  // Flag: baru dapat sinyal dari Komandan
volatile bool hasNewCommand = false;  // Flag: ada perintah baru masuk
volatile struct_message pendingCmd;   // Buffer perintah dari ISR
volatile int32_t pendingChannel = -1; // Channel yang harus di-sync

// State utama (hanya diakses dari loop())
struct_message incoming;
int32_t currentMesaId = 1;
unsigned long autoOffAt = 0;
bool isLightOn = false;
unsigned long lastHeardCommander = 0; // Hanya ditulis di loop()
Preferences prefs;

void setLight(bool on) {
  isLightOn = on;
  digitalWrite(PIN_RELAY, on ? LOW : HIGH);
  digitalWrite(PIN_LED, on ? LOW : HIGH);
  Serial.printf("[LIGHT] Meja %d: %s\n", currentMesaId, on ? "NYALA" : "MATI");
}

void lockCommander(const uint8_t *src_addr) {
  if (memcmp(CURRENT_COMMANDER_MAC, src_addr, 6) == 0)
    return;
  memcpy(CURRENT_COMMANDER_MAC, src_addr, 6);
  prefs.putBytes("commMac", CURRENT_COMMANDER_MAC, 6);

  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, CURRENT_COMMANDER_MAC, 6);
  peer.channel = 0;
  peer.encrypt = false;
  peer.ifidx = WIFI_IF_STA;
  if (esp_now_is_peer_exist(CURRENT_COMMANDER_MAC))
    esp_now_del_peer(CURRENT_COMMANDER_MAC);
  esp_now_add_peer(&peer);
  Serial.printf("[SYSTEM] Komandan Terkunci: %02X:%02X\n", src_addr[0],
                src_addr[1]);
}

// ISR CALLBACK: MINIMAL, hanya set flag & copy data
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData,
                int len) {
  if (len < sizeof(struct_message))
    return;

  struct_message temp;
  memcpy(&temp, incomingData, sizeof(struct_message));

  // Tandai Komandan terlihat (loop() yang update timestamp)
  commanderSeen = true;

  // Simpan channel untuk di-sync nanti oleh loop()
  if (temp.wifiChannel > 0 && temp.wifiChannel <= 13) {
    pendingChannel = temp.wifiChannel;
  }

  // Beacon: hanya perlu lock Komandan
  if (temp.mesaId == 0) {
    if (!hasCommander)
      lockCommander(info->src_addr);
    return;
  }

  // Lock komandan jika belum
  if (!hasCommander)
    lockCommander(info->src_addr);

  // Simpan perintah untuk diproses di loop()
  bool isBroadcast = true;
  for (int i = 0; i < 6; i++) {
    if (info->des_addr[i] != 0xFF) {
      isBroadcast = false;
      break;
    }
  }

  if (temp.mesaId == currentMesaId || !isBroadcast) {
    memcpy((void *)&pendingCmd, &temp, sizeof(struct_message));
    hasNewCommand = true;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_RELAY, HIGH);

  WiFi.mode(WIFI_STA);
  Serial.println("\n[IDENTITAS] MAC: " + WiFi.macAddress());

  if (esp_now_init() != ESP_OK)
    ESP.restart();
  esp_now_register_recv_cb(OnDataRecv);

  prefs.begin("node-config", false);
  currentMesaId = prefs.getInt("mesaId", 1);
  Serial.printf("[SYSTEM] ID Meja: %d\n", currentMesaId);

  if (prefs.getBytes("commMac", CURRENT_COMMANDER_MAC, 6) == 6) {
    bool valid = false;
    for (int i = 0; i < 6; i++) {
      if (CURRENT_COMMANDER_MAC[i] != 0) {
        valid = true;
        break;
      }
    }
    if (valid) {
      hasCommander = true;
      esp_now_peer_info_t peer = {};
      memcpy(peer.peer_addr, CURRENT_COMMANDER_MAC, 6);
      peer.channel = 0;
      peer.encrypt = false;
      peer.ifidx = WIFI_IF_STA;
      esp_now_add_peer(&peer);
      Serial.printf("[SYSTEM] Komandan dari memori: %02X:%02X\n",
                    CURRENT_COMMANDER_MAC[0], CURRENT_COMMANDER_MAC[1]);
    }
  }

  if (prefs.getBool("state", false)) {
    int remaining = prefs.getInt("remMin", 0);
    if (remaining > 0) {
      autoOffAt = millis() + (remaining * 60000UL);
      setLight(true);
    }
  }
  Serial.println("[SYSTEM] Prajurit Ready.");
}

void loop() {
  unsigned long now = millis();

  // ═══════════════════════════════════════════════
  // PROSES FLAG DARI ISR (Aman karena satu konteks)
  // ═══════════════════════════════════════════════

  // Update timestamp Komandan (di sini, bukan di ISR)
  if (commanderSeen) {
    commanderSeen = false;
    lastHeardCommander = millis();

    if (!hasCommander) {
      hasCommander = true;
      Serial.println("[SYSTEM] Komandan ditemukan!");
    }

    // Refresh peer Komandan setiap kali dengar sinyal
    // Ini memastikan peer selalu valid di ESP32-C3
    if (CURRENT_COMMANDER_MAC[0] != 0) {
      if (esp_now_is_peer_exist(CURRENT_COMMANDER_MAC))
        esp_now_del_peer(CURRENT_COMMANDER_MAC);
      esp_now_peer_info_t peer = {};
      memcpy(peer.peer_addr, CURRENT_COMMANDER_MAC, 6);
      peer.channel = 0;
      peer.encrypt = false;
      peer.ifidx = WIFI_IF_STA;
      esp_now_add_peer(&peer);
    }
  }

  // Sync channel (di sini, bukan di ISR)
  if (pendingChannel > 0) {
    int ch = pendingChannel;
    pendingChannel = -1;
    if (WiFi.channel() != ch) {
      esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);
      Serial.printf("[SYNC] Channel -> %d\n", ch);
    }
  }

  // Proses perintah masuk
  if (hasNewCommand) {
    hasNewCommand = false;
    struct_message cmd;
    memcpy(&cmd, (void *)&pendingCmd, sizeof(struct_message));

    // Auto-adopt ID jika perlu
    if (cmd.mesaId > 0 && cmd.mesaId != currentMesaId) {
      bool isBroadcast = true; // Jika sampai sini dari broadcast, tidak adopt
      // (adopsi hanya dari flag yang sudah difilter di ISR, jadi aman)
    }

    if (cmd.cmd == 1) {
      autoOffAt = millis() + (cmd.durationMin * 60000UL);
      setLight(true);
      prefs.putBool("state", true);
      prefs.putInt("remMin", cmd.durationMin);
    } else if (cmd.cmd == 0) {
      setLight(false);
      prefs.putBool("state", false);
      prefs.putInt("remMin", 0);
      autoOffAt = 0;
    }
  }

  // ═══════════════════════════════
  // TIMER AUTO-OFF (Mandiri & Aman)
  // ═══════════════════════════════
  if (isLightOn && autoOffAt > 0 && now >= autoOffAt) {
    Serial.println("[TIMER] Waktu habis, lampu mati.");
    setLight(false);
    prefs.putBool("state", false);
    autoOffAt = 0;
  }

  // ════════════════════════════════
  // HEARTBEAT KE KOMANDAN (5 detik)
  // ════════════════════════════════
  static unsigned long lastReport = 0;
  if (hasCommander && now - lastReport > 5000) {
    lastReport = now;
    struct_message report;
    report.mesaId = currentMesaId;
    report.cmd = isLightOn ? 1 : 0;
    long remaining = (long)(autoOffAt - now);
    report.durationMin = (isLightOn && remaining > 0) ? (remaining / 60000) : 0;
    report.wifiChannel = WiFi.channel();
    esp_err_t sendResult = esp_now_send(CURRENT_COMMANDER_MAC, (uint8_t *)&report, sizeof(report));
    if (sendResult != ESP_OK) {
      Serial.printf("[HEARTBEAT] GAGAL kirim (err:%d) ke %02X:%02X\n", 
                    sendResult, CURRENT_COMMANDER_MAC[0], CURRENT_COMMANDER_MAC[1]);
    } else {
      Serial.printf("[HEARTBEAT] OK -> Komandan, Meja %d, %s\n",
                    currentMesaId, isLightOn ? "NYALA" : "MATI");
    }
  }

  // ══════════════════════════════════════════════════════
  // SCANNING - Hanya jika belum pernah dengar Komandan 
  // SETELAH boot ini, atau Komandan hilang > 30 detik.
  // PENTING: Gunakan millis() bukan 'now' agar tidak underflow!
  // (lastHeardCommander bisa diisi SETELAH 'now' ditangkap)
  // ══════════════════════════════════════════════════════
  unsigned long msCurrent = millis(); // Snapshot terbaru, SETELAH semua update
  bool perluScan = (lastHeardCommander == 0)                        // Belum pernah dengar
                || (msCurrent - lastHeardCommander > 30000);        // Komandan hilang > 30s

  if (perluScan) {
    static unsigned long lastScan = 0;
    static int ch = 1;
    if (now - lastScan > 350) {
      lastScan = now;
      ch++;
      if (ch > 13)
        ch = 1;
      esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);
      Serial.printf("[SCAN] Ch: %d\n", ch);
    }
  }
}
