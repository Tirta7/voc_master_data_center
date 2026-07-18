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
#include <DNSServer.h>  // 🛡️ Added for Portal
#include <ESPmDNS.h>    // 🌐 mDNS — Akses via http://voc-panel-XXXX.local
#include <ElegantOTA.h> // 🔄 Web OTA — Upload firmware via browser
#include <PCF8575.h>
#include <Preferences.h> // 🛡️ Added for Persistent Settings
#include <PubSubClient.h>
#include <SPIFFS.h>
#include <WebServer.h> // 🛡️ Added for Portal
#include <WiFi.h>
#include <Wire.h>
#include <esp_mac.h>
#include <esp_now.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
#include <esp_wifi.h>
// WebSerial removed — uses standard Serial instead

// ─── ESP-NOW PACKET ──────────────────────────────────────────────
typedef struct __attribute__((packed)) {
  int32_t mesaId;
  int32_t cmd;
  int32_t durationMin;
  uint32_t token;
  int32_t wifiChannel;
} espnow_pkt_t;

// ─────────────────────────────────────────────────────────────
// CONFIGURATION STATE (Sekarang Dinamis v18.6)
// ─────────────────────────────────────────────────────────────
char ssid[33] = "";
char password[65] = "";
char mqtt_server[65] = "";
int mqtt_port = 1883;

// GPIO Pins (Bisa diatur di Portal)
int pin_mode_switch = 5;
int pin_led_wifi = 2;
int pin_transistor = 4;
int pin_buzzer = 19;

// PCF Config
uint8_t pcfAddresses[8] = {0x20};
int num_pcf_modules = 1;
bool pcf_active_low = true;

// Portal Objects
WebServer server(80);
DNSServer dnsServer;
Preferences preferences;
bool isConfigMode = false;
const byte DNS_PORT = 53;
PCF8575 *pcfModules[8]; // Mendukung hingga 8 modul (128 relay)
int num_relays = 16;

// ─────────────────────────────────────────────────────────────
// STATE & VARIABEL GLOBAL
// ─────────────────────────────────────────────────────────────
WiFiClient espClient;
PubSubClient client(espClient);

String deviceMac = ""; // MAC Address tanpa pemisah, uppercase
String baseTopic = ""; // billiard/table/{deviceMac}

bool relayState[128] = {false};
bool relayTarget[128] = {false};
unsigned long relayProtectedUntil[128] = {0};
unsigned long apiOverrideUntil[128] = {0}; // 🛡️ Blokir MQTT ON setelah REST API action
uint32_t tableTimer[128] = {0};           // 🛡️ Sisa waktu per meja (detik)
uint32_t tableAlertTime[128] = {0};       // 🛡️ Waktu alert per meja (detik)
uint8_t relayBlinkCount[128] = {0};       // Sisa transisi blink
unsigned long relayBlinkTimer[128] = {0}; // Timer non-blocking blink
unsigned long lastTimerTick = 0;

bool storageDirty = false;
unsigned long lastStateChange = 0;
const unsigned long STORAGE_SAVE_DELAY = 3000;

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
unsigned long lastHeartbeat = 0;
unsigned long lastWifiCheck = 0;
unsigned long portalTriggerStart = 0; // 🛡️ Tracker untuk tombol BOOT

// 🌐 mDNS & Web Services
String mdnsHostname = ""; // Nama mDNS unik (contoh: voc-panel-f770)
bool webServicesStarted =
    false; // Flag agar init hanya sekali saat WiFi connect

const unsigned long STATUS_INTERVAL = 30000;    // Telemetry tiap 30s
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
  preferences.getString("mqtt", "voc-server.local")
      .toCharArray(mqtt_server, 65);
  mqtt_port = preferences.getInt("port", 1883);

  pin_mode_switch = preferences.getInt("pMod", 5);
  pin_led_wifi = preferences.getInt("pLed", 2);
  pin_transistor = preferences.getInt("pTrn", 4);
  pin_buzzer = preferences.getInt("pBuz", 19);

  pcf_active_low = preferences.getBool("pAL", true);

  String pcfHex = preferences.getString("pcf", "0x20");
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

void saveSettings(String s, String p, String m, int pt, String ph, int pm,
                  int pl, int pr, int pb, bool al) {
  preferences.begin("voc-config", false);
  preferences.putString("ssid", s);
  preferences.putString("pass", p);
  preferences.putString("mqtt", m);
  preferences.putInt("port", pt);
  preferences.putString("pcf", ph);
  preferences.putInt("pMod", pm);
  preferences.putInt("pLed", pl);
  preferences.putInt("pTrn", pr);
  preferences.putInt("pBuz", pb);
  preferences.putBool("pAL", al);
  preferences.end();
  Serial.println("[CONFIG] New settings saved.");
}

// ─────────────────────────────────────────────────────────────
// BUZZER (Non-blocking)
// ─────────────────────────────────────────────────────────────

void startBuzzer(unsigned long durationMs) {
  buzzerBeepsRemaining = 1;
  buzzerState = true;
  digitalWrite(pin_buzzer, HIGH);
  buzzerNextToggle = millis() + durationMs;
}

void startDoubleBuzzer() {
  buzzerBeepsRemaining = 3;
  buzzerState = true;
  buzzerToneDuration = 120;
  buzzerPauseDuration = 80;
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
  int pcfPin = pin % 16;

  Wire.beginTransmission(pcfAddresses[pcfIndex]);
  if (Wire.endTransmission() != 0) {
    Serial.printf("[I2C] Error: Modul %d offline, re-init...\n", pcfIndex);
    pcfModules[pcfIndex]->begin();
  }

  bool pinLevel = pcf_active_low ? !state : state;
  pcfModules[pcfIndex]->write(pcfPin, pinLevel ? HIGH : LOW);
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
         "rgba(0,0,0,0.5);max-width:440px;margin:auto;} "
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
         ".scan-item:hover{background:rgba(59,130,246,0.1);}"
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
  String h = getHeader();
  h += "<div class='card'><h1>VOC CONFIG</h1>";
  h += "<form action='/save' method='POST'>";
  h += "<div class='field'><label>WIFI SSID <button type='button' "
       "class='scan-btn' onclick='scan()'>SCAN</button></label><input id='s' "
       "name='s' value='" +
       String(ssid) + "'> <div id='scan-res'></div></div>";
  h += "<div class='field'><label>WIFI PASSWORD</label><div "
       "class='pass-grp'><input id='p' name='p' type='password' value='" +
       String(password) +
       "'><span class='eye' onclick='togglePass()'>👀</span></div></div>";
  h += "<div class='field'><label>MQTT BROKER (IP atau mDNS .local)</label>"
       "<input name='m' placeholder='voc-server.local atau 192.168.1.x' "
       "value='" +
       String(mqtt_server) +
       "'>"
       "<div style='font-size:10px;color:#64748b;margin-top:4px;'>💡 Gunakan "
       "hostname.local agar tidak perlu ganti IP saat WiFi restart</div></div>";
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
  h += " <div class='field'><label>PIN WIFI</label><input name='pl' "
       "type='number' value='" +
       String(pin_led_wifi) + "'></div>";
  h += "</div><div class='row'>";
  h += " <div class='field'><label>PIN TRAN</label><input name='ptr' "
       "type='number' value='" +
       String(pin_transistor) + "'></div>";
  h += " <div class='field'><label>PIN BUZZ</label><input name='pb' "
       "type='number' value='" +
       String(pin_buzzer) + "'></div>";
  h += "</div>";
  h += "<div class='field'><label>RELAY ACTIVE LOW</label><select "
       "name='al'><option value='1' " +
       String(pcf_active_low ? "selected" : "") +
       ">LOW (Common)</option><option value='0' " +
       String(!pcf_active_low ? "selected" : "") +
       ">HIGH</option></select></div>";
  h += "<button type='submit'>APPLY SETTINGS</button></form>";
  h += "<a href='/dashboard' "
       "style='display:block;text-align:center;margin-top:20px;padding:12px;"
       "background:rgba(16,185,129,0.1);border:1px solid "
       "#10b981;border-radius:14px;color:#10b981;"
       "font-weight:700;text-decoration:none;font-size:14px;'>"
       "⚡ Buka Dashboard Darurat &rarr;</a>";
  h += "</div></body></html>";
  server.send(200, "text/html", h);
}

void handleScan() {
  int n = WiFi.scanNetworks();
  String h = "";
  for (int i = 0; i < n; i++) {
    h += "<div class='scan-item' onclick='setSsid(\"" + WiFi.SSID(i) + "\")'>" +
         WiFi.SSID(i) + " (" + String(WiFi.RSSI(i)) + "dBm)</div>";
  }
  server.send(200, "text/html", h);
}

// Flag PRG: restart dijadwalkan setelah redirect
bool pendingReboot = false;
unsigned long rebootAt = 0;

void handleSave() {
  // Simpan settings
  saveSettings(server.arg("s"), server.arg("p"), server.arg("m"),
               server.arg("pt").toInt(), server.arg("ph"),
               server.arg("pm").toInt(), server.arg("pl").toInt(),
               server.arg("ptr").toInt(), server.arg("pb").toInt(),
               server.arg("al") == "1");

  // PRG Pattern: redirect ke GET /saved sehingga reload browser TIDAK trigger
  // save ulang
  server.sendHeader("Location", "/saved", true);
  server.send(303, "text/plain", "");

  // Jadwalkan reboot setelah 4 detik (cukup waktu browser muat halaman /saved)
  pendingReboot = true;
  rebootAt = millis() + 4000;
}

void handleSaved() {
  String h =
      "<!DOCTYPE html><html><head>"
      "<meta charset='UTF-8'>"
      "<meta name='viewport' content='width=device-width,initial-scale=1'>"
      "<title>Saved — VOC Panel</title>"
      "<link "
      "href='https://fonts.googleapis.com/"
      "css2?family=Outfit:wght@300;400;600;800&display=swap' rel='stylesheet'>"
      "<style>"
      "*{box-sizing:border-box;margin:0;padding:0}"
      "body{font-family:'Outfit',sans-serif;background:radial-gradient(circle "
      "at 30% 20%,#1e1b4b,#020617);min-height:100vh;"
      "display:flex;align-items:center;justify-content:center;color:#f8fafc;}"
      ".card{background:rgba(15,23,42,0.75);backdrop-filter:blur(24px);border:"
      "1px solid rgba(255,255,255,0.08);"
      "border-radius:32px;padding:48px "
      "40px;max-width:400px;width:90%;text-align:center;"
      "box-shadow:0 30px 60px -12px rgba(0,0,0,0.6);}"
      ".icon{font-size:56px;margin-bottom:24px;animation:pop .4s "
      "cubic-bezier(0.34,1.56,0.64,1);}"
      "@keyframes pop{from{transform:scale(0)}to{transform:scale(1)}}"
      "h2{font-size:22px;font-weight:800;color:#10b981;margin-bottom:8px;}"
      "p{color:#94a3b8;font-size:14px;line-height:1.6;margin-bottom:28px;}"
      ".ring{width:80px;height:80px;border-radius:50%;border:4px solid "
      "rgba(255,255,255,0.06);"
      "border-top-color:#10b981;animation:spin 1s linear infinite;margin:0 "
      "auto 20px;}"
      "@keyframes spin{to{transform:rotate(360deg)}}"
      ".cnt{font-size:40px;font-weight:800;color:#3b82f6;margin:0 auto 8px;}"
      ".lbl{font-size:11px;color:#475569;letter-spacing:1px;text-transform:"
      "uppercase;margin-bottom:28px;}"
      ".bar{width:100%;height:6px;background:rgba(255,255,255,0.06);border-"
      "radius:4px;overflow:hidden;margin-bottom:24px;}"
      ".fill{height:100%;background:linear-gradient(90deg,#3b82f6,#10b981);"
      "border-radius:4px;"
      "width:100%;animation:shrink 4s linear forwards;}"
      "@keyframes shrink{from{width:100%}to{width:0%}}"
      "</style></head><body>"
      "<div class='card'>"
      "<div class='icon'>✅</div>"
      "<h2>Settings Tersimpan!</h2>"
      "<p>Konfigurasi baru telah disimpan.<br>Panel akan restart "
      "otomatis...</p>"
      "<div class='bar'><div class='fill'></div></div>"
      "<div class='cnt' id='n'>4</div>"
      "<div class='lbl'>detik hingga restart</div>"
      "<div class='ring'></div>"
      "</div>"
      "<script>"
      "var s=4;"
      "var t=setInterval(function(){"
      "s--;document.getElementById('n').textContent=s;"
      "if(s<=0){clearInterval(t);}"
      "},1000);"
      "</script>"
      "</body></html>";
  server.send(200, "text/html", h);
}

void handleDoReboot() {
  server.send(200, "text/plain", "Rebooting...");
  delay(300);
  ESP.restart();
}

void startPortal() {
  isConfigMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP("VOC-Billiard-System");
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
  server.on("/", handleRoot);
  server.on("/scan", handleScan);
  server.on("/save", HTTP_POST, handleSave);
  server.on("/saved", HTTP_GET, handleSaved);
  server.on("/do-reboot", HTTP_GET, handleDoReboot);
  server.onNotFound([]() {
    server.sendHeader("Location", "/", true);
    server.send(302, "text/plain", "");
  });
  server.begin();
  Serial.println("[PORTAL] AP Active: VOC-Billiard-System");
}

// ─────────────────────────────────────────────────────────────
// SPIFFS — Simpan & Muat Status Relay
// ─────────────────────────────────────────────────────────────
void saveToSPIFFS() {
  DynamicJsonDocument doc(4096);
  JsonArray arr = doc.createNestedArray("state");
  for (int i = 0; i < num_relays; i++)
    arr.add(relayState[i]);

  JsonArray tmr = doc.createNestedArray("timers");
  for (int i = 0; i < num_relays; i++)
    tmr.add(tableTimer[i]);

  JsonArray alrt = doc.createNestedArray("alerts");
  for (int i = 0; i < num_relays; i++)
    alrt.add(tableAlertTime[i]);

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
          relayState[i] = doc["state"][i] | false;
          tableTimer[i] = doc["timers"][i] | 0;
          tableAlertTime[i] = doc["alerts"][i] | 300; // Default 5 menit
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

  String topic = baseTopic + "/status";
  DynamicJsonDocument resp(4096);

  resp["status"] = "ONLINE";
  resp["online"] = true;
  resp["uptime"] = millis() / 1000;
  resp["rssi"] = WiFi.RSSI();
  resp["freeHeap"] = ESP.getFreeHeap();
  resp["ip"] = WiFi.localIP().toString();
  resp["mac"] = deviceMac;
  resp["hwType"] = "PCF8575";
  resp["mode"] = modeOtomatis ? "AUTO" : "MANUAL";
  resp["pin5"] = digitalRead(pin_mode_switch) == HIGH ? "OPEN" : "CLOSED";

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
    wasWifiConnected = true;
    lastMqttRetry = 0; // Langsung coba MQTT setelah WiFi connected
    break;
  case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
    Serial.println("[WiFi] PUTUS dari AP! WiFi auto-reconnect...");
    digitalWrite(pin_led_wifi, LOW);
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

  DynamicJsonDocument doc(4096);
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
    resp["status"] = "PONG";
    resp["uptime"] = millis() / 1000;
    resp["rssi"] = WiFi.RSSI();
    resp["hwType"] = "PCF8575";
    resp["mac"] = deviceMac;

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
      if (pinIndex == -1)
        pinIndex = (t["tableId"] | 1) - 1; // Fallback
      if (pinIndex < 0 || pinIndex >= num_relays)
        continue;

      const char *statusStr = t["status"] | "OFF";
      bool targetStatus = (strcasecmp(statusStr, "ON") == 0);

      if (relayState[pinIndex] != targetStatus ||
          relayTarget[pinIndex] != targetStatus) {
        relayTarget[pinIndex] = targetStatus;
        relayState[pinIndex] = targetStatus;
        pcfWrite(pinIndex, targetStatus);
        anyChange = true;
      }
    }

    if (anyChange) {
      storageDirty = true;
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
    const char *status = doc["status"] | "";
    bool activate = (strcasecmp(status, "ON") == 0);
    bool isExtend = doc["extend"] | false;
    bool isForce = doc["force"] | false;
    int tableId = doc["tableId"] | 0;

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
      relayState[pinIndex] = false;
      relayTarget[pinIndex] = false;
      tableTimer[pinIndex] = 0; // 🛡️ Reset Timer
      pcfWrite(pinIndex, false);
      storageDirty = true;
      lastStateChange = now;
      startBuzzer(200);
      Serial.printf("[RELAY] DB_ID:%d MAC:%s Pin%d → OFF\n", tableId,
                    deviceMac.c_str(), pinIndex);
    } else {
      // 🛡️ Proteksi minimalis 500ms (nyaris instan tapi tetap aman untuk relay)
      unsigned long protDuration = isExtend ? 60000 : 500;
      relayProtectedUntil[pinIndex] = now + protDuration;

      // 🛡️ Play Time (Open) Fix: 0 = Infinite, >0 = Countdown (v18.5)
      uint32_t duration = doc["duration"] | 0;
      tableTimer[pinIndex] = (uint32_t)duration * 60;

      // 🛡️ Parse alertMinute dari payload (default 5 menit jika tidak dikirim)
      uint32_t alertMin = doc["alertMinute"] | 5;
      tableAlertTime[pinIndex] = alertMin * 60;

      relayState[pinIndex] = true;
      relayTarget[pinIndex] = true;
      pcfWrite(pinIndex, true);
      storageDirty = true;
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

// ─── mDNS Resolver untuk MQTT Broker ────────────────────────
// Jika mqtt_server berakhiran ".local", resolve via mDNS ke IP.
// Fallback ke hostname asli jika gagal (biarkan TCP timeout sendiri).
IPAddress resolveMqttHost() {
  String host = String(mqtt_server);
  host.trim();

  // Cek apakah bukan .local hostname → langsung parse sebagai IP
  if (!host.endsWith(".local")) {
    IPAddress ip;
    if (ip.fromString(host)) {
      return ip; // Sudah berupa IP address
    }
    // Bisa juga hostname biasa, coba resolve via DNS
    IPAddress resolved;
    if (WiFi.hostByName(host.c_str(), resolved)) {
      Serial.printf("[MQTT] DNS resolved '%s' → %s\n", host.c_str(),
                    resolved.toString().c_str());
      return resolved;
    }
    return IPAddress(0, 0, 0, 0);
  }

  // mDNS resolve: hapus ".local" → query via MDNS.queryHost()
  String mdnsName = host.substring(0, host.length() - 6); // hilangkan ".local"
  Serial.printf("[MQTT] Resolving mDNS: '%s.local'...\n", mdnsName.c_str());

  IPAddress resolved = MDNS.queryHost(mdnsName.c_str(), 2000); // timeout 2s
  if (resolved != INADDR_NONE && resolved != IPAddress(0, 0, 0, 0)) {
    Serial.printf("[MQTT] mDNS OK: '%s.local' → %s\n", mdnsName.c_str(),
                  resolved.toString().c_str());
    return resolved;
  }

  Serial.printf("[MQTT] mDNS GAGAL resolve '%s.local'. Retry nanti.\n",
                mdnsName.c_str());
  return IPAddress(0, 0, 0, 0);
}

void handleMqttConnection() {
  if (client.connected())
    return;
  if (millis() - lastMqttRetry < 8000)
    return;
  lastMqttRetry = millis();

  String clientId = "SpotOn-PCF-" + deviceMac;
  String lwtTopic = baseTopic + "/status";

  // 🌐 Resolve broker: support IP langsung ATAU mDNS hostname (.local)
  IPAddress brokerIP = resolveMqttHost();
  if (brokerIP == IPAddress(0, 0, 0, 0)) {
    Serial.printf("[MQTT] Tidak bisa resolve broker '%s'. Skip.\n",
                  mqtt_server);
    return;
  }

  Serial.printf("[MQTT] Menghubungi Broker %s (%s):%d...\n", mqtt_server,
                brokerIP.toString().c_str(), mqtt_port);
  Serial.printf("[MQTT] ClientID: %s\n", clientId.c_str());

  client.setServer(brokerIP, mqtt_port);

  if (client.connect(clientId.c_str(), lwtTopic.c_str(), 1, true,
                     "{\"status\":\"offline\",\"hwType\":\"PCF8575\"}")) {

    // Kirim status awal instan agar Jendral langsung mendapatkan MAC Address
    publishStatus();

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
          ">> RC -2: Cek hostname broker, port 1883, dan Mosquitto berjalan.");
    }
  }
}

// ─────────────────────────────────────────────────────────────
// ESP-NOW RECEIVE CALLBACK
// ─────────────────────────────────────────────────────────────
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
#else
void OnDataRecv(const uint8_t *mac, const uint8_t *data, int len) {
#endif
  if (len < sizeof(espnow_pkt_t))
    return;

  espnow_pkt_t pkt;
  memcpy(&pkt, data, sizeof(pkt));

  // cmd: 1 atau 1001 = ON, 0 atau 1000 = OFF
  bool activate = (pkt.cmd == 1 || pkt.cmd == 1001);
  bool isRecognized =
      (pkt.cmd == 1 || pkt.cmd == 1001 || pkt.cmd == 0 || pkt.cmd == 1000);

  if (!isRecognized || pkt.mesaId <= 0)
    return;

  int pinIndex = pkt.mesaId - 1; // Meja 1 = Pin 0
  if (pinIndex < 0 || pinIndex >= num_relays)
    return;

  unsigned long now = millis();

  if (!activate) {
    if (relayProtectedUntil[pinIndex] > now)
      return; // Anti-race condition
    relayState[pinIndex] = false;
    relayTarget[pinIndex] = false;
    tableTimer[pinIndex] = 0;
    pcfWrite(pinIndex, false);
    storageDirty = true;
    lastStateChange = now;
    startBuzzer(200);
    Serial.printf("[ESP-NOW] DB_ID:%d Pin%d → OFF\n", pkt.mesaId, pinIndex);
  } else {
    relayProtectedUntil[pinIndex] = now + 500;
    uint32_t duration = pkt.durationMin;
    tableTimer[pinIndex] = duration * 60;
    relayState[pinIndex] = true;
    relayTarget[pinIndex] = true;
    pcfWrite(pinIndex, true);
    storageDirty = true;
    lastStateChange = now;
    startBuzzer(500);
    Serial.printf("[ESP-NOW] DB_ID:%d Pin%d → ON | Timer: %u min\n", pkt.mesaId,
                  pinIndex, duration);
  }

  lastStatusUpdate = 0; // Force update MQTT status
}

// ─────────────────────────────────────────────────────────────
// SERIAL CLI — Penerima Perintah via Serial Monitor
// ─────────────────────────────────────────────────────────────

void handleSerialCmd(String cmd) {
  cmd.trim();
  Serial.printf("[Serial CMD] %s\n", cmd.c_str());
  if (cmd.equalsIgnoreCase("status")) {
    publishStatus();
    Serial.println("[OK] Status MQTT telah dipublish.");
  } else if (cmd.equalsIgnoreCase("reboot")) {
    Serial.println("[OK] Rebooting dalam 2 detik...");
    delay(2000);
    ESP.restart();
  } else if (cmd.equalsIgnoreCase("help")) {
    Serial.println("╔══════════════════════════════╗");
    Serial.println("║   VOC ESP32 Serial CLI       ║");
    Serial.println("╠══════════════════════════════╣");
    Serial.println("║ status  → Publish MQTT status║");
    Serial.println("║ reboot  → Restart ESP32      ║");
    Serial.println("║ help    → Tampilkan bantuan  ║");
    Serial.println("╚══════════════════════════════╝");
  } else {
    Serial.println("[ERR] Perintah tidak dikenal. Ketik 'help'.");
  }
}

// ─────────────────────────────────────────────────────────────
// REST API — GET /api/status
// ─────────────────────────────────────────────────────────────

void handleApiStatus() {
  // Guard: cek free heap sebelum alokasi JSON
  size_t docSize = 512 + (num_relays * 80); // dinamis sesuai jumlah relay
  if (ESP.getFreeHeap() < docSize + 4096) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(503, "application/json",
                "{\"error\":\"Low memory\",\"freeHeap\":" +
                String(ESP.getFreeHeap()) + "}");
    Serial.println("[REST API] /api/status — LOW MEMORY, skip.");
    return;
  }

  DynamicJsonDocument resp(docSize);
  resp["mac"] = deviceMac;
  resp["hostname"] = mdnsHostname;
  resp["ip"] = WiFi.localIP().toString();
  resp["rssi"] = WiFi.RSSI();
  resp["uptime"] = millis() / 1000;
  resp["freeHeap"] = ESP.getFreeHeap();
  resp["mqttConnected"] = client.connected();
  resp["mode"] = modeOtomatis ? "AUTO" : "MANUAL";
  resp["hwType"] = "PCF8575";
  resp["numRelays"] = num_relays;

  JsonArray relays = resp.createNestedArray("relays");
  for (int i = 0; i < num_relays; i++) {
    JsonObject r = relays.createNestedObject();
    r["pin"] = i;
    r["meja"] = i + 1;
    r["state"] = relayState[i];
    r["timerSec"] = (uint32_t)tableTimer[i];
    r["timerMin"] = tableTimer[i] / 60;
  }

  String buf;
  buf.reserve(docSize / 2);
  serializeJson(resp, buf);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Cache-Control", "no-cache");
  server.send(200, "application/json", buf);
  Serial.printf("[REST API] GET /api/status → 200 OK (%d bytes)\n", buf.length());
}

// ─────────────────────────────────────────────────────────────
// REST API — GET /api/relay?meja=1&status=ON
// ─────────────────────────────────────────────────────────────

void handleApiRelay() {
  if (!server.hasArg("meja") || !server.hasArg("status")) {
    server.send(400, "application/json",
                "{\"error\":\"Parameter 'meja' dan 'status' wajib ada. "
                "Contoh: /api/relay?meja=1&status=ON\"}");
    return;
  }

  int mesaNum = server.arg("meja").toInt();
  int pinIndex = mesaNum - 1;
  bool activate = server.arg("status").equalsIgnoreCase("ON");

  if (pinIndex < 0 || pinIndex >= num_relays) {
    server.send(400, "application/json",
                "{\"error\":\"Nomor meja tidak valid\"}");
    return;
  }

  unsigned long now = millis();
  relayState[pinIndex] = activate;
  relayTarget[pinIndex] = activate;
  if (!activate) {
    tableTimer[pinIndex] = 0;
    relayProtectedUntil[pinIndex] = 0;
  }
  apiOverrideUntil[pinIndex] = now + 30000;
  // Kontrol relay fisik
  pcfWrite(pinIndex, activate);
  storageDirty = true;
  lastStateChange = now;

  // ✅ WAJIB: HTTP response DULU sebelum publishStatus/startBuzzer!
  // publishStatus() → client.publish() bisa blocking dan memutus HTTP conn.

  String response = "{\"success\":true,\"meja\":" + String(mesaNum) +
                    ",\"status\":\"" + (activate ? "ON" : "OFF") +
                    "\",\"pin\":" + String(pinIndex) + "}";
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", response);

  // Setelah response terkirim ke browser, baru jalankan operasi berat
  startBuzzer(activate ? 300 : 200);
  publishStatus();

  Serial.printf("[REST API] Meja %d → %s\n", mesaNum, activate ? "ON" : "OFF");
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD DARURAT — GET /dashboard
// ─────────────────────────────────────────────────────────────

void handleDashboard() {
  // ── Server-side: hitung status sekarang ──
  String ipStr     = WiFi.localIP().toString();
  String rssiStr   = String(WiFi.RSSI()) + "dBm";
  bool   mqttOk    = client.connected();
  String mqttTxt   = mqttOk ? "MQTT OK" : "MQTT Putus";
  String mqttCls   = mqttOk ? "ok" : "err";
  String heapStr   = String(ESP.getFreeHeap() / 1024) + "KB free";
  String uptimeStr = String(millis() / 1000) + "s";

  String h =
      "<!DOCTYPE html><html lang='id'><head>"
      "<meta charset='UTF-8'><meta name='viewport' "
      "content='width=device-width,initial-scale=1'>"
      "<meta http-equiv='refresh' content='8'>"
      "<title>VOC Emergency Dashboard</title>"
      "<style>"
      "*{box-sizing:border-box;margin:0;padding:0}"
      "body{font-family:'Outfit',sans-serif;background:radial-gradient(circle "
      "at 10% 10%,#1e1b4b 0%,#020617 "
      "60%);color:#f8fafc;min-height:100vh;padding:16px}"
      ".hdr{background:rgba(15,23,42,0.85);border:1px solid "
      "rgba(255,255,255,0.08);border-radius:20px;"
      "padding:16px "
      "20px;margin-bottom:14px;display:flex;justify-content:space-between;"
      "align-items:center;flex-wrap:wrap;gap:10px;"
      "backdrop-filter:blur(20px)}"
      ".logo{font-size:20px;font-weight:800;color:#3b82f6;display:flex;align-"
      "items:center;gap:8px}"
      ".sub{font-size:11px;color:#475569;margin-top:3px;letter-spacing:.5px}"
      ".info{display:flex;gap:6px;flex-wrap:wrap}"
      ".badge{font-size:11px;padding:4px 10px;border-radius:20px;border:1px "
      "solid rgba(255,255,255,0.1);"
      "background:rgba(255,255,255,0.04);color:#94a3b8}"
      ".ok{border-color:#10b981!important;color:#10b981!important}"
      ".err{border-color:#ef4444!important;color:#ef4444!important}"
      ".sb{text-align:right;font-size:11px;color:#334155;margin-bottom:10px;"
      "padding-right:4px}"
      ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,"
      "1fr));gap:10px;margin-bottom:16px}"
      ".card{background:rgba(15,23,42,0.75);border:1px solid "
      "rgba(255,255,255,0.06);border-radius:18px;"
      "padding:18px 12px;text-align:center;transition:border-color "
      ".3s,background .3s;"
      "backdrop-filter:blur(10px)}"
      ".card.on{border-color:rgba(16,185,129,0.6);background:rgba(16,185,129,0."
      "08)}"
      ".dot{width:10px;height:10px;border-radius:50%;display:inline-block;"
      "margin-bottom:10px;transition:.3s}"
      ".card.on .dot{background:#10b981;box-shadow:0 0 12px #10b981}"
      ".card.off .dot{background:#334155}"
      ".lbl{font-size:10px;color:#475569;letter-spacing:1px;text-transform:"
      "uppercase;margin-bottom:2px}"
      ".num{font-size:30px;font-weight:800;line-height:1;color:#f1f5f9}"
      ".tmr{font-size:11px;color:#64748b;margin:6px 0 14px;min-height:14px}"
      ".tmr.urgent{color:#f59e0b;font-weight:600}"
      ".btn{width:100%;border:none;border-radius:12px;padding:10px "
      "0;font-size:12px;font-weight:700;"
      "cursor:pointer;transition:.15s;font-family:'Outfit',sans-serif;letter-"
      "spacing:.3px}"
      ".btn-on{background:linear-gradient(135deg,#10b981,#059669);color:#fff}"
      ".btn-off{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff}"
      ".btn:disabled{opacity:.4;cursor:not-allowed}"
      ".btn:active:not(:disabled){transform:scale(.94)}"
      ".nav{display:flex;justify-content:center;gap:20px;flex-wrap:wrap}"
      ".nav a{font-size:12px;color:#3b82f6;text-decoration:none;padding:8px "
      "16px;"
      "border:1px solid "
      "rgba(59,130,246,0.3);border-radius:10px;background:rgba(59,130,246,0.05)"
      "}"
      ".nav a:hover{background:rgba(59,130,246,0.15)}"
      "</style></head><body>"
      "<div class='hdr'>"
      "<div>"
      "<div class='logo'>&#9889; VOC Emergency Panel V2 (Tested OTA)</div>"
      "<div class='sub'>STANDALONE &mdash; " + deviceMac + "</div>"
      "</div>"
      "<div class='info'>"
      "<span class='badge'>" + ipStr + "</span>"
      "<span class='badge'>" + rssiStr + "</span>"
      "<span class='badge " + mqttCls + "'>" + mqttTxt + "</span>"
      "<span class='badge'>" + heapStr + "</span>"
      "</div>"
      "</div>"
      "<div class='sb'>&#8635; Auto-refresh 8s | Uptime: " + uptimeStr + "</div>"
      "<div class='grid'>";

  // ── Server-side render tiap relay ──
  for (int i = 0; i < num_relays; i++) {
    int meja = i + 1;
    bool on  = relayState[i];
    uint32_t sec = tableTimer[i];

    String timerStr = "&nbsp;";
    if (on && sec > 0) {
      timerStr = String(sec / 60) + "m " + String(sec % 60) + "s sisa";
    } else if (on) {
      timerStr = "Bebas";
    }

    String onCmd  = "/api/relay?meja=" + String(meja) + "&status=ON";
    String offCmd = "/api/relay?meja=" + String(meja) + "&status=OFF";
    String btnHref = on ? offCmd : onCmd;
    String btnTxt  = on ? "&#9646; MATIKAN" : "&#9654; NYALAKAN";
    String btnCls  = on ? "btn btn-off" : "btn btn-on";

    h += "<div class='card " + String(on ? "on" : "off") + "'>";
    h += "<span class='dot'></span>";
    h += "<div class='lbl'>MEJA</div>";
    h += "<div class='num'>" + String(meja) + "</div>";
    h += "<div class='tmr'>" + timerStr + "</div>";
    // Fetch background dan reload, tanpa navigasi JSON
    h += "<a href='" + btnHref + "' class='" + btnCls + "' onclick='fetch(this.href);setTimeout(()=>location.reload(),300);return false;'>" + btnTxt + "</a>";
    h += "</div>";
  }

  h +=
      "</div>"
      "<div class='nav'>"
      "<a href='/'>&#9881; Konfigurasi</a>"
      "<a href='/update'>&#128260; OTA Update</a>"
      "<a href='/dashboard'>&#9889; Dashboard</a>"
      "</div>"
      "<script>"
      "function fmt(s){if(s<=0)return'Bebas';var m=Math.floor(s/60);return "
      "m+'m '+(s%60)+'s sisa';}"
      "</script>"
      "<p style='text-align:center;font-size:10px;color:#334155;margin-top:10px'>"
      "Mode Standalone &mdash; bekerja tanpa koneksi server VOC</p>"
      "</body></html>";

  server.send(200, "text/html", h);
}

// ─────────────────────────────────────────────────────────────
// mDNS + WEB SERVICES — Init saat WiFi pertama kali terhubung
// ─────────────────────────────────────────────────────────────

void startWebServices() {
  if (webServicesStarted)
    return;

  // Hostname unik dari 4 digit terakhir MAC
  String lastFour = deviceMac.substring(deviceMac.length() - 4);
  lastFour.toLowerCase();
  mdnsHostname = "voc-panel-" + lastFour;

  // — Start mDNS —
  if (MDNS.begin(mdnsHostname.c_str())) {
    MDNS.addService("http", "tcp", 80);
    Serial.println("\n╔══════════════════════════════════════════════╗");
    Serial.println("║      mDNS + WEB SERVICES ACTIVE ✅            ║");
    Serial.println("╠══════════════════════════════════════════════╣");
    Serial.printf("║  🏷️  Hostname : %-28s║\n",
                  (mdnsHostname + ".local").c_str());
    Serial.printf("║  🌐 Portal   : http://%-22s║\n",
                  (mdnsHostname + ".local").c_str());
    Serial.printf("║  🔄 OTA      : http://%-22s║\n",
                  (mdnsHostname + ".local/update").c_str());
    Serial.printf("║  🔌 API      : http://%-22s║\n",
                  (mdnsHostname + ".local/api/status").c_str());
    Serial.println("╚══════════════════════════════════════════════╝\n");
  } else {
    Serial.println("[mDNS] ⚠️ GAGAL start mDNS. Gunakan IP: " +
                   WiFi.localIP().toString());
    mdnsHostname = WiFi.localIP().toString(); // Fallback ke IP
  }

  // — Register Web Routes —
  server.on("/", handleRoot);
  server.on("/scan", handleScan);
  server.on("/save", HTTP_POST, handleSave);
  server.on("/saved", HTTP_GET, handleSaved);        // ✅ Halaman sukses (PRG)
  server.on("/do-reboot", HTTP_GET, handleDoReboot); // 🔄 Trigger restart
  server.on("/api/status", HTTP_GET, handleApiStatus);
  server.on("/api/relay", HTTP_GET, handleApiRelay);
  server.on("/dashboard", HTTP_GET, handleDashboard); // ⚡ Dashboard Darurat
  server.onNotFound([]() {
    server.sendHeader("Location", "/", true);
    server.send(302, "text/plain", "");
  });

  // — ElegantOTA (route: /update) —
  ElegantOTA.begin(&server);

  server.begin();
  webServicesStarted = true;

  // Info awal via Serial Monitor
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║     VOC ESP32 — Serial Monitor       ║");
  Serial.println("╠══════════════════════════════════════╣");
  Serial.print("║  MAC    : ");
  Serial.println(deviceMac);
  Serial.print("║  IP     : ");
  Serial.println(WiFi.localIP().toString());
  Serial.print("║  Relays : ");
  Serial.println(String(num_relays));
  Serial.println("║  Ketik 'help' di Serial Monitor      ║");
  Serial.println("╚══════════════════════════════════════╝");
}

// ─────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n=== BOOTING ESP32 — v18.6 PREMIUM PORTAL ===");

  // 🛡️ 1. LOAD CONFIGURATION
  loadSettings();

  // 🛡️ 2. EMERGENCY PORTAL TRIGGER (Hold Mode Switch 5 seconds)
  pinMode(pin_mode_switch, INPUT_PULLUP);
  pinMode(0, INPUT_PULLUP); // 🛡️ Inisialisasi Tombol BOOT (GPIO 0)
  if (digitalRead(pin_mode_switch) == LOW || strlen(ssid) == 0) {
    Serial.println("[SYSTEM] Trigger Portal detected...");
    startPortal();
  }

  // 🛡️ 3. DYNAMIC GPIO INIT
  pinMode(pin_led_wifi, OUTPUT);
  pinMode(pin_buzzer, OUTPUT);
  pinMode(pin_transistor, OUTPUT);
  digitalWrite(pin_led_wifi, LOW);
  digitalWrite(pin_buzzer, LOW);
  digitalWrite(pin_transistor, LOW);

  // 🛡️ 4. I2C & DYNAMIC PCF INIT
  Wire.begin(21, 22);
  Wire.setClock(400000); // 🚀 I2C Fast Mode untuk respon instan

  // 3. Mount SPIFFS & restore state
  if (SPIFFS.begin(true)) {
    loadFromSPIFFS();
  }

  Serial.printf("[HARDWARE] Initializing %d PCF modules...\n", num_pcf_modules);
  for (int i = 0; i < num_pcf_modules; i++) {
    pcfModules[i] = new PCF8575(pcfAddresses[i]);

    // Pre-emptively set the correct state directly via I2C before the library
    // does anything This prevents any "flash" or all lamps turning on due to
    // library default behaviors.
    uint16_t initialState = 0;
    for (int p = 0; p < 16; p++) {
      int globalIdx = (i * 16) + p;
      bool s = relayState[globalIdx];
      bool pinLevel = pcf_active_low ? !s : s;
      if (pinLevel)
        initialState |= (1 << p);
    }
    Wire.beginTransmission(pcfAddresses[i]);
    Wire.write(initialState & 0xFF);
    Wire.write(initialState >> 8);
    Wire.endTransmission();

    pcfModules[i]->begin();
    for (int p = 0; p < 16; p++) {
      int globalIdx = (i * 16) + p;
      bool s = relayState[globalIdx];
      bool pinLevel = pcf_active_low ? !s : s;
      pcfModules[i]->write(p, pinLevel ? HIGH : LOW);
      relayTarget[globalIdx] = s;
    }
  }

  // 🛡️ 5. MODE & MASTER RELAY
  modeOtomatis = (digitalRead(pin_mode_switch) == HIGH);
  if (modeOtomatis) {
    digitalWrite(pin_transistor, HIGH);
    Serial.println("[HARDWARE] Auto Mode: Master Relay Active.");
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
  sprintf(macStr, "%02X%02X%02X%02X%02X%02X", baseMac[0], baseMac[1],
          baseMac[2], baseMac[3], baseMac[4], baseMac[5]);
  deviceMac = String(macStr);
  baseTopic = "billiard/table/" + deviceMac;

  Serial.printf("[DEVICE] MAC Address : %s\n", deviceMac.c_str());
  Serial.printf("[DEVICE] Base Topic  : %s\n", baseTopic.c_str());
  Serial.printf("[DEVICE] Mode        : %s\n",
                modeOtomatis ? "OTOMATIS" : "MANUAL");

  // 🛡️ 9. NETWORK & MQTT (Only if not in Portal Mode)
  if (!isConfigMode) {
    client.setKeepAlive(120);
    client.setSocketTimeout(15); // Increased for stability
    client.setBufferSize(4096);  // 🚀 Increased for multi-table batch status
    // ℹ️ Server di-set saat connect (via resolveMqttHost) agar support mDNS
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

    // 🛡️ Aktifkan ESP-NOW Hybrid Mode
    if (esp_now_init() == ESP_OK) {
      esp_now_register_recv_cb(OnDataRecv);
      uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
      esp_now_peer_info_t peer = {};
      memcpy(peer.peer_addr, bc, 6);
      peer.ifidx = WIFI_IF_STA;
      esp_now_add_peer(&peer);
      Serial.println("[ESP-NOW] Hybrid Mode Active & Listening...");
    } else {
      Serial.println("[ESP-NOW] Init Failed!");
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("[WiFi] Connected! IP: %s\n",
                    WiFi.localIP().toString().c_str());
      startDoubleBuzzer();
      startWebServices(); // 🌐 Init mDNS + Web OTA + WebSerial + REST API
    } else {
      Serial.println("[WiFi] Connection failed. Will retry in loop().");
    }
  }

  Serial.println("\n=== PCF8575 PANEL NODE READY ===");
  Serial.printf("Daftarkan panel ini di Admin → Manajemen Meja\n");
  Serial.printf("  MAC Address : %s\n", deviceMac.c_str());
  Serial.printf("  Relay Count : %d channel\n", num_relays);
  if (isConfigMode)
    Serial.println("  STATUS      : 🛠️ CONFIG MODE (PORTAL ACTIVE)");
  Serial.println("================================\n");
}

// ─────────────────────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────────────────────

void loop() {
  esp_task_wdt_reset();
  unsigned long now = millis();
  updateBuzzer();

  // 🔄 PRG Reboot: Restart terjadwal setelah redirect /saved selesai dimuat
  // browser
  if (pendingReboot && now >= rebootAt) {
    Serial.println("[SYSTEM] Reboot terjadwal dieksekusi...");
    delay(100);
    ESP.restart();
  }

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
    digitalWrite(pin_led_wifi, (now / 500) % 2);
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
  }

  // 🛡️ 3. NETWORK HANDLING
  if (WiFi.status() == WL_CONNECTED) {
    handleMqttConnection();
    client.loop();

    // 🌐 Web Services (mDNS + Portal + OTA + WebSerial + REST API)
    if (webServicesStarted) {
      server.handleClient();
      ElegantOTA.loop();
    } else {
      startWebServices(); // 🌐 Retry init saat WiFi reconnect setelah putus
    }

    // 🚀 LED INDICATOR (v18.7):
    // Solid ON = All Systems OK (WiFi + MQTT)
    // Fast Blink (100ms) = WiFi Connected but MQTT Failed (Check Broker/IP)
    // Slow Blink (500ms) = WiFi Connecting...
    if (client.connected()) {
      digitalWrite(pin_led_wifi, HIGH);
    } else {
      digitalWrite(pin_led_wifi, (now / 100) % 2);
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
    digitalWrite(pin_led_wifi, (now / 500) % 2 == 0 ? HIGH : LOW);
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
    bool anyStop = false;
    for (int i = 0; i < num_relays; i++) {
      if (relayState[i] && tableTimer[i] > 0) {
        tableTimer[i]--;

        // 🚀 Trigger blink 2x jika waktu tersisa persis sama dengan alert time
        if (tableAlertTime[i] > 0 && tableTimer[i] == tableAlertTime[i]) {
          relayBlinkCount[i] = 4; // 4 transisi (OFF -> ON -> OFF -> ON)
          relayBlinkTimer[i] = now;
          pcfWrite(i, false); // Matikan seketika untuk memulai kedipan
        }

        if (tableTimer[i] == 0) {
          pcfWrite(i, false);
          relayState[i] = false;
          relayTarget[i] = false;
          anyStop = true;
          startBuzzer(1000);
        }
      }
    }
    if (anyStop)
      publishStatus();
  }

  // 🛡️ 5.1 NON-BLOCKING RELAY BLINKER
  for (int i = 0; i < num_relays; i++) {
    if (relayBlinkCount[i] > 0) {
      if (now - relayBlinkTimer[i] >= 800) { // Durasi tiap kedipan: 800ms
        relayBlinkTimer[i] = now;
        relayBlinkCount[i]--;

        if (relayBlinkCount[i] > 0) {
          bool isOff = (relayBlinkCount[i] % 2 == 0);
          pcfWrite(i, !isOff);
        } else {
          // Kedipan selesai, kembalikan ke state aslinya (ON)
          pcfWrite(i, relayTarget[i]);
        }
      }
    }
  }

  // 🛡️ 6. GHOST FIX (Every 10s)
  if (modeOtomatis && (now - lastPcfVerify > 10000)) {
    lastPcfVerify = now;
    for (int i = 0; i < num_relays; i++) {
      int pcfIndex = i / 16;
      int pcfPin = i % 16;
      if (pcfModules[pcfIndex]->read(pcfPin) !=
          (pcf_active_low ? !relayTarget[i] : relayTarget[i])) {
        pcfWrite(i, relayTarget[i]);
      }
    }
  }
}

void publishHeartbeat() {
  String htopic = baseTopic + "/heartbeat";
  String hpayload = "{\"uptime\":" + String(millis() / 1000) +
                    ",\"rssi\":" + String(WiFi.RSSI()) +
                    ",\"hwType\":\"PCF8575\"}";
  client.publish(htopic.c_str(), hpayload.c_str());
}
