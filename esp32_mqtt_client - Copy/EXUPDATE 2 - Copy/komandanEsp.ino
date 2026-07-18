/*
 * KOMANDAN (Gateway) - ESP32
 * VERSI PRODUKSI - PROTOKOL ROBUST (CHANNEL SYNC)
 */
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

#define PIN_LED_WIFI 2

typedef struct __attribute__((packed)) {
  int32_t mesaId;
  int32_t cmd;         
  int32_t durationMin; 
  int32_t wifiChannel; // 🎯 Tambahkan info channel di setiap paket
} struct_message;

struct_message myData;
struct_message lastReport; 
volatile bool hasNewReport = false; 
uint8_t lastSenderMAC[6];

WiFiClient espClient;
PubSubClient client(espClient);
Preferences prefs;

struct Config {
  char ssid[32];
  char pass[64];
  char mqtt_ip[40];
  int floor_id;
} config;

String deviceMac = ""; 

void stringToMac(const char* str, uint8_t* mac) {
  for (int i = 0; i < 6; i++) {
    char part[3] = { str[i*2], str[i*2+1], '\0' };
    mac[i] = (uint8_t)strtol(part, NULL, 16);
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  String top = String(topic);
  if (top.endsWith("/light/set") || top.endsWith("/cmd") || top.endsWith("/ping")) {
    StaticJsonDocument<512> doc;
    deserializeJson(doc, payload, length);
    
    myData.mesaId = doc["tableId"] | 0;
    String status = doc["status"] | "OFF";
    myData.cmd = (status == "ON") ? 1 : 0;
    myData.durationMin = doc["duration"] | 0;
    myData.wifiChannel = WiFi.channel(); // 🎯 Beritahu channel saat ini

    uint8_t targetMAC[6];
    bool isBroadcast = true;
    const char* targetMacStr = doc["mac"]; 
    if (targetMacStr && strlen(targetMacStr) == 12) {
      stringToMac(targetMacStr, targetMAC);
      isBroadcast = false;
    } else {
      memset(targetMAC, 0xFF, 6); 
    }

    if (!isBroadcast && !esp_now_is_peer_exist(targetMAC)) {
      esp_now_peer_info_t peer = {};
      memcpy(peer.peer_addr, targetMAC, 6);
      peer.channel = 0; peer.encrypt = false; peer.ifidx = WIFI_IF_STA;
      esp_now_add_peer(&peer);
    }

    esp_now_send(targetMAC, (uint8_t *) &myData, sizeof(myData));
    Serial.printf("[MQTT] Meja %d -> %s (Ch:%d)\n", myData.mesaId, status.c_str(), myData.wifiChannel);
  }
}

void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData, int len) {
  if (len >= sizeof(struct_message)) {
    memcpy(&lastReport, incomingData, sizeof(struct_message));
    memcpy(lastSenderMAC, info->src_addr, 6);
    hasNewReport = true;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_WIFI, OUTPUT);
  prefs.begin("billiard", false);
  prefs.getBytes("config", &config, sizeof(Config));
  
  WiFi.mode(WIFI_STA); 
  if (esp_now_init() == ESP_OK) {
    esp_now_register_recv_cb(OnDataRecv);
    uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, bc, 6);
    peer.channel = 0; peer.encrypt = false; peer.ifidx = WIFI_IF_STA;
    esp_now_add_peer(&peer);
  }

  WiFi.begin(config.ssid, config.pass);
  deviceMac = WiFi.macAddress();
  deviceMac.replace(":", "");
  
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 15) { delay(500); Serial.print("."); retry++; }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PIN_LED_WIFI, HIGH);
    client.setServer(config.mqtt_ip, 1883);
    client.setCallback(callback);
    Serial.println("\n[SYSTEM] Komandan Ready.");
  }
}

void loop() {
  if (!client.connected()) {
    if (client.connect(("Komandan-" + deviceMac).c_str())) {
      client.subscribe(("billiard/table/" + deviceMac + "/#").c_str());
      client.subscribe(("billiard/lantai" + String(config.floor_id) + "/cmd").c_str());
    }
    delay(5000);
  }
  client.loop();

  if (hasNewReport) {
    hasNewReport = false;
    char macStr[13];
    snprintf(macStr, sizeof(macStr), "%02X%02X%02X%02X%02X%02X", 
             lastSenderMAC[0], lastSenderMAC[1], lastSenderMAC[2], 
             lastSenderMAC[3], lastSenderMAC[4], lastSenderMAC[5]);

    StaticJsonDocument<256> doc;
    doc["mesaId"] = lastReport.mesaId;
    doc["mac"] = macStr;
    doc["status"] = (lastReport.cmd == 1) ? "ON" : "OFF";
    doc["lightState"] = (lastReport.cmd == 1);
    doc["remainingMin"] = lastReport.durationMin;
    doc["mode"] = "AUTO";
    
    char buffer[256];
    serializeJson(doc, buffer);
    client.publish(("billiard/meja/" + String(lastReport.mesaId) + "/status").c_str(), buffer);
    client.publish(("billiard/table/" + String(macStr) + "/status").c_str(), buffer);
  }

  // Beacon
  static unsigned long lastBeacon = 0;
  if (millis() - lastBeacon > 50) {
    lastBeacon = millis();
    struct_message beacon;
    beacon.mesaId = 0; 
    beacon.wifiChannel = WiFi.channel(); // Info channel
    beacon.cmd = beacon.wifiChannel; // Backward compatibility
    uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_send(bc, (uint8_t *) &beacon, sizeof(beacon));
  }
}
