/*
 * ESP32-C3 Super Mini MQTT Client — MOC3062 Single Table Mode
 * VOC SYSTEM (Spot On Billiard)
 *
 * Arsitektur: 1 ESP32-C3 per meja billiard
 * Hardware  : MOC3062 (optocoupler) → TRIAC BTA16 → Lampu 220V AC
 *
 * Topologi: WiFi MQTT langsung (tidak pakai ESP-NOW)
 * Chip     : ESP32-C3 Super Mini (berbeda dari WROOM-32 dalam hal PIN & LED)
 *
 * PERBEDAAN dari esp32_moc3062_singletable.ino (ESP32 biasa):
 *  - GPIO berbeda: LED onboard = GPIO8 (Active-LOW!), MOC default = GPIO7
 *  - WiFi scan sebelum connect (kabel antena lebih pendek, RSSI lebih rendah)
 *  - WiFi power management dimatikan (WIFI_PS_NONE) agar lebih stabil
 *  - MinSecurity: WIFI_AUTH_WPA2_PSK (menghindari WPA3 handshake error)
 *
 * Fitur:
 *  1. Identifikasi device via MAC Address (otomatis)
 *  2. Pin MOC configurable via SPIFFS (/moc_config.json) & MQTT /config/set
 *  3. State persistence via SPIFFS (tahan reboot / power restore)
 *  4. Hardware Watchdog 30 detik
 *  5. WiFi auto-reconnect (scan channel + full cycle)
 *  6. MQTT LWT (Last Will & Testament)
 *  7. MQTT Keep-Alive 120s + Heartbeat 60s (publish ke /heartbeat)
 *  8. Buzzer feedback (GPIO6)
 *  9. Sanity check GPIO tiap 10s
 * 10. Pending pin change handler (dari MQTT /config/set)
 *
 * TOPIK MQTT:
 *  Subscribe: billiard/table/{MAC}/#
 *  Publish  : billiard/table/{MAC}/status      (telemetry, retain=true)
 *           : billiard/table/{MAC}/heartbeat   (60s ping)
 *           : billiard/table/sync              (saat boot, minta state dari server)
 */

#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <PubSubClient.h>
#include <SPIFFS.h>
#include <WiFi.h>
#include <esp_efuse.h>
#include <esp_mac.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
#include <esp_wifi.h>

// ─────────────────────────────────────────────────────────────
// KONFIGURASI JARINGAN & MQTT (Disesuaikan dengan Screenshot)
// ─────────────────────────────────────────────────────────────
const char *ssid = "Tirtaaa";         // SSID Benar (3 huruf a)
const char *password = "4DItya79!";    // Password dari screenshot
const char *mqtt_server = "192.168.18.54"; // IP PC Server
const int mqtt_port = 1883;

// ─────────────────────────────────────────────────────────────
// PIN HARDWARE DEFAULT (ESP32-C3 Super Mini)
// ─────────────────────────────────────────────────────────────
#define PIN_LED_WIFI 8 // LED onboard C3 Super Mini (Active-LOW)
#define PIN_BUZZER 6   // Buzzer aktif-high

int mocPin = 7; // MOC Pin GPIO 7

// Flag: ganti pin MOC perlu re-apply state setelah callback selesai
bool pendingPinChange = false;
int  pendingNewPin    = -1;

// ─────────────────────────────────────────────────────────────
// LOGIKA OUTPUT MOC3062 & LED
// ─────────────────────────────────────────────────────────────
#define MOC_ACTIVE_LOW true
#define LED_ON  LOW   // C3 Super Mini LED is Active-LOW
#define LED_OFF HIGH

// ─────────────────────────────────────────────────────────────
// STATE & VARIABEL GLOBAL
// ─────────────────────────────────────────────────────────────
WiFiClient   espClient;
PubSubClient client(espClient);

String deviceMac = "";
String baseTopic  = "";

bool lightState   = false;
bool storageDirty = false;
unsigned long lastStateChange = 0;
const unsigned long STORAGE_SAVE_DELAY = 3000;

bool pendingPinChange = false;
int  pendingNewPin    = -1;

unsigned long lightProtectedUntil = 0;

// Buzzer non-blocking
int           buzzerBeepsRemaining = 0;
bool          buzzerState          = false;
unsigned long buzzerNextToggle     = 0;
unsigned long buzzerToneDuration   = 100;
unsigned long buzzerPauseDuration  = 100;

// Connection tracking
bool          wasWifiConnected = false;
unsigned long lastMqttRetry    = 0;
unsigned long lastLedBlink     = 0;
unsigned long lastStatusUpdate = 0;
unsigned long lastHeartbeat    = 0;
unsigned long lastWifiCheck    = 0;

const unsigned long STATUS_INTERVAL    = 30000;
const unsigned long HEARTBEAT_INTERVAL = 60000;
const unsigned long WIFI_FULL_RECONNECT = 30000; 

// ─────────────────────────────────────────────────────────────
// FUNGSI BUZZER (Non-blocking)
// ─────────────────────────────────────────────────────────────

void startBuzzer(unsigned long durationMs) {
  buzzerBeepsRemaining = 1;
  buzzerState = true;
  buzzerToneDuration = durationMs;
  digitalWrite(PIN_BUZZER, HIGH);
  buzzerNextToggle = millis() + durationMs;
}

void startDoubleBuzzer() {
  buzzerBeepsRemaining = 3;
  buzzerState = true;
  buzzerToneDuration = 120;
  buzzerPauseDuration = 80;
  digitalWrite(PIN_BUZZER, HIGH);
  buzzerNextToggle = millis() + buzzerToneDuration;
}

void updateBuzzer() {
  if (buzzerBeepsRemaining > 0 && millis() >= buzzerNextToggle) {
    buzzerBeepsRemaining--;
    if (buzzerBeepsRemaining == 0) {
      digitalWrite(PIN_BUZZER, LOW);
      buzzerState = false;
    } else {
      buzzerState = !buzzerState;
      digitalWrite(PIN_BUZZER, buzzerState ? HIGH : LOW);
      buzzerNextToggle = millis() + (buzzerState ? buzzerToneDuration : buzzerPauseDuration);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// KONTROL LAMPU (MOC30xx via GPIO)
// ─────────────────────────────────────────────────────────────

void setLight(bool on) {
  pinMode(mocPin, OUTPUT);
  bool pinLevel = MOC_ACTIVE_LOW ? !on : on;
  digitalWrite(mocPin, pinLevel ? HIGH : LOW);
  lightState = on;

  Serial.printf("[MOC30xx] Pin%d → %s (Lampu %s)\n", mocPin,
                pinLevel ? "HIGH" : "LOW", on ? "MENYALA" : "MATI");
}

// ─────────────────────────────────────────────────────────────
// SPIFFS — Simpan & Muat Konfigurasi
// ─────────────────────────────────────────────────────────────

void saveConfig() {
  DynamicJsonDocument doc(256);
  doc["mocPin"] = mocPin;
  doc["lightState"] = lightState;

  File f = SPIFFS.open("/moc_config.json", FILE_WRITE);
  if (f) {
    serializeJson(doc, f);
    f.close();
    Serial.println("[SPIFFS] Config tersimpan.");
  } else {
    Serial.println("[SPIFFS] GAGAL buka file untuk tulis!");
  }
}

void loadConfig() {
  if (!SPIFFS.exists("/moc_config.json")) {
    Serial.println("[SPIFFS] Config belum ada, gunakan default.");
    return;
  }
  File f = SPIFFS.open("/moc_config.json", FILE_READ);
  if (!f) return;
  DynamicJsonDocument doc(256);
  auto err = deserializeJson(doc, f);
  f.close();
  if (err) return;

  if (doc.containsKey("mocPin")) {
    int savedPin = doc["mocPin"].as<int>();
    if (savedPin >= 0 && savedPin <= 21) mocPin = savedPin;
  }
  if (doc.containsKey("lightState")) {
    lightState = doc["lightState"].as<bool>();
  }
}

// ─────────────────────────────────────────────────────────────
// MQTT — Publish Status Telemetry
// ─────────────────────────────────────────────────────────────

void publishStatus() {
  if (!client.connected()) return;

  String topic = baseTopic + "/status";
  DynamicJsonDocument doc(512);
  doc["status"]     = lightState ? "ON" : "OFF";
  doc["online"]     = true;
  doc["uptime"]     = millis() / 1000;
  doc["rssi"]       = WiFi.RSSI();
  doc["freeHeap"]   = ESP.getFreeHeap();
  doc["ip"]         = WiFi.localIP().toString();
  doc["mac"]        = deviceMac;
  doc["lightState"] = lightState;
  doc["relayPin"]   = mocPin;
  doc["hwType"]     = "MOC3062-C3";

  JsonArray relays = doc.createNestedArray("relays");
  relays.add(lightState);

  char buf[512];
  serializeJson(doc, buf);
  client.publish(topic.c_str(), buf, true);
  Serial.printf("[MQTT] ↑ Status published: Light=%s, RSSI=%d\n",
                lightState ? "ON" : "OFF", WiFi.RSSI());
}

// ─────────────────────────────────────────────────────────────
// MQTT CALLBACK — Terima Perintah dari Server
// ─────────────────────────────────────────────────────────────

void callback(char *topic, byte *payload, unsigned int length) {
  esp_task_wdt_reset(); 
  Serial.printf("[MQTT] Pesan masuk: %s\n", topic);

  DynamicJsonDocument doc(1024);
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) return;

  String sTopic = String(topic);

  // 1. PING
  if (sTopic.endsWith("/ping")) {
    int tableId = doc["tableId"] | 0;
    DynamicJsonDocument resp(192);
    resp["tableId"] = tableId;
    resp["status"] = "PONG";
    resp["hwType"] = "MOC30xx";
    resp["mocPin"] = mocPin;

    char buf[192];
    serializeJson(resp, buf);
    client.publish((baseTopic + "/status").c_str(), buf);
    return;
  }

  // 2. SYNC RESPONSE
  if (sTopic.endsWith("/sync_response")) {
    JsonArray tables = doc["tables"].as<JsonArray>();
    for (JsonObject t : tables) {
      const char *statusStr = t["status"] | "OFF";
      bool targetState = (strcasecmp(statusStr, "ON") == 0);

      if (t.containsKey("relayPin") && !t["relayPin"].isNull()) {
        int serverPin = t["relayPin"].as<int>();
        if (serverPin >= 0 && serverPin <= 21 && serverPin != mocPin) {
          digitalWrite(mocPin, MOC_ACTIVE_LOW ? HIGH : LOW);
          mocPin = serverPin;
          storageDirty = true;
          lastStateChange = millis();
        }
      }

      if (lightState != targetState) {
        setLight(targetState);
        storageDirty = true;
        lastStateChange = millis();
        startBuzzer(400);
      }
      break; 
    }
    return;
  }

  // 3. LIGHT CONTROL
  if (sTopic.endsWith("/light/set")) {
    const char *statusStr = doc["status"] | "OFF";
    bool activate = (strcasecmp(statusStr, "ON") == 0);
    bool isExtend = doc["extend"] | false;
    bool isForce = doc["force"] | false;

    unsigned long now = millis();
    if (!activate) {
      if (lightProtectedUntil > now && !isForce) return;
      setLight(false);
      lightProtectedUntil = 0;
      storageDirty = true;
      lastStateChange = now;
      startBuzzer(200);
    } else {
      lightProtectedUntil = now + (isExtend ? 60000 : 30000);
      setLight(true);
      storageDirty = true;
      lastStateChange = now;
      if (isExtend) startDoubleBuzzer(); else startBuzzer(500);
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

  String clientId = "SpotOn-MOC-C3-" + deviceMac;
  String lwtTopic = baseTopic + "/status";

  Serial.printf("[MQTT] Menghubungi broker %s:%d...\n", mqtt_server, mqtt_port);

  if (client.connect(clientId.c_str(), lwtTopic.c_str(), 1, true,
                     "{\"status\":\"offline\",\"hwType\":\"MOC3062-C3\"}")) {
    client.publish(lwtTopic.c_str(),
                   "{\"status\":\"online\",\"hwType\":\"MOC3062-C3\"}", true);
    client.subscribe((baseTopic + "/#").c_str());
    client.publish("billiard/table/sync", deviceMac.c_str());
    Serial.printf("[MQTT] Terhubung! Subscribed: %s/#\n", baseTopic.c_str());
    Serial.println("[MQTT] Sync request dikirim ke server.");
  } else {
    Serial.printf("[MQTT] Gagal konek ke %s (rc=%d)\n", mqtt_server, client.state());
  }
}

// ─────────────────────────────────────────────────────────────
// WIFI EVENT HANDLER
// ─────────────────────────────────────────────────────────────

void onWifiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
  case ARDUINO_EVENT_WIFI_STA_GOT_IP:
    digitalWrite(PIN_LED_WIFI, LED_ON); 
    startBuzzer(1000);                  
    wasWifiConnected = true;
    lastMqttRetry = 0;
    Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    break;
  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    digitalWrite(PIN_LED_WIFI, LED_OFF);
    wasWifiConnected = false;
    Serial.printf("[WiFi] Disconnected. Reason Code: %d\n", info.wifi_sta_disconnected.reason);
    break;
  default:
    break;
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────

void setup() {
  pinMode(mocPin, OUTPUT);
  digitalWrite(mocPin, MOC_ACTIVE_LOW ? HIGH : LOW);

  Serial.begin(115200);
  unsigned long startWait = millis();
  while (!Serial && millis() - startWait < 3000); 
  delay(500);

  Serial.println("\n\n=== BOOTING ESP32-C3 Super Mini — MOC30xx ===");

  pinMode(PIN_LED_WIFI, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_LED_WIFI, LED_OFF);
  digitalWrite(PIN_BUZZER, LOW);

  if (SPIFFS.begin(true)) loadConfig();

  pinMode(mocPin, OUTPUT);
  digitalWrite(mocPin, MOC_ACTIVE_LOW ? !lightState : lightState);

  // Watchdog
  esp_task_wdt_config_t wdt_cfg = { .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true };
  esp_task_wdt_reconfigure(&wdt_cfg);
  esp_task_wdt_add(NULL);

  // MAC
  uint8_t baseMac[6];
  esp_efuse_mac_get_default(baseMac);
  char macStr[13];
  sprintf(macStr, "%02X%02X%02X%02X%02X%02X", baseMac[0], baseMac[1], baseMac[2], baseMac[3], baseMac[4], baseMac[5]);
  deviceMac = String(macStr);
  baseTopic = "billiard/table/" + deviceMac;

  client.setKeepAlive(120);
  client.setBufferSize(1024);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  WiFi.onEvent(onWifiEvent);
  WiFi.mode(WIFI_OFF); // Matikan dulu untuk reset manual
  delay(200);
  WiFi.mode(WIFI_STA); // Set ke Mode STA (Station) saja
  WiFi.persistent(false); // Jangan gunakan data lama di flash

  Serial.println("[WiFi] Scan jaringan sekitar...");
  int n = WiFi.scanNetworks();
  int targetChannel = 0;
  bool found = false;
  for (int i = 0; i < n; ++i) {
    if (WiFi.SSID(i) == ssid) {
      found = true;
      targetChannel = WiFi.channel(i);
      Serial.printf("[WiFi] SSID '%s' ditemukan! (RSSI: %d dBm, Ch: %d)\n", ssid, WiFi.RSSI(i), targetChannel);
      break;
    }
  }
  
  if (!found) {
    Serial.printf("[WiFi] SSID '%s' TIDAK ditemukan. Dekatkan ke router!\n", ssid);
  }

  WiFi.setSleep(false);
  esp_wifi_set_ps(WIFI_PS_NONE); 
  
  WiFi.setMinSecurity(WIFI_AUTH_WPA2_PSK);
  WiFi.setTxPower(WIFI_POWER_15dBm); 
  
  Serial.printf("[WiFi] Fast Connecting ke %s (Ch:%d)...\n", ssid, targetChannel);
  
  if (targetChannel > 0) {
    WiFi.begin(ssid, password, targetChannel);
  } else {
    WiFi.begin(ssid, password);
  }

  startDoubleBuzzer();
}

// ─────────────────────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────────────────────

void loop() {
  esp_task_wdt_reset();
  unsigned long now = millis();

  updateBuzzer();

  if (WiFi.status() == WL_CONNECTED) {
    handleMqttConnection();
    client.loop();

    digitalWrite(PIN_LED_WIFI, LED_ON);

    // ── Heartbeat tiap 60s ──────────────────────────────────────
    // Publish ringan ke /heartbeat agar broker tidak drop koneksi saat idle
    if (client.connected() && (now - lastHeartbeat > HEARTBEAT_INTERVAL)) {
      lastHeartbeat = now;
      String htopic   = baseTopic + "/heartbeat";
      String hpayload = "{\"uptime\":" + String(millis() / 1000) +
                        ",\"rssi\":"   + String(WiFi.RSSI()) +
                        ",\"hwType\":\"MOC3062-C3\"}";
      client.publish(htopic.c_str(), hpayload.c_str());
      Serial.println("[MQTT] Heartbeat terkirim.");
    }

    // ── Telemetry tiap 30s ──────────────────────────────────────
    if (client.connected() && (now - lastStatusUpdate > STATUS_INTERVAL)) {
      lastStatusUpdate = now;
      publishStatus();
    }
  } else {
    if (now - lastLedBlink > 300) {
      lastLedBlink = now;
      digitalWrite(PIN_LED_WIFI, !digitalRead(PIN_LED_WIFI));
    }
    if (now - lastWifiCheck > WIFI_FULL_RECONNECT) {
      lastWifiCheck = now;
      Serial.println("[WiFi] Koneksi belum pulih, coba full reconnect...");
      WiFi.disconnect(true);
      delay(500);
      WiFi.begin(ssid, password);
    }
  }

  // ── Deferred SPIFFS Save ─────────────────────────────────────
  if (storageDirty && (now - lastStateChange > STORAGE_SAVE_DELAY)) {
    saveConfig();
    storageDirty = false;
  }

  // ── Pending Pin Change (dari /config/set MQTT command) ─────────
  // Dilakukan di loop() bukan di callback agar tidak blocking
  if (pendingPinChange && pendingNewPin >= 0) {
    pendingPinChange = false;
    // Matikan pin lama dengan benar
    bool offLevel = MOC_ACTIVE_LOW ? HIGH : LOW;
    pinMode(mocPin, OUTPUT);
    digitalWrite(mocPin, offLevel);
    mocPin        = pendingNewPin;
    pendingNewPin = -1;
    setLight(lightState); // Re-apply state di pin baru
    storageDirty    = true;
    lastStateChange = millis();
    startBuzzer(300);
    Serial.printf("[CONFIG] mocPin resmi diubah ke GPIO%d\n", mocPin);
    publishStatus();
  }

  // ── Sanity Check: Pastikan pin GPIO sesuai state tiap 10s ───────
  static unsigned long lastPinVerify = 0;
  if (now - lastPinVerify > 10000) {
    lastPinVerify = now;
    bool expectedLevel = MOC_ACTIVE_LOW ? !lightState : lightState;
    bool pinIsHigh     = (digitalRead(mocPin) == HIGH);
    if (pinIsHigh != expectedLevel) {
      Serial.printf("[FIX] GPIO%d tidak sesuai state, koreksi...\n", mocPin);
      digitalWrite(mocPin, expectedLevel ? HIGH : LOW);
    }
  }
}
