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

#include <time.h>
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

// ─── OLED & ENCODER ──────────────────────────────────────────────
#include <U8g2lib.h>

// Layar OLED ukuran > 1 inch biasanya menggunakan chip SH1106, bukan SSD1306.
// Jika layar masih acak, ubah U8G2_SH1106_... menjadi U8G2_SSD1306_...
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/U8X8_PIN_NONE);

// ─── WEB SERIAL CUSTOM ───────────────────────────────────────────
const int LOG_BUFFER_SIZE = 4096;
char logBuffer[LOG_BUFFER_SIZE];
int logHead = 0;
int logTail = 0;
bool logFull = false;

extern bool needOledUpdate;
String oledLogLines[5] = {"", "", "", "", ""};
String currentOledLine = "";

class DualSerialWrapper : public Print {
public:
  void begin(unsigned long baud) { Serial.begin(baud); }
  int available() { return Serial.available(); }
  int read() { return Serial.read(); }
  int peek() { return Serial.peek(); }
  void flush() { Serial.flush(); }
  
  void addToBuffer(uint8_t c) {
    logBuffer[logHead] = (char)c;
    logHead = (logHead + 1) % LOG_BUFFER_SIZE;
    if (logFull) {
      logTail = (logTail + 1) % LOG_BUFFER_SIZE;
    }
    if (logHead == logTail) {
      logFull = true;
    }
    
    // OLED Log logic
    if (c == '\n') {
      for(int i=0; i<4; i++) oledLogLines[i] = oledLogLines[i+1];
      oledLogLines[4] = currentOledLine;
      currentOledLine = "";
      needOledUpdate = true;
    } else if (c != '\r') {
      if (currentOledLine.length() >= 23) { // Batas layar OLED (wrap teks)
        for(int i=0; i<4; i++) oledLogLines[i] = oledLogLines[i+1];
        oledLogLines[4] = currentOledLine;
        currentOledLine = "";
        needOledUpdate = true;
      }
      currentOledLine += (char)c;
    }
  }

  size_t write(uint8_t c) override {
    Serial.write(c);
    addToBuffer(c);
    return 1;
  }
  size_t write(const uint8_t *buffer, size_t size) override {
    size_t n = Serial.write(buffer, size);
    for(size_t i=0; i<n; i++) addToBuffer(buffer[i]);
    return n;
  }
};
DualSerialWrapper DualSerial;
#define Serial DualSerial

String getLogBuffer() {
  String s = "";
  s.reserve(LOG_BUFFER_SIZE + 1);
  if (logFull) {
    for (int i = logTail; i < LOG_BUFFER_SIZE; i++) s += logBuffer[i];
    for (int i = 0; i < logHead; i++) s += logBuffer[i];
  } else {
    for (int i = 0; i < logHead; i++) s += logBuffer[i];
  }
  return s;
}

#define ENC_A 32
#define ENC_B 33
#define ENC_BTN 25
#define BTN_CONFIRM 26
#define BTN_BACK 27

volatile int encoderPos = 0;
volatile bool encoderA_Prev = false;
int lastEncoderPos = 0;
int currentMenuSelection = 0;
bool needOledUpdate = true;
unsigned long lastButtonPress = 0;
unsigned long lastOledDraw = 0;

enum UIState {
  STATE_MAIN_MENU,
  STATE_RELAY_CONTROL,
  STATE_TIME_SELECTION,
  STATE_SCREEN_SETTINGS,
  STATE_IDLE_TIME_SELECTION,
  STATE_RESTART_SELECTION,
  STATE_PASSWORD_INPUT,
  STATE_LOCK_CONFIRMATION,
  STATE_NETWORK_INFO,
  STATE_SYSTEM_INFO,
  STATE_SCREENSAVER,
  STATE_CUSTOM_TIME_INPUT
};
UIState currentUIState = STATE_MAIN_MENU;
int mainMenuSelection = 0;
const int NUM_MAIN_MENU_ITEMS = 5;

int lockConfirmSelection = 1; // 0 = Ya, 1 = Tidak
int timeMenuSelection = 0;
int customTimeDigitPos = 0;
int enteredCustomTime[6] = {0, 0, 0, 0, 0, 0};
int pinDigitPos = 0;

int enteredPin[4] = {0, 0, 0, 0};
int expectedPinLength = 4;
String expectedPinCode = "";
UIState stateAfterPin = STATE_MAIN_MENU;
int selectedTableForTimer = 0;

int screenMenuSelection = 0;
int idleTimeMenuSelection = 0;

int restartMenuSelection = 0;
int systemInfoPage = 0;

bool enableScreensaver = true;
int idleMode = 1;       // 0 = Logo VOC, 1 = Jam Digital
int idleTimeout = 15;   // Waktu idle (detik)
int timeZoneOffset = 7; // 7 = WIB, 8 = WITA, 9 = WIT

unsigned long lastActivityTime = 0;
unsigned long lastPinEncoderMoveTime = 0;
float ssProgress = 0.0;
bool ssIncreasing = true;

// Variabel untuk Toast Popup
bool showToast = false;
String toastMessage = "";
unsigned long toastEndTime = 0;

void IRAM_ATTR readEncoder() {
  bool encA = digitalRead(ENC_A);
  bool encB = digitalRead(ENC_B);
  if (encA != encoderA_Prev) {
    if (encA == encB) {
      encoderPos++;
    } else {
      encoderPos--;
    }
    encoderA_Prev = encA;
  }
}
// ─────────────────────────────────────────────────────────────

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
String tablePinCode = "";

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

// 🔥 ATUR JUMLAH MEJA DI SINI 🔥
// Ubah angka ini sesuai jumlah meja fisik yang Anda miliki (contoh: 6)
#define JUMLAH_MEJA 10
int num_relays = JUMLAH_MEJA;

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
unsigned long apiOverrideUntil[128] = {
    0};                             // 🛡️ Blokir MQTT ON setelah REST API action
uint32_t tableTimer[128] = {0};     // 🛡️ Sisa waktu per meja (detik)
uint32_t tableAlertTime[128] = {0}; // 🛡️ Waktu alert per meja (detik)
uint8_t relayBlinkCount[128] = {0}; // Sisa transisi blink
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

  // Baca konfigurasi Jumlah Meja dari memory, default ke JUMLAH_MEJA
  num_relays = preferences.getInt("nRel", JUMLAH_MEJA);
  
  // Baca konfigurasi Screensaver, default ON (true)
  enableScreensaver = preferences.getBool("pScr", true);
  idleMode = preferences.getInt("iMod", 1);    // Default Jam Digital
  idleTimeout = preferences.getInt("iTo", 15); // Default 15 detik
  timeZoneOffset = preferences.getInt("tZ", 7);
  tablePinCode = preferences.getString("pPin", "");

  preferences.end();
  Serial.println("[CONFIG] Settings hydrated from memory.");
}

void saveSettings(String s, String p, String m, int pt, String ph, int pm,
                  int pl, int pr, int pb, bool al, int nr, int tz, String pin) {
  preferences.begin("voc-config", false);
  preferences.putString("pPin", pin);
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
  preferences.putInt("nRel", nr);
  preferences.putInt("tZ", tz);
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
  h += "<div class='field'><label>JUMLAH MEJA DIPAKAI</label><input name='nr' "
       "type='number' value='" +
       String(num_relays) + "'></div>";
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
  h += "<div class='field'><label>ZONA WAKTU (TIMEZONE)</label><select "
       "name='tz'><option value='7' " +
       String(timeZoneOffset == 7 ? "selected" : "") +
       ">WIB (UTC+7)</option><option value='8' " +
       String(timeZoneOffset == 8 ? "selected" : "") +
       ">WITA (UTC+8)</option><option value='9' " +
       String(timeZoneOffset == 9 ? "selected" : "") +
       ">WIT (UTC+9)</option></select></div>";
  h += "<div class='field'><label>PIN KONTROL MEJA (Kosongkan jika bebas)</label><input name='pin' "
       "type='number' placeholder='Misal: 1234' value='" +
       tablePinCode + "'></div>";
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
               server.arg("al") == "1", server.arg("nr").toInt(),
               server.arg("tz").toInt(), server.arg("pin"));

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

      toastMessage = String("MEJA ") + String(pinIndex + 1) + " MATI!";
      showToast = true;
      toastEndTime = millis() + 3000;
      needOledUpdate = true;
      // Tidak mengubah currentUIState agar tidak mem-bypass layar kunci
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
                    
      toastMessage = String("MEJA ") + String(pinIndex + 1) + (isExtend ? " EXTEND!" : " AKTIF!");
      showToast = true;
      toastEndTime = millis() + 3000;
      needOledUpdate = true;
      // Tidak mengubah currentUIState agar tidak mem-bypass layar kunci
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
  Serial.printf("[REST API] GET /api/status → 200 OK (%d bytes)\n",
                buf.length());
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
  String ipStr = WiFi.localIP().toString();
  String rssiStr = String(WiFi.RSSI()) + "dBm";
  bool mqttOk = client.connected();
  String mqttTxt = mqttOk ? "MQTT OK" : "MQTT Putus";
  String mqttCls = mqttOk ? "ok" : "err";
  String heapStr = String(ESP.getFreeHeap() / 1024) + "KB free";
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
      "<div class='sub'>STANDALONE &mdash; " +
      deviceMac +
      "</div>"
      "</div>"
      "<div class='info'>"
      "<span class='badge'>" +
      ipStr +
      "</span>"
      "<span class='badge'>" +
      rssiStr +
      "</span>"
      "<span class='badge " +
      mqttCls + "'>" + mqttTxt +
      "</span>"
      "<span class='badge'>" +
      heapStr +
      "</span>"
      "</div>"
      "</div>"
      "<div class='sb'>&#8635; Auto-refresh 8s | Uptime: " +
      uptimeStr +
      "</div>"
      "<div class='grid'>";

  // ── Server-side render tiap relay ──
  for (int i = 0; i < num_relays; i++) {
    int meja = i + 1;
    bool on = relayState[i];
    uint32_t sec = tableTimer[i];

    String timerStr = "&nbsp;";
    if (on && sec > 0) {
      timerStr = String(sec / 60) + "m " + String(sec % 60) + "s sisa";
    } else if (on) {
      timerStr = "Bebas";
    }

    String onCmd = "/api/relay?meja=" + String(meja) + "&status=ON";
    String offCmd = "/api/relay?meja=" + String(meja) + "&status=OFF";
    String btnHref = on ? offCmd : onCmd;
    String btnTxt = on ? "&#9646; MATIKAN" : "&#9654; NYALAKAN";
    String btnCls = on ? "btn btn-off" : "btn btn-on";

    h += "<div class='card " + String(on ? "on" : "off") + "'>";
    h += "<span class='dot'></span>";
    h += "<div class='lbl'>MEJA</div>";
    h += "<div class='num'>" + String(meja) + "</div>";
    h += "<div class='tmr'>" + timerStr + "</div>";
    // Fetch background dan reload, tanpa navigasi JSON
    h += "<a href='" + btnHref + "' class='" + btnCls +
         "' "
         "onclick='fetch(this.href);setTimeout(()=>location.reload(),300);"
         "return false;'>" +
         btnTxt + "</a>";
    h += "</div>";
  }

  h += "</div>"
       "<div class='nav'>"
       "<a href='/'>&#9881; Konfigurasi</a>"
       "<a href='/update'>&#128260; OTA Update</a>"
       "<a href='/dashboard'>&#9889; Dashboard</a>"
       "<a href='/webserial'>&#128240; Web Serial</a>"
       "</div>"
       "<script>"
       "function fmt(s){if(s<=0)return'Bebas';var m=Math.floor(s/60);return "
       "m+'m '+(s%60)+'s sisa';}"
       "</script>"
       "<p "
       "style='text-align:center;font-size:10px;color:#334155;margin-top:10px'>"
       "Mode Standalone &mdash; bekerja tanpa koneksi server VOC</p>"
       "</body></html>";

  server.send(200, "text/html", h);
}

void handleWebSerial() {
  String h = "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
             "<title>VOC Web Serial</title>"
             "<meta name='viewport' content='width=device-width,initial-scale=1'>"
             "<link href='https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Outfit:wght@400;700&display=swap' rel='stylesheet'>"
             "<style>"
             "body{background:#0f172a;color:#cbd5e1;font-family:'Outfit',sans-serif;margin:0;padding:0;height:100vh;display:flex;flex-direction:column;overflow:hidden;}"
             ".header{background:rgba(15,23,42,0.9);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,0.05);padding:12px 20px;display:flex;justify-content:space-between;align-items:center;z-index:10;box-shadow:0 4px 20px rgba(0,0,0,0.3);}"
             ".title{font-weight:700;font-size:16px;color:#3b82f6;display:flex;align-items:center;gap:8px;}"
             ".controls{display:flex;gap:10px;}"
             "button,.btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#e2e8f0;padding:6px 12px;border-radius:8px;cursor:pointer;font-family:'Outfit',sans-serif;font-size:12px;font-weight:600;transition:0.2s;text-decoration:none;display:inline-block;}"
             "button:hover,.btn:hover{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);}"
             "button.active{background:rgba(16,185,129,0.15);border-color:#10b981;color:#10b981;}"
             ".btn-danger:hover{background:rgba(239,68,68,0.15);border-color:#ef4444;color:#ef4444;}"
             "#log-container{flex:1;overflow-y:auto;padding:20px;background:#020617;}"
             "#log{font-family:'Fira Code',monospace;font-size:13px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;color:#10b981;}"
             "</style></head><body>"
             "<div class='header'><div class='title'>&#9889; VOC Serial Monitor</div>"
             "<div class='controls'>"
             "<button id='btn-scroll' class='active' onclick='toggleScroll()'>Autoscroll: ON</button>"
             "<button class='btn-danger' onclick='clearLog()'>Clear</button>"
             "<a href='/dashboard' class='btn'>Back</a>"
             "</div></div>"
             "<div id='log-container'><div id='log'>" + getLogBuffer() + "</div></div>"
             "<script>"
             "var autoScroll=true;var logCont=document.getElementById('log-container');var logEl=document.getElementById('log');"
             "function toggleScroll(){autoScroll=!autoScroll;var btn=document.getElementById('btn-scroll');if(autoScroll){btn.className='active';btn.innerText='Autoscroll: ON';scrollToBottom();}else{btn.className='';btn.innerText='Autoscroll: OFF';}}"
             "function clearLog(){fetch('/api/logs/clear').then(()=>{logEl.innerText='';});}"
             "function scrollToBottom(){logCont.scrollTop=logCont.scrollHeight;}"
             "logCont.addEventListener('scroll',function(){if(logCont.scrollTop+logCont.clientHeight<logCont.scrollHeight-30){if(autoScroll)toggleScroll();}});"
             "setInterval(()=>{fetch('/api/logs').then(r=>r.text()).then(t=>{logEl.innerText=t;if(autoScroll)scrollToBottom();})}, 1500);"
             "window.onload=scrollToBottom;"
             "</script></body></html>";
  server.send(200, "text/html", h);
}

void handleApiLogs() {
  server.send(200, "text/plain", getLogBuffer());
}

void handleApiLogsClear() {
  logHead = 0;
  logTail = 0;
  logFull = false;
  for(int i=0; i<5; i++) oledLogLines[i] = "";
  currentOledLine = "";
  needOledUpdate = true;
  server.send(200, "text/plain", "OK");
}

// ─────────────────────────────────────────────────────────────
// mDNS + WEB SERVICES — Init saat WiFi pertama kali terhubung
// ─────────────────────────────────────────────────────────────

void startWebServices() {
  // Init NTP (Sesuai Zona Waktu yang disetting)
  configTime(timeZoneOffset * 3600, 0, "pool.ntp.org", "time.nist.gov");
  
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
  server.on("/webserial", HTTP_GET, handleWebSerial);
  server.on("/api/logs", HTTP_GET, handleApiLogs);
  server.on("/api/logs/clear", HTTP_GET, handleApiLogsClear);
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
// ANIMASI LOGO (SCREENSAVER & BOOT)
// ─────────────────────────────────────────────────────────────
const uint8_t voc_logo_128x64[] PROGMEM = {
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x80, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xff,
    0xff, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x07, 0xff, 0xff, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xff, 0xff, 0xf8, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xf0,
    0x0f, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x01, 0xff, 0x80, 0x01, 0xff, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xf8, 0x00, 0x00, 0x1f, 0xc0, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0xe0, 0x00,
    0x00, 0x07, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x1f, 0x80, 0x00, 0x00, 0x01, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x3f, 0x00, 0x00, 0x00, 0x00, 0xfc, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7c, 0x00, 0x00,
    0x00, 0x00, 0x3e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x0f, 0x80,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xe0, 0x00, 0x00,
    0x00, 0x00, 0x07, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x03, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x03, 0xc0, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x07, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x03, 0xe0,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0x80, 0x00, 0x00,
    0x00, 0x00, 0x01, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x0f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x0f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1e, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x78, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x1e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x78, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x3c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3c,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3c, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x3c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x3c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3e, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x7c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1e,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x78, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x1e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x78, 0x00, 0x00, 0x1f, 0xf8, 0x00, 0x00, 0x1e, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x78, 0x00, 0x00, 0x3f, 0xfc, 0x00, 0x00, 0x0e,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x70, 0x00, 0x00, 0xff,
    0xff, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x70, 0x00, 0x01, 0xff, 0xff, 0x80, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x70, 0x00, 0x01, 0xf0, 0x0f, 0xc0, 0x00, 0x0e,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x00, 0x03, 0xe0,
    0x03, 0xc0, 0x00, 0x0f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0xf0, 0x00, 0x07, 0xc0, 0x03, 0xe0, 0x00, 0x0f, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x70, 0x00, 0x07, 0x80, 0x01, 0xe0, 0x00, 0x0f,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x70, 0x00, 0x0f, 0x80,
    0x01, 0xf0, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x70, 0x00, 0x1f, 0x00, 0x00, 0xf8, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x78, 0x00, 0x1e, 0x01, 0x80, 0x78, 0x00, 0x0e,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x78, 0x00, 0x1e, 0x01,
    0x80, 0x78, 0x00, 0x1e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x78, 0x00, 0x3c, 0x03, 0xc0, 0x3c, 0x00, 0x1e, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x7c, 0x00, 0x7c, 0x07, 0xe0, 0x3e, 0x00, 0x1e,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3c, 0x00, 0x78, 0x07,
    0xe0, 0x1e, 0x00, 0x3e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x3c, 0x00, 0xf8, 0x0f, 0xf0, 0x1f, 0x00, 0x3c, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x3c, 0x00, 0xf0, 0x0f, 0xf0, 0x0f, 0x00, 0x3c,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1e, 0x01, 0xe0, 0x1f,
    0xf8, 0x07, 0x80, 0x78, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x1e, 0x01, 0xe0, 0x1f, 0xf8, 0x07, 0x80, 0x78, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x0c, 0x03, 0xc0, 0x3f, 0xfc, 0x03, 0xc0, 0xf0,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x03, 0xc0, 0x3f,
    0xfc, 0x03, 0xe0, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x07, 0x80, 0x7f, 0xfe, 0x01, 0xe1, 0xf0, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0x80, 0xff, 0xff, 0x01, 0xf3, 0xe0,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0x00, 0xff,
    0xff, 0x00, 0xf3, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x1e, 0x01, 0xff, 0xff, 0x80, 0x7f, 0x80, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x1e, 0x01, 0xff, 0xff, 0x80, 0x7f, 0x80,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3c, 0x03, 0xff,
    0xff, 0xc0, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x3c, 0x03, 0xff, 0xff, 0xc0, 0x3e, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x38, 0x07, 0xff, 0xff, 0xe0, 0x1c, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x0f, 0xff,
    0xff, 0xf0, 0x18, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x0f, 0xff, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xff, 0xff, 0xf8, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xff,
    0xff, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x3f, 0xff, 0xff, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xff, 0xff, 0xf8, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xff,
    0xff, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x80, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00};

void drawLogo(float progress) {
  // progress bergerak 0.0 hingga 1.0 (digunakan untuk efek melayang
  // vertikal/bouncing) tujuannya agar piksel OLED tidak burn-in (mati) jika
  // nyala terlalu lama
  int yOffset = 25 + (int)(15.0 * progress);

  u8g2.setFont(u8g2_font_ncenB14_tr); // Font tebal & besar
  u8g2.setCursor(42, yOffset);
  u8g2.print("VOC");

  u8g2.setFont(u8g2_font_5x8_tf);
  u8g2.setCursor(25, yOffset + 14);
  u8g2.print("BILLIARD SYSTEM");
}

void drawClock() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo, 10)) { // Cek cepat (10ms)
    // Fallback jika waktu belum sinkron
    drawLogo(ssProgress);
    return;
  }
  
  char timeBuf[10];
  strftime(timeBuf, sizeof(timeBuf), "%H:%M", &timeinfo);
  
  char secBuf[5];
  strftime(secBuf, sizeof(secBuf), "%S", &timeinfo);
  
  char dateBuf[20];
  strftime(dateBuf, sizeof(dateBuf), "%d %b %Y", &timeinfo);
  
  // Efek pantul / float pelan agar tidak burn-in
  int yOffset = 15 + (int)(10.0 * ssProgress);
  
  u8g2.setFont(u8g2_font_logisoso24_tn);
  u8g2.setCursor(18, yOffset + 24);
  u8g2.print(timeBuf);
  
  u8g2.setFont(u8g2_font_ncenB10_tr);
  u8g2.setCursor(95, yOffset + 24);
  u8g2.print(secBuf);
  
  u8g2.setFont(u8g2_font_5x8_tf);
  int w = u8g2.getStrWidth(dateBuf);
  u8g2.setCursor(64 - (w/2), yOffset + 40);
  u8g2.print(dateBuf);
}

// ─────────────────────────────────────────────────────────────
// OLED UI RENDERER (STATE MACHINE)
// ─────────────────────────────────────────────────────────────
void updateOLED() {
  u8g2.clearBuffer();

  if (currentUIState == STATE_SCREENSAVER) {
    // --- LAYAR SCREENSAVER ---
    if (idleMode == 0) {
      drawLogo(ssProgress);
    } else {
      drawClock();
    }

    // Update progress animasi (wipe effect up and down)
    if (ssIncreasing) {
      ssProgress += 0.04;
      if (ssProgress >= 1.0) {
        ssProgress = 1.0;
        ssIncreasing = false;
      }
    } else {
      ssProgress -= 0.04;
      if (ssProgress <= 0.0) {
        ssProgress = 0.0;
        ssIncreasing = true;
      }
    }
  } else if (currentUIState == STATE_MAIN_MENU) {
    // --- LAYAR 1: MENU UTAMA ---
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 14);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(35, 10, "MENU UTAMA");

    const char *menuItems[] = {"1. Kontrol Meja", "2. Info Jaringan",
                               "3. Info Sistem", "4. Pengaturan Layar", "5. Restart Alat"};
    u8g2.setFont(u8g2_font_6x10_tf);
    
    int startIndex = 0;
    if (mainMenuSelection >= 4) startIndex = mainMenuSelection - 3;

    for (int i = 0; i < 4; i++) {
      int itemIndex = startIndex + i;
      if (itemIndex >= NUM_MAIN_MENU_ITEMS) break;
      int yPos = 16 + (i * 12);
      if (itemIndex == mainMenuSelection) {
        u8g2.setDrawColor(1);
        u8g2.drawRBox(2, yPos, 124, 11, 2);
        u8g2.setDrawColor(0);
      } else {
        u8g2.setDrawColor(1);
      }
      u8g2.setCursor(6, yPos + 9);
      u8g2.print(menuItems[itemIndex]);
    }
    
    u8g2.setDrawColor(1);
    int trackHeight = 64 - 16;
    int scrollBarHeight = (trackHeight * 4) / NUM_MAIN_MENU_ITEMS;
    int scrollY = 16 + ((trackHeight - scrollBarHeight) * startIndex / (NUM_MAIN_MENU_ITEMS - 4));
    for (int y = 16; y < 64; y += 2)
      u8g2.drawPixel(126, y);
    u8g2.drawBox(125, scrollY, 3, scrollBarHeight);
  } else if (currentUIState == STATE_RELAY_CONTROL) {
    // --- LAYAR 2: KONTROL MEJA ---
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 14);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(30, 10, "KONTROL MEJA");

    int maxVisible = 4;
    int startIndex = 0;
    if (currentMenuSelection >= maxVisible) {
      startIndex = currentMenuSelection - maxVisible + 1;
    }

    u8g2.setFont(u8g2_font_6x10_tf);
    for (int i = 0; i < maxVisible; i++) {
      int itemIndex = startIndex + i;
      if (itemIndex >= num_relays)
        break;

      int yPos = 16 + (i * 12);
      bool isSelected = (itemIndex == currentMenuSelection);

      if (isSelected) {
        u8g2.setDrawColor(1);
        u8g2.drawRBox(2, yPos, 121, 11, 2);
        u8g2.setDrawColor(0);
      } else {
        u8g2.setDrawColor(1);
      }

      u8g2.setCursor(6, yPos + 9);
      u8g2.print("Meja ");
      if (itemIndex + 1 < 10)
        u8g2.print(" ");
      u8g2.print(itemIndex + 1);

      if (relayState[itemIndex]) {
        if (tableTimer[itemIndex] > 0) {
          uint32_t t = tableTimer[itemIndex];
          char buf[12];
          sprintf(buf, "%02lu:%02lu:%02lu", t/3600, (t%3600)/60, t%60);
          u8g2.setCursor(68, yPos + 9);
          u8g2.print(buf);
        } else {
          u8g2.setCursor(92, yPos + 9);
          u8g2.print("  ON ");
        }
      } else {
        u8g2.setCursor(96, yPos + 9);
        u8g2.print(" OFF ");
      }
    }

    // Scrollbar untuk layar kontrol meja
    u8g2.setDrawColor(1);
    if (num_relays > maxVisible) {
      int trackHeight = 64 - 16;
      int scrollBarHeight = (trackHeight * maxVisible) / num_relays;
      if (scrollBarHeight < 5)
        scrollBarHeight = 5;

      int scrollY = 16 + ((trackHeight - scrollBarHeight) * startIndex /
                          (num_relays - maxVisible));
      for (int y = 16; y < 64; y += 2)
        u8g2.drawPixel(126, y);
      u8g2.drawBox(125, scrollY, 3, scrollBarHeight);
    }
  } else if (currentUIState == STATE_TIME_SELECTION) {
    // --- LAYAR SUB-MENU: PILIH WAKTU ---
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 14);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    
    char titleBuf[32];
    sprintf(titleBuf, "PILIH WAKTU - MEJA %d", selectedTableForTimer + 1);
    u8g2.drawStr(5, 10, titleBuf);

    const char *timeMenuItems[] = {"1 Jam", "2 Jam", "3 Jam", "4 Jam", "Bebas (ON)", "Matikan (OFF)", "Custom Waktu"};
    u8g2.setFont(u8g2_font_6x10_tf);
    
    int startIndex = 0;
    if (timeMenuSelection >= 4) startIndex = timeMenuSelection - 3;
    
    for (int i = 0; i < 4; i++) {
      int itemIndex = startIndex + i;
      if (itemIndex >= 7) break;
      
      int yPos = 16 + (i * 12);
      if (itemIndex == timeMenuSelection) {
        u8g2.setDrawColor(1);
        u8g2.drawRBox(2, yPos, 124, 11, 2);
        u8g2.setDrawColor(0);
      } else {
        u8g2.setDrawColor(1);
      }
      u8g2.setCursor(6, yPos + 9);
      u8g2.print(timeMenuItems[itemIndex]);
    }
    
    u8g2.setDrawColor(1);
    // Scrollbar simple
    int trackHeight = 64 - 16;
    int scrollBarHeight = (trackHeight * 4) / 7;
    int scrollY = 16 + ((trackHeight - scrollBarHeight) * startIndex / 3);
    for (int y = 16; y < 64; y += 2)
      u8g2.drawPixel(126, y);
    u8g2.drawBox(125, scrollY, 3, scrollBarHeight);
  } else if (currentUIState == STATE_CUSTOM_TIME_INPUT) {
    // --- LAYAR SUB-MENU: CUSTOM WAKTU ---
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 14);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(25, 10, "MASUKKAN WAKTU");

    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_logisoso24_tn); // Font besar

    // Gambar HH : MM : SS
    int xPositions[6] = { 2, 18, 44, 60, 86, 102 };
    for (int i = 0; i < 6; i++) {
      int curX = xPositions[i];
      
      char digitBuf[2];
      sprintf(digitBuf, "%d", enteredCustomTime[i]);
      u8g2.setCursor(curX, 48);
      u8g2.print(digitBuf);

      if (i == customTimeDigitPos) {
        if ((millis() / 250) % 2 == 0) {
          u8g2.drawBox(curX, 52, 16, 3);
        } else {
          u8g2.drawBox(curX, 52, 16, 1);
        }
      } else {
        u8g2.drawBox(curX, 52, 16, 1);
      }
    }
    
    // Titik dua pemisah berkedip
    u8g2.setFont(u8g2_font_ncenB18_tr);
    if ((millis() / 500) % 2 == 0) {
      u8g2.drawStr(34, 45, ":");
      u8g2.drawStr(76, 45, ":");
    }
  } else if (currentUIState == STATE_SCREEN_SETTINGS) {
    // --- SUB-MENU: PENGATURAN LAYAR ---
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 14);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(20, 10, "PENGATURAN LAYAR");

    char modeBuf[32];
    sprintf(modeBuf, "1. Mode: %s", idleMode == 0 ? "Logo VOC" : "Jam Digital");
    char timeoutBuf[32];
    if (idleTimeout == 0) {
      sprintf(timeoutBuf, "2. Waktu Idle: OFF");
    } else {
      sprintf(timeoutBuf, "2. Waktu Idle: %ds", idleTimeout);
    }
    const char *menuItems[] = {modeBuf, timeoutBuf, "3. Kembali"};
    
    u8g2.setFont(u8g2_font_6x10_tf);
    for (int i = 0; i < 3; i++) {
      int yPos = 16 + (i * 12);
      if (i == screenMenuSelection) {
        u8g2.setDrawColor(1);
        u8g2.drawRBox(2, yPos, 124, 11, 2);
        u8g2.setDrawColor(0);
      } else {
        u8g2.setDrawColor(1);
      }
      u8g2.setCursor(6, yPos + 9);
      u8g2.print(menuItems[i]);
    }
  } else if (currentUIState == STATE_IDLE_TIME_SELECTION) {
    // --- SUB-MENU: WAKTU IDLE ---
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 14);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(15, 10, "PILIH WAKTU IDLE");

    const char *timeItems[] = {"5 Detik", "10 Detik", "15 Detik", "20 Detik", "30 Detik", "60 Detik", "Matikan (OFF)"};
    u8g2.setFont(u8g2_font_6x10_tf);
    
    int startIndex = 0;
    if (idleTimeMenuSelection >= 4) startIndex = idleTimeMenuSelection - 3;
    
    for (int i = 0; i < 4; i++) {
      int itemIndex = startIndex + i;
      if (itemIndex >= 7) break;
      int yPos = 16 + (i * 12);
      if (itemIndex == idleTimeMenuSelection) {
        u8g2.setDrawColor(1);
        u8g2.drawRBox(2, yPos, 124, 11, 2);
        u8g2.setDrawColor(0);
      } else {
        u8g2.setDrawColor(1);
      }
      u8g2.setCursor(6, yPos + 9);
      u8g2.print(timeItems[itemIndex]);
    }
    
    u8g2.setDrawColor(1);
    int trackHeight = 64 - 16;
    int scrollBarHeight = (trackHeight * 4) / 7;
    int scrollY = 16 + ((trackHeight - scrollBarHeight) * startIndex / 3);
    for (int y = 16; y < 64; y += 2)
      u8g2.drawPixel(126, y);
    u8g2.drawBox(125, scrollY, 3, scrollBarHeight);
  } else if (currentUIState == STATE_RESTART_SELECTION) {
    // --- SUB-MENU: RESTART ALAT ---
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 14);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(30, 10, "RESTART ALAT");

    const char *restartItems[] = {"1. Reboot Biasa", "2. Masuk Mode Portal", "3. Batal"};
    u8g2.setFont(u8g2_font_6x10_tf);
    for (int i = 0; i < 3; i++) {
      int yPos = 16 + (i * 12);
      if (i == restartMenuSelection) {
        u8g2.setDrawColor(1);
        u8g2.drawRBox(2, yPos, 124, 11, 2);
        u8g2.setDrawColor(0);
      } else {
        u8g2.setDrawColor(1);
      }
      u8g2.setCursor(6, yPos + 9);
      u8g2.print(restartItems[i]);
    }
  } else if (currentUIState == STATE_PASSWORD_INPUT) {
    // --- LAYAR INPUT PIN ---
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 14);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(25, 10, "MASUKKAN PIN");

    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_logisoso24_tn);
    
    for (int i = 0; i < expectedPinLength; i++) {
      int startX = 64 - ((expectedPinLength * 22) / 2) + 4; 
      int curX = startX + (i * 22);
      
      if (i == pinDigitPos) {
        // Tampilkan angka hanya jika baru saja diputar (kurang dari 800ms)
        if (millis() - lastActivityTime < 800) {
          char digitBuf[2];
          sprintf(digitBuf, "%d", enteredPin[i]);
          u8g2.setCursor(curX, 48);
          u8g2.print(digitBuf);
        } else {
          // Setelah 800ms tidak disentuh, ubah angka yang sedang dipilih jadi titik
          u8g2.drawDisc(curX + 8, 36, 6);
        }
        
        if ((millis() / 250) % 2 == 0) {
          u8g2.drawBox(curX, 52, 16, 3);
        } else {
          u8g2.drawBox(curX, 52, 16, 1);
        }
      } else if (i < pinDigitPos) {
        u8g2.drawDisc(curX + 8, 36, 6);
        u8g2.drawBox(curX, 52, 16, 1);
      } else {
        u8g2.drawBox(curX, 52, 16, 1);
      }
    }
  } else if (currentUIState == STATE_LOCK_CONFIRMATION) {
    // --- KONFIRMASI KUNCI LAYAR ---
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 14);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(25, 10, "KUNCI LAYAR?");

    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_6x10_tf);
    
    // Opsi YA
    if (lockConfirmSelection == 0) {
      u8g2.drawRBox(14, 30, 40, 16, 2);
      u8g2.setDrawColor(0);
    } else {
      u8g2.drawRFrame(14, 30, 40, 16, 2);
      u8g2.setDrawColor(1);
    }
    u8g2.drawStr(25, 42, "YA");
    
    u8g2.setDrawColor(1);
    // Opsi TIDAK
    if (lockConfirmSelection == 1) {
      u8g2.drawRBox(64, 30, 50, 16, 2);
      u8g2.setDrawColor(0);
    } else {
      u8g2.drawRFrame(64, 30, 50, 16, 2);
      u8g2.setDrawColor(1);
    }
    u8g2.drawStr(72, 42, "TIDAK");
  } else if (currentUIState == STATE_NETWORK_INFO) {
    // --- LAYAR 3: INFO JARINGAN ---
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 14);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(25, 10, "INFO JARINGAN");

    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.setCursor(0, 25);
    u8g2.print("WIFI: ");
    u8g2.print(WiFi.SSID());
    u8g2.setCursor(0, 35);
    u8g2.print("IP  : ");
    u8g2.print(WiFi.localIP().toString());
    u8g2.setCursor(0, 45);
    u8g2.print("MQTT: ");
    u8g2.print(client.connected() ? "Terhubung" : "Putus");
    u8g2.setCursor(0, 55);
    u8g2.print("RSSI: ");
    u8g2.print(WiFi.RSSI());
    u8g2.print(" dBm");
  } else if (currentUIState == STATE_SYSTEM_INFO) {
    // --- LAYAR 4: INFO SISTEM ---
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 14);
    u8g2.setDrawColor(0);
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(30, 10, "INFO SISTEM");
    
    // Indikator scroll halaman
    u8g2.setCursor(110, 10);
    u8g2.print(systemInfoPage + 1);
    u8g2.print("/3");

    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_5x8_tf);
    
    if (systemInfoPage == 0) {
      // Halaman 1: Info Hardware
      u8g2.setCursor(0, 25);
      u8g2.print("MAC : ");
      u8g2.print(deviceMac);
      u8g2.setCursor(0, 35);
      u8g2.print("RAM : ");
      u8g2.print(ESP.getFreeHeap() / 1024);
      u8g2.print(" KB Free");
  
      int upMins = millis() / 60000;
      u8g2.setCursor(0, 45);
      u8g2.print("UP  : ");
      u8g2.print(upMins / 60);
      u8g2.print("j ");
      u8g2.print(upMins % 60);
      u8g2.print("m");
      u8g2.setCursor(0, 55);
      u8g2.print("MEJA: ");
      u8g2.print(num_relays);
      u8g2.print(" Aktif");
    } else if (systemInfoPage == 1) {
      // Halaman 2: Info Layanan Web / mDNS
      u8g2.setCursor(0, 25);
      u8g2.print("Host: ");
      u8g2.print(mdnsHostname);
      u8g2.print(".local");
      u8g2.setCursor(0, 35);
      u8g2.print("Web : /");
      u8g2.setCursor(0, 45);
      u8g2.print("OTA : /update");
      u8g2.setCursor(0, 55);
      u8g2.print("API : /api/status");
    } else if (systemInfoPage == 2) {
      // Halaman 3: Serial Monitor Log
      for (int i = 0; i < 5; i++) {
        u8g2.setCursor(0, 24 + (i * 9));
        u8g2.print(oledLogLines[i]);
      }
    }
  }

  // --- LAYAR POPUP NOTIFIKASI (TOAST) ---
  if (showToast) {
    if (millis() > toastEndTime) {
      showToast = false;
      needOledUpdate = true; // Hapus overlay di frame berikutnya
    } else {
      // Gambar background kotak popup
      u8g2.setDrawColor(0);
      u8g2.drawBox(10, 20, 108, 24);
      u8g2.setDrawColor(1);
      u8g2.drawFrame(10, 20, 108, 24);
      u8g2.setFont(u8g2_font_5x8_tf);
      int txtW = u8g2.getStrWidth(toastMessage.c_str());
      u8g2.setCursor(64 - (txtW / 2), 35);
      u8g2.print(toastMessage);
    }
  }

  // --- PERINGATAN WIFI TERPUTUS ---
  if (WiFi.status() != WL_CONNECTED && !isConfigMode) {
    if ((millis() / 500) % 2 == 0) { // Berkedip setiap 500ms
      if (currentUIState == STATE_SCREENSAVER) {
        // Layar idle (background hitam)
        u8g2.setDrawColor(1);
        u8g2.setFont(u8g2_font_ncenB08_tr);
        int w = u8g2.getStrWidth("! WIFI TERPUTUS !");
        u8g2.setCursor(64 - (w / 2), 60);
        u8g2.print("! WIFI TERPUTUS !");
      } else {
        // Layar menu (background bar putih di atas)
        u8g2.setDrawColor(0);
        u8g2.setFont(u8g2_font_5x8_tf);
        u8g2.drawStr(72, 10, "[!] NO WIFI");
      }
    }
  }

  u8g2.sendBuffer();
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
  // Wire.setClock(400000); // 🚀 Dihapus sementara untuk stabilitas OLED

  // ─── INIT OLED & ENCODER ───
  pinMode(ENC_A, INPUT_PULLUP);
  pinMode(ENC_B, INPUT_PULLUP);
  pinMode(ENC_BTN, INPUT_PULLUP);
  pinMode(BTN_CONFIRM, INPUT_PULLUP);
  pinMode(BTN_BACK, INPUT_PULLUP);

  encoderA_Prev = digitalRead(ENC_A);
  attachInterrupt(digitalPinToInterrupt(ENC_A), readEncoder, CHANGE);

  u8g2.begin();

  // ─── ANIMASI LOADING BOOT ───
  for (int i = 0; i <= 100; i += 2) {
    u8g2.clearBuffer();

    // Posisi teks di tengah secara statis saat loading boot
    drawLogo(0.5);

    // Loading bar
    u8g2.drawFrame(14, 58, 100, 4);
    u8g2.drawBox(14, 58, i, 4);

    u8g2.sendBuffer();
    delay(20);
  }
  lastActivityTime = millis();
  // ───────────────────────────

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

  // Lockscreen at boot if PIN is set to exactly 4 digits
  if (tablePinCode.length() == 4 && !isConfigMode) {
    currentUIState = STATE_PASSWORD_INPUT;
    expectedPinLength = 4;
    expectedPinCode = tablePinCode;
    stateAfterPin = STATE_MAIN_MENU;
    pinDigitPos = 0;
    for(int i=0; i<4; i++) enteredPin[i] = 0;
  }
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

  // ─── ENCODER & OLED UI STATE MACHINE ───
  int currentEncPos = encoderPos;
  bool activityDetected = false;

  if (currentEncPos != lastEncoderPos) {
    int diff = currentEncPos - lastEncoderPos;
    if (abs(diff) >= 2) {
      activityDetected = true;
      if (currentUIState == STATE_SCREENSAVER) {
        // Abaikan navigasi saat screensaver, hanya bangunkan layar
      } else if (currentUIState == STATE_MAIN_MENU) {
        if (diff > 0)
          mainMenuSelection++;
        else
          mainMenuSelection--;
        if (mainMenuSelection < 0)
          mainMenuSelection = 0;
        if (mainMenuSelection >= NUM_MAIN_MENU_ITEMS)
          mainMenuSelection = NUM_MAIN_MENU_ITEMS - 1;
      } else if (currentUIState == STATE_RELAY_CONTROL) {
        if (diff > 0)
          currentMenuSelection++;
        else
          currentMenuSelection--;
        if (currentMenuSelection < 0)
          currentMenuSelection = 0;
        if (currentMenuSelection >= num_relays)
          currentMenuSelection = num_relays - 1;
      } else if (currentUIState == STATE_TIME_SELECTION) {
        if (diff > 0)
          timeMenuSelection++;
        else
          timeMenuSelection--;
        if (timeMenuSelection < 0)
          timeMenuSelection = 0;
        if (timeMenuSelection >= 7)
          timeMenuSelection = 6;
      } else if (currentUIState == STATE_SCREEN_SETTINGS) {
        if (diff > 0) screenMenuSelection++;
        else screenMenuSelection--;
        if (screenMenuSelection < 0) screenMenuSelection = 0;
        if (screenMenuSelection >= 3) screenMenuSelection = 2;
      } else if (currentUIState == STATE_IDLE_TIME_SELECTION) {
        if (diff > 0) idleTimeMenuSelection++;
        else idleTimeMenuSelection--;
        if (idleTimeMenuSelection < 0) idleTimeMenuSelection = 0;
        if (idleTimeMenuSelection >= 7) idleTimeMenuSelection = 6;
      } else if (currentUIState == STATE_RESTART_SELECTION) {
        if (diff > 0) restartMenuSelection++;
        else restartMenuSelection--;
        if (restartMenuSelection < 0) restartMenuSelection = 0;
        if (restartMenuSelection >= 3) restartMenuSelection = 2;
      } else if (currentUIState == STATE_SYSTEM_INFO) {
        if (diff > 0) systemInfoPage++;
        else systemInfoPage--;
        if (systemInfoPage < 0) systemInfoPage = 0;
        if (systemInfoPage > 2) systemInfoPage = 2;
      } else if (currentUIState == STATE_PASSWORD_INPUT) {
        if (diff > 0) enteredPin[pinDigitPos]++;
        else enteredPin[pinDigitPos]--;
        if (enteredPin[pinDigitPos] < 0) enteredPin[pinDigitPos] = 9;
        if (enteredPin[pinDigitPos] > 9) enteredPin[pinDigitPos] = 0;
        lastPinEncoderMoveTime = millis();
      } else if (currentUIState == STATE_CUSTOM_TIME_INPUT) {
        if (diff > 0) enteredCustomTime[customTimeDigitPos]++;
        else enteredCustomTime[customTimeDigitPos]--;
        // Aturan waktu HH:MM:SS (Puluhan menit & puluhan detik maks 5)
        if (customTimeDigitPos == 2 || customTimeDigitPos == 4) { 
          if (enteredCustomTime[customTimeDigitPos] < 0) enteredCustomTime[customTimeDigitPos] = 5;
          if (enteredCustomTime[customTimeDigitPos] > 5) enteredCustomTime[customTimeDigitPos] = 0;
        } else {
          if (enteredCustomTime[customTimeDigitPos] < 0) enteredCustomTime[customTimeDigitPos] = 9;
          if (enteredCustomTime[customTimeDigitPos] > 9) enteredCustomTime[customTimeDigitPos] = 0;
        }
      } else if (currentUIState == STATE_LOCK_CONFIRMATION) {
        if (diff > 0) lockConfirmSelection++;
        else lockConfirmSelection--;
        if (lockConfirmSelection < 0) lockConfirmSelection = 0;
        if (lockConfirmSelection > 1) lockConfirmSelection = 1;
      }
      lastEncoderPos = currentEncPos;
      needOledUpdate = true;
    }
  }

  bool confirmPressed =
      (digitalRead(BTN_CONFIRM) == LOW) || (digitalRead(ENC_BTN) == LOW);
  bool backPressed = (digitalRead(BTN_BACK) == LOW);

  if (currentUIState == STATE_PASSWORD_INPUT && lastPinEncoderMoveTime != 0 && (now - lastPinEncoderMoveTime > 1000)) {
    confirmPressed = true;
  }

  if (confirmPressed) {
    lastPinEncoderMoveTime = 0;
  }

  if (confirmPressed || backPressed) {
    activityDetected = true;
  }

  if (activityDetected && currentUIState == STATE_SCREENSAVER) {
    if (tablePinCode.length() == 4 && !isConfigMode) {
      currentUIState = STATE_PASSWORD_INPUT;
      expectedPinLength = 4;
      expectedPinCode = tablePinCode;
      stateAfterPin = STATE_MAIN_MENU;
      pinDigitPos = 0;
      for(int i=0; i<4; i++) enteredPin[i] = 0;
    } else {
      currentUIState = STATE_MAIN_MENU;
    }
    needOledUpdate = true;
    lastActivityTime = now;
    lastButtonPress = now + 300; // Debounce wake up press
    startBuzzer(100);
  } else if (activityDetected) {
    lastActivityTime = now;
  }

  if (backPressed && (now - lastButtonPress > 300) &&
      currentUIState != STATE_SCREENSAVER) {
    lastButtonPress = now;
    if (currentUIState == STATE_TIME_SELECTION) {
      currentUIState = STATE_RELAY_CONTROL; // Kembali ke daftar meja
      needOledUpdate = true;
      startBuzzer(100);
    } else if (currentUIState == STATE_CUSTOM_TIME_INPUT) {
      if (customTimeDigitPos > 0) {
        customTimeDigitPos--;
      } else {
        currentUIState = STATE_TIME_SELECTION; // Batal, kembali ke pilih waktu
      }
      needOledUpdate = true;
      startBuzzer(100);
    } else if (currentUIState == STATE_IDLE_TIME_SELECTION) {
      currentUIState = STATE_SCREEN_SETTINGS; // Kembali ke pengaturan layar
      needOledUpdate = true;
      startBuzzer(100);
    } else if (currentUIState == STATE_RESTART_SELECTION) {
      currentUIState = STATE_MAIN_MENU; // Kembali ke menu utama
      needOledUpdate = true;
      startBuzzer(100);
    } else if (currentUIState == STATE_PASSWORD_INPUT) {
      if (pinDigitPos > 0) {
        pinDigitPos--;
      } else {
        if (expectedPinLength != 4) { // Allow back only if it's table control
          currentUIState = STATE_MAIN_MENU;
        }
      }
      needOledUpdate = true;
      startBuzzer(100);
    } else if (currentUIState == STATE_MAIN_MENU) {
      if (tablePinCode.length() == 4 && !isConfigMode) {
        currentUIState = STATE_LOCK_CONFIRMATION;
        lockConfirmSelection = 1; // Default to Tidak
        needOledUpdate = true;
        startBuzzer(100);
      }
    } else if (currentUIState == STATE_LOCK_CONFIRMATION) {
      currentUIState = STATE_MAIN_MENU;
      needOledUpdate = true;
      startBuzzer(100);
    } else if (currentUIState != STATE_MAIN_MENU) {
      currentUIState = STATE_MAIN_MENU; // Kembali ke menu utama
      needOledUpdate = true;
      startBuzzer(100);
    }
  }

  if (confirmPressed && (now - lastButtonPress > 300) &&
      currentUIState != STATE_SCREENSAVER) {
    lastButtonPress = now;

    if (currentUIState == STATE_MAIN_MENU) {
      if (mainMenuSelection == 0) {
        if (tablePinCode.length() == 4) {
          currentUIState = STATE_PASSWORD_INPUT;
          expectedPinLength = 2;
          expectedPinCode = tablePinCode.substring(2); // last 2 digits
          stateAfterPin = STATE_RELAY_CONTROL;
          pinDigitPos = 0;
          for(int i=0; i<4; i++) enteredPin[i] = 0;
        } else {
          currentUIState = STATE_RELAY_CONTROL;
        }
      }
      else if (mainMenuSelection == 1)
        currentUIState = STATE_NETWORK_INFO;
      else if (mainMenuSelection == 2) {
        currentUIState = STATE_SYSTEM_INFO;
        systemInfoPage = 0;
      } else if (mainMenuSelection == 3) {
        currentUIState = STATE_SCREEN_SETTINGS;
        screenMenuSelection = 0;
      }
      else if (mainMenuSelection == 4) {
        currentUIState = STATE_RESTART_SELECTION;
        restartMenuSelection = 0;
      }
      needOledUpdate = true;
      startBuzzer(100);
    } else if (currentUIState == STATE_LOCK_CONFIRMATION) {
      if (lockConfirmSelection == 0) { // YA (Kunci Layar)
        currentUIState = STATE_PASSWORD_INPUT;
        expectedPinLength = 4;
        expectedPinCode = tablePinCode;
        stateAfterPin = STATE_MAIN_MENU;
        pinDigitPos = 0;
        for(int i=0; i<4; i++) enteredPin[i] = 0;
        startBuzzer(500); // Nada panjang tanda terkunci
      } else { // TIDAK
        currentUIState = STATE_MAIN_MENU;
        startBuzzer(100);
      }
      needOledUpdate = true;
    } else if (currentUIState == STATE_PASSWORD_INPUT) {
      if (pinDigitPos < expectedPinLength - 1) {
        pinDigitPos++;
      } else {
        // Validate PIN
        String enteredStr = "";
        for (int i = 0; i < expectedPinLength; i++) {
          enteredStr += String(enteredPin[i]);
        }
        
        if (enteredStr == expectedPinCode) {
          currentUIState = stateAfterPin;
          startBuzzer(300);
        } else {
          showToast = true;
          toastMessage = "PIN SALAH!";
          toastEndTime = millis() + 2000;
          
          if (expectedPinLength == 4) {
             pinDigitPos = 0;
             for (int i=0; i<4; i++) enteredPin[i] = 0;
          } else {
             currentUIState = STATE_MAIN_MENU;
          }
          startBuzzer(1000); // Error beep
        }
      }
      needOledUpdate = true;
      startBuzzer(100);
    } else if (currentUIState == STATE_RELAY_CONTROL) {
      // Masuk ke menu pemilihan waktu
      selectedTableForTimer = currentMenuSelection;
      currentUIState = STATE_TIME_SELECTION;
      timeMenuSelection = 0; // Default posisi ke 0 (1 Jam)
      needOledUpdate = true;
      startBuzzer(100);
    } else if (currentUIState == STATE_TIME_SELECTION) {
      if (timeMenuSelection == 6) {
        currentUIState = STATE_CUSTOM_TIME_INPUT;
        customTimeDigitPos = 0;
        for (int i = 0; i < 6; i++) enteredCustomTime[i] = 0;
        needOledUpdate = true;
        startBuzzer(100);
      } else {
        bool targetState = false;
        uint32_t durationMin = 0;
        
        if (timeMenuSelection == 0) { targetState = true; durationMin = 60; }
        else if (timeMenuSelection == 1) { targetState = true; durationMin = 120; }
        else if (timeMenuSelection == 2) { targetState = true; durationMin = 180; }
        else if (timeMenuSelection == 3) { targetState = true; durationMin = 240; }
        else if (timeMenuSelection == 4) { targetState = true; durationMin = 0; }
        else if (timeMenuSelection == 5) { targetState = false; durationMin = 0; }
        
        relayState[selectedTableForTimer] = targetState;
        relayTarget[selectedTableForTimer] = targetState;
        if (!targetState) {
          tableTimer[selectedTableForTimer] = 0;
          relayProtectedUntil[selectedTableForTimer] = 0;
        } else {
          tableTimer[selectedTableForTimer] = durationMin * 60;
          relayProtectedUntil[selectedTableForTimer] = now + 500;
          tableAlertTime[selectedTableForTimer] = 5 * 60; // Peringatan sisa 5 menit
        }
        apiOverrideUntil[selectedTableForTimer] = now + 30000;
        pcfWrite(selectedTableForTimer, targetState);
        storageDirty = true;
        lastStateChange = now;

        startBuzzer(targetState ? 300 : 200);
        publishStatus();
        
        // Tampilkan Toast
        if (targetState) {
          toastMessage = String("MEJA ") + String(selectedTableForTimer + 1) + (durationMin > 0 ? " TIMER AKTIF!" : " BEBAS AKTIF!");
        } else {
          toastMessage = String("MEJA ") + String(selectedTableForTimer + 1) + " MATI!";
        }
        showToast = true;
        toastEndTime = now + 3000;
        
        currentUIState = STATE_RELAY_CONTROL; // Kembali ke daftar meja
        needOledUpdate = true;
      }
    } else if (currentUIState == STATE_CUSTOM_TIME_INPUT) {
      if (customTimeDigitPos < 5) {
        customTimeDigitPos++;
        needOledUpdate = true;
        startBuzzer(100);
      } else {
        // Eksekusi Custom Timer (HH:MM:SS)
        uint32_t totalSec = ((enteredCustomTime[0] * 10 + enteredCustomTime[1]) * 3600) + 
                            ((enteredCustomTime[2] * 10 + enteredCustomTime[3]) * 60) + 
                            (enteredCustomTime[4] * 10 + enteredCustomTime[5]);
                            
        bool targetState = (totalSec > 0);
        
        relayState[selectedTableForTimer] = targetState;
        relayTarget[selectedTableForTimer] = targetState;
        if (!targetState) {
          tableTimer[selectedTableForTimer] = 0;
          relayProtectedUntil[selectedTableForTimer] = 0;
        } else {
          tableTimer[selectedTableForTimer] = totalSec;
          relayProtectedUntil[selectedTableForTimer] = now + 500;
          tableAlertTime[selectedTableForTimer] = 5 * 60; // Peringatan sisa 5 menit (jika > 5 menit)
        }
        apiOverrideUntil[selectedTableForTimer] = now + 30000;
        pcfWrite(selectedTableForTimer, targetState);
        storageDirty = true;
        lastStateChange = now;

        startBuzzer(targetState ? 300 : 200);
        publishStatus();
        
        // Tampilkan Toast
        if (targetState) {
          toastMessage = String("MEJA ") + String(selectedTableForTimer + 1) + " TIMER AKTIF!";
        } else {
          toastMessage = String("MEJA ") + String(selectedTableForTimer + 1) + " MATI!";
        }
        showToast = true;
        toastEndTime = now + 3000;
        
        currentUIState = STATE_RELAY_CONTROL; // Kembali ke daftar meja
        needOledUpdate = true;
      }
    } else if (currentUIState == STATE_SCREEN_SETTINGS) {
      if (screenMenuSelection == 0) {
        idleMode = (idleMode == 0) ? 1 : 0;
        preferences.begin("voc-config", false);
        preferences.putInt("iMod", idleMode);
        preferences.end();
      } else if (screenMenuSelection == 1) {
        currentUIState = STATE_IDLE_TIME_SELECTION;
        idleTimeMenuSelection = 0;
      } else if (screenMenuSelection == 2) {
        currentUIState = STATE_MAIN_MENU;
      }
      needOledUpdate = true;
      startBuzzer(100);
    } else if (currentUIState == STATE_IDLE_TIME_SELECTION) {
      int times[] = {5, 10, 15, 20, 30, 60, 0};
      idleTimeout = times[idleTimeMenuSelection];
      preferences.begin("voc-config", false);
      preferences.putInt("iTo", idleTimeout);
      preferences.end();
      
      currentUIState = STATE_SCREEN_SETTINGS;
      needOledUpdate = true;
      startBuzzer(100);
    } else if (currentUIState == STATE_RESTART_SELECTION) {
      if (restartMenuSelection == 0) { // Reboot Biasa
        startBuzzer(1000);
        delay(1500);
        ESP.restart();
      } else if (restartMenuSelection == 1) { // Masuk Mode Portal
        startBuzzer(500);
        delay(500);
        startBuzzer(500);
        startPortal();
      } else { // Batal
        currentUIState = STATE_MAIN_MENU;
        needOledUpdate = true;
        startBuzzer(100);
      }
    }
  }

  // Timeout Screensaver (dapat diatur)
  bool forceScreensaver = (currentUIState == STATE_PASSWORD_INPUT && expectedPinLength == 4 && now - lastActivityTime > 10000);
  if (((idleTimeout > 0 && enableScreensaver && now - lastActivityTime > (idleTimeout * 1000)) || forceScreensaver) && currentUIState != STATE_SCREENSAVER) {
    currentUIState = STATE_SCREENSAVER;
    needOledUpdate = true;
  }

  // Refresh otomatis (berguna untuk update uptime/RSSI di layar Info & Animasi)
  if (currentUIState == STATE_SCREENSAVER) {
    if (now - lastOledDraw > 30) { // ~30 FPS untuk animasi mulus
      updateOLED();
      lastOledDraw = now;
      needOledUpdate = false;
    }
  } else if (needOledUpdate || (now - lastOledDraw > 1000) || (currentUIState == STATE_PASSWORD_INPUT && (now - lastOledDraw > 100))) {
    updateOLED();
    needOledUpdate = false;
    lastOledDraw = now;
  }
  // ─────────────────────────

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
    
    // RENDER OLED UNTUK PORTAL
    if (now - lastOledDraw > 500) {
      u8g2.clearBuffer();
      u8g2.setDrawColor(1);
      u8g2.drawBox(0, 0, 128, 14);
      u8g2.setDrawColor(0);
      u8g2.setFont(u8g2_font_5x8_tf);
      u8g2.drawStr(25, 10, "PORTAL AKTIF");
      
      u8g2.setDrawColor(1);
      u8g2.setFont(u8g2_font_5x8_tf);
      u8g2.drawStr(0, 30, "1. Konek WiFi HP ke:");
      u8g2.setFont(u8g2_font_6x10_tf);
      u8g2.drawStr(10, 42, "VOC-Config");
      
      u8g2.setFont(u8g2_font_5x8_tf);
      u8g2.drawStr(0, 58, "2. Buka: 192.168.4.1");
      
      u8g2.sendBuffer();
      lastOledDraw = now;
    }
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
    uint32_t passedSeconds = (now - lastTimerTick) / 1000;
    lastTimerTick += (passedSeconds * 1000); // 🚀 Anti-drift fix
    bool anyStop = false;
    for (int i = 0; i < num_relays; i++) {
      if (relayState[i] && tableTimer[i] > 0) {
        if (tableTimer[i] >= passedSeconds) {
          tableTimer[i] -= passedSeconds;
        } else {
          tableTimer[i] = 0;
        }

        // 🚀 Trigger blink 2x jika waktu mendekati/melewati alert time
        if (tableAlertTime[i] > 0 && tableTimer[i] <= tableAlertTime[i] && (tableTimer[i] + passedSeconds) > tableAlertTime[i]) {
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
          
          toastMessage = String("WAKTU MEJA ") + String(i + 1) + " HABIS!";
          showToast = true;
          toastEndTime = millis() + 4000;
          needOledUpdate = true;
          
          if (currentUIState == STATE_SCREENSAVER) {
            currentUIState = STATE_RELAY_CONTROL;
            lastActivityTime = millis();
          }
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
