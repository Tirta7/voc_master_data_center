/*
 * ESP32 MQTT Client for Billiard Table Control - VOC SYSTEM (Spot On Billiard)
 * * Fitur Utama:
 * 1. Multi Modul PCF8575: Mendukung hingga puluhan modul (Otomatis hitung
 * jumlah relay).
 * 2. Dynamic-Safe JSON: Alokasi memory JSON menyesuaikan jumlah relay.
 * 3. Hardware Watchdog: Auto-restart jika sistem membeku (hang).
 * 4. Anti-Ghost Switching: Verifikasi status I2C setiap 10 detik di SEMUA
 * modul.
 * 5. MQTT LWT (Last Will): Server tahu secara instan jika alat offline.
 * 6. Extend Protection: Proteksi 60 detik saat tambah waktu (anti-race
 * condition).
 */

#include <ArduinoJson.h>
#include <PCF8575.h>
#include <PubSubClient.h>
#include <SPIFFS.h>
#include <WiFi.h>
#include <Wire.h>
#include <esp_task_wdt.h>

// ─────────────────────────────────────────────────────────────
// KONFIGURASI JARINGAN & MQTT
// ─────────────────────────────────────────────────────────────
const char *ssid = "panel";
const char *password = "12345678";
const char *mqtt_server = "192.168.1.22"; // Server IP
const int mqtt_port =
    1883; // Gunakan 1883 untuk protocol TCP (Standard Mosquitto)

// Topik untuk monitoring status alat
String baseTopic = ""; // Akan diisi di setup dengan MAC Address
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
#define MODE_SWITCH 5
#define TRANSISTOR_PIN 4
#define LED_WIFI 2
#define BUZZER 19

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
const unsigned long STORAGE_SAVE_DELAY =
    3000; // Simpan ke Flash setelah 3 detik idle

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
  pcfModules[pcfIndex]->digitalWrite(pcfPin, state ? HIGH : LOW);
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

// ─────────────────────────────────────────────────────────────
// MQTT CALLBACK (Logika Utama Terima Perintah)
// ─────────────────────────────────────────────────────────────

void callback(char *topic, byte *payload, unsigned int length) {
  DynamicJsonDocument doc(1024);
  if (deserializeJson(doc, payload, length))
    return;

  String sTopic = String(topic);

  // 1. Handle PING Request
  if (sTopic.endsWith("/ping")) {
    int tableId = doc["tableId"] | 0;
    String responseTopic = "billiard/table/" + WiFi.macAddress() + "/status";
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

  // 2. Handle Light Control
  if (sTopic.endsWith("/light/set")) {
    JsonObject data = doc.as<JsonObject>();
    const char *status = data["status"] | "";
    bool activate = (strcmp(status, "ON") == 0);
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

    if (pinIndex < 0 || pinIndex >= NUM_RELAYS)
      return;
    if (!modeOtomatis)
      return;

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
}

void handleMqttConnection() {
  if (client.connected())
    return;

  if (millis() - lastMqttRetry > 5000) {
    lastMqttRetry = millis();
    String mac = WiFi.macAddress();
    mac.replace(":", ""); // Bersihkan titik dua agar ClientID lebih kompatibel
    String clientId = "SpotOn-Ctrl-" + mac;
    String lwt = "billiard/table/" + WiFi.macAddress() + "/status";

    Serial.printf("[MQTT] Menghubungi Broker di %s:%d...\n", mqtt_server,
                  mqtt_port);
    Serial.printf("[MQTT] ClientID: %s\n", clientId.c_str());

    if (client.connect(clientId.c_str(), lwt.c_str(), 1, true,
                       "{\"status\":\"offline\"}")) {
      client.publish(lwt.c_str(), "{\"status\":\"online\"}", true);
      String subTopic = "billiard/table/" + WiFi.macAddress() + "/#";
      client.subscribe(subTopic.c_str());
      client.subscribe("billiard/table/+/light/set");

      // Request state sync from server
      String syncTopic = "billiard/table/sync";
      client.publish(syncTopic.c_str(), WiFi.macAddress().c_str());

      Serial.println("[MQTT] BERHASIL TERKONEKSI & SYNC REQUEST SENT!");
      Serial.printf("[MQTT] Subscribed ke: %s\n", subTopic.c_str());
    } else {
      int state = client.state();
      Serial.printf("[MQTT] GAGAL (rc=%d)\n", state);
      if (state == -2) {
        Serial.println(">> TIPS: RC -2 berarti Socket Gagal. Penyebab:");
        Serial.println("   1. IP Server salah (Cek 'ipconfig' di PC Server)");
        Serial.println("   2. Port 1883 diblokir Firewall (Cek Inbound Rules)");
        Serial.println("   3. Mosquitto TIDAK jalan (Jalankan 'mosquitto -c "
                       "mosquitto.conf')");
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
      pcfModules[i]->pinMode(pin, OUTPUT);
      pcfModules[i]->digitalWrite(pin, relayTarget[globalPin] ? HIGH : LOW);
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
  const esp_task_wdt_config_t wdt_config = {
      .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true};
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);

  // 8. Connect to WiFi
  WiFi.mode(WIFI_STA);
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
  } else {
    Serial.println("\n[WIFI] GAGAL (Check SSID/Pass)");
  }

  // 9. Initialize MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  Serial.printf("=== VOC BILLIARD SYSTEM READY ===\n");
}

// ─────────────────────────────────────────────────────────────
// LOOP (Berjalan Terus Menerus)
// ─────────────────────────────────────────────────────────────

void loop() {
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
  }

  if (WiFi.status() == WL_CONNECTED) {
    if (!wasWifiConnected) {
      digitalWrite(LED_WIFI, HIGH);
      wasWifiConnected = true;
    }
    handleMqttConnection();
    client.loop();
  } else {
    wasWifiConnected = false;
    if (now - lastLedBlink > 500) {
      lastLedBlink = now;
      digitalWrite(LED_WIFI, !digitalRead(LED_WIFI));
    }
    if (now - lastMqttRetry > 5000) {
      WiFi.reconnect();
      lastMqttRetry = now;
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
      if (pcfModules[pcfIndex]->digitalRead(pcfPin) != relayTarget[i]) {
        pcfWrite(i, relayTarget[i]);
        Serial.printf("[FIX] Ghost state corrected on Pin %d\n", i);
      }
    }
  }
}
