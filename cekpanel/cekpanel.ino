/*
 * ESP32 MQTT Client - VOC BILLIARD SYSTEM
 * VERSION: 4.0 (Robust Parsing & New Pins)
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
const char *ssid = "GEMENNTE";
const char *password = "Toramoka";
const char *mqtt_server = "192.168.1.38"; // <--- PASTIKAN IP PC SERVER BENAR
const int mqtt_port = 1883;
const char *LWT_TOPIC = "billiard/controller/status";

// ─────────────────────────────────────────────────────────────
// KONFIGURASI I2C & MEJA
// ─────────────────────────────────────────────────────────────
uint8_t activeAddr = 0x20; 
#define NUM_RELAYS 4 // Hanya meja 1-4

PCF8575 *pcf;

// ─────────────────────────────────────────────────────────────
// PIN HARDWARE
// ─────────────────────────────────────────────────────────────
#define MODE_SWITCH 5
#define TRANSISTOR_PIN 4
#define RELAY_CONTROL 15
#define LED_WIFI 2
#define BUZZER 19

// ─────────────────────────────────────────────────────────────
// STATE & TIMERS
// ─────────────────────────────────────────────────────────────
WiFiClient espClient;
PubSubClient client(espClient);

bool relayState[NUM_RELAYS] = {false};
bool relayTarget[NUM_RELAYS] = {false};
unsigned long relayProtectedUntil[NUM_RELAYS] = {0};

bool modeOtomatis = true;
int buzzerBeepsRemaining = 0;
unsigned long buzzerNextToggle = 0;
unsigned long lastMqttRetry = 0;
unsigned long lastLedBlink = 0;
unsigned long lastPcfVerify = 0;

// ─────────────────────────────────────────────────────────────
// FUNGSI KONTROL PCF8575
// ─────────────────────────────────────────────────────────────
bool pcfWrite(uint8_t pin, bool state) {
  if (pin >= 16 || pcf == NULL) return false;

  Wire.beginTransmission(activeAddr);
  if (Wire.endTransmission() != 0) {
    Serial.println("[I2C] Bus Error! Resetting...");
    Wire.begin(21, 22);
    Wire.setClock(40000); 
    pcf->begin();
  }

  pcf->digitalWrite(pin, state ? HIGH : LOW);
  return true;
}

void startBuzzer(unsigned long durationMs) {
  buzzerBeepsRemaining = 1;
  digitalWrite(BUZZER, HIGH);
  buzzerNextToggle = millis() + durationMs;
}

void updateBuzzer() {
  if (buzzerBeepsRemaining > 0 && millis() >= buzzerNextToggle) {
    buzzerBeepsRemaining = 0;
    digitalWrite(BUZZER, LOW);
  }
}

// ─────────────────────────────────────────────────────────────
// MQTT CALLBACK (Logika Diperbaiki)
// ─────────────────────────────────────────────────────────────
void callback(char *topic, byte *payload, unsigned int length) {
  Serial.printf("[MQTT] Perintah Masuk di Topik: %s\n", topic);
  
  DynamicJsonDocument doc(1024);
  if (deserializeJson(doc, payload, length)) {
    Serial.println("[MQTT] Gagal parsing JSON");
    return;
  }

  // Ambil data langsung dari JSON payload
  JsonObject data = doc["data"].isNull() ? doc.as<JsonObject>() : doc["data"];
  const char *status = data["status"] | "";
  int tableId = data["tableId"] | 0;
  
  // Ambil relayPin dari JSON. Jika tidak ada, gunakan tableId - 1 sebagai cadangan
  int pinIndex = -1;
  if (data.containsKey("relayPin")) {
      pinIndex = data["relayPin"].as<int>();
  } else if (tableId > 0) {
      pinIndex = tableId - 1;
  }

  if (pinIndex < 0 || pinIndex >= NUM_RELAYS) {
    Serial.printf("[MQTT] Pin %d di luar jangkauan (Meja 1-4)\n", pinIndex);
    return;
  }

  bool activate = (strcmp(status, "ON") == 0);
  unsigned long now = millis();

  if (!activate) {
    if (relayProtectedUntil[pinIndex] > now && !(data["force"] | false)) {
      Serial.println("[PROTECT] Off diabaikan (Race Protection)");
      return;
    }
    relayState[pinIndex] = false; relayTarget[pinIndex] = false;
    pcfWrite(pinIndex, false); startBuzzer(200);
    Serial.printf("[RELAY] Meja %d (Pin %d) -> OFF\n", tableId, pinIndex);
  } else {
    relayProtectedUntil[pinIndex] = now + ((data["extend"] | false) ? 60000 : 30000);
    relayState[pinIndex] = true; relayTarget[pinIndex] = true;
    pcfWrite(pinIndex, true); startBuzzer(500);
    Serial.printf("[RELAY] Meja %d (Pin %d) -> ON\n", tableId, pinIndex);
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);

  // Watchdog setup v2
  #if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
    esp_task_wdt_config_t twdt_config = { .timeout_ms = 30000, .idle_core_mask = (1 << 2) - 1, .trigger_panic = true };
    esp_task_wdt_reconfigure(&twdt_config);
  #else
    esp_task_wdt_init(30000, true);
  #endif
  esp_task_wdt_add(NULL);

  pinMode(MODE_SWITCH, INPUT_PULLUP);
  pinMode(LED_WIFI, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(TRANSISTOR_PIN, OUTPUT);
  pinMode(RELAY_CONTROL, OUTPUT);

  digitalWrite(TRANSISTOR_PIN, HIGH);
  digitalWrite(RELAY_CONTROL, HIGH);

  Wire.begin(21, 22);
  Wire.setClock(40000); 
  delay(100);

  // Scan Alamat
  Serial.println("\nMemindai Modul...");
  for (uint8_t a = 0x20; a <= 0x27; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      activeAddr = a;
      Serial.printf("Ditemukan Modul di: 0x%02X\n", a);
      break;
    }
  }

  pcf = new PCF8575(activeAddr);
  pcf->begin();
  for (int p = 0; p < 16; p++) pcf->pinMode(p, OUTPUT);

  WiFi.begin(ssid, password);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  Serial.println("=== SISTEM SIAP CONTROL 4 MEJA ===");
}

void loop() {
  esp_task_wdt_reset();
  unsigned long now = millis();
  updateBuzzer();

  // Mode Auto/Manual handling
  bool currentMode = (digitalRead(MODE_SWITCH) == HIGH);
  if (currentMode != modeOtomatis) {
    modeOtomatis = currentMode;
    digitalWrite(TRANSISTOR_PIN, modeOtomatis ? HIGH : LOW);
    digitalWrite(RELAY_CONTROL, modeOtomatis ? HIGH : LOW);
    for (int i = 0; i < NUM_RELAYS; i++) {
      pcfWrite(i, modeOtomatis && relayState[i]);
    }
    startBuzzer(500);
    Serial.printf("[MODE] Diubah ke: %s\n", modeOtomatis ? "AUTO" : "MANUAL");
  }

  // WiFi & MQTT Logic
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_WIFI, HIGH);
    if (!client.connected() && now - lastMqttRetry > 5000) {
      lastMqttRetry = now;
      String clientId = "SpotOn-4T-V4-" + String(WiFi.macAddress());
      if (client.connect(clientId.c_str(), LWT_TOPIC, 1, true, "offline")) {
        Serial.println("[MQTT] Terhubung ke Broker!");
        client.publish(LWT_TOPIC, "online", true);
        client.subscribe("billiard/table/+/light/set");
      } else {
        Serial.printf("[MQTT] Gagal konek, status: %d\n", client.state());
      }
    }
    client.loop();
  } else {
    digitalWrite(LED_WIFI, (now / 500) % 2);
    if (now - lastMqttRetry > 5000) { WiFi.reconnect(); lastMqttRetry = now; }
  }

  // Auto-Sync I2C
  if (modeOtomatis && (now - lastPcfVerify > 15000)) {
    lastPcfVerify = now;
    Wire.beginTransmission(activeAddr);
    if (Wire.endTransmission() == 0) {
       // Refresh all relay states in hardware
       for(int i=0; i<NUM_RELAYS; i++) pcfWrite(i, relayTarget[i]);
    }
  }
}
