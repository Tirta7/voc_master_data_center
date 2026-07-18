/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║        ESP-NOW GATEWAY — SI KOMANDAN (Billiard System)           ║
 * ║        VOC SYSTEM (Spot On Billiard)                             ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Arsitektur : HYBRID MQTT + ESP-NOW  [v6.2 — Final Online]       ║
 * ║  Chip       : ESP32 (DevKit V1 / WROOM)                          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

#include <ArduinoJson.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

struct Config {
  char ssid[32];
  char pass[64];
  char mqtt_ip[32];
  int floor_id;
};

Config config;
Preferences prefs;
WiFiClient espClient;
PubSubClient client(espClient);
String deviceMac;

#define PIN_LED_WIFI 2
#define REPORT_QUEUE_SIZE 50

typedef struct __attribute__((packed)) {
  int32_t mesaId;
  int32_t cmd;
  int32_t durationMin;
  uint32_t token;
  int32_t wifiChannel;
} struct_message;

struct QueuedReport {
  struct_message data;
  uint8_t mac[6];
};
QueuedReport reportQueue[REPORT_QUEUE_SIZE];
volatile int qHead = 0;
volatile int qTail = 0;

void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData,
                int len) {
  if (len < sizeof(struct_message))
    return;
  struct_message temp;
  memcpy(&temp, incomingData, sizeof(struct_message));

  if (temp.mesaId > 0) {
    int nextTail = (qTail + 1) % REPORT_QUEUE_SIZE;
    if (nextTail != qHead) {
      memcpy((void *)&reportQueue[qTail].data, &temp, sizeof(struct_message));
      memcpy((void *)reportQueue[qTail].mac, info->src_addr, 6);
      qTail = nextTail;
    }
  }
}

void callback(char *topic, byte *payload, unsigned int length) {
  StaticJsonDocument<512> doc;
  deserializeJson(doc, payload, length);
  struct_message myData;
  myData.mesaId = doc["relayPin"] | 0;
  myData.cmd = doc["status"] == "ON" ? 1 : 0;
  myData.durationMin = doc["duration"] | 0;
  myData.token = doc["token"] | 0;
  myData.wifiChannel = WiFi.channel();

  uint8_t broadcastMAC[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  Serial.printf("[ESPNOW] Broadcast -> Meja %d: %s\n", myData.mesaId,
                myData.cmd == 1 ? "ON" : "OFF");

  for (int i = 0; i < 3; i++) {
    esp_now_send(broadcastMAC, (uint8_t *)&myData, sizeof(myData));
    delay(5);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[SYSTEM] Komandan Start...");

  prefs.begin("billiard", false);
  if (prefs.getBytes("config", &config, sizeof(Config)) != sizeof(Config)) {
    strncpy(config.ssid, "Tirtaaa", 32);
    strncpy(config.pass, "4DItya79!", 64);
    strncpy(config.mqtt_ip, "192.168.1.13", 32);
    config.floor_id = 1;
  }

  WiFi.mode(WIFI_STA);
  delay(500);
  deviceMac = WiFi.macAddress();
  deviceMac.replace(":", "");
  deviceMac.toUpperCase();

  WiFi.begin(config.ssid, config.pass);
  Serial.printf("[WIFI] %s (MAC: %s)\n", config.ssid, deviceMac.c_str());

  if (esp_now_init() == ESP_OK) {
    esp_now_register_recv_cb(OnDataRecv);
    uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, bc, 6);
    peer.ifidx = WIFI_IF_STA;
    esp_now_add_peer(&peer);
  }

  client.setServer(config.mqtt_ip, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    if (client.connect(("Komandan-" + deviceMac).c_str())) {
      String topic = "billiard/table/" + deviceMac + "/light/set";
      client.subscribe(topic.c_str());
    }
    delay(5000);
  }
  client.loop();

  while (qHead != qTail) {
    struct_message rpt = reportQueue[qHead].data;
    uint8_t *pMac = reportQueue[qHead].mac;
    qHead = (qHead + 1) % REPORT_QUEUE_SIZE;

    char macStr[13];
    sprintf(macStr, "%02X%02X%02X%02X%02X%02X", pMac[0], pMac[1], pMac[2],
            pMac[3], pMac[4], pMac[5]);

    char buffer[256];
    StaticJsonDocument<256> doc;
    doc["tableId"] = rpt.mesaId;
    doc["status"] = rpt.cmd == 1 ? "ON" : "OFF";
    doc["lightState"] = rpt.cmd == 1 ? true : false;
    doc["remainingMin"] = rpt.durationMin;
    doc["token"] = rpt.token;
    doc["online"] = true;
    doc["isOnline"] = true;
    doc["lastSeen"] = millis();
    doc["mac"] = macStr;
    doc["hwType"] = "ESPNOW_NODE";

    serializeJson(doc, buffer);
    String topic = "billiard/table/" + String(macStr) + "/status";
    client.publish(topic.c_str(), buffer);
    client.publish(("billiard/heartbeat/" + String(macStr)).c_str(), buffer);

    Serial.printf("[REPORT] ID %d (MAC: %s) Sent to Backend\n", rpt.mesaId,
                  macStr);
  }

  static unsigned long lastBeacon = 0;
  if (millis() - lastBeacon > 1000) {
    lastBeacon = millis();
    struct_message beacon;
    beacon.mesaId = 0;
    beacon.wifiChannel = WiFi.channel();
    uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_send(bc, (uint8_t *)&beacon, sizeof(beacon));
  }
}
