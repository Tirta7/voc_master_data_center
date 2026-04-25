/*
 * UNIVERSAL ELITE FIRMWARE — Spot On Billiard (v2.0)
 * VOC SYSTEM (Unified Driver for MOC3062 & PCF8575)
 * 
 * Perangkat ini bisa berfungsi sebagai:
 * 1. MOC3062 Driver (1 ESP32 per meja, GPIO langsung)
 * 2. PCF8575 Panel (1 ESP32 mengontrol hingga 16 relay via I2C)
 */

#include <ArduinoJson.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <WebServer.h>
#include <WiFi.h>
#include <Wire.h>
#include <esp_task_wdt.h>
#include <PCF8575.h>

// ─────────────────────────────────────────────────────────────
// CONFIG & GLOBALS
// ─────────────────────────────────────────────────────────────
#define PIN_LED_WIFI    2
#define PIN_BUZZER      19
#define PIN_BUTTON      5    // Tombol multifungsi (Reset/Manual)
#define PIN_MOC_GPIO    4    // Default GPIO jika mode MOC3062
#define PIN_I2C_SDA     21
#define PIN_I2C_SCL     22

Preferences preferences;
WiFiClient espClient;
PubSubClient client(espClient);
WebServer server(80);
DNSServer dnsServer;

// Settings (Stored in NVM)
char ssid[33], password[65], mqtt_server[65];
int mqtt_port = 1883;
int deviceMode = 0;     // 0: MOC3062, 1: PCF8575
int pcfAddress = 0x20;  // Default I2C Address

// State Variables
String deviceMac = "", baseTopic = "";
bool isConfigMode = false;
bool relayState[16] = {false}; 
bool relayTarget[16] = {false};
unsigned long relayFailsafe[16] = {0};
uint32_t latestToken = 0;
unsigned long lastMqttRetry = 0;
unsigned long lastStatusUpdate = 0;
unsigned long lastFailsafeTick = 0;

// PCF8575 Instance (Lazy Load)
PCF8575* pcf = nullptr;

// Buzzer State
int buzzerBeepsRemaining = 0;
unsigned long buzzerNextToggle = 0;
bool buzzerState = false;
unsigned long buzzerToneDuration = 100;
unsigned long buzzerPauseDuration = 100;

// ─────────────────────────────────────────────────────────────
// HARDWARE CONTROL (Universal)
// ─────────────────────────────────────────────────────────────

void startBuzzer(int durationMs) {
    buzzerBeepsRemaining = 1;
    buzzerState = true;
    digitalWrite(PIN_BUZZER, HIGH);
    buzzerNextToggle = millis() + durationMs;
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

void writeRelay(int pin, bool state) {
    if (deviceMode == 1) { // PCF8575 Mode
        if (!pcf) {
            pcf = new PCF8575(pcfAddress);
            pcf->begin();
        }
        pcf->write(pin, state ? HIGH : LOW);
    } else { // MOC3062 Mode (Direct GPIO)
        digitalWrite(PIN_MOC_GPIO, state ? HIGH : LOW);
    }
    relayState[pin] = state;
    relayTarget[pin] = state;
}

// ─────────────────────────────────────────────────────────────
// SETTINGS MANAGEMENT
// ─────────────────────────────────────────────────────────────

void loadSettings() {
    preferences.begin("voc-elite", true);
    String s = preferences.getString("ssid", "");
    String p = preferences.getString("pass", "");
    String m = preferences.getString("mqtt", "");
    mqtt_port = preferences.getInt("port", 1883);
    deviceMode = preferences.getInt("mode", 0);
    pcfAddress = preferences.getInt("i2c", 0x20);
    preferences.end();

    strncpy(ssid, s.c_str(), sizeof(ssid));
    strncpy(password, p.c_str(), sizeof(password));
    strncpy(mqtt_server, m.c_str(), sizeof(mqtt_server));
}

void saveSettings(const char* s, const char* p, const char* m, int pt, int mode, int i2c) {
    preferences.begin("voc-elite", false);
    preferences.putString("ssid", s);
    preferences.putString("pass", p);
    preferences.putString("mqtt", m);
    preferences.putInt("port", pt);
    preferences.putInt("mode", mode);
    preferences.putInt("i2c", i2c);
    preferences.end();
}

// ─────────────────────────────────────────────────────────────
// WEB PORTAL (Glassmorphism v2.0)
// ─────────────────────────────────────────────────────────────

void handleRoot() {
    String html = R"rawliteral(
<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'>
<title>VOC Elite Config</title>
<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap' rel='stylesheet'>
<style>
:root{--p:#6366f1;--s:#4f46e5;--bg:#0f172a;--card:rgba(30,41,59,0.7)}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',sans-serif}
body{background:linear-gradient(135deg,#020617,#0f172a);color:#f8fafc;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.c{background:var(--card);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.1);padding:40px;border-radius:24px;width:100%;max-width:480px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5)}
h1{font-size:28px;font-weight:600;margin-bottom:8px;background:linear-gradient(to right,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
p.sub{color:#94a3b8;font-size:14px;margin-bottom:32px}
.f-g{margin-bottom:20px;position:relative}
label{display:block;font-size:13px;font-weight:500;color:#94a3b8;margin-bottom:8px;margin-left:4px}
input,select{width:100%;background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.1);padding:12px 16px;border-radius:12px;color:#fff;font-size:15px;transition:all 0.3s}
input:focus,select:focus{outline:none;border-color:var(--p);box-shadow:0 0 0 4px rgba(99,102,241,0.2)}
.btn{width:100%;background:linear-gradient(to right,var(--p),var(--s));color:#fff;border:none;padding:14px;border-radius:12px;font-weight:600;cursor:pointer;margin-top:12px;transition:0.3s;box-shadow:0 10px 15px -3px rgba(79,70,229,0.3)}
.btn:hover{transform:translateY(-2px);box-shadow:0 20px 25px -5px rgba(79,70,229,0.4)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.scan-btn{position:absolute;right:8px;top:32px;background:rgba(99,102,241,0.2);color:#818cf8;border:none;padding:5px 10px;border-radius:8px;font-size:12px;cursor:pointer}
#wifi-list{background:rgba(15,23,42,0.8);border-radius:12px;margin-top:10px;max-height:150px;overflow-y:auto;display:none}
.wifi-item{padding:10px 15px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);font-size:14px}
.wifi-item:hover{background:rgba(99,102,241,0.1)}
</style></head>
<body><div class='c'>
<h1>VOC Elite Config</h1>
<p class='sub'>Universal Hardware v2.0</p>
<form action='/save' method='POST'>
<div class='f-g'><label>WiFi SSID</label>
<input type='text' name='s' id='ssid' placeholder='Nama WiFi' required>
<button type='button' class='scan-btn' onclick='scanWiFi()'>SCAN</button>
<div id='wifi-list'></div></div>
<div class='f-g'><label>Password</label>
<input type='password' name='p' id='pass' placeholder='••••••••'></div>
<div class='f-g'><label>MQTT Broker</label>
<input type='text' name='m' placeholder='192.168.1.100'></div>
<div class='row'><div class='f-g'><label>MQTT Port</label>
<input type='number' name='pt' value='1883'></div>
<div class='f-g'><label>Device Mode</label>
<select name='mode' onchange='toggleI2C(this.value)'>
<option value='0'>MOC3062 (Single)</option>
<option value='1'>PCF8575 (Panel)</option></select></div></div>
<div id='i2c_area' style='display:none' class='f-g'><label>I2C Address (Hex)</label>
<input type='text' name='i2c' value='0x20'></div>
<button type='submit' class='btn'>SIMPAN & RESTART</button>
</form></div>
<script>
function toggleI2C(v){document.getElementById('i2c_area').style.display=(v=='1'?'block':'none')}
function scanWiFi(){const l=document.getElementById('wifi-list');l.style.display='block';l.innerHTML="<div class='wifi-item'>Memindai...</div>";
fetch('/scan').then(r=>r.text()).then(h=>{l.innerHTML=h;}) }
function selectSSID(s){document.getElementById('ssid').value=s;document.getElementById('wifi-list').style.display='none';document.getElementById('pass').focus()}
</script></body></html>
)rawliteral";
    server.send(200, "text/html", html);
}

void handleScan() {
    int n = WiFi.scanNetworks();
    String html = "";
    if (n == 0) html = "<div class='wifi-item'>Tidak ada WiFi</div>";
    else {
        for (int i = 0; i < n; ++i) {
            html += "<div class='wifi-item' onclick='selectSSID(\"" + WiFi.SSID(i) + "\")'>" + 
                    WiFi.SSID(i) + " (" + String(WiFi.RSSI(i)) + "db)</div>";
        }
    }
    server.send(200, "text/html", html);
}

void handleSave() {
    String s = server.arg("s");
    String p = server.arg("p");
    String m = server.arg("m");
    int pt = server.arg("pt").toInt();
    int mode = server.arg("mode").toInt();
    String i2cStr = server.arg("i2c");
    int i2c = (int)strtol(i2cStr.c_str(), NULL, 0);

    saveSettings(s.c_str(), p.c_str(), m.c_str(), pt, mode, i2c);
    
    String msg = "<html><body style='background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'><div><h2>Konfigurasi Tersimpan!</h2><p>ESP32 akan restart dalam 2 detik...</p></div></body></html>";
    server.send(200, "text/html", msg);
    delay(2000);
    ESP.restart();
}

void startPortal() {
    isConfigMode = true;
    WiFi.mode(WIFI_AP);
    String apName = "vocBilliard-ELITE-" + deviceMac.substring(8);
    WiFi.softAP(apName.c_str());
    dnsServer.start(53, "*", WiFi.softAPIP());
    
    server.on("/", handleRoot);
    server.on("/scan", handleScan);
    server.on("/save", HTTP_POST, handleSave);
    server.onNotFound([]() { server.sendHeader("Location", "/", true); server.send(302, "text/plain", ""); });
    server.begin();
    
    Serial.println("[PORTAL] AP Aktif: " + apName);
    startBuzzer(1000);
}

// ─────────────────────────────────────────────────────────────
// MQTT LOGIC
// ─────────────────────────────────────────────────────────────

void publishStatus() {
    if (!client.connected()) return;
    DynamicJsonDocument doc(1024);
    doc["status"] = "online";
    doc["mac"] = deviceMac;
    doc["hwType"] = (deviceMode == 1 ? "PCF8575" : "MOC3062");
    doc["uptime"] = millis() / 1000;
    doc["rssi"] = WiFi.RSSI();
    doc["token"] = latestToken;

    JsonArray relays = doc.createNestedArray("relays");
    JsonArray timers = doc.createNestedArray("timers");
    for (int i = 0; i < 16; i++) {
        relays.add(relayState[i]);
        timers.add(relayFailsafe[i] / 60);
    }

    char buf[1024];
    serializeJson(doc, buf);
    client.publish((baseTopic + "/status").c_str(), buf, true);
}

void callback(char* topic, byte* payload, unsigned int length) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload, length);
    String sTopic = String(topic);

    if (sTopic.endsWith("/light/set")) {
        latestToken = doc["token"] | 0;
        int pin = doc["relayPin"] | 0; // Channel 0-15
        bool state = (strcasecmp(doc["status"] | "OFF", "ON") == 0);
        bool isForce = doc["force"] | false;
        
        writeRelay(pin, state);
        
        if (state) {
            relayFailsafe[pin] = (doc["duration"] | 0) * 60;
            if (doc["extend"] | false) { startBuzzer(100); delay(100); startBuzzer(100); }
            else startBuzzer(500);
        }
        publishStatus();
    }
}

void handleMqtt() {
    if (client.connected()) return;
    if (millis() - lastMqttRetry < 10000) return;
    lastMqttRetry = millis();

    String clientId = "SpotOn-Elite-" + deviceMac;
    if (client.connect(clientId.c_str())) {
        client.subscribe((baseTopic + "/#").c_str());
        client.publish("billiard/table/sync", deviceMac.c_str());
        Serial.println("[MQTT] Connected!");
        publishStatus();
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
    pinMode(PIN_MOC_GPIO, OUTPUT);
    digitalWrite(PIN_MOC_GPIO, LOW);

    loadSettings();

    uint8_t mac[6];
    WiFi.macAddress(mac);
    char buf[13];
    sprintf(buf, "%02X%02X%02X%02X%02X%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    deviceMac = String(buf);
    baseTopic = "billiard/table/" + deviceMac;

    if (strlen(ssid) == 0) {
        startPortal();
    } else {
        WiFi.begin(ssid, password);
        Serial.print("[WiFi] Connecting");
        int retry = 0;
        while (WiFi.status() != WL_CONNECTED && retry < 20) {
            delay(500); Serial.print("."); retry++;
        }
        if (WiFi.status() != WL_CONNECTED) startPortal();
        else {
            Serial.println("\n[WiFi] Connected!");
            client.setServer(mqtt_server, mqtt_port);
            client.setCallback(callback);
        }
    }

    esp_task_wdt_init(30, true);
    esp_task_wdt_add(NULL);
}

void loop() {
    esp_task_wdt_reset();
    updateBuzzer();

    if (isConfigMode) {
        dnsServer.processNextRequest();
        server.handleClient();
    } else {
        if (WiFi.status() == WL_CONNECTED) {
            handleMqtt();
            client.loop();
            if (millis() - lastStatusUpdate > 30000) {
                lastStatusUpdate = millis();
                publishStatus();
            }
        }
        
        // Failsafe Timer Tick (Setiap 1 detik)
        if (millis() - lastFailsafeTick >= 1000) {
            lastFailsafeTick = millis();
            bool changed = false;
            for (int i = 0; i < 16; i++) {
                if (relayState[i] && relayFailsafe[i] > 0) {
                    relayFailsafe[i]--;
                    if (relayFailsafe[i] == 0) {
                        writeRelay(i, false);
                        changed = true;
                        startBuzzer(1000);
                    }
                }
            }
            if (changed) publishStatus();
        }
    }

    // Factory Reset (Hold button 5s)
    if (digitalRead(PIN_BUTTON) == LOW) {
        static unsigned long holdStart = 0;
        if (holdStart == 0) holdStart = millis();
        if (millis() - holdStart > 5000) {
            preferences.begin("voc-elite", false);
            preferences.clear();
            preferences.end();
            ESP.restart();
        }
    } else {
        // Simple manual toggle simulation on PIN_MOC_GPIO for MOC mode
        if (deviceMode == 0) {
           static bool lastBtn = HIGH;
           bool curBtn = digitalRead(PIN_BUTTON);
           if (lastBtn == HIGH && curBtn == LOW) {
              writeRelay(0, !relayState[0]);
              publishStatus();
           }
           lastBtn = curBtn;
        }
    }
}
