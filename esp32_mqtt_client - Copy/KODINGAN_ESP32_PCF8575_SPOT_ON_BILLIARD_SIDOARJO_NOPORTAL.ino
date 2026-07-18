/*
 * IoT Relay Controller dengan ESP32 + N PCF8575 + Reverb WebSocket
 * -------------------------------------------------------------
 * Fitur:
 * - 30 relay dikendalikan via 2 modul PCF8575 (I2C)
 * - Mode Manual (semua relay mati) dan Otomatis (dikendalikan via WebSocket)
 * - Persistensi status relay via SPIFFS (dengan recovery otomatis)
 * - Koneksi ke server Reverb (Pusher-compatible) via WebSocket
 * - Animasi test & warning tanpa delay (non-blocking)
 * - Penanganan error I2C dan koneksi jaringan
 * - Validasi waktu untuk mencegah warning prematur: hanya jika waktu tersisa <= 5 menit
 * 
 * Hardware:
 * - ESP32 DevKit V1
 * - 2x PCF8575: alamat 0x21 (relay 1-16), 0x22 (relay 17-30)
 * - Mode switch on GPIO 5 (INPUT_PULLUP): HIGH = Otomatis | LOW = Manual
 * - Buzzer on GPIO 19
 * - WiFi LED on GPIO 2
 * - External power transistor on GPIO 4
 * - Relay control enable (PCF power) on GPIO 15 (active-high)
 * 
 * Oleh: Tirta Aditya
 * Tanggal: 25 November 2025
 * LOKASI: BALLISTIC SURABAYA
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>
#include <esp_wifi.h>
#include "Wire.h"
#include "PCF8575.h"

// ─────────────────────────────────────────────────────────────
// KONFIGURASI JARINGAN
// ─────────────────────────────────────────────────────────────
#define WIFI_SSID "Tirtaaa"
#define WIFI_PASSWORD "4DItya79!"
const char* CONFIG_FILE = "/relay_config.json";

// ─────────────────────────────────────────────────────────────
// KONFIGURASI PCF8575
// ─────────────────────────────────────────────────────────────
#define NUM_PCF 1
uint8_t pcfAddresses[NUM_PCF] = {0x20};

// ─────────────────────────────────────────────────────────────
// KONFIGURASI RELAY
// ─────────────────────────────────────────────────────────────
const uint8_t NUM_RELAYS_PER_PCF = 16;
const uint8_t NUM_TOTAL_RELAYS = 4; // Relay 1-30 → index 0-29

// ─────────────────────────────────────────────────────────────
// KONFIGURASI VALIDASI WARNING
// ─────────────────────────────────────────────────────────────
const unsigned long MIN_TIME_BEFORE_WARNING_MS = 10000UL;
const unsigned long WARNING_THRESHOLD_MS = 5UL * 60UL * 1000UL;

// ─────────────────────────────────────────────────────────────
// PIN HARDWARE
// ─────────────────────────────────────────────────────────────
#define MODE_SWITCH    5
#define TRANSISTOR_PIN 4
#define RELAY_CONTROL 15
#define LED_WIFI       2
#define BUZZER         19

// ─────────────────────────────────────────────────────────────
// OBJEK & VARIABEL GLOBAL
// ─────────────────────────────────────────────────────────────
PCF8575* pcfModules[NUM_PCF];
bool* relayState = nullptr;
bool* relayStateBackup = nullptr;
unsigned long* relayActivationTime = nullptr;
unsigned long* relayEndTime = nullptr;
bool modeOtomatis = true;
bool wifiConnected = false;
unsigned long lastWiFiCheck = 0;
unsigned long lastPing = 0;
const unsigned long pingInterval = 25000;

bool buzzerActive = false;
unsigned long buzzerEndTime = 0;

enum TestState {
  IDLE,
  RUNNING_LIGHT_ON,
  RUNNING_LIGHT_END,
  WARNING_BLINK
};
TestState currentState = IDLE;
unsigned long stateStartTime = 0;
int testStep = 0;
uint8_t warningCode = 0;
int warningBlinkCount = 0;

StaticJsonDocument<1024> doc;
StaticJsonDocument<1024> dataDoc;
StaticJsonDocument<2048> loadDoc;
StaticJsonDocument<2048> saveDoc;

// ─────────────────────────────────────────────────────────────
// REVERB CONFIG
// ─────────────────────────────────────────────────────────────
const String host_static_ip = "192.168.1.13";
const int reverb_port = 6061;
const char* reverb_app_key = "pjdishtaa3yp4doumbyy";

const char* pusher_channel = "iot.channel";
const char* pusher_channel_warn = "iot.warn.channel";
const char* pusher_channel_check = "iot.check.channel";
const char* pusher_channel_test = "iot.test.channel";

const char* subscribeTemplate = "{\"event\":\"pusher:subscribe\",\"data\":{\"channel\":\"%s\"}}";
const char* pusherChannels[] = {
  pusher_channel, pusher_channel_check, pusher_channel_warn, pusher_channel_test
};
const size_t numPusherChannels = sizeof(pusherChannels) / sizeof(pusherChannels[0]);

const char* pusher_event_connec = "lamp.connection";
const char* pusher_event_check = "lamp.check";
const char* pusher_event_warn = "lamp.warn";
const char* pusher_event_test = "lamp.test";

WebSocketsClient webSocket;

// ─────────────────────────────────────────────────────────────
// FUNCTION PROTOTYPES
// ─────────────────────────────────────────────────────────────
void LoadRelayConfigSPIFFS();
void SaveRelayConfigSPIFFS();
void connectToWiFi();
void ConnectWebSocket();
void cekWiFi(unsigned long currentMillis);
void WebSocketEvent(WStype_t type, uint8_t* payload, size_t length);
void PowerRelayByWebSocket(uint8_t code, const char* status, unsigned long durationMs = 0);
void PowerRelayByWebSocketCheck(uint8_t code);
void PowerRelayByWebSocketWarning(uint8_t code);
void PowerRelayByWebSocketTest();
bool setRelayState(uint8_t channel, bool state, bool updateActivationTime = true);
bool setRelayStateAndEndTime(uint8_t channel, bool state, unsigned long endTime);
void startBuzzer(unsigned long duration);
void updateBuzzer();

// ─────────────────────────────────────────────────────────────
// BUZZER NON-BLOCKING
// ─────────────────────────────────────────────────────────────
void startBuzzer(unsigned long duration) {
  digitalWrite(BUZZER, HIGH);
  buzzerActive = true;
  buzzerEndTime = millis() + duration;
}

void updateBuzzer() {
  if (buzzerActive && millis() >= buzzerEndTime) {
    digitalWrite(BUZZER, LOW);
    buzzerActive = false;
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(MODE_SWITCH, INPUT_PULLUP);
  pinMode(RELAY_CONTROL, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(TRANSISTOR_PIN, OUTPUT);

  digitalWrite(TRANSISTOR_PIN, LOW);
  digitalWrite(RELAY_CONTROL, LOW);
  digitalWrite(LED_WIFI, LOW);
  digitalWrite(BUZZER, LOW);

  Wire.begin();

  for (int i = 0; i < NUM_PCF; i++) {
    Serial.printf("Inisialisasi PCF8575 di alamat 0x%02X...\n", pcfAddresses[i]);
    pcfModules[i] = new PCF8575(pcfAddresses[i]);
    pcfModules[i]->begin();
    for (int j = 0; j < NUM_RELAYS_PER_PCF; j++) {
      pcfModules[i]->write(j, LOW);
    }
  }

  if (!SPIFFS.begin(true)) {
    Serial.println("Gagal memulai SPIFFS – restart otomatis");
    ESP.restart();
  }

  // Alokasi memori untuk 30 relay
  relayState = new bool[NUM_TOTAL_RELAYS];
  relayStateBackup = new bool[NUM_TOTAL_RELAYS];
  relayActivationTime = new unsigned long[NUM_TOTAL_RELAYS];
  relayEndTime = new unsigned long[NUM_TOTAL_RELAYS];

  for (int i = 0; i < NUM_TOTAL_RELAYS; i++) {
    relayState[i] = false;
    relayStateBackup[i] = false;
    relayActivationTime[i] = 0;
    relayEndTime[i] = 0;
  }

  LoadRelayConfigSPIFFS();

  for (int i = 0; i < NUM_TOTAL_RELAYS; i++) {
    setRelayState(i, relayState[i], false);
  }

  modeOtomatis = (digitalRead(MODE_SWITCH) == HIGH);
  Serial.printf("Boot: Mode awal = %s\n", modeOtomatis ? "OTOMATIS" : "MANUAL");

  connectToWiFi();
  ConnectWebSocket();

  digitalWrite(TRANSISTOR_PIN, modeOtomatis ? HIGH : LOW);
  digitalWrite(RELAY_CONTROL, modeOtomatis ? HIGH : LOW);
}

// ─────────────────────────────────────────────────────────────
// LOOP UTAMA
// ─────────────────────────────────────────────────────────────
void loop() {
  unsigned long currentMillis = millis();

  cekWiFi(currentMillis);
  webSocket.loop();
  updateBuzzer();

  if (currentMillis - lastPing > pingInterval) {
    lastPing = currentMillis;
    webSocket.sendTXT("{\"event\":\"pusher:ping\"}");
    Serial.println("Mengirim ping ke Reverb...");
  }

  // ───── DEBOUNCE MODE SWITCH ─────
  static bool lastSwitchReading = HIGH;
  static unsigned long lastDebounceTime = 0;
  const unsigned long debounceDelay = 500; // Ditingkatkan untuk mencegah noise listrik mematikan semua meja
  bool reading = digitalRead(MODE_SWITCH);
  if (reading != lastSwitchReading) lastDebounceTime = millis();
  lastSwitchReading = reading;

  if ((millis() - lastDebounceTime) > debounceDelay) {
    bool newMode = (reading == HIGH);
    if (newMode != modeOtomatis) {
      modeOtomatis = newMode;
      digitalWrite(TRANSISTOR_PIN, modeOtomatis ? HIGH : LOW);
      digitalWrite(RELAY_CONTROL, modeOtomatis ? HIGH : LOW);

      if (modeOtomatis) {
        delay(10);
        LoadRelayConfigSPIFFS();
        for (int i = 0; i < NUM_TOTAL_RELAYS; i++) {
          setRelayState(i, relayState[i], false);
        }
        Serial.println("Mode OTOMATIS: status relay dipulihkan");
      } else {
        for (int i = 0; i < NUM_TOTAL_RELAYS; i++) {
          setRelayState(i, false, false);
        }
        currentState = IDLE;
        Serial.println("Mode MANUAL: semua relay mati");
      }

      startBuzzer(modeOtomatis ? 500 : 300);
      Serial.printf("Mode berubah: %s\n", modeOtomatis ? "OTOMATIS" : "MANUAL");
    }
  }

  // ───── STATE MACHINE ─────
  if (modeOtomatis) {
    switch (currentState) {
      case RUNNING_LIGHT_ON:
        if (currentMillis - stateStartTime >= 500) {
          if (testStep < NUM_TOTAL_RELAYS) {
            setRelayState(testStep, true, false);
            startBuzzer(50);
            testStep++;
            stateStartTime = currentMillis;
          } else {
            currentState = RUNNING_LIGHT_END;
            stateStartTime = currentMillis;
          }
        }
        break;

      case RUNNING_LIGHT_END:
        for (int i = 0; i < NUM_TOTAL_RELAYS; i++) {
          setRelayState(i, relayStateBackup[i], false);
        }
        startBuzzer(100);
        currentState = IDLE;
        Serial.println("Running light test selesai");
        break;

      case WARNING_BLINK:
        if (currentMillis - stateStartTime >= 400) {
          bool newState = (warningBlinkCount % 2 == 1);
          setRelayState(warningCode - 1, newState, false);
          startBuzzer(50);
          warningBlinkCount++;
          stateStartTime = currentMillis;
          if (warningBlinkCount >= 6) {
            setRelayState(warningCode - 1, true, false);
            currentState = IDLE;
            Serial.println("Warning selesai");
          }
        }
        break;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// FUNGSI JARINGAN
// ─────────────────────────────────────────────────────────────
void connectToWiFi() {
  Serial.print("\nMenghubungkan ke WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.setAutoReconnect(true);
  esp_wifi_set_ps(WIFI_PS_NONE); // Matikan hemat daya agar responsif
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startTime) < 10000) {
    digitalWrite(LED_WIFI, (millis() / 500) % 2);
    delay(10);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi terhubung!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.println("2_KODINGAN_ESP32_PCF8575_BALLISTIC_BILLIARD_SURABAYA");
    digitalWrite(LED_WIFI, HIGH);
    wifiConnected = true;
    startBuzzer(1000);
  } else {
    Serial.println("\nGagal terhubung ke WiFi");
    digitalWrite(LED_WIFI, LOW);
  }
}

void cekWiFi(unsigned long currentMillis) {
  if (currentMillis - lastWiFiCheck >= 5000) {
    lastWiFiCheck = currentMillis;
    if (WiFi.status() != WL_CONNECTED) {
      if (wifiConnected) {
        Serial.println("WiFi terputus!");
        digitalWrite(LED_WIFI, LOW);
        wifiConnected = false;
        startBuzzer(1000);
      }
    } else if (!wifiConnected) {
      digitalWrite(LED_WIFI, HIGH);
      wifiConnected = true;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// WEBSOCKET EVENT
// ─────────────────────────────────────────────────────────────
void WebSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket: Terputus");
      digitalWrite(LED_WIFI, LOW);
      break;

    case WStype_CONNECTED:
      Serial.println("WebSocket: Terhubung ke Reverb");
      char msgBuf[128];
      for (size_t i = 0; i < numPusherChannels; i++) {
        int len = snprintf(msgBuf, sizeof(msgBuf), subscribeTemplate, pusherChannels[i]);
        if (len > 0 && len < (int)sizeof(msgBuf)) {
          webSocket.sendTXT(msgBuf);
          Serial.print("Subscribe ke: ");
          Serial.println(pusherChannels[i]);
        }
      }
      digitalWrite(LED_WIFI, HIGH);
      break;

    case WStype_TEXT: {
      deserializeJson(doc, payload);
      if (doc.isNull()) { Serial.println("JSON tidak valid"); return; }

      const char* event = doc["event"];
      if (!event) { Serial.println("Pesan tanpa field 'event'"); return; }

      if (strncmp(event, "pusher:", 7) == 0) {
        if (strcmp(event, "pusher:pong") == 0) Serial.println("Pong diterima");
        else if (strcmp(event, "pusher:connection_established") == 0) Serial.println("Koneksi WebSocket stabil");
        else if (strcmp(event, "pusher:error") == 0) {
          const char* errorMsg = doc["data"];
          Serial.print("Pusher Error: ");
          Serial.println(errorMsg ? errorMsg : "Tidak ada detail");
        }
        return;
      }

      if (strcmp(event, pusher_event_connec) == 0) {
        const char* dataPayload = doc["data"];
        deserializeJson(dataDoc, dataPayload);
        uint8_t code = dataDoc["code"];
        const char* status = dataDoc["status"];
        unsigned long durationMs = dataDoc["duration_ms"] | 0;
        PowerRelayByWebSocket(code, status, durationMs);
      }
      else if (strcmp(event, pusher_event_check) == 0) {
        const char* dataPayload = doc["data"];
        deserializeJson(dataDoc, dataPayload);
        uint8_t code = dataDoc["code"];
        PowerRelayByWebSocketCheck(code);
      }
      else if (strcmp(event, pusher_event_warn) == 0) {
        const char* dataPayload = doc["data"];
        deserializeJson(dataDoc, dataPayload);
        uint8_t code = dataDoc["code"];
        PowerRelayByWebSocketWarning(code);
      }
      else if (strcmp(event, pusher_event_test) == 0) {
        PowerRelayByWebSocketTest();
      }
      else {
        Serial.printf("Event tidak dikenali: %s\n", event);
      }
      break;
    }
  }
}

void ConnectWebSocket() {
  char url[128];
  snprintf(url, sizeof(url),
           "/app/%s?protocol=7&client=esp32&version=1.0&flash=false",
           reverb_app_key);
  webSocket.begin(host_static_ip.c_str(), reverb_port, url);
  webSocket.onEvent(WebSocketEvent);
  webSocket.setReconnectInterval(10000);
  Serial.println("Menghubungkan ke Reverb WebSocket...");
}

// ─────────────────────────────────────────────────────────────
// HANDLER WEBSOCKET
// ─────────────────────────────────────────────────────────────
void PowerRelayByWebSocket(uint8_t code, const char* status, unsigned long durationMs) {
  if (code == 0 || code > NUM_TOTAL_RELAYS) {
    Serial.printf("Kode relay tidak valid: %d (harus 1-%d)\n", code, NUM_TOTAL_RELAYS);
    return;
  }
  bool activate = (strcmp(status, "active") == 0);
  uint8_t relayIndex = code - 1;

  // Batalkan warning jika meja ini sedang berkedip
  if (currentState == WARNING_BLINK && warningCode == code) {
    currentState = IDLE;
  }

  if (activate) {
    // Jika durationMs 0 (Open Table), endTime harus 0 agar tidak memicu warning prematur
    unsigned long endTime = (durationMs > 0) ? (millis() + durationMs) : 0;
    if (setRelayStateAndEndTime(relayIndex, true, endTime)) {
      startBuzzer(500);
      SaveRelayConfigSPIFFS();
      Serial.printf("Relay %d NYALA, durasi: %lu ms\n", code, durationMs);
    }
  } else {
    if (setRelayState(relayIndex, false)) {
      relayEndTime[relayIndex] = 0;
      startBuzzer(500);
      SaveRelayConfigSPIFFS();
      Serial.printf("Relay %d MATI\n", code);
    }
  }
}

void PowerRelayByWebSocketCheck(uint8_t code) {
  if (code == 0 || code > NUM_TOTAL_RELAYS) return;
  bool newState = !relayState[code - 1];
  if (setRelayState(code - 1, newState)) {
    startBuzzer(500);
    SaveRelayConfigSPIFFS();
    Serial.printf("Relay %d -> %s\n", code, newState ? "ON" : "OFF");
  }
}

void PowerRelayByWebSocketWarning(uint8_t code) {
  if (code == 0 || code > NUM_TOTAL_RELAYS) {
    Serial.printf("Kode relay tidak valid untuk warning: %d\n", code);
    return;
  }
  if (currentState != IDLE) {
    Serial.println("Warning ditolak: Sedang ada animasi/warning lain berjalan.");
    return;
  }
  if (!modeOtomatis) {
    Serial.println("Mode MANUAL aktif - lewati perintah warning");
    return;
  }
  uint8_t relayIndex = code - 1;
  if (!relayState[relayIndex]) {
    Serial.printf("Warning ditolak: Relay %d mati.\n", code);
    return;
  }
  unsigned long currentTime = millis();
  unsigned long timeSinceActivation = currentTime - relayActivationTime[relayIndex];
  if (timeSinceActivation < MIN_TIME_BEFORE_WARNING_MS) {
    Serial.printf("Warning ditolak: Relay %d baru nyala %lu ms lalu.\n", code, timeSinceActivation);
    return;
  }
  if (relayEndTime[relayIndex] == 0) {
    Serial.printf("Warning ditolak: Relay %d tidak punya waktu akhir.\n", code);
    return;
  }
  unsigned long timeRemaining = (currentTime < relayEndTime[relayIndex]) ? (relayEndTime[relayIndex] - currentTime) : 0;
  if (timeRemaining > WARNING_THRESHOLD_MS) {
    Serial.printf("Warning ditolak: Waktu tersisa %lu ms > 5 menit.\n", timeRemaining);
    return;
  }
  Serial.printf("Peringatan diterima untuk relay %d. Waktu tersisa: %lu ms.\n", code, timeRemaining);
  warningCode = code;
  warningBlinkCount = 0;
  currentState = WARNING_BLINK;
  stateStartTime = millis();
}

void PowerRelayByWebSocketTest() {
  if (!modeOtomatis) return;
  if (currentState != IDLE) return;
  for (int i = 0; i < NUM_TOTAL_RELAYS; i++) {
    relayStateBackup[i] = relayState[i];
  }
  Serial.println("Memulai running light test...");
  testStep = 0;
  currentState = RUNNING_LIGHT_ON;
  stateStartTime = millis();
}

// ─────────────────────────────────────────────────────────────
// SET RELAY STATE
// ─────────────────────────────────────────────────────────────
bool setRelayState(uint8_t channel, bool state, bool updateActivationTime) {
  if (channel >= NUM_TOTAL_RELAYS) {
    Serial.printf("Error: Channel %d melebihi batas (%d)\n", channel, NUM_TOTAL_RELAYS);
    return false;
  }
  if (state && updateActivationTime) {
    relayActivationTime[channel] = millis();
  }
  relayState[channel] = state;

  int pcfIndex = channel / NUM_RELAYS_PER_PCF;
  int pcfPin = channel % NUM_RELAYS_PER_PCF;

  // Pastikan tidak melebihi jumlah modul
  if (pcfIndex >= NUM_PCF) {
    Serial.printf("Error: Relay %d memerlukan PCF ke-%d, tapi hanya ada %d modul\n", channel, pcfIndex, NUM_PCF);
    return false;
  }

  pcfModules[pcfIndex]->write(pcfPin, state ? HIGH : LOW);
  // Library PCF8575 baru tidak mengembalikan nilai bool
  bool success = true; 
  return success;
}

bool setRelayStateAndEndTime(uint8_t channel, bool state, unsigned long endTime) {
  bool success = setRelayState(channel, state, true);
  if (success) relayEndTime[channel] = endTime;
  return success;
}

// ─────────────────────────────────────────────────────────────
// SPIFFS CONFIG (AMAN & OTOMATIS RECOVERY)
// ─────────────────────────────────────────────────────────────
void SaveRelayConfigSPIFFS() {
  saveDoc.clear();
  saveDoc["numRelays"] = NUM_TOTAL_RELAYS;
  JsonArray relaysArray = saveDoc.createNestedArray("relayState");
  JsonArray endTimeArray = saveDoc.createNestedArray("relayEndTime");
  for (uint8_t i = 0; i < NUM_TOTAL_RELAYS; i++) {
    relaysArray.add(relayState[i]);
    endTimeArray.add(relayEndTime[i]);
  }

  File configFile = SPIFFS.open(CONFIG_FILE, FILE_WRITE);
  if (!configFile) {
    Serial.println("Gagal membuka file untuk menulis");
    return;
  }

  size_t written = serializeJson(saveDoc, configFile);
  configFile.close();

  if (written == 0) {
    Serial.println("Gagal menyimpan konfigurasi");
  } else {
    Serial.println("Konfigurasi relay disimpan ke SPIFFS");
  }
}

void LoadRelayConfigSPIFFS() {
  if (!SPIFFS.exists(CONFIG_FILE)) {
    Serial.println("File konfigurasi tidak ada – gunakan default (semua relay MATI)");
    return;
  }

  File configFile = SPIFFS.open(CONFIG_FILE, FILE_READ);
  if (!configFile) {
    Serial.println("Gagal membuka file konfigurasi");
    return;
  }

  size_t fileSize = configFile.size();
  if (fileSize == 0) {
    Serial.println("File konfigurasi kosong – hapus dan gunakan default");
    configFile.close();
    SPIFFS.remove(CONFIG_FILE);
    return;
  }

  String content = configFile.readString();
  configFile.close();

  DeserializationError err = deserializeJson(loadDoc, content.c_str());
  if (err) {
    Serial.print("JSON tidak valid: ");
    Serial.println(err.f_str());
    Serial.println("File korup – hapus dan gunakan default");
    SPIFFS.remove(CONFIG_FILE);
    return;
  }

  if (!loadDoc["numRelays"].is<uint8_t>()) {
    Serial.println("Field 'numRelays' tidak ditemukan atau tidak valid");
    return;
  }

  uint8_t savedNumRelays = loadDoc["numRelays"];
  if (savedNumRelays != NUM_TOTAL_RELAYS) {
    Serial.printf("Jumlah relay tidak cocok: file=%d, sistem=%d – abaikan file\n", savedNumRelays, NUM_TOTAL_RELAYS);
    return;
  }

  JsonArray stateArr = loadDoc["relayState"].as<JsonArray>();
  JsonArray endArr = loadDoc["relayEndTime"].as<JsonArray>();

  if (stateArr.isNull() || endArr.isNull() ||
      stateArr.size() != NUM_TOTAL_RELAYS || endArr.size() != NUM_TOTAL_RELAYS) {
    Serial.println("Ukuran array tidak sesuai – abaikan file");
    return;
  }

  for (uint8_t i = 0; i < NUM_TOTAL_RELAYS; i++) {
    relayState[i] = stateArr[i].as<bool>();
    relayEndTime[i] = endArr[i].as<unsigned long>();
    relayStateBackup[i] = relayState[i];
  }
  Serial.println("Konfigurasi relay dimuat dari SPIFFS");
}