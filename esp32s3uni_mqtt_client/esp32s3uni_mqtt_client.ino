/*
 * ESP32-S3 UNO MQTT Client — Panel Konvensional (Multi-Relay PCF8575)
 * VOC SYSTEM (Spot On Billiard)
 *
 * Arsitektur: 1 ESP32-S3 UNO per panel (mengontrol 1–16 relay via PCF8575)
 * Hardware  : PCF8575 (I2C GPIO Expander) → Relay Modul → Lampu 220V AC
 *
 * Topologi: WiFi MQTT langsung (tidak pakai ESP-NOW)
 * Gunakan firmware ini jika panel menggunakan ESP32-S3 UNO + PCF8575 + relay module.
 *
 * Fitur:
 *  1. Multi Modul PCF8575: Mendukung hingga puluhan modul (otomatis hitung
 * jumlah relay)
 *  2. Dynamic-Safe JSON: Alokasi memory JSON menyesuaikan jumlah relay
 *  3. Hardware Watchdog: Auto-restart jika sistem membeku (hang) >30s
 *  4. Anti-Ghost Switching: Verifikasi status I2C setiap 10 detik di semua
 * modul
 *  5. MQTT LWT (Last Will): Server tahu secara instan jika alat offline
 *  6. Extend Protection: Proteksi 60 detik saat tambah waktu (anti-race
 * condition)
 *  7. WiFi Stability: Auto-reconnect dengan full disconnect+begin cycle setiap
 * 30s
 *  8. MQTT Keep-Alive: 120s keep-alive + heartbeat 60s agar tidak drop saat
 * idle
 *  9. State Persistence: Status relay tersimpan ke SPIFFS, di-restore saat
 * power restore
 * 10. Identifikasi via MAC Address (otomatis, tanpa konfigurasi manual)
 * 11. STATUS LED (GPIO 16): Indikator status sistem tambahan
 * 12. RELAY CONTROL (GPIO 15): Output kontrol relay onboard
 *
 * PIN KONFIGURASI (ESP32-S3 UNO):
 *  MODE_SWITCH   : GPIO 46 (Saklar Mode Otomatis/Manual)
 *  LED_WIFI      : GPIO  3 (Indikator koneksi WiFi)
 *  STATUS_LED    : GPIO 16 (Indikator status sistem)
 *  TRANSISTOR_PIN: GPIO 14 (Master relay transistor)
 *  RELAY_CONTROL : GPIO 15 (Output kontrol relay)
 *  BUZZER        : GPIO 11 (Buzzer notifikasi)
 *  SDA_PIN       : GPIO  9 (I2C Data)
 *  SCL_PIN       : GPIO  8 (I2C Clock)
 *
 * TOPIK MQTT:
 *  Subscribe: billiard/table/{MAC}/#
 *  Publish  : billiard/table/{MAC}/status     (telemetry, retain=true)
 *           : billiard/table/{MAC}/heartbeat  (60s ping)
 *           : billiard/table/sync             (saat boot, minta state dari
 * server)
 */

#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <DNSServer.h> // 🛡️ Added for Portal
#include <PCF8575.h>
#include <Preferences.h> // 🛡️ Added for Persistent Settings
#include <PubSubClient.h>
#include <SPIFFS.h>
#include <WebServer.h> // 🛡️ Added for Portal
#include <WiFi.h>
#include <Wire.h>
#include <esp_mac.h>
#include <esp_system.h>
#include <esp_task_wdt.h>

// ─────────────────────────────────────────────────────────────
// PIN DEFINITIONS (ESP32-S3 UNO)
// ─────────────────────────────────────────────────────────────
#define MODE_SWITCH     46  // Saklar Mode Otomatis/Manual
#define LED_WIFI         3  // Indikator koneksi WiFi
#define STATUS_LED      16  // Indikator status sistem
#define TRANSISTOR_PIN  14  // Master relay transistor
#define RELAY_CONTROL   15  // Output kontrol relay
#define BUZZER          11  // Buzzer notifikasi
#define SDA_PIN          9  // I2C Data
#define SCL_PIN          8  // I2C Clock

// ─────────────────────────────────────────────────────────────
// CONFIGURATION STATE (Dinamis via Portal)
// ─────────────────────────────────────────────────────────────
char ssid[33]        = "";
char password[65]    = "";
char mqtt_server[65] = "";
int  mqtt_port       = 1883;

// GPIO Pins (default dari #define, bisa di-override via Portal)
int pin_mode_switch = MODE_SWITCH;
int pin_led_wifi    = LED_WIFI;
int pin_status_led  = STATUS_LED;
int pin_transistor  = TRANSISTOR_PIN;
int pin_relay_ctrl  = RELAY_CONTROL;
int pin_buzzer      = BUZZER;
int pin_sda         = SDA_PIN;
int pin_scl         = SCL_PIN;

// PCF Config
uint8_t pcfAddresses[8] = {0x20};
int num_pcf_modules = 1;
bool pcf_active_low = true;

// Portal Objects
WebServer  server(80);
DNSServer  dnsServer;
Preferences preferences;
bool isConfigMode = false;
const byte DNS_PORT = 53;
PCF8575 *pcfModules[8]; // Mendukung hingga 8 modul (128 relay)
int num_relays = 16;

// ─────────────────────────────────────────────────────────────
// STATE & VARIABEL GLOBAL
// ─────────────────────────────────────────────────────────────
WiFiClient   espClient;
PubSubClient client(espClient);

String deviceMac = ""; // MAC Address tanpa pemisah, uppercase
String baseTopic = ""; // billiard/table/{deviceMac}

bool          relayState[128]          = {false};
bool          relayTarget[128]         = {false};
unsigned long relayProtectedUntil[128] = {0};
uint32_t      tableTimer[128]          = {0}; // 🛡️ Sisa waktu per meja (detik)
unsigned long lastTimerTick            = 0;

bool          storageDirty    = false;
unsigned long lastStateChange = 0;
const unsigned long STORAGE_SAVE_DELAY = 3000;

bool          modeOtomatis         = true;
bool          wasWifiConnected     = false;
int           buzzerBeepsRemaining = 0;
unsigned long buzzerNextToggle     = 0;
bool          buzzerState          = false;
unsigned long buzzerToneDuration   = 100;
unsigned long buzzerPauseDuration  = 100;
unsigned long lastMqttRetry        = 0;
unsigned long lastLedBlink         = 0;
unsigned long lastPcfVerify        = 0;
unsigned long lastStatusUpdate     = 0;
unsigned long lastHeartbeat        = 0;
unsigned long lastWifiCheck        = 0;
unsigned long portalTriggerStart   = 0; // 🛡️ Tracker untuk tombol BOOT

const unsigned long STATUS_INTERVAL    = 30000; // Telemetry tiap 30s
const unsigned long HEARTBEAT_INTERVAL = 60000; // Heartbeat tiap 60s
const unsigned long WIFI_FULL_RECONNECT =
    30000; // Full reconnect jika WiFi putus >30s

// ─────────────────────────────────────────────────────────────
// CONFIGURATION PERSISTENCE (NVM via Preferences)
// ─────────────────────────────────────────────────────────────

void loadSettings() {
  preferences.begin("voc-config", true);

  preferences.getString("ssid", "").toCharArray(ssid, 33);
  preferences.getString("pass", "").toCharArray(password, 65);
  preferences.getString("mqtt", "192.168.1.5").toCharArray(mqtt_server, 65);
  mqtt_port = preferences.getInt("port", 1883);

  pin_mode_switch = preferences.getInt("pMod", MODE_SWITCH);
  pin_led_wifi    = preferences.getInt("pLed", LED_WIFI);
  pin_status_led  = preferences.getInt("pSLed", STATUS_LED);
  pin_transistor  = preferences.getInt("pTrn", TRANSISTOR_PIN);
  pin_relay_ctrl  = preferences.getInt("pRly", RELAY_CONTROL);
  pin_buzzer      = preferences.getInt("pBuz", BUZZER);
  pin_sda         = preferences.getInt("pSDA", SDA_PIN);
  pin_scl         = preferences.getInt("pSCL", SCL_PIN);

  pcf_active_low = preferences.getBool("pAL", true);

  String pcfHex   = preferences.getString("pcf", "0x20");
  num_pcf_modules = 0;

  // Simple parser for "0x20,0x21"
  int lastComma = -1;
  for (int i = 0; i <= pcfHex.length(); i++) {
    if (i == pcfHex.length() || pcfHex[i] == ',') {
      String hexPart = pcfHex.substring(lastComma + 1, i);
      hexPart.trim();
      if (hexPart.length() > 0) {
        pcfAddresses[num_pcf_modules++] =
            (uint8_t)strtol(hexPart.c_str(), NULL, 0);
      }
      lastComma = i;
    }
  }
  num_relays = num_pcf_modules * 16;

  preferences.end();
  Serial.println("[CONFIG] Settings hydrated from memory.");
}

void saveSettings(String s, String p, String m, int pt, String ph,
                  int pm, int pl, int psl, int pr, int prly,
                  int pb, bool al) {
  preferences.begin("voc-config", false);
  preferences.putString("ssid", s);
  preferences.putString("pass", p);
  preferences.putString("mqtt", m);
  preferences.putInt("port", pt);
  preferences.putString("pcf", ph);
  preferences.putInt("pMod",  pm);
  preferences.putInt("pLed",  pl);
  preferences.putInt("pSLed", psl);
  preferences.putInt("pTrn",  pr);
  preferences.putInt("pRly",  prly);
  preferences.putInt("pBuz",  pb);
  preferences.putBool("pAL",  al);
  preferences.end();
  Serial.println("[CONFIG] New settings saved.");
}

// ─────────────────────────────────────────────────────────────
// BUZZER (Non-blocking)
// ─────────────────────────────────────────────────────────────

void startBuzzer(unsigned long durationMs) {
  buzzerBeepsRemaining = 1;
  buzzerState          = true;
  digitalWrite(pin_buzzer, HIGH);
  buzzerNextToggle = millis() + durationMs;
}

void startDoubleBuzzer() {
  buzzerBeepsRemaining = 3;
  buzzerState          = true;
  buzzerToneDuration   = 120;
  buzzerPauseDuration  = 80;
  digitalWrite(pin_buzzer, HIGH);
  buzzerNextToggle = millis() + buzzerToneDuration;
}

void updateBuzzer() {
  if (buzzerBeepsRemaining > 0 && millis() >= buzzerNextToggle) {
    buzzerBeepsRemaining--;
    if (buzzerBeepsRemaining == 0) {
      digitalWrite(pin_buzzer, LOW);
      buzzerState = false;
    } else {
      buzzerState = !buzzerState;
      digitalWrite(pin_buzzer, buzzerState ? HIGH : LOW);
      buzzerNextToggle =
          millis() + (buzzerState ? buzzerToneDuration : buzzerPauseDuration);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// PCF8575 WRITE HELPER
// ─────────────────────────────────────────────────────────────

bool pcfWrite(uint8_t pin, bool state) {
  if (pin >= num_relays)
    return false;
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
// WEB PORTAL (Premium Glassmorphism UI)
// ─────────────────────────────────────────────────────────────

String getHeader() {
  return "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta "
         "name='viewport' content='width=device-width, initial-scale=1.0'>"
         "<link "
         "href='https://fonts.googleapis.com/"
         "css2?family=Outfit:wght@300;400;600;800&display=swap' "
         "rel='stylesheet'>"
         "<style>:root{--p:#3b82f6;--s:#10b981;--bg:#020617;--glass:rgba(255,"
         "255,255,0.03);} "
         "body{font-family:'Outfit',sans-serif;margin:0;padding:20px;"
         "background:radial-gradient(circle at 0% 0%, #1e1b4b 0%, #020617 "
         "100%);color:#f8fafc;min-height:100vh;} "
         "*{box-sizing:border-box;transition:0.3s cubic-bezier(0.4,0,0.2,1);} "
         ".card{background:rgba(15,23,42,0.6);backdrop-filter:blur(20px);-"
         "webkit-backdrop-filter:blur(20px);border-radius:32px;padding:30px;"
         "border:1px solid rgba(255,255,255,0.08);box-shadow:0 25px 50px -12px "
         "rgba(0,0,0,0.5);max-width:480px;margin:auto;} "
         "h1{font-weight:800;font-size:24px;margin-bottom:20px;display:flex;"
         "align-items:center;gap:12px;color:var(--p);} "
         ".field{margin-bottom:20px;} "
         "label{display:block;font-size:11px;font-weight:600;color:#64748b;"
         "text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;} "
         "input,select{width:100%;background:rgba(255,255,255,0.03);border:1px "
         "solid "
         "rgba(255,255,255,0.1);border-radius:12px;padding:12px;color:white;"
         "outline:none;} "
         "input:focus{border-color:var(--p);background:rgba(59,130,246,0.05);} "
         ".row{display:flex;gap:10px;} "
         "button{background:linear-gradient(135deg,var(--p),#2563eb);color:"
         "white;border:none;padding:15px;border-radius:14px;font-weight:700;"
         "cursor:pointer;width:100%;} "
         ".scan-btn{width:auto;padding:8px "
         "15px;background:rgba(59,130,246,0.1);color:var(--p);border:1px solid "
         "var(--p);font-size:10px;} "
         ".pass-grp{position:relative;} "
         ".eye{position:absolute;right:12px;top:10px;cursor:pointer;opacity:0."
         "5;} "
         "#scan-res{margin-top:10px;background:rgba(0,0,0,0.3);border-radius:"
         "10px;overflow:hidden;max-height:0;transition:max-height 0.4s ease;} "
         ".scan-item{padding:10px;font-size:13px;border-bottom:1px solid "
         "rgba(255,255,255,0.05);cursor:pointer;} "
         ".scan-item:hover{background:rgba(59,130,246,0.1);} "
         ".badge{font-size:10px;background:rgba(16,185,129,0.15);color:#10b981;"
         "border:1px solid rgba(16,185,129,0.3);border-radius:6px;padding:2px 8px;}"
         "</style><script>"
         "function togglePass(){var "
         "x=document.getElementById('p');x.type=x.type==='password'?'text':'"
         "password';} "
         "function scan(){var "
         "r=document.getElementById('scan-res');r.style.maxHeight='200px';r."
         "innerHTML='<p "
         "style=\"padding:10px;font-size:11px;\">Scanning...</p>';"
         "fetch('/scan').then(res=>res.text()).then(h=>{r.innerHTML=h;});} "
         "function setSsid(s){document.getElementById('s').value=s;}"
         "</script></head><body>";
}

void handleRoot() {
  preferences.begin("voc-config", true);
  String h = getHeader();
  h += "<div class='card'><h1>⚙️ VOC CONFIG <span class='badge'>S3-UNO</span></h1>";
  h += "<form action='/save' method='POST'>";
  h += "<div class='field'><label>WIFI SSID <button type='button' "
       "class='scan-btn' onclick='scan()'>SCAN</button></label><input id='s' "
       "name='s' value='" +
       String(ssid) + "'> <div id='scan-res'></div></div>";
  h += "<div class='field'><label>WIFI PASSWORD</label><div "
       "class='pass-grp'><input id='p' name='p' type='password' value='" +
       String(password) +
       "'><span class='eye' onclick='togglePass()'>👀</span></div></div>";
  h += "<div class='field'><label>MQTT BROKER IP</label><input name='m' "
       "value='" +
       String(mqtt_server) + "'></div>";
  h += "<div class='field'><label>MQTT PORT</label><input name='pt' "
       "type='number' value='" +
       String(mqtt_port) + "'></div>";
  h += "<div class='field'><label>PCF ADDRESSES (CSV)</label><input name='ph' "
       "value='" +
       preferences.getString("pcf", "0x20") +
       "' placeholder='0x20,0x21'></div>";
  h += "<div class='row'>";
  h += " <div class='field'><label>PIN MODE</label><input name='pm' "
       "type='number' value='" +
       String(pin_mode_switch) + "'></div>";
  h += " <div class='field'><label>PIN WIFI LED</label><input name='pl' "
       "type='number' value='" +
       String(pin_led_wifi) + "'></div>";
  h += "</div><div class='row'>";
  h += " <div class='field'><label>PIN STATUS LED</label><input name='psl' "
       "type='number' value='" +
       String(pin_status_led) + "'></div>";
  h += " <div class='field'><label>PIN TRANSISTOR</label><input name='ptr' "
       "type='number' value='" +
       String(pin_transistor) + "'></div>";
  h += "</div><div class='row'>";
  h += " <div class='field'><label>PIN RELAY CTRL</label><input name='prly' "
       "type='number' value='" +
       String(pin_relay_ctrl) + "'></div>";
  h += " <div class='field'><label>PIN BUZZER</label><input name='pb' "
       "type='number' value='" +
       String(pin_buzzer) + "'></div>";
  h += "</div>";
  h += "<div class='field'><label>RELAY ACTIVE LOW</label><select "
       "name='al'><option value='1' " +
       String(pcf_active_low ? "selected" : "") +
       ">LOW (Common)</option><option value='0' " +
       String(!pcf_active_low ? "selected" : "") +
       ">HIGH</option></select></div>";
  h += "<button type='submit'>APPLY SETTINGS</button></form></div></body></html>";
  preferences.end();
  server.send(200, "text/html", h);
}

void handleScan() {
  int    n = WiFi.scanNetworks();
  String h = "";
  for (int i = 0; i < n; i++) {
    h += "<div class='scan-item' onclick='setSsid(\"" + WiFi.SSID(i) + "\")'>" +
         WiFi.SSID(i) + " (" + String(WiFi.RSSI(i)) + "dBm)</div>";
  }
  server.send(200, "text/html", h);
}

void handleSave() {
  saveSettings(server.arg("s"), server.arg("p"), server.arg("m"),
               server.arg("pt").toInt(), server.arg("ph"),
               server.arg("pm").toInt(),  server.arg("pl").toInt(),
               server.arg("psl").toInt(), server.arg("ptr").toInt(),
               server.arg("prly").toInt(), server.arg("pb").toInt(),
               server.arg("al") == "1");
  server.send(200, "text/plain", "Settings saved. Rebooting...");
  delay(2000);
  ESP.restart();
}

void startPortal() {
  isConfigMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP("VOC-Billiard-S3UNO");
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
  server.on("/", handleRoot);
  server.on("/scan", handleScan);
  server.on("/save", HTTP_POST, handleSave);
  server.onNotFound([]() {
    server.sendHeader("Location", "/", true);
    server.send(302, "text/plain", "");
  });
  server.begin();
  Serial.println("[PORTAL] AP Active: VOC-Billiard-S3UNO");
}

// ─────────────────────────────────────────────────────────────
// SPIFFS — Simpan & Muat Status Relay
// ─────────────────────────────────────────────────────────────
void saveToSPIFFS() {
  DynamicJsonDocument doc(4096);
  JsonArray           arr = doc.createNestedArray("state");
  for (int i = 0; i < num_relays; i++)
    arr.add(relayState[i]);

  JsonArray tmr = doc.createNestedArray("timers");
  for (int i = 0; i < num_relays; i++)
    tmr.add(tableTimer[i]);

  File f = SPIFFS.open("/relay_config.json", FILE_WRITE);
  if (f) {
    serializeJson(doc, f);
    f.close();
    Serial.println("[SPIFFS] State & Timers tersimpan.");
  }
}

void loadFromSPIFFS() {
  if (SPIFFS.exists("/relay_config.json")) {
    File f = SPIFFS.open("/relay_config.json", FILE_READ);
    if (f) {
      DynamicJsonDocument doc(4096);
      if (!deserializeJson(doc, f)) {
        for (int i = 0; i < num_relays; i++) {
          relayState[i]  = doc["state"][i] | false;
          tableTimer[i]  = doc["timers"][i] | 0;
        }
        Serial.println("[SPIFFS] State & Timers di-restore.");
      }
      f.close();
    }
  }
}

// ─────────────────────────────────────────────────────────────
// MQTT — Publish Status Telemetry
// ─────────────────────────────────────────────────────────────

void publishStatus() {
  if (!client.connected())
    return;

  String             topic = baseTopic + "/status";
  DynamicJsonDocument resp(4096);

  resp["status"]   = "ONLINE";
  resp["online"]   = true;
  resp["uptime"]   = millis() / 1000;
  resp["rssi"]     = WiFi.RSSI();
  resp["freeHeap"] = ESP.getFreeHeap();
  resp["ip"]       = WiFi.localIP().toString();
  resp["mac"]      = deviceMac;
  resp["hwType"]   = "PCF8575";
  resp["board"]    = "ESP32-S3-UNO";
  resp["mode"]     = modeOtomatis ? "AUTO" : "MANUAL";
  resp["modePin"]  = digitalRead(pin_mode_switch) == HIGH ? "OPEN" : "CLOSED";
  resp["relayCtrl"]= digitalRead(pin_relay_ctrl) == HIGH ? "ON" : "OFF";

  JsonArray relays = resp.createNestedArray("relays");
  for (int i = 0; i < num_relays; i++) {
    relays.add(relayState[i]);
  }

  JsonArray timers = resp.createNestedArray("timers");
  for (int i = 0; i < num_relays; i++) {
    timers.add(tableTimer[i] / 60); // Laporkan menit sisa ke dashboard
  }

  String buf;
  serializeJson(resp, buf);
  client.publish(topic.c_str(), buf.c_str(), true); // retain=true

  Serial.printf("[MQTT] ↑ Status published: %d relays, RSSI=%d\n", num_relays,
                WiFi.RSSI());
}

// ─────────────────────────────────────────────────────────────
// WIFI EVENT HANDLER
// ─────────────────────────────────────────────────────────────

void onWifiEvent(WiFiEvent_t event) {
  switch (event) {
  case ARDUINO_EVENT_WIFI_STA_GOT_IP:
    Serial.printf("[WiFi] Terhubung! IP: %s\n",
                  WiFi.localIP().toString().c_str());
    digitalWrite(pin_led_wifi, HIGH);
    digitalWrite(pin_status_led, HIGH);
    wasWifiConnected = true;
    lastMqttRetry    = 0; // Langsung coba MQTT setelah WiFi connected
    break;
  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    Serial.println("[WiFi] PUTUS dari AP! WiFi auto-reconnect...");
    digitalWrite(pin_led_wifi, LOW);
    digitalWrite(pin_status_led, LOW);
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

  DynamicJsonDocument  doc(4096);
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) {
    Serial.printf("[MQTT] JSON parse error: %s\n", error.c_str());
    return;
  }

  String sTopic = String(topic);

  // ── 1. PING ──────────────────────────────────────────────────
  if (sTopic.endsWith("/ping")) {
    int                 tableId = doc["tableId"] | 0;
    DynamicJsonDocument resp(256);
    resp["tableId"]  = tableId;
    resp["status"]   = "PONG";
    resp["uptime"]   = millis() / 1000;
    resp["rssi"]     = WiFi.RSSI();
    resp["hwType"]   = "PCF8575";
    resp["board"]    = "ESP32-S3-UNO";
    resp["mac"]      = deviceMac;

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

    unsigned long now       = millis();
    bool          anyChange = false;

    for (JsonObject t : tables) {
      int pinIndex = t["relayPin"] | -1;
      if (pinIndex == -1)
        pinIndex = (t["tableId"] | 1) - 1; // Fallback
      if (pinIndex < 0 || pinIndex >= num_relays)
        continue;

      const char *statusStr  = t["status"] | "OFF";
      bool        targetStatus = (strcasecmp(statusStr, "ON") == 0);

      if (relayState[pinIndex] != targetStatus ||
          relayTarget[pinIndex] != targetStatus) {
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
      publishStatus(); // 🚀 Kirim feedback instan setelah sync
    } else {
      Serial.println("[MQTT] Sync: State sudah sesuai, tidak ada perubahan.");
    }
    return;
  }

  // ── 3. LIGHT CONTROL ─────────────────────────────────────────
  if (sTopic.endsWith("/light/set")) {
    const char *status   = doc["status"] | "";
    bool        activate = (strcasecmp(status, "ON") == 0);
    bool        isExtend = doc["extend"] | false;
    bool        isForce  = doc["force"] | false;
    int         tableId  = doc["tableId"] | 0;

    int pinIndex = -1;
    if (doc.containsKey("relayPin") && !doc["relayPin"].isNull()) {
      pinIndex = doc["relayPin"].as<int>();
    } else {
      pinIndex = tableId - 1; // Fallback
    }

    if (pinIndex < 0 || pinIndex >= num_relays) {
      Serial.printf("[MQTT] GAGAL: PinIndex %d diluar jangkauan (0-%d)\n",
                    pinIndex, num_relays - 1);
      return;
    }

    if (!modeOtomatis) {
      Serial.println("[MQTT] PERINGATAN: Berjalan dalam MODE MANUAL. Perintah "
                     "diizinkan (Debug Mode).");
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
      tableTimer[pinIndex]  = 0; // 🛡️ Reset Timer
      pcfWrite(pinIndex, false);
      // Update RELAY_CONTROL jika ini pin pertama
      if (pinIndex == 0)
        digitalWrite(pin_relay_ctrl, LOW);
      storageDirty    = true;
      lastStateChange = now;
      startBuzzer(200);
      Serial.printf("[RELAY] DB_ID:%d MAC:%s Pin%d → OFF\n", tableId,
                    deviceMac.c_str(), pinIndex);
    } else {
      // 🛡️ Proteksi minimalis 500ms (nyaris instan tapi tetap aman untuk relay)
      unsigned long protDuration        = isExtend ? 60000 : 500;
      relayProtectedUntil[pinIndex]     = now + protDuration;

      // 🛡️ Play Time (Open) Fix: 0 = Infinite, >0 = Countdown
      uint32_t duration        = doc["duration"] | 0;
      tableTimer[pinIndex]     = (uint32_t)duration * 60;

      relayState[pinIndex]  = true;
      relayTarget[pinIndex] = true;
      pcfWrite(pinIndex, true);
      // Update RELAY_CONTROL jika ini pin pertama
      if (pinIndex == 0)
        digitalWrite(pin_relay_ctrl, HIGH);
      storageDirty    = true;
      lastStateChange = now;
      if (isExtend)
        startDoubleBuzzer();
      else
        startBuzzer(500);
      Serial.printf("[RELAY] DB_ID:%d MAC:%s Pin%d → ON (%s) | Timer: %u min\n",
                    tableId, deviceMac.c_str(), pinIndex,
                    isExtend ? "EXTEND" : "START", duration);
    }
    publishStatus(); // 🚀 Kirim feedback instan setelah perintah diterima
    return;
  }

  // ── 4. RELAY CONTROL (Direct GPIO 15) ────────────────────────
  if (sTopic.endsWith("/relay/set")) {
    const char *st    = doc["status"] | "OFF";
    bool        state = (strcasecmp(st, "ON") == 0);
    digitalWrite(pin_relay_ctrl, state ? HIGH : LOW);
    Serial.printf("[RELAY_CTRL] GPIO%d → %s\n", pin_relay_ctrl, st);
    startBuzzer(100);
    return;
  }

  // ── 5. GPIO DIAGNOSTIC (Test Mode) ───────────────────────────
  if (sTopic.endsWith("/gpio/set")) {
    int         pin   = doc["pin"] | -1;
    const char *st    = doc["status"] | "OFF";
    bool        state = (strcasecmp(st, "ON") == 0);

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

  // ── 6. SYSTEM COMMAND ─────────────────────────────────────────
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

  String clientId = "SpotOn-S3UNO-" + deviceMac;
  String lwtTopic = baseTopic + "/status";

  Serial.printf("[MQTT] Menghubungi Broker di %s:%d...\n", mqtt_server,
                mqtt_port);
  Serial.printf("[MQTT] ClientID: %s\n", clientId.c_str());

  if (client.connect(clientId.c_str(), lwtTopic.c_str(), 1, true,
                     "{\"status\":\"offline\",\"hwType\":\"PCF8575\","
                     "\"board\":\"ESP32-S3-UNO\"}")) {

    client.publish(lwtTopic.c_str(),
                   "{\"status\":\"online\",\"hwType\":\"PCF8575\","
                   "\"board\":\"ESP32-S3-UNO\"}", true);

    client.subscribe((baseTopic + "/#").c_str());

    // Minta sync state dari server
    client.publish("billiard/table/sync", deviceMac.c_str());

    Serial.println("[MQTT] Terhubung & Sync Request dikirim!");
    Serial.printf("[MQTT] Subscribed ke: %s/#\n", baseTopic.c_str());
  } else {
    int state = client.state();
    Serial.printf("[MQTT] GAGAL (rc=%d). Retry 8s lagi.\n", state);
    if (state == -2) {
      Serial.println(
          ">>RC -2: Cek IP server, port 1883, dan Mosquitto berjalan.");
    }
  }
}

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n=== BOOTING ESP32-S3 UNO — VOC SYSTEM ===");
  Serial.println("    Board  : ESP32-S3 UNO");
  Serial.println("    Firmware: v1.0 (based on esp32_mqtt_client v18.6)");

  // 🛡️ 1. LOAD CONFIGURATION
  loadSettings();

  // 🛡️ 2. EMERGENCY PORTAL TRIGGER (Hold Mode Switch at boot)
  pinMode(pin_mode_switch, INPUT_PULLUP);
  pinMode(0, INPUT_PULLUP); // 🛡️ Inisialisasi Tombol BOOT (GPIO 0)
  if (digitalRead(pin_mode_switch) == LOW || strlen(ssid) == 0) {
    Serial.println("[SYSTEM] Trigger Portal detected...");
    startPortal();
  }

  // 🛡️ 3. GPIO INIT (ESP32-S3 UNO Pin Map)
  pinMode(pin_led_wifi,   OUTPUT);
  pinMode(pin_status_led, OUTPUT);
  pinMode(pin_buzzer,     OUTPUT);
  pinMode(pin_transistor, OUTPUT);
  pinMode(pin_relay_ctrl, OUTPUT);
  digitalWrite(pin_led_wifi,   LOW);
  digitalWrite(pin_status_led, LOW);
  digitalWrite(pin_buzzer,     LOW);
  digitalWrite(pin_transistor, LOW);
  digitalWrite(pin_relay_ctrl, LOW);

  Serial.printf("[GPIO] MODE_SWITCH    : GPIO %d\n", pin_mode_switch);
  Serial.printf("[GPIO] LED_WIFI       : GPIO %d\n", pin_led_wifi);
  Serial.printf("[GPIO] STATUS_LED     : GPIO %d\n", pin_status_led);
  Serial.printf("[GPIO] TRANSISTOR_PIN : GPIO %d\n", pin_transistor);
  Serial.printf("[GPIO] RELAY_CONTROL  : GPIO %d\n", pin_relay_ctrl);
  Serial.printf("[GPIO] BUZZER         : GPIO %d\n", pin_buzzer);
  Serial.printf("[GPIO] SDA_PIN        : GPIO %d\n", pin_sda);
  Serial.printf("[GPIO] SCL_PIN        : GPIO %d\n", pin_scl);

  // 🛡️ 4. I2C INIT (SDA=9, SCL=8 untuk ESP32-S3 UNO)
  Wire.begin(pin_sda, pin_scl);
  Wire.setClock(400000); // 🚀 I2C Fast Mode untuk respon instan
  Serial.printf("[I2C] Bus init: SDA=GPIO%d, SCL=GPIO%d @ 400kHz\n",
                pin_sda, pin_scl);

  // 5. Mount SPIFFS & restore state
  if (SPIFFS.begin(true)) {
    loadFromSPIFFS();
  }

  // 6. Dynamic PCF Init & restore relay states
  Serial.printf("[HARDWARE] Initializing %d PCF8575 module(s)...\n",
                num_pcf_modules);
  for (int i = 0; i < num_pcf_modules; i++) {
    pcfModules[i] = new PCF8575(pcfAddresses[i]);
    pcfModules[i]->begin();
    for (int p = 0; p < 16; p++) {
      int  globalIdx = (i * 16) + p;
      bool s         = relayState[globalIdx];
      bool pinLevel  = pcf_active_low ? !s : s;
      pcfModules[i]->write(p, pinLevel ? HIGH : LOW);
      relayTarget[globalIdx] = s;
    }
    Serial.printf("[PCF] Modul %d (0x%02X) → %d relay dipulihkan.\n",
                  i, pcfAddresses[i], 16);
  }

  // 🛡️ 7. MODE & MASTER RELAY
  modeOtomatis = (digitalRead(pin_mode_switch) == HIGH);
  if (modeOtomatis) {
    digitalWrite(pin_transistor, HIGH);
    Serial.println("[HARDWARE] Auto Mode: Master Relay Active (TRANSISTOR_PIN HIGH).");
  }

  // 8. Watchdog 30 detik
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
  esp_task_wdt_config_t wdt_config = {
      .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true};
  esp_task_wdt_reconfigure(&wdt_config);
#else
  esp_task_wdt_init(30, true);
#endif
  esp_task_wdt_add(NULL);

  // 9. Baca MAC Address
  uint8_t baseMac[6];
  esp_efuse_mac_get_default(baseMac);
  char macStr[13];
  sprintf(macStr, "%02X%02X%02X%02X%02X%02X", baseMac[0], baseMac[1],
          baseMac[2], baseMac[3], baseMac[4], baseMac[5]);
  deviceMac = String(macStr);
  baseTopic  = "billiard/table/" + deviceMac;

  Serial.printf("[DEVICE] MAC Address : %s\n", deviceMac.c_str());
  Serial.printf("[DEVICE] Base Topic  : %s\n", baseTopic.c_str());
  Serial.printf("[DEVICE] Mode        : %s\n",
                modeOtomatis ? "OTOMATIS" : "MANUAL");

  // 🛡️ 10. NETWORK & MQTT (Only if not in Portal Mode)
  if (!isConfigMode) {
    client.setKeepAlive(120);
    client.setSocketTimeout(15);  // Increased for stability
    client.setBufferSize(4096);   // 🚀 Increased for multi-table batch status
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);

    WiFi.onEvent(onWifiEvent);
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.persistent(true);
    WiFi.setSleep(false); // 🚀 Matikan WiFi Sleep agar respon MQTT instan

    Serial.printf("[WiFi] STA Mode: Connecting to '%s'...\n", ssid);
    WiFi.begin(ssid, password);

    int retry = 0;
    while (WiFi.status() != WL_CONNECTED && retry < 20) {
      delay(500);
      Serial.print(".");
      retry++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("[WiFi] Connected! IP: %s\n",
                    WiFi.localIP().toString().c_str());
      digitalWrite(pin_status_led, HIGH); // STATUS LED ON saat WiFi OK
      startDoubleBuzzer();
    } else {
      Serial.println("[WiFi] Connection failed. Will retry in loop().");
    }
  }

  Serial.println("\n=== ESP32-S3 UNO PANEL NODE READY ===");
  Serial.printf("Daftarkan panel ini di Admin → Manajemen Meja\n");
  Serial.printf("  Board       : ESP32-S3 UNO\n");
  Serial.printf("  MAC Address : %s\n", deviceMac.c_str());
  Serial.printf("  Relay Count : %d channel\n", num_relays);
  Serial.printf("  I2C Bus     : SDA=GPIO%d, SCL=GPIO%d\n", pin_sda, pin_scl);
  if (isConfigMode)
    Serial.println("  STATUS      : 🛠️ CONFIG MODE (PORTAL ACTIVE)");
  Serial.println("=====================================\n");
}

// ─────────────────────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────────────────────

void loop() {
  esp_task_wdt_reset();
  unsigned long now = millis();
  updateBuzzer();

  // 🛡️ 0. MANUAL PORTAL TRIGGER (Hold BOOT Button 5s)
  if (digitalRead(0) == LOW && !isConfigMode) {
    if (portalTriggerStart == 0)
      portalTriggerStart = now;
    if (now - portalTriggerStart > 5000) {
      Serial.println("[SYSTEM] BOOT Button held 5s, starting portal...");
      startDoubleBuzzer();
      startPortal();
    }
  } else {
    portalTriggerStart = 0;
  }

  // 🛡️ 1. CONFIG MODE (Portal)
  if (isConfigMode) {
    dnsServer.processNextRequest();
    server.handleClient();
    // Blink LED_WIFI & STATUS_LED saat config mode
    bool blink = (now / 500) % 2;
    digitalWrite(pin_led_wifi,   blink);
    digitalWrite(pin_status_led, !blink); // Status LED counter-blink
    return;
  }

  // 🛡️ 2. MODE SWITCH DETECTION
  bool currentMode = (digitalRead(pin_mode_switch) == HIGH);
  if (currentMode != modeOtomatis) {
    modeOtomatis = currentMode;
    digitalWrite(pin_transistor, modeOtomatis ? HIGH : LOW);
    for (int i = 0; i < num_relays; i++) {
      bool s = modeOtomatis && relayState[i];
      pcfWrite(i, s);
      relayTarget[i] = s;
    }
    startBuzzer(500);
    publishStatus();
    Serial.printf("[MODE] Switch → %s\n", modeOtomatis ? "OTOMATIS" : "MANUAL");
  }

  // 🛡️ 3. NETWORK HANDLING
  if (WiFi.status() == WL_CONNECTED) {
    handleMqttConnection();
    client.loop();

    // 🚀 LED INDICATOR:
    // LED_WIFI Solid ON + STATUS_LED ON   = All Systems OK (WiFi + MQTT)
    // LED_WIFI Fast Blink + STATUS_LED ON = WiFi OK but MQTT Failed
    // LED_WIFI Slow Blink + STATUS_LED OFF = WiFi Connecting...
    if (client.connected()) {
      digitalWrite(pin_led_wifi,   HIGH);
      digitalWrite(pin_status_led, HIGH);
    } else {
      digitalWrite(pin_led_wifi,   (now / 100) % 2);
      digitalWrite(pin_status_led, HIGH); // WiFi OK, MQTT belum
    }

    if (now - lastStatusUpdate > STATUS_INTERVAL) {
      lastStatusUpdate = now;
      publishStatus();
    }

    if (now - lastHeartbeat > HEARTBEAT_INTERVAL) {
      lastHeartbeat = now;
      publishHeartbeat();
    }

  } else {
    digitalWrite(pin_led_wifi,   (now / 500) % 2 == 0 ? HIGH : LOW);
    digitalWrite(pin_status_led, LOW); // Status LED OFF saat WiFi disconnect
    if (now - lastWifiCheck > WIFI_FULL_RECONNECT) {
      lastWifiCheck = now;
      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }
  }

  // 🛡️ 4. DEFERRED STORAGE SAVE
  if (storageDirty && (now - lastStateChange > STORAGE_SAVE_DELAY)) {
    saveToSPIFFS();
    storageDirty = false;
  }

  // 🛡️ 5. AUTONOMOUS TIMERS
  if (now - lastTimerTick >= 1000) {
    lastTimerTick = now;
    bool anyStop  = false;
    for (int i = 0; i < num_relays; i++) {
      if (relayState[i] && tableTimer[i] > 0) {
        tableTimer[i]--;
        if (tableTimer[i] == 0) {
          pcfWrite(i, false);
          relayState[i]  = false;
          relayTarget[i] = false;
          anyStop        = true;
          startBuzzer(1000);
          Serial.printf("[TIMER] Pin%d → Timer habis, relay OFF.\n", i);
        }
      }
    }
    if (anyStop)
      publishStatus();
  }

  // 🛡️ 6. GHOST FIX (Every 10s — Verifikasi state PCF8575)
  if (modeOtomatis && (now - lastPcfVerify > 10000)) {
    lastPcfVerify = now;
    for (int i = 0; i < num_relays; i++) {
      int pcfIndex = i / 16;
      int pcfPin   = i % 16;
      if (pcfModules[pcfIndex]->read(pcfPin) !=
          (pcf_active_low ? !relayTarget[i] : relayTarget[i])) {
        pcfWrite(i, relayTarget[i]);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// HEARTBEAT PUBLISHER
// ─────────────────────────────────────────────────────────────

void publishHeartbeat() {
  String htopic   = baseTopic + "/heartbeat";
  String hpayload = "{\"uptime\":"   + String(millis() / 1000) +
                    ",\"rssi\":"     + String(WiFi.RSSI()) +
                    ",\"hwType\":\"PCF8575\""
                    ",\"board\":\"ESP32-S3-UNO\""
                    ",\"freeHeap\":" + String(ESP.getFreeHeap()) + "}";
  client.publish(htopic.c_str(), hpayload.c_str());
}
