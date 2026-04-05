/*
 * ESP32 MQTT Client — MOC3062 Single Table Mode
 * VOC SYSTEM (Spot On Billiard)
 *
 * Arsitektur: 1 ESP32 per meja billiard
 * Hardware : MOC3062 (optocoupler) → TRIAC BTA16 → Lampu 220V AC
 *
 * Perbedaan dari firmware PCF8575 (panel konvensional):
 *  - Tidak ada PCF8575, Wire.h, atau komunikasi I2C
 *  - 1 pin GPIO langsung kontrol MOC3062 (default D4 = GPIO4)
 *  - Pin configurable via SPIFFS (/moc_config.json) & MQTT /config/set
 *  - 1 ESP = 1 meja = 1 MAC Address = 1 relay channel
 *
 * Fitur:
 *  1. Identifikasi device via MAC Address (otomatis, tanpa konfigurasi manual)
 *  2. MQTT Topics identik dengan firmware lama (berbasis MAC)
 *  3. PIN Control MOC bisa dikonfigurasi runtime via MQTT /config/set
 *  4. State persistence via SPIFFS (tahan reboot)
 *  5. Hardware Watchdog 30 detik
 *  6. WiFi auto-reconnect (full cycle jika 30s masih putus)
 *  7. MQTT LWT (Last Will & Testament) — server tahu instant jika offline
 *  8. MQTT Keep-Alive 120s + Heartbeat 60s
 *  9. Buzzer feedback (GPIO19)
 * 10. OTA update siap (dinonaktifkan by default, aktifkan jika butuh)
 *
 * WIRING:
 *  GPIO4  (D4)  → Anoda MOC3062 (via 220Ω resistor) → TRIAC BTA16 gate → Lampu
 * 220V GPIO2  (D2)  → LED indikator WiFi (onboard biasanya) GPIO19 (D19) →
 * Buzzer aktif-high
 *
 * TOPIK MQTT (identik dengan firmware PCF8575):
 *  Subscribe: billiard/table/{MAC}/#
 *  Publish  : billiard/table/{MAC}/status      (telemetry, retain=true)
 *           : billiard/table/{MAC}/heartbeat   (60s ping)
 *           : billiard/table/sync              (saat boot, minta state dari
 * server)
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

// ─────────────────────────────────────────────────────────────
// KONFIGURASI JARINGAN & MQTT
// ─────────────────────────────────────────────────────────────
const char *ssid = "Tirtaaa";
const char *password = "4DItya79!";
const char *mqtt_server = "172.20.10.2"; // IP PC server (MQTT broker)
const int mqtt_port = 1883;

// ─────────────────────────────────────────────────────────────
// PIN HARDWARE DEFAULT
// ─────────────────────────────────────────────────────────────
#define PIN_LED_WIFI 2 // Indikator WiFi (LED onboard)
#define PIN_BUZZER 19  // Buzzer aktif-high

// Pin MOC3062 bisa berbeda tiap modul, dibaca dari SPIFFS
// Default = GPIO4 (D4), bisa diubah via MQTT /config/set
int mocPin = 4;

// ─────────────────────────────────────────────────────────────
// LOGIKA OUTPUT MOC3062
// ─────────────────────────────────────────────────────────────
// MOC3062 bisa dihubungkan 2 cara:
//   active-HIGH: GPIO HIGH → LED optocoupler ON → TRIAC aktif → Lampu MENYALA
//   active-LOW : GPIO LOW  → LED optocoupler ON → TRIAC aktif → Lampu MENYALA
//                (terjadi jika LED MOC dihubungkan antara VCC dan GPIO, dengan
//                 pull-up, atau jika ada inverter di rangkaian)
//
// Set true  → active-LOW  (GPIO LOW  = Lampu ON)  ← rangkaian pull-up / VCC ke
// anoda Set false → active-HIGH (GPIO HIGH = Lampu ON)  ← rangkaian standar
//
// Gejala salah: software ON → lampu MATI, software OFF → lampu MENYALA
//               → ganti nilai di bawah ke 'true'
#define MOC_ACTIVE_LOW true // <-- UBAH ke false jika logika terbalik lagi

// ─────────────────────────────────────────────────────────────
// STATE & VARIABEL GLOBAL
// ─────────────────────────────────────────────────────────────
WiFiClient espClient;
PubSubClient client(espClient);

String deviceMac =
    ""; // MAC Address tanpa pemisah, uppercase (e.g. "AABBCCDDEEFF")
String baseTopic = ""; // billiard/table/{deviceMac}

bool lightState = false; // Status lampu saat ini
bool storageDirty = false;
unsigned long lastStateChange = 0;
const unsigned long STORAGE_SAVE_DELAY =
    3000; // Tunda simpan ke SPIFFS 3s setelah perubahan

// Flag: ganti pin MOC perlu re-apply state setelah callback selesai
// (tidak dilakukan langsung di callback untuk menghindari crash)
bool pendingPinChange = false;
int pendingNewPin = -1;

// Race condition protection (tidak matikan lampu dalam window ini kecuali
// force=true)
unsigned long lightProtectedUntil = 0;

// Buzzer non-blocking
int buzzerBeepsRemaining = 0;
bool buzzerState = false;
unsigned long buzzerNextToggle = 0;
unsigned long buzzerToneDuration = 100;
unsigned long buzzerPauseDuration = 100;

// Connection tracking
bool wasWifiConnected = false;
unsigned long lastMqttRetry = 0;
unsigned long lastLedBlink = 0;
unsigned long lastStatusUpdate = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastWifiCheck = 0;

const unsigned long STATUS_INTERVAL = 30000;    // Telemetry tiap 30s
const unsigned long HEARTBEAT_INTERVAL = 60000; // Heartbeat tiap 60s
const unsigned long WIFI_FULL_RECONNECT =
    30000; // Full reconnect jika WiFi putus >30s

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
      buzzerNextToggle =
          millis() + (buzzerState ? buzzerToneDuration : buzzerPauseDuration);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// KONTROL LAMPU (MOC30xx via GPIO)
// ─────────────────────────────────────────────────────────────

void setLight(bool on) {
  // Pastikan mocPin sudah di-configure sebagai OUTPUT
  pinMode(mocPin, OUTPUT);

  // Terapkan logika sesuai konfigurasi wiring MOC3062
  // active-LOW : LOW = nyala, HIGH = mati
  // active-HIGH: HIGH = nyala, LOW = mati
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
  if (!f) {
    Serial.println("[SPIFFS] GAGAL buka config.");
    return;
  }
  DynamicJsonDocument doc(256);
  auto err = deserializeJson(doc, f);
  f.close();
  if (err) {
    Serial.printf("[SPIFFS] Parse error: %s\n", err.c_str());
    return;
  }

  if (doc.containsKey("mocPin")) {
    int savedPin = doc["mocPin"].as<int>();
    if (savedPin >= 0 && savedPin <= 39) { // Validasi range GPIO ESP32
      mocPin = savedPin;
      Serial.printf("[SPIFFS] MOC Pin dimuat: GPIO%d\n", mocPin);
    }
  }
  if (doc.containsKey("lightState")) {
    lightState = doc["lightState"].as<bool>();
    Serial.printf("[SPIFFS] Light state dimuat: %s\n",
                  lightState ? "ON" : "OFF");
  }
}

// ─────────────────────────────────────────────────────────────
// MQTT — Publish Status Telemetry
// ─────────────────────────────────────────────────────────────

void publishStatus() {
  if (!client.connected())
    return;

  String topic = baseTopic + "/status";
  DynamicJsonDocument doc(384);
  doc["status"] = "online";
  doc["uptime"] = millis() / 1000;
  doc["rssi"] = WiFi.RSSI();
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["ip"] = WiFi.localIP().toString();
  doc["lightState"] = lightState;
  doc["mocPin"] = mocPin;
  doc["hwType"] = "MOC30xx"; // Identifier untuk server agar tahu jenis hardware

  // Kompatibilitas dengan server lama yang mengharapkan array "relays"
  JsonArray relays = doc.createNestedArray("relays");
  relays.add(lightState);

  char buf[384];
  serializeJson(doc, buf);
  client.publish(topic.c_str(), buf, true); // retain=true
  Serial.printf("[MQTT] Status telemetry published (Light=%s, Pin=%d)\n",
                lightState ? "ON" : "OFF", mocPin);
}

// ─────────────────────────────────────────────────────────────
// MQTT CALLBACK — Terima Perintah dari Server
// ─────────────────────────────────────────────────────────────

void callback(char *topic, byte *payload, unsigned int length) {
  esp_task_wdt_reset(); // Reset WDT di awal callback agar tidak timeout
  Serial.printf("[MQTT] Pesan masuk: %s (len=%u)\n", topic, length);

  // Gunakan 1024 agar cukup untuk sync_response (348 byte raw JSON)
  // ArduinoJson butuh ~2x raw size untuk internal structure
  DynamicJsonDocument doc(1024);
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    Serial.printf("[MQTT] JSON parse error: %s\n", err.c_str());
    return;
  }

  String sTopic = String(topic);

  // ── 1. PING ──────────────────────────────────────────────────
  if (sTopic.endsWith("/ping")) {
    int tableId = doc["tableId"] | 0;
    DynamicJsonDocument resp(192);
    resp["tableId"] = tableId;
    resp["status"] = "PONG";
    resp["uptime"] = millis() / 1000;
    resp["rssi"] = WiFi.RSSI();
    resp["hwType"] = "MOC30xx";
    resp["mocPin"] = mocPin;

    char buf[192];
    serializeJson(resp, buf);
    client.publish((baseTopic + "/status").c_str(), buf);
    Serial.println("[MQTT] PING → PONG terkirim.");
    return;
  }

  // ── 2. SYNC RESPONSE dari Server (status awal saat boot) ─────
  if (sTopic.endsWith("/sync_response")) {
    Serial.println("[MQTT] Menerima sync response dari server...");
    JsonArray tables = doc["tables"].as<JsonArray>();

    for (JsonObject t : tables) {
      // Ambil status dari server
      const char *statusStr = t["status"] | "OFF";
      bool targetState = (strcasecmp(statusStr, "ON") == 0);

      // Debug: tampilkan nilai yang diterima dari server
      Serial.printf("[SYNC] Server kirim → status=%s targetState=%s\n",
                    statusStr, targetState ? "ON" : "OFF");

      bool pinChanged = false;

      // Jika server kirim relayPin berbeda, update mocPin
      if (t.containsKey("relayPin") && !t["relayPin"].isNull()) {
        int serverPin = t["relayPin"].as<int>();
        if (serverPin >= 0 && serverPin <= 39 && serverPin != mocPin) {
          Serial.printf("[SYNC] mocPin berubah: %d → %d, wajib re-apply state\n",
                        mocPin, serverPin);
          // Matikan pin lama dulu dengan benar
          bool offLevel = MOC_ACTIVE_LOW ? HIGH : LOW;
          pinMode(mocPin, OUTPUT);
          digitalWrite(mocPin, offLevel);
          // Ganti pin
          mocPin    = serverPin;
          pinChanged = true;
          storageDirty    = true;
          lastStateChange = millis();
        }
      }

      // Apply state jika berbeda ATAU jika pin baru (perlu inisialisasi)
      if (lightState != targetState || pinChanged) {
        setLight(targetState);
        storageDirty    = true;
        lastStateChange = millis();
        startBuzzer(400);
        Serial.printf("[SYNC] State diterapkan ke GPIO%d: %s%s\n",
                      mocPin, targetState ? "ON" : "OFF",
                      pinChanged ? " (pin baru)" : "");
      } else {
        // State sudah sama dan pin tidak berubah — konfirmasi saja
        Serial.printf("[SYNC] State sudah sesuai: %s pada GPIO%d\n",
                      lightState ? "ON" : "OFF", mocPin);
        // Re-apply ke GPIO untuk pastikan fisik benar (sanity)
        bool pinLevel = MOC_ACTIVE_LOW ? !lightState : lightState;
        digitalWrite(mocPin, pinLevel ? HIGH : LOW);
      }
      break; // 1 ESP = 1 meja, ambil entry pertama saja
    }
    return;
  }


  // ── 3. LIGHT CONTROL ─────────────────────────────────────────
  if (sTopic.endsWith("/light/set")) {
    const char *statusStr = doc["status"] | "OFF";
    bool activate = (strcasecmp(statusStr, "ON") == 0);
    bool isExtend = doc["extend"] | false;
    bool isForce = doc["force"] | false;
    int tableId = doc["tableId"] | 0;

    // Update mocPin kalau server kirim relayPin (konfigurasi baru dari server)
    if (doc.containsKey("relayPin") && !doc["relayPin"].isNull()) {
      int serverPin = doc["relayPin"].as<int>();
      if (serverPin >= 0 && serverPin <= 39 && serverPin != mocPin) {
        Serial.printf("[LIGHT] Update mocPin dari server: %d → %d\n", mocPin,
                      serverPin);
        mocPin = serverPin;
        storageDirty = true;
        lastStateChange = millis();
      }
    }

    unsigned long now = millis();

    if (!activate) {
      // MATIKAN LAMPU
      if (lightProtectedUntil > now && !isForce) {
        Serial.printf("[PROTECT] Diblokir (Race Condition, sisa %lus). Kirim "
                      "force=true untuk override.\n",
                      (lightProtectedUntil - now) / 1000);
        return;
      }
      setLight(false);
      lightProtectedUntil = 0;
      storageDirty = true;
      lastStateChange = now;
      startBuzzer(200);
      // tableId = primary key database, bukan nomor urut meja
      Serial.printf("[RELAY] DB_ID:%d MAC:%s → LAMPU MATI\n", tableId,
                    deviceMac.c_str());

    } else {
      // NYALAKAN LAMPU
      unsigned long protDuration = isExtend ? 60000 : 30000;
      lightProtectedUntil = now + protDuration;
      setLight(true);
      storageDirty = true;
      lastStateChange = now;
      if (isExtend)
        startDoubleBuzzer();
      else
        startBuzzer(500);
      Serial.printf("[RELAY] DB_ID:%d MAC:%s → LAMPU MENYALA (%s)\n", tableId,
                    deviceMac.c_str(), isExtend ? "EXTEND" : "START");
    }
    return;
  }

  // ── 4. GPIO DIAGNOSTIC (Tes pin langsung) ────────────────────
  if (sTopic.endsWith("/gpio/set")) {
    int pin = doc["pin"] | -1;
    const char *st = doc["status"] | "OFF";
    bool state = (strcasecmp(st, "ON") == 0);

    if (pin >= 0 && pin <= 39) {
      pinMode(pin, OUTPUT);
      digitalWrite(pin, state ? HIGH : LOW);
      Serial.printf("[DIAG] GPIO%d → %s\n", pin, st);
      startBuzzer(100);
    }
    return;
  }

  // ── 5. CONFIG — Ubah mocPin runtime ──────────────────────────
  if (sTopic.endsWith("/config/set")) {
    /*
     * Payload: { "mocPin": 5 }
     * Ganti pin GPIO yang dipakai MOC3062.
     * Re-apply dilakukan di loop() via pendingPinChange flag
     * agar tidak ada blocking SPIFFS write di dalam callback.
     */
    if (doc.containsKey("mocPin")) {
      int newPin = doc["mocPin"].as<int>();
      if (newPin >= 0 && newPin <= 39) {
        if (mocPin != newPin) {
          // Matikan output pin lama dengan benar (respek active-LOW)
          bool offLevel = MOC_ACTIVE_LOW ? HIGH : LOW;
          pinMode(mocPin, OUTPUT);
          digitalWrite(mocPin, offLevel);
          Serial.printf("[CONFIG] Pin lama GPIO%d dimatikan.\n", mocPin);
        }
        // Set flag, biarkan loop() yang handle re-apply + save
        pendingNewPin = newPin;
        pendingPinChange = true;
        Serial.printf("[CONFIG] mocPin akan diganti ke GPIO%d (pending)...\n",
                      newPin);
      } else {
        Serial.printf("[CONFIG] mocPin tidak valid: %d (harus 0-39)\n", newPin);
      }
    }
    return;
  }

  // ── 6. SYSTEM COMMAND ────────────────────────────────────────
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
  if (client.connected())
    return;

  if (millis() - lastMqttRetry < 8000)
    return;
  lastMqttRetry = millis();

  String clientId = "Hybrid-MOC-" + deviceMac;
  String lwtTopic = baseTopic + "/status";

  Serial.printf("[MQTT] Menghubungi broker %s:%d...\n", mqtt_server, mqtt_port);

  if (client.connect(clientId.c_str(), lwtTopic.c_str(), 1, true,
                     "{\"status\":\"offline\",\"hwType\":\"MOC3062\"}")) {

    // LWT online
    client.publish(lwtTopic.c_str(),
                   "{\"status\":\"online\",\"hwType\":\"MOC3062\"}", true);

    // Subscribe ke semua topik milik device ini
    client.subscribe((baseTopic + "/#").c_str());

    // Minta sync state dari server
    client.publish("billiard/table/sync", deviceMac.c_str());

    Serial.printf("[MQTT] Terhubung! Subscribed: %s/#\n", baseTopic.c_str());
    Serial.println("[MQTT] Sync request dikirim ke server.");

  } else {
    int rc = client.state();
    Serial.printf("[MQTT] Gagal (rc=%d). Retry 8s lagi.\n", rc);
    if (rc == -2) {
      Serial.println(">> RC -2: Cek IP server, port 1883, Mosquitto berjalan.");
    }
  }
}

// ─────────────────────────────────────────────────────────────
// WIFI EVENT HANDLER
// ─────────────────────────────────────────────────────────────

void onWifiEvent(WiFiEvent_t event) {
  switch (event) {
  case ARDUINO_EVENT_WIFI_STA_GOT_IP:
    Serial.printf("[WiFi] Terhubung! IP: %s\n",
                  WiFi.localIP().toString().c_str());
    digitalWrite(PIN_LED_WIFI, HIGH);
    wasWifiConnected = true;
    lastMqttRetry = 0; // Langsung retry MQTT
    break;
  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    Serial.println("[WiFi] Terputus dari AP. Auto-reconnect...");
    digitalWrite(PIN_LED_WIFI, LOW);
    wasWifiConnected = false;
    break;
  default:
    break;
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────

void setup() {
  // ── PRIORITAS PERTAMA: Matikan MOC pin sebelum apapun ────────
  // Ini meminimalkan durasi blink yang terjadi saat ESP32 boot
  // (GPIO masih floating saat bootloader, pull-up hardware 10kΩ
  //  adalah solusi terbaik, ini adalah software safety net)
  pinMode(mocPin, OUTPUT);
  bool safeOffLevel = MOC_ACTIVE_LOW ? HIGH : LOW;
  digitalWrite(mocPin, safeOffLevel); // Matikan MOC3062 secepat mungkin

  Serial.begin(115200);
  Serial.println("\n\n=== BOOTING ESP32 — MOC30xx SINGLE TABLE MODE ===");
  Serial.println("VOC Billiard System | Hybrid IoT");
  Serial.println("=================================================");

  // 1. Pin dasar
  pinMode(PIN_LED_WIFI, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_LED_WIFI, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  // 2. Mount SPIFFS & load config (mocPin, lightState)
  if (SPIFFS.begin(true)) {
    Serial.println("[SPIFFS] Mount berhasil.");
    loadConfig();
  } else {
    Serial.println("[SPIFFS] Mount GAGAL! Gunakan nilai default.");
  }

  // 3. Inisialisasi pin MOC3062 — RESTORE state dari SPIFFS
  //
  //  ♻ POWER RESTORE LOGIC:
  //    - Jika sebelum mati listrik lampu MENYALA → langsung nyalakan lagi
  //    - Jika sebelum mati listrik lampu MATI    → tetap mati
  //    - Server akan koreksi via sync_response jika session sudah berakhir
  //      selama pemadaman (misalnya billing habis, staff matikan manual di SW)
  //
  Serial.printf("[HARDWARE] Init MOC30xx pada GPIO%d (mode: %s)\n", mocPin,
                MOC_ACTIVE_LOW ? "ACTIVE-LOW" : "ACTIVE-HIGH");
  pinMode(mocPin, OUTPUT);

  // Terapkan state tersimpan dari SPIFFS langsung ke GPIO
  bool bootPinLevel = MOC_ACTIVE_LOW ? !lightState : lightState;
  digitalWrite(mocPin, bootPinLevel ? HIGH : LOW);

  if (lightState) {
    Serial.println("[HARDWARE] ♻ POWER RESTORE: Lampu MENYALA (state dari SPIFFS)");
    Serial.println("[HARDWARE] Server akan konfirmasi/koreksi via sync...");
  } else {
    Serial.println("[HARDWARE] Lampu OFF saat boot (state dari SPIFFS).");
  }


  // 4. Watchdog 30 detik
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
  esp_task_wdt_config_t wdt_cfg = {
      .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true};
  esp_task_wdt_reconfigure(&wdt_cfg);
#else
  esp_task_wdt_init(30, true);
#endif
  esp_task_wdt_add(NULL);

  // 5. Baca MAC Address (untuk baseTopic & client ID)
  uint8_t baseMac[6];
  esp_efuse_mac_get_default(baseMac);
  char macStr[13];
  sprintf(macStr, "%02X%02X%02X%02X%02X%02X", baseMac[0], baseMac[1],
          baseMac[2], baseMac[3], baseMac[4], baseMac[5]);
  deviceMac = String(macStr);
  baseTopic = "billiard/table/" + deviceMac;

  Serial.printf("[DEVICE] MAC Address : %s\n", deviceMac.c_str());
  Serial.printf("[DEVICE] Base Topic  : %s\n", baseTopic.c_str());
  Serial.printf("[DEVICE] MOC Control : GPIO%d\n", mocPin);

  // 6. MQTT client setup
  client.setKeepAlive(120);
  client.setSocketTimeout(10);
  client.setBufferSize(1024);
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  // 7. WiFi connect
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
    Serial.printf("[WiFi] Terhubung! IP: %s\n",
                  WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WiFi] GAGAL. Akan retry di loop().");
  }

  // 8. OTA (non-aktif by default, uncomment jika perlu)
  // ArduinoOTA.setHostname(("SpotOn-MOC-" + deviceMac).c_str());
  // ArduinoOTA.begin();

  // Buzzer 2x: boot sukses
  startDoubleBuzzer();

  Serial.println("\n=== MOC3062 NODE READY ===");
  Serial.printf("Daftarkan meja ini di Admin → Manajemen Meja\n");
  Serial.printf("  MAC Address : %s\n", deviceMac.c_str());
  Serial.printf("  PIN Control : %d  (GPIO%d)\n", mocPin, mocPin);
  Serial.println("=========================\n");
}

// ─────────────────────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────────────────────

void loop() {
  esp_task_wdt_reset();
  unsigned long now = millis();

  updateBuzzer();
  // ArduinoOTA.handle(); // Uncomment jika OTA diaktifkan

  if (WiFi.status() == WL_CONNECTED) {
    // MQTT reconnect & loop
    handleMqttConnection();
    client.loop();

    // ── Heartbeat tiap 60s ──────────────────────────────────
    if (client.connected() && (now - lastHeartbeat > HEARTBEAT_INTERVAL)) {
      lastHeartbeat = now;
      String hTopic = baseTopic + "/heartbeat";
      String hPayload =
          "{\"uptime\":" + String(millis() / 1000) +
          ",\"rssi\":" + String(WiFi.RSSI()) + ",\"hwType\":\"MOC30xx\"" +
          ",\"mocPin\":" + String(mocPin) +
          ",\"light\":" + String(lightState ? "true" : "false") + "}";
      client.publish(hTopic.c_str(), hPayload.c_str());
      Serial.println("[MQTT] Heartbeat terkirim.");
    }

    // ── Telemetry tiap 30s ──────────────────────────────────
    if (client.connected() && (now - lastStatusUpdate > STATUS_INTERVAL)) {
      lastStatusUpdate = now;
      publishStatus();
    }

  } else {
    // WiFi terputus: LED blink & full reconnect cycle
    if (now - lastLedBlink > 300) {
      lastLedBlink = now;
      digitalWrite(PIN_LED_WIFI, !digitalRead(PIN_LED_WIFI));
    }
    if (now - lastWifiCheck > WIFI_FULL_RECONNECT) {
      lastWifiCheck = now;
      Serial.println("[WiFi] Belum tersambung, coba full reconnect...");
      WiFi.disconnect(true);
      delay(500);
      WiFi.begin(ssid, password);
    }
  }

  // ── Deferred SPIFFS Save (3s setelah perubahan terakhir) ──
  if (storageDirty && (now - lastStateChange > STORAGE_SAVE_DELAY)) {
    saveConfig();
    storageDirty = false;
  }

  // ── Pending Pin Change (dari /config/set MQTT command) ──────
  // Dilakukan di loop() bukan di callback agar tidak blocking
  if (pendingPinChange && pendingNewPin >= 0) {
    pendingPinChange = false;
    mocPin = pendingNewPin;
    pendingNewPin = -1;
    setLight(lightState); // Re-apply state di pin baru
    storageDirty = true;
    lastStateChange = millis();
    startBuzzer(300);
    Serial.printf("[CONFIG] mocPin resmi diubah ke GPIO%d\n", mocPin);
    publishStatus();
  }

  // ── Sanity Check: Pastikan pin GPIO sesuai state ──────────
  // Koreksi output pin tiap 10 detik jika ada glitch
  static unsigned long lastPinVerify = 0;
  if (now - lastPinVerify > 10000) {
    lastPinVerify = now;
    int currentPinState = digitalRead(mocPin);
    // Hitung expected pin level sesuai logika active-LOW/HIGH
    bool expectedLevel = MOC_ACTIVE_LOW ? !lightState : lightState;
    bool pinIsHigh = (currentPinState == HIGH);
    if (pinIsHigh != expectedLevel) {
      Serial.printf("[FIX] Pin GPIO%d tidak sesuai state, koreksi...\n",
                    mocPin);
      digitalWrite(mocPin, expectedLevel ? HIGH : LOW);
    }
  }
}
