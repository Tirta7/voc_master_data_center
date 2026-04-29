/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║        ESP-NOW NODE — SI PRAJURIT (Billiard System)              ║
 * ║        VOC SYSTEM (Spot On Billiard)                             ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Arsitektur : ISR-SAFE FLAG (Arsitektur Pilihan User)            ║
 * ║  Fitur      : Power Recovery + Anti-Double Extend                ║
 * ║  Chip       : ESP32-C3 Super Mini                                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
#include <Preferences.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

#define PIN_RELAY 7
#define PIN_LED 8

// WAJIB PACKED AGAR COCOK DENGAN KOMANDAN
typedef struct __attribute__((packed)) {
  int32_t mesaId;
  int32_t cmd;
  int32_t durationMin;
  uint32_t token; // UNTUK ANTI-DOUBLE EXTEND
  int32_t wifiChannel;
} struct_message;

// State & Config
int32_t currentMesaId = 2; // <--- GANTI DISINI (ID Meja / relayPin)
uint8_t CURRENT_COMMANDER_MAC[6] = {0, 0, 0, 0, 0, 0};
volatile bool hasCommander = false;
bool isLightOn = false;
uint32_t lastToken = 0;
unsigned long autoOffAt = 0;
unsigned long lastHeardCommander = 0;
unsigned long silenceUntil = 0;

// Flag ISR
volatile bool hasNewCommand = false;
volatile struct_message pendingCmd;
volatile bool requestSaveChannel = false;
volatile int currentSavedCh = 0;

Preferences prefs;

void setLight(bool on) {
  isLightOn = on;
  digitalWrite(PIN_RELAY, on ? LOW : HIGH);
  digitalWrite(PIN_LED, on ? LOW : HIGH);
  prefs.putBool("state", on);
  if (!on) {
    prefs.putInt("remMin", 0);
    autoOffAt = 0;
  }
}

void lockCommander(const uint8_t *src_addr) {
  if (memcmp(CURRENT_COMMANDER_MAC, src_addr, 6) != 0) {
    memcpy(CURRENT_COMMANDER_MAC, src_addr, 6);
    hasCommander = true;

    // LANGSUNG SIMPAN KE NVS!
    prefs.putBytes("commMac", CURRENT_COMMANDER_MAC, 6);

    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, CURRENT_COMMANDER_MAC, 6);
    peer.ifidx = WIFI_IF_STA;
    if (esp_now_is_peer_exist(CURRENT_COMMANDER_MAC))
      esp_now_del_peer(CURRENT_COMMANDER_MAC);
    esp_now_add_peer(&peer);
    Serial.printf("[SYSTEM] BEACON: Komandan Dikunci & Tersimpan ke NVS!\n");
  }
}

void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData,
                int len) {
  if (len < sizeof(struct_message))
    return;

  struct_message temp;
  memcpy(&temp, incomingData, sizeof(struct_message));

  // 1. Proses Beacon (ID 0)
  if (temp.mesaId == 0) {
    lockCommander(info->src_addr);

    int ch = temp.wifiChannel;
    if (ch != currentSavedCh && ch >= 1 && ch <= 13) {
      currentSavedCh = ch;
      // LANGSUNG SIMPAN CHANNEL KE NVS!
      prefs.putInt("cmdCh", currentSavedCh);
      Serial.printf("[SYSTEM] CHANNEL: Ch %d Tersimpan ke NVS!\n",
                    currentSavedCh);
    }

    lastHeardCommander = millis();
    return;
  }

  // 2. Proses Perintah (Hanya untuk Meja Ini)
  if (temp.mesaId == currentMesaId) {
    lastHeardCommander = millis(); // RESET TIMER PANIK!
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
  WiFi.disconnect();

  if (esp_now_init() != ESP_OK)
    ESP.restart();
  esp_now_register_recv_cb(OnDataRecv);

  // Daftar Broadcast Peer
  uint8_t broadcastMAC[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  esp_now_peer_info_t bcastPeer = {};
  memcpy(bcastPeer.peer_addr, broadcastMAC, 6);
  bcastPeer.ifidx = WIFI_IF_STA;
  esp_now_add_peer(&bcastPeer);

  prefs.begin("node-config", false);
  // Manual ID Meja jika Bapak butuh dinamis, atau pakai define di atas.
  // currentMesaId = prefs.getInt("mesaId", 13);

  // Power Recovery
  if (prefs.getBool("state", false)) {
    int remaining = prefs.getInt("remMin", 0);
    if (remaining > 0) {
      autoOffAt = millis() + (remaining * 60000UL);
      setLight(true);
    }
  }

  // Inisialisasi State
  hasCommander = false;
  lastHeardCommander = millis();

  // Ambil Config dari NVS
  if (prefs.getBytes("commMac", CURRENT_COMMANDER_MAC, 6) == 6) {
    hasCommander = true;
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, CURRENT_COMMANDER_MAC, 6);
    peer.ifidx = WIFI_IF_STA;
    esp_now_add_peer(&peer);

    currentSavedCh = prefs.getInt("cmdCh", 0);
    if (currentSavedCh >= 1 && currentSavedCh <= 13) {
      esp_wifi_set_promiscuous(true);
      esp_wifi_set_channel(currentSavedCh, WIFI_SECOND_CHAN_NONE);
      esp_wifi_set_promiscuous(false);
      Serial.printf("[SYSTEM] Resume dari Channel Tersimpan: %d\n",
                    currentSavedCh);
    }
  }

  Serial.printf("[SYSTEM] Prajurit Meja %d Ready.\n", currentMesaId);
}

void loop() {
  unsigned long now = millis();

  if (requestSaveChannel) {
    requestSaveChannel = false;
    prefs.putBytes("commMac", CURRENT_COMMANDER_MAC, 6);
    prefs.putInt("cmdCh", currentSavedCh);

    // Sinkronisasi mutlak: Geser radio fisik Prajurit ke channel asli Komandan
    esp_wifi_set_promiscuous(true);
    esp_wifi_set_channel(currentSavedCh, WIFI_SECOND_CHAN_NONE);
    esp_wifi_set_promiscuous(false);

    Serial.printf(
        "[SYSTEM] Sinkronisasi antena ke Ch: %d berhasil & Tersimpan ke NVS!\n",
        currentSavedCh);
  }

  // 0. Channel Hopping (HANYA AKTIF JIKA BELUM PERNAH KETEMU KOMANDAN, ATAU
  // HILANG > 10 MENIT)
  if (!hasCommander || (now - lastHeardCommander > 600000)) {
    static unsigned long lastHop = 0;
    if (now - lastHop > 2500) {
      lastHop = now;
      currentSavedCh++;
      if (currentSavedCh > 13)
        currentSavedCh = 1;

      esp_wifi_set_promiscuous(true);
      esp_wifi_set_channel(currentSavedCh, WIFI_SECOND_CHAN_NONE);
      esp_wifi_set_promiscuous(false);
      Serial.printf("[SCAN] Mencari Komandan di Ch: %d...\n", currentSavedCh);
    }
  }

  // 1. Sinkronisasi Channel Dihapus karena Komandan ngaco laporannya.

  // 2. Proses Perintah (dari Flag ISR)
  if (hasNewCommand) {
    hasNewCommand = false;
    struct_message cmd;
    memcpy(&cmd, (void *)&pendingCmd, sizeof(struct_message));

    /* Anti-Double Action via Token — DIMATIKAN AGAR SUPER RESPONSIF
    if (cmd.token != 0 && cmd.token == lastToken) {
      Serial.printf("[CMD] Token %u duplikat, abaikan.\n", cmd.token);
      return;
    }
    */
    lastToken = cmd.token;

    if (cmd.cmd == 1) {
      Serial.printf("[CMD] Eksekusi LAMPU NYALA | Durasi: %d menit\n",
                    cmd.durationMin);
      autoOffAt = millis() + (cmd.durationMin * 60000UL);
      setLight(true);
      prefs.putInt("remMin", cmd.durationMin);
    } else if (cmd.cmd == 0) {
      Serial.printf("[CMD] Eksekusi LAMPU MATI\n");
      setLight(false);
    }
    // Tutup mulut selama 2 detik agar perintah tidak bertabrakan dengan
    // Heartbeat
    silenceUntil = millis() + 2000;
  }

  // 3. Auto-OFF
  if (isLightOn && autoOffAt > 0 && now >= autoOffAt) {
    setLight(false);
  }

  // 4. Heartbeat (5 detik) — Dengan jeda Anti-Tabrakan
  static unsigned long lastHb = 0;
  static unsigned long silenceUntil = 0; // Jeda lapor setelah terima perintah

  if (now > silenceUntil && now - lastHb > 5000) {
    lastHb = now;
    struct_message rpt;
    rpt.mesaId = currentMesaId;
    rpt.cmd = isLightOn ? 1 : 0;
    long remaining = (autoOffAt > now) ? (autoOffAt - now) / 60000 : 0;
    rpt.durationMin = (int)remaining;
    rpt.wifiChannel = WiFi.channel();
    rpt.token = lastToken;

    if (hasCommander) {
      esp_now_send(CURRENT_COMMANDER_MAC, (uint8_t *)&rpt, sizeof(rpt));
      Serial.printf("[HEARTBEAT] Lapor status Meja %d ke Komandan (Ch: %d)\n",
                    rpt.mesaId, WiFi.channel());
    } else {
      uint8_t broadcastMAC[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
      esp_now_send(broadcastMAC, (uint8_t *)&rpt, sizeof(rpt));
      Serial.printf("[HEARTBEAT] Mencari Komandan via Broadcast...\n");
      // Jika sudah kirim, tandai agar tidak terus-terusan scan di awal
      lastHeardCommander = now;
    }
  }
}
