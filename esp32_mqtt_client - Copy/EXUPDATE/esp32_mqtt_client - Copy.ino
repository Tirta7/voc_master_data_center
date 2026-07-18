/*
 * ESP32 MQTT Client — Panel Konvensional (Multi-Relay PCF8575)
 * VOC SYSTEM (Spot On Billiard)
 *
 * Arsitektur: 1 ESP32 per panel (mengontrol 1–16 relay via PCF8575)
 * Hardware  : PCF8575 (I2C GPIO Expander) → Relay Modul → Lampu 220V AC
 *
 * Topologi: WiFi MQTT langsung (tidak pakai ESP-NOW)
 * Gunakan firmware ini jika panel lama Anda pakai PCF8575 + relay module.
 *
 * Fitur:
 *  1. Multi Modul PCF8575: Mendukung hingga puluhan modul (otomatis hitung jumlah relay)
 *  2. Dynamic-Safe JSON: Alokasi memory JSON menyesuaikan jumlah relay
 *  3. Hardware Watchdog: Auto-restart jika sistem membeku (hang) >30s
 *  4. Anti-Ghost Switching: Verifikasi status I2C setiap 10 detik di semua modul
 *  5. MQTT LWT (Last Will): Server tahu secara instan jika alat offline
 *  6. Extend Protection: Proteksi 60 detik saat tambah waktu (anti-race condition)
 *  7. WiFi Stability: Auto-reconnect dengan full disconnect+begin cycle setiap 30s
 *  8. MQTT Keep-Alive: 120s keep-alive + heartbeat 60s agar tidak drop saat idle
 *  9. State Persistence: Status relay tersimpan ke SPIFFS, di-restore saat power restore
 * 10. Identifikasi via MAC Address (otomatis, tanpa konfigurasi manual)
 *
 * TOPIK MQTT:
 *  Subscribe: billiard/table/{MAC}/#
 *  Publish  : billiard/table/{MAC}/status     (telemetry, retain=true)
 *           : billiard/table/{MAC}/heartbeat  (60s ping)
 *           : billiard/table/sync             (saat boot, minta state dari server)
 */

#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <PCF8575.h>
#include <PubSubClient.h>
#include <SPIFFS.h>
#include <WiFi.h>
#include <Wire.h>
#include <esp_task_wdt.h>
#include <esp_mac.h>
#include <esp_system.h>

// ─────────────────────────────────────────────────────────────
// KONFIGURASI JARINGAN & MQTT
// ─────────────────────────────────────────────────────────────
const char *ssid        = "Tirtaaa";
const char *password    = "4DItya79!";
const char *mqtt_server = "192.168.1.19"; // IP PC server (MQTT broker)
const int   mqtt_port   = 1883;

// ─────────────────────────────────────────────────────────────
// KONFIGURASI PCF8575 (MULTI MODUL)
// ─────────────────────────────────────────────────────────────
const uint8_t pcfAddresses[] = {0x20};
const int NUM_PCF_MODULES = sizeof(pcfAddresses) / sizeof(pcfAddresses[0]);
#define NUM_RELAYS (NUM_PCF_MODULES * 16)

PCF8575 *pcfModules[NUM_PCF_MODULES];

// ─────────────────────────────────────────────────────────────
// PIN HARDWARE
// ─────────────────────────────────────────────────────────────
#define MODE_SWITCH     5
#define LED_WIFI        2
#define TRANSISTOR_PIN  4
#define BUZZER         19

// ─────────────────────────────────────────────────────────────
// STATE & VARIABEL GLOBAL
// ─────────────────────────────────────────────────────────────
WiFiClient   espClient;
PubSubClient client(espClient);

String deviceMac = ""; // MAC Address tanpa pemisah, uppercase
String baseTopic  = ""; // billiard/table/{deviceMac}

bool relayState[NUM_RELAYS]          = {false};
bool relayTarget[NUM_RELAYS]         = {false};
unsigned long relayProtectedUntil[NUM_RELAYS] = {0};

bool storageDirty           = false;
unsigned long lastStateChange = 0;
const unsigned long STORAGE_SAVE_DELAY = 3000;

bool modeOtomatis          = true;
bool wasWifiConnected       = false;
int  buzzerBeepsRemaining   = 0;
unsigned long buzzerNextToggle  = 0;
bool buzzerState            = false;
unsigned long buzzerToneDuration  = 100;
unsigned long buzzerPauseDuration = 100;
unsigned long lastMqttRetry   = 0;
unsigned long lastLedBlink    = 0;
unsigned long lastPcfVerify   = 0;
unsigned long lastStatusUpdate = 0;
unsigned long lastHeartbeat   = 0;
unsigned long lastWifiCheck   = 0;

const unsigned long STATUS_INTERVAL    = 30000; // Telemetry tiap 30s
const unsigned long HEARTBEAT_INTERVAL = 60000; // Heartbeat tiap 60s
const unsigned long WIFI_FULL_RECONNECT = 30000; // Full reconnect jika WiFi putus >30s

// ─────────────────────────────────────────────────────────────
// BUZZER (Non-blocking)
// ─────────────────────────────────────────────────────────────

void startBuzzer(unsigned long durationMs) {
  buzzerBeepsRemaining = 1;
  buzzerState = true;
  digitalWrite(BUZZER, HIGH);
  buzzerNextToggle = millis() + durationMs;
}

void startDoubleBuzzer() {
  buzzerBeepsRemaining = 3;
  buzzerState = true;
  buzzerToneDuration = 120;
  buzzerPauseDuration = 80;
  digitalWrite(BUZZER, HIGH);
  buzzerNextToggle = millis() + buzzerToneDuration;
}

void updateBuzzer() {
  if (buzzerBeepsRemaining > 0 && millis() >= buzzerNextToggle) {
    buzzerBeepsRemaining--;
    if (buzzerBeepsRemaining == 0) {
      digitalWrite(BUZZER, LOW);
      buzzerState = false;
    } else {
      buzzerState = !buzzerState;
      digitalWrite(BUZZER, buzzerState ? HIGH : LOW);
      buzzerNextToggle =
          millis() + (buzzerState ? buzzerToneDuration : buzzerPauseDuration);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// PCF8575 WRITE HELPER
// ─────────────────────────────────────────────────────────────

bool pcfWrite(uint8_t pin, bool state) {
  if (pin >= NUM_RELAYS) return false;
  int pcfIndex = pin / 16;
  int pcfPin   = pin % 16;

  Wire.beginTransmission(pcfAddresses[pcfIndex]);
  if (Wire.endTransmission() != 0) {
    Serial.printf("[I2C] Error: Modul %d offline, re-init...\n", pcfIndex);
    pcfModules[pcfIndex]->begin();
  }
  pcfModules[pcfIndex]->write(pcfPin, state ? HIGH : LOW);
  return true;
}

// ─────────────────────────────────────────────────────────────
// SPIFFS — Simpan & Muat Status Relay
// ─────────────────────────────────────────────────────────────

void saveToSPIFFS() {
  DynamicJsonDocument doc(1024 + (NUM_RELAYS * 8));
  JsonArray arr = doc.createNestedArray("state");
  for (int i = 0; i < NUM_RELAYS; i++)
    arr.add(relayState[i]);
  File f = SPIFFS.open("/relay_config.json", FILE_WRITE);
  if (f) {
    serializeJson(doc, f);
    f.close();
    Serial.println("[SPIFFS] State tersimpan.");
  }
}

// ─────────────────────────────────────────────────────────────
// MQTT — Publish Status Telemetry
// ─────────────────────────────────────────────────────────────

void publishStatus() {
  if (!client.connected()) return;

  String topic = baseTopic + "/status";
  DynamicJsonDocument resp(1024);

  resp["status"]   = "ONLINE";
  resp["online"]   = true;
  resp["uptime"]   = millis() / 1000;
  resp["rssi"]     = WiFi.RSSI();
  resp["freeHeap"] = ESP.getFreeHeap();
  resp["ip"]       = WiFi.localIP().toString();
  resp["mac"]      = deviceMac;
  resp["hwType"]   = "PCF8575";
  resp["mode"]     = modeOtomatis ? "AUTO" : "MANUAL";
  resp["pin5"]     = digitalRead(MODE_SWITCH) == HIGH ? "OPEN" : "CLOSED";

  JsonArray relays = resp.createNestedArray("relays");
  for (int i = 0; i < NUM_RELAYS; i++) {
    relays.add(relayState[i]);
  }

  char buf[1024];
  serializeJson(resp, buf);
  client.publish(topic.c_str(), buf, true); // retain=true

  Serial.printf("[MQTT] ↑ Status published: %d relays, RSSI=%d\n", 
                NUM_RELAYS, WiFi.RSSI());
}

// ─────────────────────────────────────────────────────────────
// WIFI EVENT HANDLER
// ─────────────────────────────────────────────────────────────

void onWifiEvent(WiFiEvent_t event) {
  switch (event) {
  case ARDUINO_EVENT_WIFI_STA_GOT_IP:
    Serial.printf("[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());
    digitalWrite(LED_WIFI, HIGH);
    wasWifiConnected = true;
    lastMqttRetry = 0; // Langsung coba MQTT setelah WiFi connected
    break;
  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    Serial.println("[WiFi] PUTUS dari AP! WiFi auto-reconnect...");
    digitalWrite(LED_WIFI, LOW);
    wasWifiConnected = false;
    break;
  default:
    break;
  }
}

// ─────────────────────────────────────────────────────────────
// MQTT CALLBACK — Terima Perintah dari Server
// ─────────────────────────────────────────────────────────────

void callback(char *topic, byte *payload, unsigned int length) {
  esp_task_wdt_reset();
  Serial.printf("[MQTT] Pesan masuk: %s (len=%u)\n", topic, length);

  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) {
    Serial.printf("[MQTT] JSON parse error: %s\n", error.c_str());
    return;
  }

  String sTopic = String(topic);

  // ── 1. PING ──────────────────────────────────────────────────
  if (sTopic.endsWith("/ping")) {
    int tableId = doc["tableId"] | 0;
    DynamicJsonDocument resp(256);
    resp["tableId"] = tableId;
    resp["status"]  = "PONG";
    resp["uptime"]  = millis() / 1000;
    resp["rssi"]    = WiFi.RSSI();
    resp["hwType"]  = "PCF8575";
    resp["mac"]     = deviceMac;

    char buffer[256];
    serializeJson(resp, buffer);
    client.publish((baseTopic + "/status").c_str(), buffer);
    Serial.println("[MQTT] PING → PONG terkirim.");
    return;
  }

  // ── 2. SYNC RESPONSE (Batched Payload) ───────────────────────
  if (sTopic.endsWith("/sync_response")) {
    Serial.println("[MQTT] Menerima Batched Sync Response dari Server!");
    JsonArray tables = doc["tables"].as<JsonArray>();

    unsigned long now = millis();
    bool anyChange = false;

    for (JsonObject t : tables) {
      int pinIndex = t["relayPin"] | -1;
      if (pinIndex == -1) pinIndex = (t["tableId"] | 1) - 1; // Fallback
      if (pinIndex < 0 || pinIndex >= NUM_RELAYS) continue;

      const char *statusStr  = t["status"] | "OFF";
      bool targetStatus = (strcasecmp(statusStr, "ON") == 0);

      if (relayState[pinIndex] != targetStatus || relayTarget[pinIndex] != targetStatus) {
        relayTarget[pinIndex] = targetStatus;
        relayState[pinIndex]  = targetStatus;
        pcfWrite(pinIndex, targetStatus);
        anyChange = true;
      }
    }

    if (anyChange) {
      storageDirty    = true;
      lastStateChange = now;
      startBuzzer(600);
      Serial.println("[MQTT] Sync State Terapan Sukses (Bulk).");
    } else {
      Serial.println("[MQTT] Sync: State sudah sesuai, tidak ada perubahan.");
    }
    return;
  }

  // ── 3. LIGHT CONTROL ─────────────────────────────────────────
  if (sTopic.endsWith("/light/set")) {
    const char *status = doc["status"] | "";
    bool activate = (strcasecmp(status, "ON") == 0);
    bool isExtend = doc["extend"] | false;
    bool isForce  = doc["force"]  | false;
    int  tableId  = doc["tableId"]| 0;

    int pinIndex = -1;
    if (doc.containsKey("relayPin") && !doc["relayPin"].isNull()) {
      pinIndex = doc["relayPin"].as<int>();
    } else {
      pinIndex = tableId - 1; // Fallback
    }

    if (pinIndex < 0 || pinIndex >= NUM_RELAYS) {
      Serial.printf("[MQTT] GAGAL: PinIndex %d diluar jangkauan (0-%d)\n",
                    pinIndex, NUM_RELAYS - 1);
      return;
    }

    if (!modeOtomatis) {
      Serial.println("[MQTT] PERINGATAN: Berjalan dalam MODE MANUAL. Perintah diizinkan (Debug Mode).");
    }

    unsigned long now = millis();

    if (!activate) {
      if (relayProtectedUntil[pinIndex] > now && !isForce) {
        Serial.printf("[PROTECT] Blocked Pin %d (Race Condition, sisa %lu s)\n",
                      pinIndex, (relayProtectedUntil[pinIndex] - now) / 1000);
        return;
      }
      relayState[pinIndex]  = false;
      relayTarget[pinIndex] = false;
      pcfWrite(pinIndex, false);
      storageDirty    = true;
      lastStateChange = now;
      startBuzzer(200);
      Serial.printf("[RELAY] DB_ID:%d MAC:%s Pin%d → OFF\n",
                    tableId, deviceMac.c_str(), pinIndex);
    } else {
      unsigned long protDuration = isExtend ? 60000 : 30000;
      relayProtectedUntil[pinIndex] = now + protDuration;
      relayState[pinIndex]  = true;
      relayTarget[pinIndex] = true;
      pcfWrite(pinIndex, true);
      storageDirty    = true;
      lastStateChange = now;
      if (isExtend) startDoubleBuzzer(); else startBuzzer(500);
      Serial.printf("[RELAY] DB_ID:%d MAC:%s Pin%d → ON (%s)\n",
                    tableId, deviceMac.c_str(), pinIndex,
                    isExtend ? "EXTEND" : "START");
    }
    return;
  }

  // ── 4. GPIO DIAGNOSTIC (Test Mode) ───────────────────────────
  if (sTopic.endsWith("/gpio/set")) {
    int pin = doc["pin"] | -1;
    const char *st = doc["status"] | "OFF";
    bool state = (strcasecmp(st, "ON") == 0);

    if (pin >= 100) {
      // Direct PCF8575 Control: 100-115 = Modul 0, 116-131 = Modul 1, etc.
      int pcfPinIndex = pin - 100;
      pcfWrite(pcfPinIndex, state);
      Serial.printf("[DIAG] PCF8575 Pin%d → %s\n", pcfPinIndex, st);
      startBuzzer(100);
    } else if (pin != -1) {
      pinMode(pin, OUTPUT);
      digitalWrite(pin, state ? HIGH : LOW);
      Serial.printf("[DIAG] GPIO%d → %s\n", pin, st);
      startBuzzer(100);
    }
    return;
  }

  // ── 5. SYSTEM COMMAND ─────────────────────────────────────────
  if (sTopic.endsWith("/system/set")) {
    const char *cmd = doc["command"] | "";
    if (strcmp(cmd, "REBOOT") == 0) {
      Serial.println("[SYSTEM] Reboot via MQTT...");
      startBuzzer(1000);
      delay(1500);
      ESP.restart();
    }
    return;
  }
}

// ─────────────────────────────────────────────────────────────
// MQTT — Reconnect Handler
// ─────────────────────────────────────────────────────────────

void handleMqttConnection() {
  if (client.connected()) return;
  if (millis() - lastMqttRetry < 8000) return;
  lastMqttRetry = millis();

  String clientId = "SpotOn-PCF-" + deviceMac;
  String lwtTopic = baseTopic + "/status";

  Serial.printf("[MQTT] Menghubungi Broker di %s:%d...\n", mqtt_server, mqtt_port);
  Serial.printf("[MQTT] ClientID: %s\n", clientId.c_str());

  if (client.connect(clientId.c_str(), lwtTopic.c_str(), 1, true,
                     "{\"status\":\"offline\",\"hwType\":\"PCF8575\"}")) {

    client.publish(lwtTopic.c_str(),
                   "{\"status\":\"online\",\"hwType\":\"PCF8575\"}", true);

    client.subscribe((baseTopic + "/#").c_str());

    // Minta sync state dari server
    client.publish("billiard/table/sync", deviceMac.c_str());

    Serial.println("[MQTT] Terhubung & Sync Request dikirim!");
    Serial.printf("[MQTT] Subscribed ke: %s/#\n", baseTopic.c_str());
  } else {
    int state = client.state();
    Serial.printf("[MQTT] GAGAL (rc=%d). Retry 8s lagi.\n", state);
    if (state == -2) {
      Serial.println(">> RC -2: Cek IP server, port 1883, dan Mosquitto berjalan.");
    }
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== BOOTING ESP32 — PCF8575 PANEL MODE ===");
  Serial.println("VOC Billiard System");
  Serial.println("==========================================");

  // 1. Inisialisasi Pin
  pinMode(MODE_SWITCH,    INPUT_PULLUP);
  pinMode(LED_WIFI,       OUTPUT);
  pinMode(BUZZER,         OUTPUT);
  pinMode(TRANSISTOR_PIN, OUTPUT);
  digitalWrite(LED_WIFI,       LOW);
  digitalWrite(BUZZER,         LOW);
  digitalWrite(TRANSISTOR_PIN, LOW); // Master relay OFF dulu saat boot

  // 2. Inisialisasi I2C
  Serial.println("[HARDWARE] Menginisialisasi I2C (SDA=21, SCL=22)...");
  Wire.begin(21, 22);
  Wire.setClock(100000);

  // 3. Mount SPIFFS & restore state
  if (SPIFFS.begin(true)) {
    Serial.println("[SPIFFS] Mount berhasil.");
    File f = SPIFFS.open("/relay_config.json", FILE_READ);
    if (f) {
      DynamicJsonDocument doc(1024 + (NUM_RELAYS * 8));
      if (!deserializeJson(doc, f)) {
        for (int i = 0; i < NUM_RELAYS; i++) {
          relayState[i] = doc["state"][i] | false;
        }
        Serial.println("[SPIFFS] State relay di-restore dari flash.");
      }
      f.close();
    } else {
      Serial.println("[SPIFFS] Config belum ada, gunakan default (semua OFF).");
    }
  } else {
    Serial.println("[SPIFFS] Mount GAGAL! Gunakan nilai default.");
  }

  // 4. Baca mode switch
  modeOtomatis = (digitalRead(MODE_SWITCH) == HIGH);
  for (int i = 0; i < NUM_RELAYS; i++) {
    relayTarget[i] = modeOtomatis && relayState[i];
  }

  // 5. Inisialisasi modul PCF8575 & terapkan state yang di-restore
  Serial.printf("[HARDWARE] Menginisialisasi %d modul PCF8575...\n", NUM_PCF_MODULES);
  for (int i = 0; i < NUM_PCF_MODULES; i++) {
    pcfModules[i] = new PCF8575(pcfAddresses[i]);
    pcfModules[i]->begin();
    for (int pin = 0; pin < 16; pin++) {
      int globalPin = i * 16 + pin;
      pcfModules[i]->write(pin, relayTarget[globalPin] ? HIGH : LOW);
    }
  }

  // 6. Aktifkan Master Relay (jika mode otomatis)
  //    ♻ POWER RESTORE LOGIC: State relay sudah di-apply ke PCF di atas
  if (modeOtomatis) {
    digitalWrite(TRANSISTOR_PIN, HIGH);
    Serial.println("[HARDWARE] ♻ POWER RESTORE: Master Relay ACTIVE.");
    Serial.println("[HARDWARE] Server akan konfirmasi state via sync...");
  } else {
    digitalWrite(TRANSISTOR_PIN, LOW);
    Serial.println("[HARDWARE] Manual Mode: Master Relay OFF.");
  }

  // 7. Watchdog 30 detik
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
  esp_task_wdt_config_t wdt_config = {
      .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true};
  esp_task_wdt_reconfigure(&wdt_config);
#else
  esp_task_wdt_init(30, true);
#endif
  esp_task_wdt_add(NULL);

  // 8. Baca MAC Address
  uint8_t baseMac[6];
  esp_efuse_mac_get_default(baseMac);
  char macStr[13];
  sprintf(macStr, "%02X%02X%02X%02X%02X%02X",
          baseMac[0], baseMac[1], baseMac[2],
          baseMac[3], baseMac[4], baseMac[5]);
  deviceMac = String(macStr);
  baseTopic = "billiard/table/" + deviceMac;

  Serial.printf("[DEVICE] MAC Address : %s\n", deviceMac.c_str());
  Serial.printf("[DEVICE] Base Topic  : %s\n", baseTopic.c_str());
  Serial.printf("[DEVICE] Mode        : %s\n", modeOtomatis ? "OTOMATIS" : "MANUAL");

  // 9. Setup MQTT client
  client.setKeepAlive(120);
  client.setSocketTimeout(10);
  client.setBufferSize(1024);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  // 10. WiFi connect
  WiFi.onEvent(onWifiEvent);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);

  Serial.printf("[WiFi] Menyambung ke SSID '%s'...\n", ssid);
  WiFi.begin(ssid, password);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WiFi] GAGAL. Akan retry di loop().");
  }

  // 11. OTA (non-aktif by default)
  // ArduinoOTA.setHostname(("SpotOn-PCF-" + deviceMac).c_str());
  // ArduinoOTA.begin();

  startDoubleBuzzer();

  Serial.println("\n=== PCF8575 PANEL NODE READY ===");
  Serial.printf("Daftarkan panel ini di Admin → Manajemen Meja\n");
  Serial.printf("  MAC Address : %s\n", deviceMac.c_str());
  Serial.printf("  Relay Count : %d channel\n", NUM_RELAYS);
  Serial.println("================================\n");
}

// ─────────────────────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────────────────────

void loop() {
  // ArduinoOTA.handle(); // Uncomment jika OTA diaktifkan
  esp_task_wdt_reset();
  unsigned long now = millis();

  updateBuzzer();

  // ── Deteksi perubahan Mode Switch ────────────────────────────
  bool currentMode = (digitalRead(MODE_SWITCH) == HIGH);
  if (currentMode != modeOtomatis) {
    modeOtomatis = currentMode;
    digitalWrite(TRANSISTOR_PIN, modeOtomatis ? HIGH : LOW);
    for (int i = 0; i < NUM_RELAYS; i++) {
      bool s = modeOtomatis && relayState[i];
      pcfWrite(i, s);
      relayTarget[i] = s;
    }
    startBuzzer(500);
    Serial.printf("[MODE] Beralih ke: %s\n", modeOtomatis ? "OTOMATIS" : "MANUAL");
    publishStatus();
  }

  if (WiFi.status() == WL_CONNECTED) {
    handleMqttConnection();
    client.loop();

    // ── Telemetry tiap 30s ────────────────────────────────────
    if (client.connected() && (now - lastStatusUpdate > STATUS_INTERVAL)) {
      lastStatusUpdate = now;
      publishStatus();
    }

    // ── Heartbeat tiap 60s ────────────────────────────────────
    // Publi ke /heartbeat (ringan, tanpa perubahan state)
    // agar broker tidak drop koneksi MQTT saat idle
    if (client.connected() && (now - lastHeartbeat > HEARTBEAT_INTERVAL)) {
      lastHeartbeat = now;
      String htopic   = baseTopic + "/heartbeat";
      String hpayload = "{\"uptime\":" + String(millis() / 1000) +
                        ",\"rssi\":"   + String(WiFi.RSSI()) +
                        ",\"hwType\":\"PCF8575\"}";
      client.publish(htopic.c_str(), hpayload.c_str());
      Serial.println("[MQTT] Heartbeat terkirim.");
    }

  } else {
    // ── WiFi putus: LED blink & full reconnect cycle ──────────
    if (now - lastLedBlink > 300) {
      lastLedBlink = now;
      digitalWrite(LED_WIFI, !digitalRead(LED_WIFI));
    }
    if (now - lastWifiCheck > WIFI_FULL_RECONNECT) {
      lastWifiCheck = now;
      Serial.println("[WiFi] Koneksi belum pulih, coba full reconnect...");
      WiFi.disconnect(true);
      delay(500);
      WiFi.begin(ssid, password);
    }
  }

  // ── Deferred SPIFFS Save (3s setelah perubahan terakhir) ────
  if (storageDirty && (now - lastStateChange > STORAGE_SAVE_DELAY)) {
    Serial.println("[SYSTEM] Menyimpan state ke SPIFFS...");
    saveToSPIFFS();
    storageDirty = false;
    Serial.println("[SYSTEM] Simpan berhasil.");
  }

  // ── Anti-Ghost: Verifikasi PCF setiap 10s ───────────────────
  if (modeOtomatis && (now - lastPcfVerify > 10000)) {
    lastPcfVerify = now;
    for (int i = 0; i < NUM_RELAYS; i++) {
      int pcfIndex = i / 16;
      int pcfPin   = i % 16;
      if (pcfModules[pcfIndex]->read(pcfPin) != relayTarget[i]) {
        pcfWrite(i, relayTarget[i]);
        Serial.printf("[FIX] Ghost state corrected on Pin %d\n", i);
      }
    }
  }
}
