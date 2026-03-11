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
const char *ssid = "Penerbang Liar";
const char *password = "12345678!";
const char *mqtt_server = "192.168.1.31";
const int mqtt_port = 1883;

// Topik untuk monitoring status alat
const char *LWT_TOPIC = "billiard/controller/status";

// ─────────────────────────────────────────────────────────────
// KONFIGURASI PCF8575 (MULTI MODUL)
// ─────────────────────────────────────────────────────────────
// PERHATIAN: Alamat I2C PCF8575 mentok di 8 jenis (0x20 s/d 0x27).
// Jika butuh lebih dari 8 modul (>128 relay), gunakan I2C Multiplexer
// (TCA9548A). Masukkan alamat modul di array bawah ini:

const uint8_t pcfAddresses[] = {
    0x20}; // <--- TAMBAH ALAMAT DI SINI! (Pisahkan dengan koma)

const int NUM_PCF_MODULES = sizeof(pcfAddresses) / sizeof(pcfAddresses[0]);
#define NUM_RELAYS                                                             \
  (NUM_PCF_MODULES * 16) // Jumlah limit relay dihitung otomatis!

PCF8575 *pcfModules[NUM_PCF_MODULES];

// ─────────────────────────────────────────────────────────────
// KONFIGURASI HARDWARE
// ─────────────────────────────────────────────────────────────
#define MODE_SWITCH 5
#define LED_WIFI 2
#define TRANSISTOR_PIN 15
#define RELAY_CONTROL 17
#define BUZZER 19

// ─────────────────────────────────────────────────────────────
// DATA & STATE (Static Allocation)
// ─────────────────────────────────────────────────────────────
WiFiClient espClient;
PubSubClient client(espClient);

bool relayState[NUM_RELAYS] = {false};
bool relayTarget[NUM_RELAYS] = {false};
unsigned long relayProtectedUntil[NUM_RELAYS] = {0};

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
  buzzerBeepsRemaining = 1; // 1 kali mati (state akhir) = beep tunggal
  buzzerState = true;
  digitalWrite(BUZZER, HIGH);
  buzzerNextToggle = millis() + durationMs;
}

void startDoubleBuzzer() {
  buzzerBeepsRemaining = 3; // ON, OFF, ON (kemudian mati saat iterasi ke-0)
  buzzerState = true;
  buzzerToneDuration = 120; // durasi bunyi (120ms)
  buzzerPauseDuration = 80; // durasi jeda mati (80ms)
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

// Menulis ke PCF secara dinamis berdasarkan alamat I2C
bool pcfWrite(uint8_t pin, bool state) {
  if (pin >= NUM_RELAYS)
    return false;

  // Keajaiban pembagian & sisa bagi untuk mengetahui alamat pin
  int pcfIndex = pin / 16;
  int pcfPin = pin % 16;

  // Cek respons bus i2c sebelum eksekusi write
  Wire.beginTransmission(pcfAddresses[pcfIndex]);
  if (Wire.endTransmission() != 0) {
    Serial.printf("[I2C] Error: Bus macet di modul %d, re-initializing...\n",
                  pcfIndex);
    pcfModules[pcfIndex]->begin();
  }

  pcfModules[pcfIndex]->digitalWrite(pcfPin, state ? HIGH : LOW);
  return true;
}

void saveToSPIFFS() {
  // Allocation dinamis sesuai beban array NUM_RELAYS (Anti buffer-overflow
  // json)
  DynamicJsonDocument doc(1024 + (NUM_RELAYS * 8));
  JsonArray arr = doc.createNestedArray("state");
  for (int i = 0; i < NUM_RELAYS; i++)
    arr.add(relayState[i]);

  File f = SPIFFS.open("/relay_config.json", FILE_WRITE);
  if (f) {
    serializeJson(doc, f);
    f.close();
    Serial.println("[SPIFFS] Status tersimpan.");
  }
}

// ─────────────────────────────────────────────────────────────
// MQTT CALLBACK (Logika Utama Terima Perintah)
// ─────────────────────────────────────────────────────────────

void callback(char *topic, byte *payload, unsigned int length) {
  DynamicJsonDocument doc(1024);
  if (deserializeJson(doc, payload, length))
    return;

  // Parsing ID Tabel dari Topik (billiard/table/1/light/set)
  String sTopic = String(topic);
  int first = sTopic.indexOf("table/") + 6;
  int last = sTopic.indexOf("/light");
  int tableId = sTopic.substring(first, last).toInt();

  JsonObject data = doc["data"].isNull() ? doc.as<JsonObject>() : doc["data"];
  const char *status = data["status"] | "";

  // Gunakan relayPin dari payload, jika tidak ada pakai (tableId - 1)
  int pinIndex =
      data.containsKey("relayPin") ? data["relayPin"].as<int>() : (tableId - 1);

  if (pinIndex < 0 || pinIndex >= NUM_RELAYS)
    return;

  if (!modeOtomatis) {
    Serial.println("[MQTT] Denied: Manual Mode Active.");
    return;
  }

  bool activate = (strcmp(status, "ON") == 0);
  bool isExtend = data["extend"] | false;
  bool isForce = data["force"] | false;
  unsigned long now = millis();

  if (!activate) {
    if (relayProtectedUntil[pinIndex] > now && !isForce) {
      Serial.printf("[PROTECT] OFF diabaikan untuk Pin %d (Race Condition "
                    "Protection, sisa: %lus)\n",
                    pinIndex, (relayProtectedUntil[pinIndex] - now) / 1000);
      return;
    }
    if (isForce && relayProtectedUntil[pinIndex] > now) {
      Serial.printf(
          "[FORCE] Proteksi dilewati untuk Pin %d (Manual Override)\n",
          pinIndex);
      relayProtectedUntil[pinIndex] = 0;
    }
    relayState[pinIndex] = false;
    relayTarget[pinIndex] = false;
    pcfWrite(pinIndex, false);
    startBuzzer(200);
    Serial.printf("[RELAY] Table %d -> OFF%s\n", tableId,
                  isForce ? " (FORCE)" : "");
  } else {
    unsigned long protDuration = isExtend ? 60000 : 30000;
    relayProtectedUntil[pinIndex] = now + protDuration;

    relayState[pinIndex] = true;
    relayTarget[pinIndex] = true;
    pcfWrite(pinIndex, true);

    // Bunyikan buzzer secara berbeda (2x cepat jika extend, 1x panjang jika
    // baru)
    if (isExtend) {
      startDoubleBuzzer();
    } else {
      startBuzzer(500); // 1 Detik
    }

    Serial.printf("[RELAY] Table %d -> ON (%s)\n", tableId,
                  isExtend ? "EXTEND" : "START");
  }
  saveToSPIFFS();
}

void handleMqttConnection() {
  if (client.connected())
    return;

  if (millis() - lastMqttRetry > 5000) {
    lastMqttRetry = millis();
    String clientId = "SpotOn-Controller-" + String(WiFi.macAddress());

    if (client.connect(clientId.c_str(), LWT_TOPIC, 1, true, "offline")) {
      client.publish(LWT_TOPIC, "online", true);
      client.subscribe("billiard/table/+/light/set");
      Serial.println("[MQTT] Connected & Status Online");
    }
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);

  // Konfigurasi Watchdog (30 Detik)
  const esp_task_wdt_config_t wdt_config = {
      .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true};
  esp_task_wdt_init(&wdt_config);
  esp_task_wdt_add(NULL);

  pinMode(MODE_SWITCH, INPUT_PULLUP);
  pinMode(LED_WIFI, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(TRANSISTOR_PIN, OUTPUT);
  pinMode(RELAY_CONTROL, OUTPUT);

  digitalWrite(TRANSISTOR_PIN, HIGH);
  digitalWrite(RELAY_CONTROL, HIGH);

  Wire.begin(21, 22);
  Wire.setClock(100000);

  Serial.printf("[HARDWARE] Memulai Inisialisasi %d Modul PCF8575...\n",
                NUM_PCF_MODULES);

  // Inisialisasi seluruh Array Modul PCF
  for (int i = 0; i < NUM_PCF_MODULES; i++) {
    pcfModules[i] = new PCF8575(pcfAddresses[i]);
    pcfModules[i]->begin();
    for (int pin = 0; pin < 16; pin++) {
      pcfModules[i]->pinMode(pin, OUTPUT);
    }
  }

  if (SPIFFS.begin(true)) {
    File f = SPIFFS.open("/relay_config.json", FILE_READ);
    if (f) {
      DynamicJsonDocument doc(1024 + (NUM_RELAYS * 8));
      deserializeJson(doc, f);
      for (int i = 0; i < NUM_RELAYS; i++)
        relayState[i] = doc["state"][i] | false;
      f.close();
      Serial.println("[SPIFFS] Restore data berhasil.");
    }
  }

  modeOtomatis = (digitalRead(MODE_SWITCH) == HIGH);
  for (int i = 0; i < NUM_RELAYS; i++) {
    bool s = modeOtomatis && relayState[i];
    pcfWrite(i, s);
    relayTarget[i] = s;
  }

  WiFi.begin(ssid, password);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  Serial.printf("=== VOC BILLIARD SYSTEM READY (%d RELAY) ===\n", NUM_RELAYS);
}

// ─────────────────────────────────────────────────────────────
// LOOP (Berjalan Terus Menerus)
// ─────────────────────────────────────────────────────────────

void loop() {
  esp_task_wdt_reset();
  unsigned long now = millis();
  updateBuzzer();

  // 1. Cek Mode (Manual/Otomatis)
  bool currentMode = (digitalRead(MODE_SWITCH) == HIGH);
  if (currentMode != modeOtomatis) {
    modeOtomatis = currentMode;
    digitalWrite(TRANSISTOR_PIN, modeOtomatis ? HIGH : LOW);
    digitalWrite(RELAY_CONTROL, modeOtomatis ? HIGH : LOW);
    for (int i = 0; i < NUM_RELAYS; i++) {
      bool s = modeOtomatis && relayState[i];
      pcfWrite(i, s); // Gunakan single source of truth fungsi pcfWrite
      relayTarget[i] = s;
    }
    startBuzzer(500);
    Serial.printf("[MODE] Switched to: %s\n", modeOtomatis ? "AUTO" : "MANUAL");
  }

  // 2. WiFi & MQTT Reconnect (Non-Blocking)
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

  // 3. Verifikasi PCF (Anti-Ghosting) untuk SELURUH MODUL
  if (modeOtomatis && (now - lastPcfVerify > 10000)) {
    lastPcfVerify = now;
    for (int i = 0; i < NUM_RELAYS; i++) {
      int pcfIndex = i / 16;
      int pcfPin = i % 16;

      // Baca status hardware langsung
      if (pcfModules[pcfIndex]->digitalRead(pcfPin) != relayTarget[i]) {
        pcfWrite(i, relayTarget[i]); // Fix jika ternyata relay mati/hang
        Serial.printf("[FIX] Ghost state corrected on Pin %d (Modul %d)\n", i,
                      pcfIndex);
      }
    }
  }
}
