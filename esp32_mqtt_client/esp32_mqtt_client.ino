/*
 * ESP32 MQTT Client for Billiard Table Control - VOC SYSTEM (Spot On Billiard)
 * * Fitur Utama:
 * 1. Static Memory Allocation: Bebas memory leak, stabil untuk running 24/7.
 * 2. Hardware Watchdog: Auto-restart jika sistem membeku (hang).
 * 3. Anti-Ghost Switching: Verifikasi status I2C setiap 10 detik (proteksi noise).
 * 4. MQTT LWT (Last Will): Server tahu secara instan jika alat offline.
 * 5. Extend Protection: Proteksi 60 detik saat tambah waktu (anti-race condition).
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>
#include <Wire.h>
#include <PCF8575.h>
#include <esp_task_wdt.h>

// ─────────────────────────────────────────────────────────────
// KONFIGURASI JARINGAN & MQTT
// ─────────────────────────────────────────────────────────────
const char* ssid         = "Penerbang Liar";
const char* password     = "12345678!";
const char* mqtt_server  = "192.168.0.104";
const int   mqtt_port    = 1883;

// Topik untuk monitoring status alat
const char* LWT_TOPIC    = "billiard/controller/status"; 

// ─────────────────────────────────────────────────────────────
// KONFIGURASI HARDWARE
// ─────────────────────────────────────────────────────────────
#define MODE_SWITCH     5
#define LED_WIFI        2
#define TRANSISTOR_PIN  15
#define RELAY_CONTROL   17
#define BUZZER          19
#define NUM_RELAYS      16  // Sesuai kapasitas 1 chip PCF8575

// ─────────────────────────────────────────────────────────────
// DATA & STATE (Static Allocation)
// ─────────────────────────────────────────────────────────────
PCF8575 pcf(0x20);
WiFiClient espClient;
PubSubClient client(espClient);

bool relayState[NUM_RELAYS]           = {false}; // Status asli (dari server)
bool relayTarget[NUM_RELAYS]          = {false}; // Status target (untuk verifikasi I2C)
unsigned long relayProtectedUntil[NUM_RELAYS] = {0};

bool modeOtomatis      = true;
bool wasWifiConnected  = false;
bool buzzerActive      = false;
unsigned long buzzerEndTime     = 0;
unsigned long lastMqttRetry     = 0;
unsigned long lastLedBlink      = 0;
unsigned long lastPcfVerify     = 0;

// ─────────────────────────────────────────────────────────────
// FUNGSI HELPER
// ─────────────────────────────────────────────────────────────

void startBuzzer(unsigned long durationMs) {
    digitalWrite(BUZZER, HIGH);
    buzzerActive = true;
    buzzerEndTime = millis() + durationMs;
}

void updateBuzzer() {
    if (buzzerActive && millis() >= buzzerEndTime) {
        digitalWrite(BUZZER, LOW);
        buzzerActive = false;
    }
}

// Menulis ke PCF dengan pengecekan bus I2C
bool pcfWrite(uint8_t pin, bool state) {
    if (pin >= NUM_RELAYS) return false;
    
    Wire.beginTransmission(0x20);
    if (Wire.endTransmission() != 0) {
        Serial.println("[I2C] Error: Bus macet, re-initializing...");
        pcf.begin();
    }
    
    pcf.digitalWrite(pin, state ? HIGH : LOW);
    return true;
}

void saveToSPIFFS() {
    StaticJsonDocument<512> doc;
    JsonArray arr = doc.createNestedArray("state");
    for (int i = 0; i < NUM_RELAYS; i++) arr.add(relayState[i]);

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

void callback(char* topic, byte* payload, unsigned int length) {
    StaticJsonDocument<512> doc;
    if (deserializeJson(doc, payload, length)) return;

    // Parsing ID Tabel dari Topik (billiard/table/1/light/set)
    String sTopic = String(topic);
    int first = sTopic.indexOf("table/") + 6;
    int last  = sTopic.indexOf("/light");
    int tableId = sTopic.substring(first, last).toInt();

    JsonObject data = doc["data"].isNull() ? doc.as<JsonObject>() : doc["data"];
    const char* status = data["status"] | "";
    
    // Gunakan relayPin dari payload, jika tidak ada pakai (tableId - 1)
    int pinIndex = data.containsKey("relayPin") ? data["relayPin"].as<int>() : (tableId - 1);

    if (pinIndex < 0 || pinIndex >= NUM_RELAYS) return;

    if (!modeOtomatis) {
        Serial.println("[MQTT] Denied: Manual Mode Active.");
        return;
    }

    bool activate = (strcmp(status, "ON") == 0);
    bool isExtend = data["extend"] | false;
    bool isForce  = data["force"]  | false;  // Force flag: bypass race condition protection
    unsigned long now = millis();

    if (!activate) {
        // PERINTAH MATI (OFF)
        if (relayProtectedUntil[pinIndex] > now && !isForce) {
            // Protection aktif & bukan perintah manual — abaikan
            Serial.printf("[PROTECT] OFF diabaikan untuk Pin %d (Race Condition Protection, sisa: %lus)\n",
                pinIndex, (relayProtectedUntil[pinIndex] - now) / 1000);
            return;
        }
        if (isForce && relayProtectedUntil[pinIndex] > now) {
            // Force override — bypass proteksi dan reset window
            Serial.printf("[FORCE] Proteksi dilewati untuk Pin %d (Manual Override)\n", pinIndex);
            relayProtectedUntil[pinIndex] = 0;
        }
        relayState[pinIndex] = false;
        relayTarget[pinIndex] = false;
        pcfWrite(pinIndex, false);
        startBuzzer(200);
        Serial.printf("[RELAY] Table %d -> OFF%s\n", tableId, isForce ? " (FORCE)" : "");
    } else {
        // PERINTAH NYALA (ON)
        // Proteksi 60 detik jika ini "Extend", 30 detik jika start biasa
        unsigned long protDuration = isExtend ? 60000 : 30000;
        relayProtectedUntil[pinIndex] = now + protDuration;
        
        relayState[pinIndex] = true;
        relayTarget[pinIndex] = true;
        pcfWrite(pinIndex, true);
        startBuzzer(1000);
        Serial.printf("[RELAY] Table %d -> ON (%s)\n", tableId, isExtend ? "EXTEND" : "START");
    }
    saveToSPIFFS();
}

void handleMqttConnection() {
    if (client.connected()) return;

    if (millis() - lastMqttRetry > 5000) {
        lastMqttRetry = millis();
        String clientId = "SpotOn-Controller-" + String(WiFi.macAddress());
        
        // Connect dengan Last Will (LWT): Jika alat mati, status jadi 'offline' di broker
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
        .timeout_ms = 30000,
        .idle_core_mask = 0,
        .trigger_panic = true
    };
    esp_task_wdt_init(&wdt_config);
    esp_task_wdt_add(NULL);

    pinMode(MODE_SWITCH, INPUT_PULLUP);
    pinMode(LED_WIFI, OUTPUT);
    pinMode(BUZZER, OUTPUT);
    pinMode(TRANSISTOR_PIN, OUTPUT);
    pinMode(RELAY_CONTROL, OUTPUT);

    // Power up relay system
    digitalWrite(TRANSISTOR_PIN, HIGH);
    digitalWrite(RELAY_CONTROL, HIGH);
    
    Wire.begin(21, 22);
    Wire.setClock(100000); // Clock rendah lebih stabil terhadap noise
    pcf.begin();
    for(int i=0; i<NUM_RELAYS; i++) pcf.pinMode(i, OUTPUT);

    if (SPIFFS.begin(true)) {
        File f = SPIFFS.open("/relay_config.json", FILE_READ);
        if (f) {
            StaticJsonDocument<512> doc;
            deserializeJson(doc, f);
            for(int i=0; i<NUM_RELAYS; i++) relayState[i] = doc["state"][i] | false;
            f.close();
            Serial.println("[SPIFFS] Restore data berhasil.");
        }
    }

    modeOtomatis = (digitalRead(MODE_SWITCH) == HIGH);
    for(int i=0; i<NUM_RELAYS; i++) {
        bool s = modeOtomatis && relayState[i];
        pcfWrite(i, s);
        relayTarget[i] = s;
    }

    WiFi.begin(ssid, password);
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(callback);
    
    Serial.println("=== VOC BILLIARD SYSTEM READY ===");
}

// ─────────────────────────────────────────────────────────────
// LOOP (Berjalan Terus Menerus)
// ─────────────────────────────────────────────────────────────

void loop() {
    esp_task_wdt_reset(); // Beritahu WD bahwa sistem hidup
    unsigned long now = millis();
    updateBuzzer();

    // 1. Cek Mode (Manual/Otomatis)
    bool currentMode = (digitalRead(MODE_SWITCH) == HIGH);
    if (currentMode != modeOtomatis) {
        modeOtomatis = currentMode;
        digitalWrite(TRANSISTOR_PIN, modeOtomatis ? HIGH : LOW);
        digitalWrite(RELAY_CONTROL, modeOtomatis ? HIGH : LOW);
        for(int i=0; i<NUM_RELAYS; i++) {
            bool s = modeOtomatis && relayState[i];
            pcf.digitalWrite(i, s ? HIGH : LOW);
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

    // 3. Verifikasi PCF (Anti-Ghosting)
    // Setiap 10 detik, pastikan hardware PCF sesuai dengan data di memory
    if (modeOtomatis && (now - lastPcfVerify > 10000)) {
        lastPcfVerify = now;
        for(int i=0; i<NUM_RELAYS; i++) {
            if (pcf.digitalRead(i) != relayTarget[i]) {
                pcf.digitalWrite(i, relayTarget[i] ? HIGH : LOW);
                Serial.printf("[FIX] Ghost state corrected on Pin %d\n", i);
            }
        }
    }
}