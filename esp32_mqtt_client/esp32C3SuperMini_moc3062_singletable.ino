/*
 * ESP32-C3 Super Mini MQTT Client — MOC3062 Single Table Mode
 * VOC SYSTEM (Spot On Billiard) - ELITE PORTAL VERSION
 */

#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <SPIFFS.h>
#include <WebServer.h>
#include <WiFi.h>
#include <esp_efuse.h>
#include <esp_mac.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
#include <esp_wifi.h>

// ─────────────────────────────────────────────────────────────
// KONFIGURASI HARDWARE (C3 SUPER MINI)
// ─────────────────────────────────────────────────────────────
#define PIN_LED_WIFI 8 // LED C3 Super Mini (Active-LOW)
#define PIN_BUZZER 6   // Buzzer aktif-high
#define PIN_BUTTON 9   // Tombol BOOT pada board C3 Super Mini

// Default (Akan dimuat dari NVM jika sudah disetting)
char ssid[33] = "";
char password[65] = "";
char mqtt_server[40] = "";
int mqtt_port = 1883;
int mocPin = 7;
bool MOC_ACTIVE_LOW = true;

// ─────────────────────────────────────────────────────────────
// STATE & VARIABEL GLOBAL
// ─────────────────────────────────────────────────────────────
WiFiClient espClient;
PubSubClient client(espClient);
WebServer server(80);
DNSServer dnsServer;
Preferences preferences;

String deviceMac = "";
String baseTopic = "";
bool lightState = false;
bool isManualMode = false;
bool isConfigMode = false;
bool storageDirty = false;

unsigned long lastStateChange = 0;
unsigned long lightProtectedUntil = 0;
const unsigned long STORAGE_SAVE_DELAY = 3000;

// Buzzer & LED tracking
int buzzerBeepsRemaining = 0;
bool buzzerState = false;
unsigned long buzzerNextToggle = 0;
unsigned long buzzerToneDuration = 100;
unsigned long buzzerPauseDuration = 100;

unsigned long lastMqttRetry = 0;
unsigned long lastLedBlink = 0;
unsigned long lastStatusUpdate = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastWifiCheck = 0;

const unsigned long STATUS_INTERVAL = 20000;
const unsigned long HEARTBEAT_INTERVAL = 30000;
const unsigned long WIFI_FULL_RECONNECT = 30000;
const byte DNS_PORT = 53;

uint32_t failsafeSeconds = 0;
unsigned long lastFailsafeTick = 0;
uint8_t lastErrorCode = 0;

// ─────────────────────────────────────────────────────────────
// NVM STORAGE (PREFERENCES)
// ─────────────────────────────────────────────────────────────

void loadSettings() {
  preferences.begin("voc-config", true);
  String s_ssid = preferences.getString("ssid", "");
  String s_pass = preferences.getString("pass", "");
  String s_mqtt = preferences.getString("mqtt", "");
  mqtt_port = preferences.getInt("port", 1883);
  mocPin = preferences.getInt("pin", 7);
  MOC_ACTIVE_LOW = preferences.getBool("logic", true);
  lightState = preferences.getBool("state", false);
  failsafeSeconds = preferences.getUInt("failsafe", 0);

  s_ssid.toCharArray(ssid, 33);
  s_pass.toCharArray(password, 65);
  s_mqtt.toCharArray(mqtt_server, 40);
  preferences.end();
  Serial.println("[CONFIG] Settings loaded from NVM.");
}

void saveSettings(const char *s, const char *p, const char *m, int pt, int mp, bool al) {
  preferences.begin("voc-config", false);
  preferences.putString("ssid", s);
  preferences.putString("pass", p);
  preferences.putString("mqtt", m);
  preferences.putInt("port", pt);
  preferences.putInt("pin", mp);
  preferences.putBool("logic", al);
  preferences.end();
  Serial.println("[CONFIG] New settings saved to NVM.");
}

void factoryReset() {
  Serial.println("[SYSTEM] !!! FACTORY RESET TRIGERRED !!!");
  startBuzzer(2000);
  preferences.begin("voc-config", false);
  preferences.clear();
  preferences.end();
  delay(1000);
  ESP.restart();
}

// ─────────────────────────────────────────────────────────────
// BUZZER & LED (C3 SPECIFIC)
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
      buzzerNextToggle = millis() + (buzzerState ? buzzerToneDuration : buzzerPauseDuration);
    }
  }
}

void updateLed() {
  // Logic C3: Terhubung=LOW (Nyala), Putus=HIGH (Mati)
  if (isConfigMode) {
    unsigned long now = millis();
    static unsigned long lastToggle = 0;
    if (now - lastToggle >= 100) { lastToggle = now; digitalWrite(PIN_LED_WIFI, !digitalRead(PIN_LED_WIFI)); }
    return;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PIN_LED_WIFI, LOW); // LED C3 ON (Active-Low)
  } else {
    digitalWrite(PIN_LED_WIFI, HIGH); // LED C3 OFF
  }
}

bool mqttWarningActive = false; 
void updateBuzzer() {
  unsigned long now = millis();
  if (buzzerBeepsRemaining > 0 && now >= buzzerNextToggle) {
    buzzerBeepsRemaining--;
    if (buzzerBeepsRemaining == 0) {
      digitalWrite(PIN_BUZZER, LOW);
      buzzerState = false;
    } else {
      buzzerState = !buzzerState;
      digitalWrite(PIN_BUZZER, buzzerState ? HIGH : LOW);
      buzzerNextToggle = now + (buzzerState ? buzzerToneDuration : buzzerPauseDuration);
    }
    return;
  }

  // Alarm MQTT (Jika WiFi OK tapi MQTT Putus)
  if (mqttWarningActive && !isConfigMode && WiFi.status() == WL_CONNECTED) {
    static unsigned long lastWarn = 0;
    if (now - lastWarn > 2000) { 
      lastWarn = now;
      startBuzzer(100); 
    }
  }
}

// ─────────────────────────────────────────────────────────────
// KONTROL LAMPU
// ─────────────────────────────────────────────────────────────

void setLight(bool on) {
  pinMode(mocPin, OUTPUT);
  bool pinLevel = MOC_ACTIVE_LOW ? !on : on;
  digitalWrite(mocPin, pinLevel ? HIGH : LOW);
  lightState = on;
  Serial.printf("[MOC30xx] Pin%d → %s (Lampu %s)\n", mocPin, pinLevel ? "HIGH" : "LOW", on ? "MENYALA" : "MATI");
}

// ─────────────────────────────────────────────────────────────
// ELITE WEB PORTAL UI
// ─────────────────────────────────────────────────────────────

String getHeader() {
  return "<!DOCTYPE html><html><head>"
         "<meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>"
         "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap' rel='stylesheet'>"
         "<style>"
         ":root{--p:#3b82f6;--s:#10b981;--bg:#020617;--glass:rgba(255,255,255,0.03);}"
         "body{font-family:'Outfit',sans-serif;margin:0;padding:0;background:radial-gradient(circle at 0% 0%, #1e1b4b 0%, #020617 100%);color:#f8fafc;min-height:100vh;display:flex;justify-content:center;align-items:center;}"
         "*{box-sizing:border-box;transition:all 0.3s ease;}"
         ".container{width:90%;max-width:440px;opacity:0;transform:translateY(20px);animation:f 0.6s forwards;}"
         "@keyframes f{to{opacity:1;transform:translateY(0);}}"
         ".card{background:rgba(15,23,42,0.6);backdrop-filter:blur(20px);border-radius:32px;padding:40px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);}"
         "h1{font-weight:800;font-size:24px;margin-bottom:8px;display:flex;align-items:center;gap:10px;}"
         ".mac-chip{display:inline-flex;padding:6px 14px;background:rgba(255,255,255,0.05);border-radius:100px;font-size:11px;color:#94a3b8;margin-bottom:20px;}"
         ".field{margin-bottom:20px;}"
         "label{display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:8px;}"
         "input,select{width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 16px;color:white;outline:none;}"
         "button{width:100%;background:linear-gradient(135deg,var(--p),#2563eb);color:white;border:none;padding:16px;border-radius:14px;font-weight:800;cursor:pointer;margin-top:10px;}"
         ".summary-box{background:rgba(0,0,0,0.2);border-radius:16px;padding:15px;margin:20px 0;}"
         ".sum-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03);font-size:13px;}"
         ".sum-val{font-weight:700;color:var(--p);}"
         ".pass-group{position:relative;display:flex;align-items:center;}"
         ".eye-btn{position:absolute;right:15px;background:none;border:none;color:#64748b;cursor:pointer;}"
         ".scan-btn{font-size:9px;background:rgba(59,130,246,0.1);color:var(--p);border:1px solid rgba(59,130,246,0.2);border-radius:6px;padding:2px 8px;cursor:pointer;}"
         "#scan-results{margin-top:10px;background:rgba(0,0,0,0.2);border-radius:10px;overflow:hidden;max-height:0;transition:max-height 0.4s ease;}"
         "#scan-results.open{max-height:180px;overflow-y:auto;border:1px solid rgba(255,255,255,0.05);}"
         ".scan-item{padding:10px 15px;border-bottom:1px solid rgba(255,255,255,0.03);cursor:pointer;font-size:13px;display:flex;justify-content:space-between;}"
         "</style>"
         "<script>"
         "function togglePass(){var x=document.getElementById('p');x.type=x.type==='password'?'text':'password';}"
         "function scanWiFi(){"
         "  var r=document.getElementById('scan-results');r.innerHTML='<p style=\"padding:10px;font-size:11px;color:var(--p);\">Scanning...</p>';r.classList.add('open');"
         "  fetch('/scan').then(res=>res.text()).then(html=>{r.innerHTML=html;});"
         "}"
         "function selectSsid(s){document.getElementById('s').value=s;document.getElementById('scan-results').classList.remove('open');}"
         "</script></head><body>";
}

void handleRoot() {
  String html = getHeader();
  html += "<div class='container'><div class='card'>";
  html += "<h1>VOC C3 ELITE</h1>";
  html += "<div class='mac-chip'>MAC: " + deviceMac + "</div>";
  html += "<form action='/save' method='POST'>";
  html += "<div class='field'><label>WIFI SSID <span class='scan-btn' onclick='scanWiFi()'>SCAN</span></label><input id='s' name='s' value='" + String(ssid) + "'> <div id='scan-results'></div></div>";
  html += "<div class='field'><label>WIFI PASSWORD</label><div class='pass-group'><input id='p' name='p' type='password' value='" + String(password) + "'><button type='button' class='eye-btn' onclick='togglePass()'>👁</button></div></div>";
  html += "<div class='field'><label>MQTT BROKER</label><input name='m' value='" + String(mqtt_server) + "'></div>";
  html += "<div class='field'><label>MQTT PORT</label><input name='pt' type='number' value='" + String(mqtt_port) + "'></div>";
  html += "<div class='field'><label>GPIO CONTROL</label><input name='mp' type='number' value='" + String(mocPin) + "'></div>";
  html += "<div class='field'><label>LOGIC</label><select name='al'><option value='1' "+String(MOC_ACTIVE_LOW?"selected":"")+">Active LOW</option><option value='0' "+String(!MOC_ACTIVE_LOW?"selected":"")+">Active HIGH</option></select></div>";
  html += "<button type='submit'>SAVE CONFIG</button></form></div></div></body></html>";
  server.send(200, "text/html", html);
}

void handleScan() {
  int n = WiFi.scanNetworks();
  String html = "";
  if (n == 0) { html = "<p style='padding:10px;color:#94a3b8;'>No WiFi found.</p>"; }
  else {
    for (int i = 0; i < n; ++i) {
      String s = WiFi.SSID(i);
      html += "<div class='scan-item' onclick='selectSsid(\""+s+"\")'><span>"+s+"</span><span style='opacity:0.5;'>"+String(WiFi.RSSI(i))+"</span></div>";
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
  html += "<div class='container'><div class='card' style='text-align:center;'>";
  html += "<h2>Tersimpan</h2><div class='summary-box'>";
  html += "<div class='sum-row'><span>SSID</span><span class='sum-val'>"+s+"</span></div>";
  html += "<div class='sum-row'><span>MQTT</span><span class='sum-val'>"+m+"</span></div>";
  html += "</div><p style='font-size:12px;color:var(--p);'>ESP32-C3 Restarting...</p></div></div></body></html>";
  server.send(200, "text/html", html);
  startDoubleBuzzer();
  delay(3000);
  ESP.restart();
}

void startPortal() {
  isConfigMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP(("vocBilliard-C3-" + deviceMac).c_str());
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
  server.on("/", handleRoot);
  server.on("/scan", handleScan);
  server.on("/save", HTTP_POST, handleSave);
  server.onNotFound([]() { server.sendHeader("Location", "/", true); server.send(302, "text/plain", ""); });
  server.begin();
  startLongBuzzer();
  Serial.println("[PORTAL] AP Active: vocBilliard-C3-" + deviceMac);
}

// ─────────────────────────────────────────────────────────────
// MQTT & TELEMETRY
// ─────────────────────────────────────────────────────────────

void publishStatus() {
  if (!client.connected()) return;
  JsonDocument doc;
  doc["status"] = lightState ? "ON" : "OFF";
  doc["online"] = true;
  doc["uptime"] = millis() / 1000;
  doc["rssi"] = WiFi.RSSI();
  doc["mac"] = deviceMac;
  doc["remainingSeconds"] = failsafeSeconds;
  doc["hwType"] = "MOC3062-C3-ELITE";
  
  char buf[512];
  serializeJson(doc, buf);
  client.publish((baseTopic + "/status").c_str(), buf, true);
}

void callback(char *topic, byte *payload, unsigned int length) {
  JsonDocument doc;
  deserializeJson(doc, payload, length);
  String sTopic = String(topic);
  
  if (sTopic.endsWith("/light/set")) {
    const char *statusStr = doc["status"] | "OFF";
    bool activate = (strcasecmp(statusStr, "ON") == 0);
    bool isForce = doc["force"] | false;
    
    if (!activate) {
      if (lightProtectedUntil > millis() && !isForce) return;
      setLight(false);
      lightProtectedUntil = 0;
    } else {
      failsafeSeconds = (doc["duration"] | 0) * 60;
      lightProtectedUntil = millis() + (doc["extend"] | false ? 60000 : 30000);
      setLight(true);
      if (doc["extend"] | false) startDoubleBuzzer(); else startBuzzer(500);
    }
    storageDirty = true;
    lastStateChange = millis();
    publishStatus();
  }
}

void handleMqttConnection() {
  if (client.connected()) return;
  if (millis() - lastMqttRetry < 10000) return;
  lastMqttRetry = millis();
  
  String clientId = "SpotOn-C3-" + deviceMac;
  if (client.connect(clientId.c_str())) {
    client.subscribe((baseTopic + "/#").c_str());
    publishStatus();
    client.publish("billiard/table/sync", deviceMac.c_str());
    Serial.println("[MQTT] Connected!");
    
    // 🔊 Konfirmasi MQTT Connect: 3x Beep
    mqttWarningActive = false;
    buzzerBeepsRemaining = 6; 
    buzzerState = true;
    buzzerToneDuration = 100;
    buzzerPauseDuration = 100;
    digitalWrite(PIN_BUZZER, HIGH);
    buzzerNextToggle = millis() + 100;

  } else {
    Serial.printf("[MQTT] Gagal konek ke %s (rc=%d)\n", mqtt_server, client.state());
    mqttWarningActive = true; 
  }
}

void onWifiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
    Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN SETUP & LOOP
// ─────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_WIFI, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  digitalWrite(PIN_LED_WIFI, HIGH); // Off for Active-Low

  loadSettings();

  uint8_t baseMac[6];
  esp_efuse_mac_get_default(baseMac);
  char macStr[13];
  sprintf(macStr, "%02X%02X%02X%02X%02X%02X", baseMac[0], baseMac[1], baseMac[2], baseMac[3], baseMac[4], baseMac[5]);
  deviceMac = String(macStr);
  baseTopic = "billiard/table/" + deviceMac;

  setLight(lightState);

  WiFi.onEvent(onWifiEvent);
  if (strlen(ssid) == 0) {
    startPortal();
  } else {
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    Serial.printf("[WiFi] Connecting to %s...\n", ssid);
    
    int retry = 0;
    while (WiFi.status() != WL_CONNECTED && retry < 20) {
      delay(500); Serial.print("."); retry++;
    }
    if (WiFi.status() != WL_CONNECTED) startPortal();
    else { startDoubleBuzzer(); client.setServer(mqtt_server, mqtt_port); client.setCallback(callback); }
  }

  esp_task_wdt_config_t wdt_cfg = { .timeout_ms = 30000, .idle_core_mask = 0, .trigger_panic = true };
  esp_task_wdt_reconfigure(&wdt_cfg);
  esp_task_wdt_add(NULL);
}

void loop() {
  esp_task_wdt_reset();
  unsigned long now = millis();
  updateBuzzer();
  updateLed();

  if (isConfigMode) {
    dnsServer.processNextRequest();
    server.handleClient();
  } else {
    if (WiFi.status() == WL_CONNECTED) {
      handleMqttConnection();
      client.loop();
      if (now - lastStatusUpdate > STATUS_INTERVAL) { lastStatusUpdate = now; publishStatus(); }
    } else {
      if (now - lastWifiCheck > WIFI_FULL_RECONNECT) {
        lastWifiCheck = now;
        WiFi.begin(ssid, password);
      }
    }
  }

  // Button Reset (Long Press 5s on PIN 9)
  static unsigned long btnStart = 0;
  if (digitalRead(PIN_BUTTON) == LOW) {
    if (btnStart == 0) btnStart = now;
    if (now - btnStart > 5000) factoryReset();
  } else { btnStart = 0; }

  // Failsafe Timer
  if (lightState && failsafeSeconds > 0) {
    if (now - lastFailsafeTick >= 1000) {
      lastFailsafeTick = now;
      failsafeSeconds--;
      if (failsafeSeconds == 0) { setLight(false); lastErrorCode = 16; publishStatus(); startBuzzer(1000); }
    }
  }

  if (storageDirty && (now - lastStateChange > STORAGE_SAVE_DELAY)) {
    preferences.begin("voc-config", false);
    preferences.putBool("state", lightState);
    preferences.putUInt("failsafe", failsafeSeconds);
    preferences.end();
    storageDirty = false;
  }
}
