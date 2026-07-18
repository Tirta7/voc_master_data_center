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
#include <WebServer.h>
#include <DNSServer.h>
#include <esp_wifi.h>
#include <esp_task_wdt.h>
#include "Wire.h"
#include "PCF8575.h"

// Variabel Konfigurasi Sistem
String config_ssid = "";
String config_password = "";
String config_host_ip = "192.168.1.199";
int pin_mode_switch = 5;
int pin_transistor = 4;
int pin_relay_control = 15;
int pin_led_wifi = 2;
int pin_buzzer = 19;
int config_num_pcf = 2;
String config_pcf_addrs = "0x21,0x22";
uint8_t pcfAddresses[8] = {0x21, 0x22, 0, 0, 0, 0, 0, 0};

const char* CONFIG_FILE = "/relay_config.json";
const char* SYSTEM_CONFIG_FILE = "/system_config.json";

// KONFIGURASI PCF8575 akan dimuat dari sistem config
#define NUM_PCF config_num_pcf

// ─────────────────────────────────────────────────────────────
// KONFIGURASI RELAY
// ─────────────────────────────────────────────────────────────
const uint8_t NUM_RELAYS_PER_PCF = 16;
const uint8_t NUM_TOTAL_RELAYS = 19; // Relay 1-30 → index 0-29

// ─────────────────────────────────────────────────────────────
// KONFIGURASI VALIDASI WARNING
// ─────────────────────────────────────────────────────────────
const unsigned long MIN_TIME_BEFORE_WARNING_MS = 10000UL;
const unsigned long WARNING_THRESHOLD_MS = 5UL * 60UL * 1000UL;

// Pin Hardware akan diinisialisasi dari konfigurasi
#define MODE_SWITCH    pin_mode_switch
#define TRANSISTOR_PIN pin_transistor
#define RELAY_CONTROL  pin_relay_control
#define LED_WIFI       pin_led_wifi
#define BUZZER         pin_buzzer

// ─────────────────────────────────────────────────────────────
// OBJEK & VARIABEL GLOBAL
// ─────────────────────────────────────────────────────────────
PCF8575** pcfModules = nullptr;
bool relayState[128] = {false};
bool relayStateBackup[128] = {false};
unsigned long relayActivationTime[128] = {0};
unsigned long relayEndTime[128] = {0};
unsigned long relayProtectedUntil[128] = {0}; // 🛡️ Anti-race condition: proteksi relay setelah perintah ON

bool storageDirty = false;
unsigned long lastStateChange = 0;
const unsigned long STORAGE_SAVE_DELAY = 3000;

bool modeOtomatis = true;
bool wifiConnected = false;
bool wsConnected = false;          // 🛡️ Status koneksi WebSocket level aplikasi
unsigned long lastWiFiCheck = 0;
unsigned long lastPing = 0;
unsigned long lastHeartbeat = 0;
const unsigned long pingInterval = 25000;
const unsigned long HEARTBEAT_INTERVAL = 60000; // Heartbeat level-aplikasi ke server

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

DynamicJsonDocument doc(2048);
DynamicJsonDocument dataDoc(2048);
// loadDoc dan saveDoc dialokasikan dinamis secara lokal

// Reverb config akan diambil dari config_host_ip
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
WebServer server(80);
DNSServer dnsServer;
bool portalActive = false;
const byte DNS_PORT = 53;

// ─────────────────────────────────────────────────────────────
// FUNCTION PROTOTYPES
// ─────────────────────────────────────────────────────────────
void LoadRelayConfigSPIFFS();
void SaveRelayConfigSPIFFS();
void LoadSystemConfig();
void SaveSystemConfig();
void startPortal();
void handlePortalRoot();
void handlePortalSave();
void handlePortalScan();
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

  if (!SPIFFS.begin(true)) {
    Serial.println("Gagal memulai SPIFFS – restart otomatis");
    ESP.restart();
  }

  // Cek apakah tombol BOOT (GPIO 0) ditekan saat startup
  pinMode(0, INPUT_PULLUP);
  if (digitalRead(0) == LOW) {
    unsigned long pressStart = millis();
    Serial.println("Tombol BOOT ditekan, tahan 5 detik untuk Portal...");
    while (digitalRead(0) == LOW) {
      if (millis() - pressStart > 5000) {
        Serial.println("Reset ke Portal dipicu!");
        SPIFFS.remove(SYSTEM_CONFIG_FILE);
        startPortal();
        return;
      }
      delay(100);
    }
  }

  LoadSystemConfig();

  // Alokasi modul PCF berdasarkan config
  pcfModules = new PCF8575*[config_num_pcf];

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

  // Watchdog Timer Init
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
  esp_task_wdt_config_t wdt_config = {
      .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true};
  esp_task_wdt_reconfigure(&wdt_config);
#else
  esp_task_wdt_init(30, true);
#endif
  esp_task_wdt_add(NULL);

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

  if (config_ssid == "" || config_ssid == "NULL") {
    Serial.println("SSID belum dikonfigurasi, masuk ke Portal...");
    startPortal();
    return;
  }

  connectToWiFi();
  ConnectWebSocket();

  digitalWrite(TRANSISTOR_PIN, modeOtomatis ? HIGH : LOW);
  digitalWrite(RELAY_CONTROL, modeOtomatis ? HIGH : LOW);
}

// ─────────────────────────────────────────────────────────────
// LOOP UTAMA
// ─────────────────────────────────────────────────────────────
void loop() {
  if (portalActive) {
    dnsServer.processNextRequest();
    server.handleClient();
    return;
  }

  esp_task_wdt_reset();
  unsigned long currentMillis = millis();

  // Dirty Flag Check untuk SPIFFS
  if (storageDirty && (currentMillis - lastStateChange >= STORAGE_SAVE_DELAY)) {
    SaveRelayConfigSPIFFS();
    storageDirty = false;
  }

  // Cek tombol BOOT untuk hard reset saat running
  static unsigned long bootPressStart = 0;
  if (digitalRead(0) == LOW) {
    if (bootPressStart == 0) bootPressStart = millis();
    if (millis() - bootPressStart > 5000) {
      Serial.println("Hard Reset dipicu dari Loop!");
      SPIFFS.remove(SYSTEM_CONFIG_FILE);
      ESP.restart();
    }
  } else {
    bootPressStart = 0;
  }

  cekWiFi(currentMillis);
  webSocket.loop();
  updateBuzzer();

  if (currentMillis - lastPing > pingInterval) {
    lastPing = currentMillis;
    webSocket.sendTXT("{\"event\":\"pusher:ping\"}");
    Serial.println("Mengirim ping ke Reverb...");
  }

  // 🛡️ Heartbeat Level-Aplikasi — Kirim status alat ke server setiap 60 detik
  if (wsConnected && currentMillis - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = currentMillis;
    char hbBuf[300];
    // Bangun string relay state compact
    String relayStr = "";
    for (int i = 0; i < NUM_TOTAL_RELAYS; i++) {
      relayStr += relayState[i] ? "1" : "0";
    }
    snprintf(hbBuf, sizeof(hbBuf),
      "{\"event\":\"client-device.heartbeat\",\"channel\":\"%s\","
      "\"data\":{\"uptime\":%lu,\"relay_count\":%d,\"states\":\"%s\"}}",
      pusher_channel, currentMillis / 1000, NUM_TOTAL_RELAYS, relayStr.c_str());
    webSocket.sendTXT(hbBuf);
    Serial.println("[HEARTBEAT] Dikirim ke server.");
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
  Serial.println(config_ssid);
  WiFi.setAutoReconnect(true);
  esp_wifi_set_ps(WIFI_PS_NONE); // Matikan hemat daya agar responsif
  WiFi.begin(config_ssid.c_str(), config_password.c_str());

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startTime) < 10000) {
    digitalWrite(LED_WIFI, (millis() / 500) % 2);
    delay(10);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi terhubung!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.println("08-9999-64538");
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
      wsConnected = false;
      // 🛡️ State Machine Recovery: Jika WebSocket putus saat WARNING_BLINK berjalan,
      // relay bisa tertinggal dalam kondisi MATI. Paksa ON agar meja tidak mati permanen.
      if (currentState == WARNING_BLINK) {
        Serial.printf("[RECOVERY] Disconnect saat WARNING_BLINK relay %d! Paksa relay ON.\n", warningCode);
        setRelayState(warningCode - 1, true, false);
        currentState = IDLE;
      }
      // 🛡️ Jika disconnect saat RUNNING_LIGHT_ON, restore semua relay ke backup
      if (currentState == RUNNING_LIGHT_ON || currentState == RUNNING_LIGHT_END) {
        for (int i = 0; i < NUM_TOTAL_RELAYS; i++) {
          setRelayState(i, relayStateBackup[i], false);
        }
        currentState = IDLE;
        Serial.println("[RECOVERY] Running light dibatalkan, relay di-restore.");
      }
      digitalWrite(LED_WIFI, LOW);
      break;

    case WStype_CONNECTED:
      Serial.println("WebSocket: Terhubung ke Reverb");
      wsConnected = true;
      // 🛡️ Paksa state machine ke IDLE saat reconnect agar tidak ada state yang menggantung
      if (currentState != IDLE) {
        if (currentState == WARNING_BLINK) setRelayState(warningCode - 1, true, false);
        currentState = IDLE;
        Serial.println("[RECOVERY] State machine di-reset ke IDLE saat reconnect.");
      }
      // Subscribe ke semua channel
      char msgBuf[128];
      for (size_t i = 0; i < numPusherChannels; i++) {
        int len = snprintf(msgBuf, sizeof(msgBuf), subscribeTemplate, pusherChannels[i]);
        if (len > 0 && len < (int)sizeof(msgBuf)) {
          webSocket.sendTXT(msgBuf);
          Serial.print("Subscribe ke: ");
          Serial.println(pusherChannels[i]);
        }
      }
      // 🛡️ Kirim sync request: beritahu server bahwa alat baru online dengan status relay saat ini
      {
        String relayStr = "";
        for (int i = 0; i < NUM_TOTAL_RELAYS; i++) {
          relayStr += relayState[i] ? "1" : "0";
        }
        char syncBuf[350];
        snprintf(syncBuf, sizeof(syncBuf),
          "{\"event\":\"client-device.online\",\"channel\":\"%s\","
          "\"data\":{\"num_relays\":%d,\"states\":\"%s\",\"uptime\":%lu}}",
          pusher_channel, NUM_TOTAL_RELAYS, relayStr.c_str(), millis() / 1000);
        webSocket.sendTXT(syncBuf);
        Serial.println("[SYNC] Device online broadcast dikirim ke server.");
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
  webSocket.begin(config_host_ip.c_str(), reverb_port, url);
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
  unsigned long now = millis();

  // Batalkan warning jika meja ini sedang berkedip
  if (currentState == WARNING_BLINK && warningCode == code) {
    currentState = IDLE;
  }

  if (!activate) {
    // 🛡️ Anti-Race Condition Multi-Waiter: Tolak perintah OFF jika relay masih diproteksi
    // Ini mencegah Waiter B mematikan meja yang baru saja dinyalakan Waiter A
    if (relayProtectedUntil[relayIndex] > now) {
      Serial.printf("[PROTECT] OFF relay %d DITOLAK! Proteksi aktif sisa %lu detik.\n",
        code, (relayProtectedUntil[relayIndex] - now) / 1000);
      return;
    }
    if (setRelayState(relayIndex, false)) {
      relayEndTime[relayIndex] = 0;
      startBuzzer(500);
      storageDirty = true;
      lastStateChange = now;
      Serial.printf("Relay %d MATI\n", code);
    }
  } else {
    // Deteksi apakah ini perintah Extend (relay sudah ON dan ada durasi baru)
    bool isExtend = (relayState[relayIndex] == true && durationMs > 0);

    // 🛡️ Proteksi 500ms (ON biasa) atau 60 detik (Extend) agar waiter lain tidak bisa
    // memicu perintah OFF/toggle yang bertabrakan dalam waktu dekat
    relayProtectedUntil[relayIndex] = now + (isExtend ? 60000UL : 500UL);

    // Jika durationMs 0 (Open Table), endTime harus 0 agar tidak memicu warning prematur
    unsigned long endTime = (durationMs > 0) ? (now + durationMs) : 0;
    if (setRelayStateAndEndTime(relayIndex, true, endTime)) {
      startBuzzer(isExtend ? 300 : 500);
      storageDirty = true;
      lastStateChange = now;
      Serial.printf("Relay %d %s, durasi: %lu ms\n", code,
        isExtend ? "NYALA (EXTEND)" : "NYALA", durationMs);
    }
  }
}

void PowerRelayByWebSocketCheck(uint8_t code) {
  if (code == 0 || code > NUM_TOTAL_RELAYS) return;
  uint8_t relayIndex = code - 1;
  unsigned long now = millis();

  // 🛡️ Cek proteksi: jika relay sedang dalam window proteksi, tolak perintah check
  // Mencegah waiter yang stres double-klik dari membuat relay toggle bolak-balik
  if (relayProtectedUntil[relayIndex] > now) {
    Serial.printf("[PROTECT] Check relay %d DITOLAK (masih diproteksi, sisa %lu detik).\n",
      code, (relayProtectedUntil[relayIndex] - now) / 1000);
    return;
  }

  bool newState = !relayState[relayIndex];
  relayProtectedUntil[relayIndex] = now + 500; // Proteksi 500ms setelah toggle
  if (setRelayState(relayIndex, newState)) {
    startBuzzer(500);
    storageDirty = true;
    lastStateChange = now;
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

  Wire.beginTransmission(pcfAddresses[pcfIndex]);
  if (Wire.endTransmission() != 0) {
    Serial.printf("I2C Error: Modul %d offline, mencoba re-init...\n", pcfIndex);
    pcfModules[pcfIndex]->begin();
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
  DynamicJsonDocument saveDoc(4096);
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

  DynamicJsonDocument loadDoc(4096);
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
    // 🛡️ TIDAK restore relayEndTime! millis() selalu mulai dari 0 setelah restart.
    // Jika di-restore, nilai lama (misal: 3600000) akan dianggap masih valid padahal sudah lewat.
    // Ini menyebabkan: warning prematur, timer hantu, atau meja tidak bisa di-warning sama sekali.
    // Solusi: Server akan kirim ulang state terbaru via WebSocket saat device.online event diterima.
    relayEndTime[i] = 0;
    relayStateBackup[i] = relayState[i];
  }
  Serial.println("[SPIFFS] Status relay di-restore. Timer di-reset (perlu sync dari server).");
}

// ─────────────────────────────────────────────────────────────
// SYSTEM CONFIG & PORTAL
// ─────────────────────────────────────────────────────────────
void LoadSystemConfig() {
  if (!SPIFFS.exists(SYSTEM_CONFIG_FILE)) {
    Serial.println("System config not found.");
    return;
  }
  File f = SPIFFS.open(SYSTEM_CONFIG_FILE, "r");
  if (f) {
    StaticJsonDocument<1024> sdoc;
    DeserializationError err = deserializeJson(sdoc, f);
    if (!err) {
      config_ssid = sdoc["ssid"] | "";
      config_password = sdoc["pass"] | "";
      config_host_ip = sdoc["host"] | "192.168.1.199";
      pin_mode_switch = sdoc["p_mode"] | 5;
      pin_transistor = sdoc["p_trans"] | 4;
      pin_relay_control = sdoc["p_relay"] | 15;
      pin_led_wifi = sdoc["p_led"] | 2;
      pin_buzzer = sdoc["p_buzz"] | 19;
      config_num_pcf = sdoc["n_pcf"] | 2;
      config_pcf_addrs = sdoc["a_pcf"] | "0x21,0x22";
      
      // Parse addresses
      char buf[64];
      strncpy(buf, config_pcf_addrs.c_str(), sizeof(buf));
      char* p = strtok(buf, ",");
      int i = 0;
      while(p != NULL && i < 8) {
        pcfAddresses[i++] = (uint8_t)strtol(p, NULL, 0);
        p = strtok(NULL, ",");
      }
      Serial.println("System config loaded.");
    }
    f.close();
  }
}

void SaveSystemConfig() {
  File f = SPIFFS.open(SYSTEM_CONFIG_FILE, "w");
  if (f) {
    StaticJsonDocument<1024> sdoc;
    sdoc["ssid"] = config_ssid;
    sdoc["pass"] = config_password;
    sdoc["host"] = config_host_ip;
    sdoc["p_mode"] = pin_mode_switch;
    sdoc["p_trans"] = pin_transistor;
    sdoc["p_relay"] = pin_relay_control;
    sdoc["p_led"] = pin_led_wifi;
    sdoc["p_buzz"] = pin_buzzer;
    sdoc["n_pcf"] = config_num_pcf;
    sdoc["a_pcf"] = config_pcf_addrs;
    serializeJson(sdoc, f);
    f.close();
    Serial.println("System config saved.");
  }
}

void startPortal() {
  portalActive = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP("ESP32-SPOT-ON-PORTAL");
  
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
  
  server.on("/", handlePortalRoot);
  server.on("/save", HTTP_POST, handlePortalSave);
  server.on("/scan", handlePortalScan);
  server.onNotFound([]() {
    server.sendHeader("Location", "/", true);
    server.send(302, "text/plain", "");
  });
  
  server.begin();
  Serial.print("Portal AP IP: ");
  Serial.println(WiFi.softAPIP());
  
  // Blink LED to indicate portal mode
  for(int i=0; i<10; i++) {
    digitalWrite(LED_WIFI, HIGH); delay(100);
    digitalWrite(LED_WIFI, LOW); delay(100);
  }
}

void handlePortalRoot() {
  String html = "<!DOCTYPE html><html><head>"
    "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
    "<title>Config Portal</title>"
    "<style>"
    "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }"
    ".card { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; width: 100%; max-width: 450px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37); border: 1px solid rgba(255, 255, 255, 0.1); }"
    "h2 { text-align: center; margin-bottom: 30px; color: #4ecca3; font-weight: 300; letter-spacing: 2px; }"
    ".input-group { margin-bottom: 20px; position: relative; }"
    "label { display: block; margin-bottom: 8px; font-size: 0.9em; color: #a2a2a2; }"
    "input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; box-sizing: border-box; outline: none; transition: 0.3s; }"
    "input:focus { border-color: #4ecca3; background: rgba(255,255,255,0.1); }"
    ".row { display: flex; gap: 10px; flex-wrap: wrap; }"
    ".row .input-group { flex: 1; min-width: 140px; }"
    "button { width: 100%; padding: 14px; border: none; border-radius: 8px; background: #4ecca3; color: #1a1a2e; font-weight: bold; cursor: pointer; transition: 0.3s; margin-top: 10px; }"
    "button:hover { background: #45b393; transform: translateY(-2px); }"
    ".scan-btn { background: #3498db; color: white; padding: 8px 12px; font-size: 0.8em; margin-top: 5px; width: auto; }"
    ".toggle-pass { position: absolute; right: 10px; top: 38px; cursor: pointer; color: #a2a2a2; }"
    "#networks { margin-top: 10px; font-size: 0.85em; max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 5px; padding: 5px; display: none; }"
    ".net-item { padding: 8px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); }"
    ".net-item:hover { background: rgba(255,255,255,0.1); }"
    "</style></head><body>"
    "<div class='card'>"
    "<h2>CONFIG PORTAL</h2>"
    "<form action='/save' method='POST'>"
    "<div class='input-group'>"
    "<label>SSID</label>"
    "<input name='ssid' id='ssid' value='" + config_ssid + "'>"
    "<button type='button' class='scan-btn' onclick='scanWiFi()'>Scan WiFi</button>"
    "<div id='networks'></div>"
    "</div>"
    "<div class='input-group'>"
    "<label>Password</label>"
    "<input name='pass' id='pass' type='password' value='" + config_password + "'>"
    "<span class='toggle-pass' onclick='togglePass()'>👁️</span>"
    "</div>"
    "<div class='input-group'>"
    "<label>Host Static IP</label>"
    "<input name='host' value='" + config_host_ip + "'>"
    "</div>"
    "<div class='row'>"
    "<div class='input-group'><label>MODE SWITCH</label><input name='p_mode' type='number' placeholder='5' value='" + String(pin_mode_switch) + "'></div>"
    "<div class='input-group'><label>TRANSISTOR</label><input name='p_trans' type='number' placeholder='4' value='" + String(pin_transistor) + "'></div>"
    "</div>"
    "<div class='row'>"
    "<div class='input-group'><label>RELAY CONTROL</label><input name='p_relay' type='number' placeholder='15' value='" + String(pin_relay_control) + "'></div>"
    "<div class='input-group'><label>LED WIFI</label><input name='p_led' type='number' placeholder='2' value='" + String(pin_led_wifi) + "'></div>"
    "<div class='input-group'><label>BUZZER</label><input name='p_buzz' type='number' placeholder='19' value='" + String(pin_buzzer) + "'></div>"
    "</div>"
    "<div class='row' style='background: rgba(78, 204, 163, 0.05); padding: 15px; border-radius: 10px; border: 1px solid rgba(78, 204, 163, 0.2); margin-top: 10px;'>"
    "<div class='input-group' style='flex: 0 0 100px;'><label>NUM PCF</label><input name='n_pcf' type='number' placeholder='2' value='" + String(config_num_pcf) + "'></div>"
    "<div class='input-group'><label>I2C ADDRESSES (comma separated)</label><input name='a_pcf' placeholder='0x21,0x22' value='" + config_pcf_addrs + "'></div>"
    "</div>"
    "<button type='submit'>SIMPAN PENGATURAN</button>"
    "</form>"
    "</div>"
    "<script>"
    "function togglePass() { var x = document.getElementById('pass'); x.type = (x.type === 'password') ? 'text' : 'password'; }"
    "function scanWiFi() { "
    "  var btn = document.querySelector('.scan-btn'); btn.innerText = 'Scanning...'; "
    "  fetch('/scan').then(r => r.json()).then(data => { "
    "    var div = document.getElementById('networks'); div.innerHTML = ''; div.style.display = 'block'; "
    "    data.forEach(n => { "
    "      var item = document.createElement('div'); item.className = 'net-item'; "
    "      item.innerText = n.ssid + ' (' + n.rssi + 'dBm)'; "
    "      item.onclick = () => { document.getElementById('ssid').value = n.ssid; div.style.display = 'none'; }; "
    "      div.appendChild(item); "
    "    }); "
    "    btn.innerText = 'Scan WiFi'; "
    "  }); "
    "}"
    "</script></body></html>";
  server.send(200, "text/html", html);
}

void handlePortalScan() {
  int n = WiFi.scanNetworks();
  String json = "[";
  for (int i = 0; i < n; i++) {
    if (i > 0) json += ",";
    json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
  }
  json += "]";
  server.send(200, "application/json", json);
}

void handlePortalSave() {
  config_ssid = server.arg("ssid");
  config_password = server.arg("pass");
  config_host_ip = server.arg("host");
  pin_mode_switch = server.arg("p_mode").toInt();
  pin_transistor = server.arg("p_trans").toInt();
  pin_relay_control = server.arg("p_relay").toInt();
  pin_led_wifi = server.arg("p_led").toInt();
  pin_buzzer = server.arg("p_buzz").toInt();
  config_num_pcf = server.arg("n_pcf").toInt();
  config_pcf_addrs = server.arg("a_pcf");
  
  SaveSystemConfig();
  
  String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1.0'><style>"
    "body { font-family: sans-serif; background: #1a1a2e; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center; }"
    ".card { background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; }"
    "h2 { color: #4ecca3; }"
    "</style></head><body><div class='card'>"
    "<h2>PENGATURAN DISIMPAN!</h2>"
    "<p>ESP32 akan restart dan mencoba terhubung ke WiFi.</p>"
    "<p><b>IP Address:</b> Sedang menyambung...</p>"
    "<p>Mohon tunggu sebentar.</p>"
    "</div><script>setTimeout(() => { window.location.href = '/'; }, 5000);</script></body></html>";
  
  server.send(200, "text/html", html);
  delay(2000);
  ESP.restart();
}