/*
 * ESP32 MQTT Client — MOC3062 Single Table Mode
 * VOC SYSTEM (Spot On Billiard)
 *
 * Arsitektur: 1 ESP32 per meja billiard
 * Hardware  : MOC3062 (optocoupler) → TRIAC BTA16 → Lampu 220V AC
 *
 * Topologi: WiFi MQTT langsung (tidak pakai ESP-NOW)
 * Gunakan firmware ini jika setiap meja dipasang 1 ESP32 + MOC3062 secara
 * mandiri.
 *
 * Perbedaan dari firmware PCF8575 (panel konvensional):
 *  - Tidak ada PCF8575, Wire.h, atau komunikasi I2C
 *  - 1 pin GPIO langsung kontrol MOC3062 (default GPIO4)
 *  - Pin configurable via SPIFFS (/moc_config.json) & MQTT /config/set
 *  - 1 ESP = 1 meja = 1 MAC Address = 1 relay channel
 *
 * Fitur:
 *  1. Identifikasi device via MAC Address (otomatis, tanpa konfigurasi manual)
 *  2. MQTT Topics identik dengan firmware lain (berbasis MAC)
 *  3. PIN Control MOC bisa dikonfigurasi runtime via MQTT /config/set
 *  4. State persistence via SPIFFS (tahan reboot / power restore)
 *  5. Hardware Watchdog 30 detik
 *  6. WiFi auto-reconnect (full cycle jika 30s masih putus)
 *  7. MQTT LWT (Last Will & Testament) — server tahu instant jika offline
 *  8. MQTT Keep-Alive 120s + Heartbeat 60s (publish ke /heartbeat)
 *  9. Buzzer feedback (GPIO19)
 * 10. OTA update siap (dinonaktifkan by default, aktifkan jika butuh)
 *
 * WIRING:
 *  GPIO4  (D4)  → Anoda MOC3062 (via 220Ω resistor) → TRIAC BTA16 gate → Lampu
 * 220V GPIO2  (D2)  → LED indikator WiFi (onboard biasanya) GPIO19 (D19) →
 * Buzzer aktif-high
 *
 * TOPIK MQTT:
 *  Subscribe: billiard/table/{MAC}/#
 *  Publish  : billiard/table/{MAC}/status      (telemetry, retain=true)
 *           : billiard/table/{MAC}/heartbeat   (60s ping)
 *           : billiard/table/sync              (saat boot, minta state dari
 * server)
 */

#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <DNSServer.h>   // 🆕 Captive Portal
#include <Preferences.h> // 🆕 NVM Flash Storage
#include <PubSubClient.h>
#include <SPIFFS.h>
#include <WebServer.h> // 🆕 Web Portal
#include <WiFi.h>
#include <esp_efuse.h>
#include <esp_mac.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
#include <esp_wifi.h>

// ─────────────────────────────────────────────────────────────
// KONFIGURASI JARINGAN & MQTT (Sekarang dinamis via Portal)
// ─────────────────────────────────────────────────────────────
char ssid[33] = "";
char password[65] = "";
char mqtt_server[40] = "";
int mqtt_port = 1883;

// Global objects for Portal
WebServer server(80);
DNSServer dnsServer;
Preferences preferences;
bool isConfigMode = false;
const byte DNS_PORT = 53;

// ─────────────────────────────────────────────────────────────
// PIN HARDWARE DEFAULT
// ─────────────────────────────────────────────────────────────
#define PIN_LED_WIFI 8 // LED Biru Onboard ESP32-C3 SuperMini (GPIO8, Active LOW)
#define PIN_BUZZER 6   // Buzzer aktif-high
#define PIN_BUTTON 9   // Tombol manual (BOOT button pada devkit)

// Pin MOC3062 bisa berbeda tiap modul, dibaca dari SPIFFS
// Default = GPIO4 (D4), bisa diubah via MQTT /config/set
int mocPin = 7;

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
bool MOC_ACTIVE_LOW = true; // Sekarang dinamis, bisa diubah via Portal

// ─────────────────────────────────────────────────────────────
// STATE & VARIABEL GLOBAL
// ─────────────────────────────────────────────────────────────
WiFiClient espClient;
PubSubClient client(espClient);

String deviceMac =
    ""; // MAC Address tanpa pemisah, uppercase (e.g. "AABBCCDDEEFF")
String baseTopic = ""; // billiard/table/{deviceMac}

bool lightState = false;   // Status lampu saat ini
bool isManualMode = false; // Flag jika dinyalakan manual via tombol
bool storageDirty = false;
unsigned long lastStateChange = 0;
unsigned long latestToken = 0; // 🛡️ SESSION LOCK (v17.2)
const unsigned long STORAGE_SAVE_DELAY =
    3000; // Tunda simpan ke SPIFFS 3s setelah perubahan

// Flag: ganti pin MOC perlu re-apply state setelah callback selesai
// (tidak dilakukan langsung di callback untuk menghindari crash)
bool pendingPinChange = false;
int pendingNewPin = -1;

// Race condition protection (tidak matikan lampu dalam window ini kecuali
// force=true)
unsigned long lightProtectedUntil = 0;

// LED Feedback
unsigned long commandFeedbackUntil = 0;

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

const unsigned long STATUS_INTERVAL = 20000; // Telemetry tiap 20s (Fast Sync)
uint32_t failsafeSeconds = 0;       // 🛡️ Sisa detik bermain (Hardware Failsafe)
unsigned long lastFailsafeTick = 0; // Tracking detik berjalan
uint8_t lastErrorCode = 0;          // 0: OK, 16: Hardware Auto-Stop
const unsigned long HEARTBEAT_INTERVAL = 30000; // Heartbeat tiap 30s
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
  buzzerBeepsRemaining = 2;
  buzzerState = true;
  buzzerToneDuration = 150;
  buzzerPauseDuration = 150;
  digitalWrite(PIN_BUZZER, HIGH);
  buzzerNextToggle = millis() + 150;
}

void startLongBuzzer() { // Indikator masuk mode Portal
  buzzerBeepsRemaining = 1;
  buzzerState = true;
  buzzerToneDuration = 2000;
  digitalWrite(PIN_BUZZER, HIGH);
  buzzerNextToggle = millis() + 2000;
}

// ─────────────────────────────────────────────────────────────
// CONFIGURATION PERSISTENCE (NVM via Preferences)
// ─────────────────────────────────────────────────────────────

void loadSettings() {
  preferences.begin("voc-config", true); // Mode RO

  String s_ssid = preferences.getString("ssid", "");
  String s_pass = preferences.getString("pass", "");
  String s_mqtt = preferences.getString("mqtt", "");
  mqtt_port = preferences.getInt("port", 1883);
  mocPin = preferences.getInt("mocPin", 4);
  MOC_ACTIVE_LOW = preferences.getBool("activeLow", true);

  s_ssid.toCharArray(ssid, 33);
  s_pass.toCharArray(password, 65);
  s_mqtt.toCharArray(mqtt_server, 40);

  preferences.end();

  Serial.println("[CONFIG] Settings loaded from memory.");
}

void saveSettings(const char *s, const char *p, const char *m, int pt, int mp,
                  bool al) {
  preferences.begin("voc-config", false); // Mode RW
  preferences.putString("ssid", s);
  preferences.putString("pass", p);
  preferences.putString("mqtt", m);
  preferences.putInt("port", pt);
  preferences.putInt("mocPin", mp);
  preferences.putBool("activeLow", al);
  preferences.end();
  Serial.println("[CONFIG] Settings saved successfully.");
}

void factoryReset() {
  preferences.begin("voc-config", false);
  preferences.clear();
  preferences.end();
  Serial.println("[CONFIG] All settings cleared! Rebooting...");
  startLongBuzzer();
  delay(2100);
  ESP.restart();
}

// ─────────────────────────────────────────────────────────────
// WEB PORTAL (Captive Portal UI)
// ─────────────────────────────────────────────────────────────

String getHeader() {
  return "<!DOCTYPE html><html><head>"
         "<meta charset='UTF-8'><meta name='viewport' "
         "content='width=device-width, initial-scale=1.0'>"
         "<link "
         "href='https://fonts.googleapis.com/"
         "css2?family=Outfit:wght@300;400;600;800&display=swap' "
         "rel='stylesheet'>"
         "<style>"
         ":root{--p:#3b82f6;--s:#10b981;--bg:#020617;--glass:rgba(255,255,255,"
         "0.03);}"
         "body{font-family:'Outfit',sans-serif;margin:0;padding:0;background:"
         "radial-gradient(circle at 0% 0%, #1e1b4b 0%, #020617 "
         "100%);color:#f8fafc;min-height:100vh;display:flex;justify-content:"
         "center;align-items:center;overflow-x:hidden;}"
         "*{box-sizing:border-box;transition:all 0.3s "
         "cubic-bezier(0.4,0,0.2,1);}"
         ".container{width:90%;max-width:440px;opacity:0;transform:translateY("
         "20px);animation:f 0.6s forwards;}"
         "@keyframes f{to{opacity:1;transform:translateY(0);}}"
         ".card{background:rgba(15,23,42,0.6);backdrop-filter:blur(20px);-"
         "webkit-backdrop-filter:blur(20px);border-radius:32px;padding:40px;"
         "border:1px solid rgba(255,255,255,0.08);box-shadow:0 25px 50px -12px "
         "rgba(0,0,0,0.5);position:relative;overflow:hidden;}"
         ".card::before{content:'';position:absolute;top:0;left:0;width:100%;"
         "height:4px;background:linear-gradient(90deg,var(--p),#818cf8);}"
         "h1{font-weight:800;font-size:28px;margin:0 0 "
         "8px;letter-spacing:-1px;display:flex;align-items:center;gap:12px;}"
         "h1 svg{color:var(--p);}"
         ".mac-chip{display:inline-flex;align-items:center;padding:6px "
         "14px;background:rgba(255,255,255,0.05);border-radius:100px;font-size:"
         "11px;font-weight:600;color:#94a3b8;margin-bottom:30px;border:1px "
         "solid rgba(255,255,255,0.05);}"
         ".field{margin-bottom:24px;}"
         "label{display:flex;align-items:center;gap:8px;font-size:11px;font-"
         "weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1."
         "5px;margin-bottom:10px;}"
         "input,select{width:100%;background:rgba(255,255,255,0.03);border:1px "
         "solid rgba(255,255,255,0.1);border-radius:16px;padding:14px "
         "18px;color:white;font-size:15px;outline:none;}"
         "input:focus{border-color:var(--p);background:rgba(59,130,246,0.05);"
         "box-shadow:0 0 0 4px rgba(59,130,246,0.1);}"
         "button{width:100%;background:linear-gradient(135deg,var(--p),#2563eb)"
         ";color:white;border:none;padding:18px;border-radius:18px;font-weight:"
         "800;font-size:15px;cursor:pointer;margin-top:10px;box-shadow:0 10px "
         "20px -5px rgba(59,130,246,0.4);}"
         "button:hover{transform:translateY(-2px);box-shadow:0 15px 25px -5px "
         "rgba(59,130,246,0.5);}"
         ".done-icon{width:64px;height:64px;background:rgba(16,185,129,0.1);"
         "color:var(--s);border-radius:50%;display:flex;align-items:center;"
         "justify-content:center;margin:0 auto 20px;}"
         ".summary-box{background:rgba(0,0,0,0.2);border-radius:20px;padding:"
         "20px;margin:20px 0;border:1px solid rgba(255,255,255,0.03);}"
         ".sum-row{display:flex;justify-content:space-between;padding:10px "
         "0;border-bottom:1px solid rgba(255,255,255,0.03);font-size:13px;}"
         ".sum-row:last-child{border:0;}"
         ".sum-val{font-weight:700;color:var(--p);}"
         ".pass-group{position:relative;display:flex;align-items:center;}"
         ".eye-btn{position:absolute;right:15px;background:none;border:none;"
         "color:#64748b;cursor:pointer;padding:0;box-shadow:none;width:auto;"
         "margin:0;}"
         ".scan-btn{font-size:10px;font-weight:700;padding:4px "
         "10px;background:rgba(59,130,246,0.1);color:var(--p);border:1px solid "
         "rgba(59,130,246,0.2);border-radius:8px;cursor:pointer;margin-left:"
         "auto;box-shadow:none;width:auto;margin-top:0;}"
         "#scan-results{margin-top:10px;background:rgba(0,0,0,0.2);border-"
         "radius:12px;overflow:hidden;max-height:0;transition:max-height 0.4s "
         "ease;}"
         "#scan-results.open{max-height:200px;overflow-y:auto;border:1px solid "
         "rgba(255,255,255,0.05);}"
         ".scan-item{padding:12px 18px;border-bottom:1px solid "
         "rgba(255,255,255,0.03);cursor:pointer;display:flex;justify-content:"
         "space-between;align-items:center;font-size:14px;}"
         ".scan-item:hover{background:rgba(59,130,246,0.1);}"
         "</style>"
         "<script>"
         "function togglePass(){"
         "  var x=document.getElementById('p');"
         "  x.type=x.type==='password'?'text':'password';"
         "}"
         "function scanWiFi(){"
         "  var r=document.getElementById('scan-results');"
         "  r.innerHTML='<p "
         "style=\"padding:15px;font-size:12px;color:var(--p);\">Scanning "
         "networks...</p>';"
         "  r.classList.add('open');"
         "  fetch('/scan').then(res=>res.text()).then(html=>{"
         "    r.innerHTML=html;"
         "  });"
         "}"
         "function selectSsid(s){"
         "  document.getElementById('s').value=s;"
         "  document.getElementById('scan-results').classList.remove('open');"
         "}"
         "</script>"
         "</head><body>";
}

void handleRoot() {
  String html = getHeader();
  html += "<div class='container'><div class='card'>";
  html += "<h1><svg width='28' height='28' fill='none' stroke='currentColor' "
          "stroke-width='2.5'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 "
          "10-5M2 12l10 5 10-5'></path></svg> VOC SYSTEM</h1>";
  html += "<div class='mac-chip'>DEVICES MAC: " + deviceMac + "</div>";
  html += "<form action='/save' method='POST'>";

  html += "<div class='field'><label><svg width='12' height='12' fill='none' "
          "stroke='currentColor' stroke-width='2'><path d='M8.5 17.5L2 "
          "15.5l.5-13 13 1 1.5 10.5-8.5 4zm0 0l4-10.5'></path></svg> WIFI "
          "SSID <button type='button' class='scan-btn' "
          "onclick='scanWiFi()'>SCAN</button></label><input id='s' name='s' "
          "value='" +
          String(ssid) +
          "' placeholder='Network Name'><div id='scan-results'></div></div>";
  html += "<div class='field'><label>WIFI PASSWORD</label><div "
          "class='pass-group'><input id='p' name='p' "
          "type='password' value='" +
          String(password) +
          "' placeholder='••••••••'><button type='button' class='eye-btn' "
          "onclick='togglePass()'><svg width='18' height='18' viewBox='0 0 24 "
          "24' fill='none' stroke='currentColor' stroke-width='2' "
          "stroke-linecap='round' stroke-linejoin='round'><path d='M1 12s4-8 "
          "11-8 11 8 11 8-4 8-11 8-11-8-11-8z'></path><circle cx='12' cy='12' "
          "r='3'></circle></svg></button></div></div>";
  html += "<div class='field'><label>MQTT BROKER IP</label><input name='m' "
          "value='" +
          String(mqtt_server) + "' placeholder='192.168.1.xxx'></div>";
  html += "<div class='field'><label>MQTT PORT</label><input name='pt' "
          "type='number' value='" +
          String(mqtt_port) + "'></div>";
  html += "<div class='field'><label>GPIO CONTROL PIN</label><input name='mp' "
          "type='number' value='" +
          String(mocPin) + "'></div>";

  html += "<div class='field'><label>RELAY LOGIC</label><select name='al'>";
  html += "<option value='1' " + String(MOC_ACTIVE_LOW ? "selected" : "") +
          ">Active LOW (Recommended)</option>";
  html += "<option value='0' " + String(!MOC_ACTIVE_LOW ? "selected" : "") +
          ">Active HIGH</option>";
  html += "</select></div>";

  html += "<button type='submit'>APPLY CHANGES</button>";
  html += "</form></div></div></body></html>";
  server.send(200, "text/html", html);
}

void handleScan() {
  Serial.println("[WIFI] Scanning...");
  int n = WiFi.scanNetworks();
  String html = "";
  if (n == 0) {
    html = "<p style='padding:10px;color:#94a3b8;'>No networks found.</p>";
  } else {
    for (int i = 0; i < n; ++i) {
      String ssidName = WiFi.SSID(i);
      int rssi = WiFi.RSSI(i);
      html +=
          "<div class='scan-item' onclick='selectSsid(\"" + ssidName + "\")'>";
      html += "<span>" + ssidName + "</span>";
      html += "<span style='font-size:10px;opacity:0.6;'>" + String(rssi) +
              " dBm</span>";
      html += "</div>";
    }
  }
  WiFi.scanDelete();
  server.send(200, "text/html", html);
}

void handleSave() {
  String s = server.arg("s");
  String p = server.arg("p");
  String m = server.arg("m");
  int pt = server.arg("pt").toInt();
  int mp = server.arg("mp").toInt();
  bool al = server.arg("al") == "1";

  saveSettings(s.c_str(), p.c_str(), m.c_str(), pt, mp, al);

  String html = getHeader();
  html +=
      "<div class='container'><div class='card' style='text-align:center;'>";
  html += "<div class='done-icon'><svg width='32' height='32' fill='none' "
          "stroke='currentColor' stroke-width='3.5'><path d='M20 6L9 "
          "17l-5-5'></path></svg></div>";
  html += "<h1 style='justify-content:center;'>Konfigurasi Tersimpan</h1>";
  html += "<p style='font-size:12px;color:#64748b;margin-bottom:10px;'>Silakan "
          "screenshot halaman ini sebagai arsip.</p>";

  html += "<div class='summary-box'>";
  html += "<div class='sum-row'><span>WIFI SSID</span><span class='sum-val'>" +
          s + "</span></div>";
  html +=
      "<div class='sum-row'><span>MQTT BROKER</span><span class='sum-val'>" +
      m + ":" + String(pt) + "</span></div>";
  html += "<div class='sum-row'><span>GPIO PIN</span><span class='sum-val'>" +
          String(mp) + "</span></div>";
  html +=
      "<div class='sum-row'><span>LOGIK RELAY</span><span class='sum-val'>" +
      String(al ? "LOW" : "HIGH") + "</span></div>";
  html += "</div>";

  html +=
      "<p style='font-weight:600;font-size:13px;color:#818cf8;animation:pulse "
      "2s infinite;'>ESP32 sedang mencoba menghubungkan diri...</p>";
  html += "</div></div></body></html>";

  server.send(200, "text/html", html);
  startDoubleBuzzer();
  delay(5000);
  ESP.restart();
}

void startPortal() {
  isConfigMode = true;
  WiFi.mode(WIFI_AP);
  String apName = "vocBilliard-MOC-" + deviceMac;
  WiFi.softAP(apName.c_str());

  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

  server.on("/", handleRoot);
  server.on("/save", HTTP_POST, handleSave);
  server.on("/scan", handleScan);
  server.onNotFound([]() {
    server.sendHeader("Location", "/", true);
    server.send(302, "text/plain", "");
  });

  server.begin();
  Serial.printf("[PORTAL] Mode AP Aktif: %s\n", apName.c_str());
  Serial.printf("[PORTAL] Akses di http://%s\n",
                WiFi.softAPIP().toString().c_str());
  startLongBuzzer();
}

// ─────────────────────────────────────────────────────────────
// KONTROL LED (Visual Indicator GPIO2)
// ─────────────────────────────────────────────────────────────

void updateLed() {
  static unsigned long lastTick = 0;
  static int step = 0;
  unsigned long now = millis();
  
  // 1. Pola 3x (Menerima Perintah) - Prioritas Tertinggi
  if (now < commandFeedbackUntil) {
    if (now - lastTick > 80) {
      lastTick = now;
      step++;
      digitalWrite(PIN_LED_WIFI, (step % 2 == 0) ? HIGH : LOW);
    }
    return;
  }

  // 2. Pola Portal Mode (Kedip Cepat)
  if (isConfigMode) {
    if (now - lastTick > 100) {
      lastTick = now;
      digitalWrite(PIN_LED_WIFI, !digitalRead(PIN_LED_WIFI));
    }
    return;
  }

  // 3. Pola Terputus (2x Kedip - Jeda)
  if (WiFi.status() != WL_CONNECTED || !client.connected()) {
    if (now - lastTick > 200) {
      lastTick = now;
      step = (step + 1) % 10; // Cycle 10 langkah
      if (step == 0 || step == 2) digitalWrite(PIN_LED_WIFI, LOW); // ON (Active Low)
      else digitalWrite(PIN_LED_WIFI, HIGH); // OFF
    }
    return;
  }

  // 4. Pola Terhubung (Kedip 1 detik)
  if (now - lastTick > 1000) {
    lastTick = now;
    digitalWrite(PIN_LED_WIFI, !digitalRead(PIN_LED_WIFI));
  }
}

bool mqttWarningActive = false; // Flag untuk alarm MQTT
void updateBuzzer() {
  unsigned long now = millis();

  // 1. Prioritas: Beep berurutan (3x on connect, dsb)
  if (buzzerBeepsRemaining > 0 && now >= buzzerNextToggle) {
    buzzerBeepsRemaining--;
    if (buzzerBeepsRemaining == 0) {
      digitalWrite(PIN_BUZZER, LOW);
      buzzerState = false;
    } else {
      buzzerState = !buzzerState;
      digitalWrite(PIN_BUZZER, buzzerState ? HIGH : LOW);
      buzzerNextToggle =
          now + (buzzerState ? buzzerToneDuration : buzzerPauseDuration);
    }
    return;
  }

  // 2. Alarm MQTT (Jika WiFi OK tapi MQTT Putus)
  if (mqttWarningActive && !isConfigMode && WiFi.status() == WL_CONNECTED) {
    static unsigned long lastWarn = 0;
    if (now - lastWarn > 2000) { // Bunyi setiap 2 detik
      lastWarn = now;
      startBuzzer(100); // Beep pendek
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
  doc["failsafeSeconds"] = failsafeSeconds; // Simpan sisa waktu

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
  if (doc.containsKey("failsafeSeconds")) {
    failsafeSeconds = doc["failsafeSeconds"].as<uint32_t>();
    Serial.printf("[SPIFFS] Failsafe Timer dimuat: %u detik\n",
                  failsafeSeconds);
  }
}

// ─────────────────────────────────────────────────────────────
// MQTT — Publish Status Telemetry
// ─────────────────────────────────────────────────────────────

void publishStatus() {
  if (!client.connected())
    return;

  String topic = baseTopic + "/status";
  DynamicJsonDocument doc(512);
  doc["status"] = lightState ? "ON" : "OFF";
  doc["online"] = true;
  doc["uptime"] = millis() / 1000;
  doc["rssi"] = WiFi.RSSI();
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["ip"] = WiFi.localIP().toString();
  doc["mac"] = deviceMac;
  doc["lightState"] = lightState;
  doc["relayPin"] = mocPin;
  doc["token"] = latestToken; // 🛡️ Report back current token
  doc["hwType"] = "MOC3062";
  doc["mode"] = isManualMode ? "MANUAL" : "AUTO";
  doc["errorCode"] = lastErrorCode; // 🛡️ Report if hardware just auto-stopped
  doc["remainingSeconds"] = failsafeSeconds;

  // Reset error code setelah dikirim agar tidak "nempel" selamanya
  if (lastErrorCode != 0)
    lastErrorCode = 0;

  // Kompatibilitas dengan server yang mengharapkan array "relays"
  JsonArray relays = doc.createNestedArray("relays");
  relays.add(lightState);

  char buf[512];
  serializeJson(doc, buf);
  client.publish(topic.c_str(), buf, true); // retain=true

  Serial.printf("[MQTT] ↑ Status published: Light=%s, Mode=%s, RSSI=%d\n",
                lightState ? "ON" : "OFF", isManualMode ? "MANUAL" : "AUTO",
                WiFi.RSSI());

  // ✅ Dual-publish ke billiard/heartbeat/{mac} agar Backend deteksi Online
  String htopic = "billiard/heartbeat/" + deviceMac;
  client.publish(htopic.c_str(), buf); // Payload sama, tanpa retain
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
          Serial.printf(
              "[SYNC] mocPin berubah: %d → %d, wajib re-apply state\n", mocPin,
              serverPin);
          // Matikan pin lama dulu dengan benar
          bool offLevel = MOC_ACTIVE_LOW ? HIGH : LOW;
          pinMode(mocPin, OUTPUT);
          digitalWrite(mocPin, offLevel);
          // Ganti pin
          mocPin = serverPin;
          pinChanged = true;
          storageDirty = true;
          lastStateChange = millis();
        }
      }

      // Ambil sisa waktu jika ada (Hydration dari server)
      if (t.containsKey("remainingMinutes")) {
        failsafeSeconds = t["remainingMinutes"].as<uint32_t>() * 60;
        storageDirty = true;
        Serial.printf("[SYNC] Failsafe Timer diatur: %u detik\n",
                      failsafeSeconds);
      }

      // Apply state jika berbeda ATAU jika pin baru (perlu inisialisasi)
      if (lightState != targetState || pinChanged) {
        setLight(targetState);
        storageDirty = true;
        lastStateChange = millis();
        startBuzzer(400);
        Serial.printf("[SYNC] State diterapkan ke GPIO%d: %s%s\n", mocPin,
                      targetState ? "ON" : "OFF",
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
    latestToken = doc["token"] | 0; // 🛡️ Capture token
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
    // Command dari server selalu meriset manual mode kembali ke AUTO
    isManualMode = false;
    commandFeedbackUntil = millis() + 1000; // Feedback LED
    publishStatus(); // 🚀 Kirim status segera agar backend verifikasi token

    // 🛡️ Update Failsafe Timer (v17.5.1)
    if (activate) {
      // Jika ada duration (Prepaid) -> Set Timer. Jika tidak ada (Open Table)
      // -> Reset ke 0
      failsafeSeconds = (doc["duration"] | 0) * 60;
      storageDirty = true;
      if (failsafeSeconds > 0) {
        Serial.printf("[TIMER] Failsafe dimulai: %u detik\n", failsafeSeconds);
      } else {
        Serial.println("[TIMER] Mode Open Table (Tanpa Auto-Stop)");
      }
    } else {
      failsafeSeconds = 0;
      storageDirty = true;
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

  String clientId = "SpotOn-MOC-" + deviceMac;
  String lwtTopic = baseTopic + "/status";

  Serial.printf("[MQTT] Menghubungi broker %s:%d...\n", mqtt_server, mqtt_port);

  client.setKeepAlive(15); // 🛡️ Fast Disconnect Detection (v17.5)
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

    // 🔊 Konfirmasi Connect: 3x Beep
    mqttWarningActive = false;
    buzzerBeepsRemaining = 6; // 3x Toggle (On/Off)
    buzzerState = true;
    buzzerToneDuration = 100;
    buzzerPauseDuration = 100;
    digitalWrite(PIN_BUZZER, HIGH);
    buzzerNextToggle = millis() + 100;

  } else {
    int rc = client.state();
    Serial.printf("[MQTT] Gagal (rc=%d). Retry 8s lagi.\n", rc);
    mqttWarningActive = true; // Aktifkan alarm jika gagal konek ke server
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
  bool safeOffLevel = MOC_ACTIVE_LOW ? HIGH : LOW;
  digitalWrite(mocPin, safeOffLevel); // Tulis state ke register DULU
  pinMode(mocPin, OUTPUT);            // Baru ubah ke OUTPUT (mencegah glitch LOW)

  Serial.begin(115200);
  Serial.println("\n\n=== BOOTING ESP32 — MOC30xx SINGLE TABLE MODE ===");
  Serial.println("VOC Billiard System | Hybrid IoT");
  Serial.println("=================================================");

  // 1. Pin dasar
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  
  digitalWrite(PIN_LED_WIFI, HIGH); // Tulis state DULU
  pinMode(PIN_LED_WIFI, OUTPUT);    // Baru jadikan output

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
  // 5. Baca MAC Address (untuk baseTopic & client ID)
  uint8_t baseMac[6];
  esp_efuse_mac_get_default(baseMac);
  char macStr[13];
  sprintf(macStr, "%02X%02X%02X%02X%02X%02X", baseMac[0], baseMac[1],
          baseMac[2], baseMac[3], baseMac[4], baseMac[5]);
  deviceMac = String(macStr);
  baseTopic = "billiard/table/" + deviceMac;

  // 6. Muat Konfigurasi dari NVM
  loadSettings();

  Serial.printf("[DEVICE] MAC Address : %s\n", deviceMac.c_str());
  Serial.printf("[DEVICE] Base Topic  : %s\n", baseTopic.c_str());
  Serial.printf("[DEVICE] MOC Control : GPIO%d\n", mocPin);

  // 7. Inisialisasi MOC Pin dengan logika yang tepat (RESTORE STATE DARI MEMORI)
  bool bootPinLevel = MOC_ACTIVE_LOW ? !lightState : lightState;
  digitalWrite(mocPin, bootPinLevel ? HIGH : LOW); // TULIS STATE DULU!
  pinMode(mocPin, OUTPUT);                         // BARU OUTPUT!

  // 8. Putuskan mode: WiFi atau Portal
  WiFi.onEvent(onWifiEvent);

  if (strlen(ssid) == 0) {
    Serial.println("[SYSTEM] SSID Kosong. Masuk Mode Portal Konfigurasi...");
    startPortal();
  } else {
    WiFi.mode(WIFI_STA);
    esp_wifi_set_ps(WIFI_PS_NONE); // 🛡️ Matikan hemat daya agar responsif dan tidak tiba-tiba offline
    WiFi.setAutoReconnect(true);
    WiFi.begin(ssid, password);
    Serial.printf("[WiFi] Mencoba menyambung ke SSID '%s'...\n", ssid);

    int retry = 0;
    while (WiFi.status() != WL_CONNECTED && retry < 15) {
      delay(500);
      Serial.print(".");
      retry++;
    }
    Serial.println();

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println(
          "[WiFi] Gagal konek cepat. Masuk Mode Portal Konfigurasi...");
      startPortal();
    } else {
      Serial.printf("[WiFi] Terhubung! IP: %s\n",
                    WiFi.localIP().toString().c_str());
      startDoubleBuzzer();
    }
  }

  // 9. MQTT setup (Hanya relevan jika tidak dalam Mode Portal)
  if (!isConfigMode) {
    client.setKeepAlive(120);
    client.setSocketTimeout(10);
    client.setBufferSize(1024);
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);
  }

  // 10. Watchdog 30 detik
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(5, 0, 0)
  esp_task_wdt_config_t wdt_cfg = {
      .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true};
  esp_task_wdt_reconfigure(&wdt_cfg);
#else
  esp_task_wdt_init(30, true);
#endif
  esp_task_wdt_add(NULL);

  Serial.println("\n=== MOC3062 NODE READY ===");
  Serial.println("=========================\n");
}

// ─────────────────────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────────────────────

void loop() {
  esp_task_wdt_reset();
  unsigned long now = millis();

  updateBuzzer();
  updateLed(); // 💡 Indikator Visual GPIO2

  // ── Mode Konfigurasi ───────────────────────────────────────
  if (isConfigMode) {
    dnsServer.processNextRequest();
    server.handleClient();
    return; // Loncat ke loop berikutnya, jangan jalankan Mqtt
  }

  // ── Handle Push Button (Multi-function) ────────────────────
  // ESP32-C3 SuperMini: GPIO9 = Tombol BOOT (active LOW)
  // - Klik singkat (<1.5s)  : Manual toggle lampu
  // - Tahan 2-5s            : Buzzer peringatan (masih bisa dibatalkan)
  // - Tahan >5s             : HARD RESET (hapus semua config NVM + reboot)
  static unsigned long btnHoldStartTime = 0;
  static bool lastBtnState = HIGH;
  static bool warnBeepSent = false; // Flag: sudah bunyi peringatan 2s?
  bool currentBtnState = digitalRead(PIN_BUTTON);

  if (currentBtnState == LOW) {
    if (btnHoldStartTime == 0) {
      btnHoldStartTime = now;
      warnBeepSent = false;
    }

    unsigned long heldMs = now - btnHoldStartTime;

    // ⚠️ PERINGATAN di 2 detik: 3x Beep cepat (masih bisa dibatalkan)
    if (heldMs > 2000 && !warnBeepSent) {
      warnBeepSent = true;
      buzzerBeepsRemaining = 6; // 3x Toggle = 3 beep
      buzzerState = true;
      buzzerToneDuration = 80;
      buzzerPauseDuration = 80;
      digitalWrite(PIN_BUZZER, HIGH);
      buzzerNextToggle = now + 80;
      Serial.println("[BUTTON] ⚠️ Tahan terus 3 detik lagi untuk HARD RESET...");
    }

    // 🔴 HARD RESET di 5 detik
    if (heldMs > 5000) {
      Serial.println("[BUTTON] 🔴 HARD RESET! Menghapus semua konfigurasi...");
      // Matikan lampu dulu sebelum reset
      setLight(false);
      // Bunyi panjang tanda reset
      digitalWrite(PIN_BUZZER, HIGH);
      delay(1500);
      digitalWrite(PIN_BUZZER, LOW);
      delay(300);
      // Hapus semua NVM
      preferences.begin("voc-config", false);
      preferences.clear();
      preferences.end();
      // Hapus SPIFFS
      SPIFFS.format();
      Serial.println("[BUTTON] ✅ NVM & SPIFFS bersih. Restarting...");
      delay(500);
      ESP.restart();
    }

  } else {
    // 🖱️ KLIK BIASA: Manual Toggle (handle saat tombol dilepas)
    if (lastBtnState == LOW && btnHoldStartTime > 0 && (now - btnHoldStartTime < 1500)) {
      isManualMode = true;
      setLight(!lightState);
      storageDirty = true;
      lastStateChange = now;
      startBuzzer(150);
      Serial.printf("[BUTTON] Klik! Mode: MANUAL, Lampu: %s\n",
                    lightState ? "ON" : "OFF");
      publishStatus();
    }
    btnHoldStartTime = 0;
    warnBeepSent = false;
  }
  lastBtnState = currentBtnState;

  if (WiFi.status() == WL_CONNECTED) {
    // MQTT reconnect & loop
    handleMqttConnection();
    client.loop();

    // ── Telemetry tiap 30s ───────────────────────────────────
    if (client.connected() && (now - lastStatusUpdate > STATUS_INTERVAL)) {
      lastStatusUpdate = now;
      publishStatus();
    }

    // ── Heartbeat tiap 30s ke billiard/heartbeat/{mac} ─────────
    if (client.connected() && (now - lastHeartbeat > HEARTBEAT_INTERVAL)) {
      lastHeartbeat = now;
      String htopic = "billiard/heartbeat/" + deviceMac;
      DynamicJsonDocument hdoc(256);
      hdoc["online"] = true;
      hdoc["uptime"] = millis() / 1000;
      hdoc["rssi"] = WiFi.RSSI();
      hdoc["hwType"] = "MOC3062";
      hdoc["lightState"] = lightState;
      hdoc["status"] = lightState ? "ON" : "OFF";
      hdoc["relayPin"] = mocPin;
      hdoc["mode"] = isManualMode ? "MANUAL" : "AUTO";
      char hbuf[256];
      serializeJson(hdoc, hbuf);
      client.publish(htopic.c_str(), hbuf);
      Serial.printf("[MQTT] Heartbeat terkirim ke %s\n", htopic.c_str());
    }

  } else {
    if (now - lastWifiCheck > WIFI_FULL_RECONNECT) {
      lastWifiCheck = now;
      Serial.println("[WiFi] Belum tersambung, coba full reconnect...");
      WiFi.disconnect(true);
      delay(500);
      WiFi.begin(ssid, password);
    }
  }

  // ── 🛡️ FAILS-SAFE HARDWARE TIMER (v17.5) ──────────────────
  if (lightState && failsafeSeconds > 0) {
    if (now - lastFailsafeTick >= 1000) {
      lastFailsafeTick = now;
      failsafeSeconds--;

      // Update storage setiap 30 detik agar tidak boros flash
      if (failsafeSeconds % 30 == 0)
        storageDirty = true;

      if (failsafeSeconds == 0) {
        Serial.println(
            "[TIMER] ⏰ Failsafe Triggered! Mematikan lampu mandiri...");
        setLight(false);
        lastErrorCode = 16; // Code for 'Safe Stop'
        storageDirty = true;
        lastStateChange = now;
        startBuzzer(1000); // Buzzer panjang tanda waktu habis
        publishStatus();   // Segera lapor ke server
      }
    }
  } else if (!lightState) {
    failsafeSeconds = 0;
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
