/*
 * ESP32 MQTT Client for Billiard Table Control - VOC SYSTEM (Spot On Billiard)
 * Fitur Utama:
 * 1. Multi Modul PCF8575: Mendukung hingga puluhan modul (Otomatis hitung jumlah relay).
 * 2. Dynamic-Safe JSON: Alokasi memory JSON menyesuaikan jumlah relay.
 * 3. Hardware Watchdog: Auto-restart jika sistem membeku (hang).
 * 4. Anti-Ghost Switching: Verifikasi status I2C setiap 10 detik di SEMUA modul.
 * 5. MQTT LWT (Last Will): Server tahu secara instan jika alat offline.
 * 6. Extend Protection: Proteksi 60 detik saat tambah waktu (anti-race condition).
 * 7. WiFi Stability: Auto-reconnect dengan full disconnect+begin cycle setiap 30s.
 * 8. MQTT Keep-Alive: 120s keep-alive + heartbeat 60s agar tidak drop saat idle.
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
const char *ssid = "Tirtaaa";
const char *password = "4DItya79!";
const char *mqtt_server = "192.168.1.5"; // Gunakan IP Hotspot (Gateway) PC
const int mqtt_port = 1883; // Gunakan 1883 untuk protocol TCP (Standard Mosquitto)

// Topik untuk monitoring status alat
String deviceMac = ""; // Akan diisi di setup (Tanpa Titik Dua)
String baseTopic = ""; // billiard/table/[deviceMac]
const char *LWT_TOPIC = "billiard/controller/status";

// ─────────────────────────────────────────────────────────────
// KONFIGURASI PCF8575 (MULTI MODUL)
// ─────────────────────────────────────────────────────────────
const uint8_t pcfAddresses[] = {0x20};
const int NUM_PCF_MODULES = sizeof(pcfAddresses) / sizeof(pcfAddresses[0]);
#define NUM_RELAYS (NUM_PCF_MODULES * 16)

PCF8575 *pcfModules[NUM_PCF_MODULES];

// ─────────────────────────────────────────────────────────────
// KONFIGURASI HARDWARE
// ─────────────────────────────────────────────────────────────
#define MODE_SWITCH     5
#define LED_WIFI        2
#define TRANSISTOR_PIN  4
#define BUZZER          19

// ─────────────────────────────────────────────────────────────
// DATA & STATE (Static Allocation)
// ─────────────────────────────────────────────────────────────
WiFiClient espClient;
PubSubClient client(espClient);

bool relayState[NUM_RELAYS] = {false};
bool relayTarget[NUM_RELAYS] = {false};
unsigned long relayProtectedUntil[NUM_RELAYS] = {0};

// Performance & Persistence Optimization
bool storageDirty = false;
unsigned long lastStateChange = 0;
const unsigned long STORAGE_SAVE_DELAY = 3000; // Simpan ke Flash setelah 3 detik idle

bool modeOtomatis = true;
bool wasWifiConnected = false;
int buzzerBeepsRemaining = 0;
unsigned long buzzerNextToggle = 0;
bool buzzerState = false;
unsigned long buzzerToneDuration = 100;
unsigned long buzzerPauseDuration = 100;
unsigned long lastMqttRetry = 0;
unsigned long lastLedBlink = 0;
unsigned long lastPcfVerify = 0;
unsigned long lastStatusUpdate = 0;
unsigned long lastWifiCheck = 0;    // NEW: for full WiFi reconnect cycle
unsigned long lastHeartbeat = 0;    // NEW: periodic MQTT heartbeat saat idle

const unsigned long STATUS_INTERVAL   = 30000;  // 30s telemetry interval
const unsigned long HEARTBEAT_INTERVAL = 60000; // 60s MQTT ping saat idle agar broker tidak drop
const unsigned long WIFI_FULL_RECONNECT = 30000; // 30s sebelum coba disconnect+begin ulang

// ─────────────────────────────────────────────────────────────
// FUNGSI HELPER
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

bool pcfWrite(uint8_t pin, bool state) {
  if (pin >= NUM_RELAYS)
    return false;
  int pcfIndex = pin / 16;
  int pcfPin = pin % 16;

  Wire.beginTransmission(pcfAddresses[pcfIndex]);
  if (Wire.endTransmission() != 0) {
    Serial.printf("[I2C] Error: Modul %d offline, re-init...\n", pcfIndex);
    pcfModules[pcfIndex]->begin();
  }
  pcfModules[pcfIndex]->write(pcfPin, state ? HIGH : LOW);
  return true;
}

void saveToSPIFFS() {
  DynamicJsonDocument doc(1024 + (NUM_RELAYS * 8));
  JsonArray arr = doc.createNestedArray("state");
  for (int i = 0; i < NUM_RELAYS; i++)
    arr.add(relayState[i]);
  File f = SPIFFS.open("/relay_config.json", FILE_WRITE);
  if (f) {
    serializeJson(doc, f);
    f.close();
  }
}

void publishStatus() {
  String topic = baseTopic + "/status";
  DynamicJsonDocument resp(512);
  
  resp["status"] = "online";
  resp["uptime"] = millis() / 1000;
  resp["rssi"] = WiFi.RSSI();
  resp["freeHeap"] = ESP.getFreeHeap();
  resp["mode"] = modeOtomatis ? "AUTO" : "MANUAL";
  resp["pin5"] = digitalRead(MODE_SWITCH) == HIGH ? "OPEN" : "CLOSED";
  resp["ip"] = WiFi.localIP().toString();
  
  // Also include current relay states for robust sync
  JsonArray relays = resp.createNestedArray("relays");
  for (int i = 0; i < NUM_RELAYS; i++) {
    relays.add(relayState[i]);
  }

  char buffer[512];
  serializeJson(resp, buffer);
  client.publish(topic.c_str(), buffer, true); // Retain=true for persistent status
  Serial.println("[MQTT] Status Telemetry Published");
}

// ─────────────────────────────────────────────────────────────
// WIFI EVENT HANDLER (Deteksi putus/terhubung secara hardware)
// ─────────────────────────────────────────────────────────────
void onWifiEvent(WiFiEvent_t event) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.println("[WiFi] Terhubung! IP: " + WiFi.localIP().toString());
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
// MQTT CALLBACK (Logika Utama Terima Perintah)
// ─────────────────────────────────────────────────────────────

void callback(char *topic, byte *payload, unsigned int length) {
  Serial.printf("[MQTT] Message arrived on Topic: %s (length: %u)\n", topic, length);
  
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) {
    Serial.printf("[MQTT] Deserialization failed: %s\n", error.c_str());
    return;
  }

  String sTopic = String(topic);

  // 1. Handle PING Request
  if (sTopic.endsWith("/ping")) {
    int tableId = doc["tableId"] | 0;
    String responseTopic = baseTopic + "/status";
    DynamicJsonDocument resp(256);
    resp["tableId"] = tableId;
    resp["status"] = "PONG";
    resp["uptime"] = millis() / 1000;
    resp["rssi"] = WiFi.RSSI();

    char buffer[256];
    serializeJson(resp, buffer);
    client.publish(responseTopic.c_str(), buffer);
    Serial.println("[MQTT] Ping received -> Pong sent");
    return;
  }

  // 1.5. Handle Sync Response (Batched Payload)
  if (sTopic.endsWith("/sync_response")) {
    Serial.println("[MQTT] Menerima Batched Sync Response dari Server!");
    JsonArray tables = doc["tables"].as<JsonArray>();
    
    unsigned long now = millis();
    bool anyChange = false;

    // Apply states to memory
    for (JsonObject t : tables) {
      int pinIndex = t["relayPin"] | -1;
      if (pinIndex == -1) pinIndex = (t["tableId"] | 1) - 1; // Fallback
      if (pinIndex < 0 || pinIndex >= NUM_RELAYS) continue;

      const char *statusStr = t["status"] | "OFF";
      bool targetStatus = (strcasecmp(statusStr, "ON") == 0);

      if (relayState[pinIndex] != targetStatus || relayTarget[pinIndex] != targetStatus) {
        relayTarget[pinIndex] = targetStatus;
        relayState[pinIndex] = targetStatus;
        pcfWrite(pinIndex, targetStatus);
        anyChange = true;
      }
    }

    if (anyChange) {
      storageDirty = true;
      lastStateChange = now;
      startBuzzer(600); // 1 beep for full sync success
      Serial.println("[MQTT] Sync State Terapan Sukses (Bulk).");
    }
    return;
  }

  // 2. Handle Light Control
  if (sTopic.endsWith("/light/set")) {
    JsonObject data = doc.as<JsonObject>();
    const char *status = data["status"] | "";
    bool activate = (strcasecmp(status, "ON") == 0);
    bool isExtend = data["extend"] | false;
    bool isForce = data["force"] | false;
    int tableId = data["tableId"] | 0;

    // Gunakan relayPin dari payload
    int pinIndex = -1;
    if (data.containsKey("relayPin") && !data["relayPin"].isNull()) {
      pinIndex = data["relayPin"].as<int>();
    } else {
      // Fallback: assume tableId - 1 if relayPin not provided
      pinIndex = tableId - 1;
    }

    if (pinIndex < 0 || pinIndex >= NUM_RELAYS) {
      Serial.printf("[MQTT] GAGAL: PinIndex %d diluar jangkauan (0-%d)\n", pinIndex, NUM_RELAYS-1);
      return;
    }

    if (!modeOtomatis) {
      Serial.println("[MQTT] PERINGATAN: Berjalan dalam MODE MANUAL. Perintah diizinkan (Debug Mode).");
      // return; // SEMENTARA: Izinkan tetap jalan meskipun switch manual agar bisa debug
    }

    unsigned long now = millis();

    if (!activate) {
      if (relayProtectedUntil[pinIndex] > now && !isForce) {
        Serial.printf("[PROTECT] Blocked Pin %d (Race Condition, sisa %lus)\n",
                      pinIndex, (relayProtectedUntil[pinIndex] - now) / 1000);
        return;
      }
      relayState[pinIndex] = false;
      relayTarget[pinIndex] = false;
      pcfWrite(pinIndex, false);
      startBuzzer(200);

      // Defer storage save
      storageDirty = true;
      lastStateChange = now;

      Serial.printf("[RELAY] Pin %d (Table %d) -> OFF\n", pinIndex, tableId);
    } else {
      unsigned long protDuration = isExtend ? 60000 : 30000;
      relayProtectedUntil[pinIndex] = now + protDuration;
      relayState[pinIndex] = true;
      relayTarget[pinIndex] = true;
      pcfWrite(pinIndex, true);

      if (isExtend)
        startDoubleBuzzer();
      else
        startBuzzer(500);

      // Defer storage save
      storageDirty = true;
      lastStateChange = now;

      Serial.printf("[RELAY] Pin %d (Table %d) -> ON (%s)\n", pinIndex, tableId,
                    isExtend ? "EXTEND" : "START");
    }
  }

  // 3. Handle Raw GPIO Pin Control (Diagnostic Mode)
  if (sTopic.endsWith("/gpio/set")) {
    int pin = doc["pin"] | -1;
    const char* status = doc["status"] | "OFF";
    bool state = (strcasecmp(status, "ON") == 0);

    if (pin >= 100) {
      // Direct PCF8575 Control (Test Mode)
      // 100-115 = Module 0, 116-131 = Module 1, etc.
      int pcfPinIndex = pin - 100;
      pcfWrite(pcfPinIndex, state);
      Serial.printf("[DIAG] PCF8575 Pin %d set to %s\n", pcfPinIndex, status);
      startBuzzer(100);
    } else if (pin != -1) {
      pinMode(pin, OUTPUT);
      digitalWrite(pin, state ? HIGH : LOW);
      Serial.printf("[DIAG] GPIO %d set to %s\n", pin, status);
      startBuzzer(100); // Feedback beep
    }
  }

  // 4. Handle System Commands
  if (sTopic.endsWith("/system/set")) {
    const char* cmd = doc["command"] | "";
    if (strcmp(cmd, "REBOOT") == 0) {
      Serial.println("[SYSTEM] Rebooting via MQTT...");
      startBuzzer(1000);
      delay(1500);
      ESP.restart();
    }
  }
}

void handleMqttConnection() {
  if (client.connected())
    return;

  // Retry setiap 8 detik (lebih lambat agar tidak spam broker)
  if (millis() - lastMqttRetry > 8000) {
    lastMqttRetry = millis();
    
    String clientId = "SpotOn-Ctrl-" + deviceMac;
    String lwt = baseTopic + "/status";

    Serial.printf("[MQTT] Menghubungi Broker di %s:%d...\n", mqtt_server, mqtt_port);
    Serial.printf("[MQTT] ClientID: %s\n", clientId.c_str());

    if (client.connect(clientId.c_str(), lwt.c_str(), 1, true,
                       "{\"status\":\"offline\"}")) {
      client.publish(lwt.c_str(), "{\"status\":\"online\"}", true);
      
      // Strict Subscriptions: Combined with specific MAC
      client.subscribe((baseTopic + "/#").c_str());
      client.subscribe(("billiard/locker/" + deviceMac + "/#").c_str());

      // Request state sync from server
      client.publish("billiard/table/sync", deviceMac.c_str());

      Serial.println("[MQTT] BERHASIL TERKONEKSI & SYNC REQUEST SENT!");
      Serial.printf("[MQTT] Subscribed ke: %s/#\n", baseTopic.c_str());
    } else {
      int state = client.state();
      Serial.printf("[MQTT] GAGAL (rc=%d)\n", state);
      if (state == -2) {
        Serial.println(">> TIPS: RC -2 = Socket Gagal. Cek IP server, port 1883, dan Mosquitto.");
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────

void setup() {
  // 1. Initialize Serial
  Serial.begin(115200);
  Serial.println("\n\n=== BOOTING ESP32 (PERSISTENT STATE) ===");

  // 2. Initialize Pins (Except Master Relay for now)
  pinMode(MODE_SWITCH, INPUT_PULLUP);
  pinMode(LED_WIFI, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  // 3. Initialize I2C & PCF early
  Serial.println("[HARDWARE] Menginisialisasi I2C (Pin 21, 22)...");
  Wire.begin(21, 22);
  Wire.setClock(100000);

  // 4. Restore Data from SPIFFS (Critical for persistence)
  if (SPIFFS.begin(true)) {
    Serial.println("[SPIFFS] Mounting berhasil.");
    File f = SPIFFS.open("/relay_config.json", FILE_READ);
    if (f) {
      DynamicJsonDocument doc(1024 + (NUM_RELAYS * 8));
      deserializeJson(doc, f);
      for (int i = 0; i < NUM_RELAYS; i++) {
        relayState[i] = doc["state"][i] | false;
      }
      f.close();
      Serial.println("[SPIFFS] Data restore sukses.");
    }
  }

  modeOtomatis = (digitalRead(MODE_SWITCH) == HIGH);
  bool anyActive = false;
  for (int i = 0; i < NUM_RELAYS; i++) {
    relayTarget[i] = modeOtomatis && relayState[i];
    if (relayTarget[i]) anyActive = true;
  }

  // 5. Initialize PCF modules with restored state
  Serial.printf("[HARDWARE] Menginisialisasi %d modul PCF8575...\n",
                NUM_PCF_MODULES);
  for (int i = 0; i < NUM_PCF_MODULES; i++) {
    pcfModules[i] = new PCF8575(pcfAddresses[i]);
    pcfModules[i]->begin();
    for (int pin = 0; pin < 16; pin++) {
      int globalPin = i * 16 + pin;
      pcfModules[i]->write(pin, relayTarget[globalPin] ? HIGH : LOW);
    }
  }

  // 6. ACTIVATE MASTER RELAY IMMEDIATELY (Minimize dark period)
  pinMode(TRANSISTOR_PIN, OUTPUT);
  if (modeOtomatis) {
    digitalWrite(TRANSISTOR_PIN, HIGH);
    Serial.println("[HARDWARE] Master Relay ACTIVE (Power Restored).");
  } else {
    digitalWrite(TRANSISTOR_PIN, LOW);
    Serial.println("[HARDWARE] Manual Mode: Master Relay OFF.");
  }

  // 7. Initialize Hardware Watchdog
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
  esp_task_wdt_config_t wdt_config = {
      .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true};
  esp_task_wdt_reconfigure(&wdt_config);
#else
  esp_task_wdt_init(30, true); // 30 seconds
#endif
  esp_task_wdt_add(NULL);

  // 8. Connect to WiFi
  WiFi.mode(WIFI_STA);
  
  uint8_t baseMac[6];
  esp_efuse_mac_get_default(baseMac);
  char macStr[13];
  sprintf(macStr, "%02X%02X%02X%02X%02X%02X", baseMac[0], baseMac[1], baseMac[2], baseMac[3], baseMac[4], baseMac[5]);
  deviceMac = String(macStr);
  baseTopic = "billiard/table/" + deviceMac;

  // 9. Initialize MQTT
  // Keep-alive 120 detik: broker tidak akan drop client idle < 120s
  client.setKeepAlive(120);
  // Socket timeout 10 detik: cepat detect koneksi putus
  client.setSocketTimeout(10);
  // Buffer lebih besar: cegah disconnect saat payload besar (sync, status)
  client.setBufferSize(1024);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  // 10. Register WiFi Event Handler (Deteksi putus/terhubung realtime)
  WiFi.onEvent(onWifiEvent);
  // Auto-reconnect aktif (tidak disable manual)
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true); // Simpan kredensial ke NVS

  Serial.printf("[WIFI] Menyambung ke SSID '%s'...\n", ssid);
  WiFi.begin(ssid, password);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] TERKONEKSI!");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WIFI] GAGAL (Check SSID/Pass)");
  }

  // 11. Initialize ArduinoOTA
  ArduinoOTA.setHostname(("SpotOn-" + WiFi.macAddress()).c_str());
  ArduinoOTA.onStart([]() { Serial.println("[OTA] Start updating..."); });
  ArduinoOTA.onEnd([]() { Serial.println("\n[OTA] End"); });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("[OTA] Progress: %u%%\r", (progress / (total / 100)));
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("[OTA] Error[%u]: ", error);
  });
  // ArduinoOTA.begin();

  Serial.printf("=== VOC BILLIARD SYSTEM READY ===\n");
}

// ─────────────────────────────────────────────────────────────
// LOOP (Berjalan Terus Menerus)
// ─────────────────────────────────────────────────────────────

void loop() {
  // ArduinoOTA.handle(); // Important for OTA updates
  esp_task_wdt_reset();
  unsigned long now = millis();
  updateBuzzer();

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
    Serial.printf("[MODE] Switched to: %s\n", modeOtomatis ? "AUTO" : "MANUAL");
    publishStatus(); // Instant update when physical switch toggles
  }

  // ─────────────────────────────────────────────────────────────
  // PERIODIC TELEMETRY (Every 30s)
  // ─────────────────────────────────────────────────────────────
  if (now - lastStatusUpdate > STATUS_INTERVAL) {
    lastStatusUpdate = now;
    if (client.connected()) {
      publishStatus();
    }
  }

  if (WiFi.status() == WL_CONNECTED) {
    handleMqttConnection();
    client.loop();

    // ─────────────────────────────────────────────────────────────
    // HEARTBEAT: Kirim ping kecil setiap 60s agar broker TIDAK drop
    // koneksi MQTT saat idle (tidak ada perintah relay)
    // ─────────────────────────────────────────────────────────────
    if (client.connected() && (now - lastHeartbeat > HEARTBEAT_INTERVAL)) {
      lastHeartbeat = now;
      // Publish heartbeat ringan ke LWT topic (tidak perubahan state)
      String htopic = baseTopic + "/heartbeat";
      String hpayload = "{\"uptime\":" + String(millis()/1000) + ",\"rssi\":" + String(WiFi.RSSI()) + "}";
      client.publish(htopic.c_str(), hpayload.c_str());
      Serial.println("[MQTT] Heartbeat sent (idle keepalive)");
    }

  } else {
    // ─────────────────────────────────────────────────────────────
    // WiFi RECONNECT: Pertama biarkan auto-reconnect bekerja.
    // Jika dalam 30 detik masih tidak tersambung, lakukan
    // full disconnect + begin cycle (lebih agresif, reset hardware WiFi).
    // ─────────────────────────────────────────────────────────────
    if (now - lastLedBlink > 300) {  // Blink lebih cepat saat offline
      lastLedBlink = now;
      digitalWrite(LED_WIFI, !digitalRead(LED_WIFI));
    }

    if (now - lastWifiCheck > WIFI_FULL_RECONNECT) {
      lastWifiCheck = now;
      Serial.println("[WiFi] Koneksi belum pulih, coba full reconnect...");
      WiFi.disconnect(true);  // Putus dan reset state internal WiFi
      delay(500);
      WiFi.begin(ssid, password);
      Serial.println("[WiFi] WiFi.begin() ulang.");
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PENGHEMATAN FLASH (SPIFFS DEFERRED SAVE)
  // ─────────────────────────────────────────────────────────────
  if (storageDirty && (now - lastStateChange > STORAGE_SAVE_DELAY)) {
    Serial.println("[SYSTEM] Menyimpan perubahan status ke Flash (SPIFFS)...");
    saveToSPIFFS();
    storageDirty = false;
    Serial.println("[SYSTEM] Simpan berhasil.");
  }

  if (modeOtomatis && (now - lastPcfVerify > 10000)) {
    lastPcfVerify = now;
    for (int i = 0; i < NUM_RELAYS; i++) {
      int pcfIndex = i / 16;
      int pcfPin = i % 16;
      if (pcfModules[pcfIndex]->read(pcfPin) != relayTarget[i]) {
        pcfWrite(i, relayTarget[i]);
        Serial.printf("[FIX] Ghost state corrected on Pin %d\n", i);
      }
    }
  }
}
