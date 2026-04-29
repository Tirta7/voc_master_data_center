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

struct TableState {
  unsigned long lastMqttSend = 0;
  int lastCmd = -1;
  uint32_t lastToken = 0;
};
TableState tables[30];

void beaconTimerCallback(void *arg) {
  static int count = 0;
  struct_message beacon;
  beacon.mesaId = 0;
  beacon.wifiChannel = WiFi.channel();
  uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  esp_now_send(bc, (uint8_t *)&beacon, sizeof(beacon));

  if (++count >= 10) {
    Serial.printf("[BEACON] Memancarkan sinyal di Ch: %d (Rutin)\n",
                  beacon.wifiChannel);
    count = 0;
  }
}

void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *incomingData,
                int len) {
  if (len < sizeof(struct_message))
    return;
  struct_message temp;
  memcpy(&temp, incomingData, sizeof(struct_message));

  // 3. Proses Discovery (cmd 99): Prajurit sedang mencari channel
  if (temp.cmd == 99) {
    Serial.printf("[DISCOVERY] Prajurit Meja %d mencari Komandan. Membalas Beacon...\n", temp.mesaId);
    beaconTimerCallback(NULL); // Langsung kirim identitas channel
    return;
  }

  // 1. Proses Heartbeat (mesaId > 0)
  if (temp.mesaId > 0) {
    Serial.printf("[RADIO-IN] Terima Heartbeat Meja %d | S: %s | Ch: %d\n",
                  temp.mesaId, temp.cmd == 1 ? "ON" : "OFF", temp.wifiChannel);
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

  Serial.printf("[MQTT-IN] Perintah Meja %d -> %s | Token: %u\n", myData.mesaId,
                myData.cmd == 1 ? "ON" : "OFF", myData.token);

  uint8_t broadcastMAC[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  Serial.printf("[RADIO-OUT] BURST MODE: Mengirim perintah ke Meja %d (2x)\n",
                myData.mesaId);

  for (int i = 0; i < 2; i++) { // Cukup 2x burst agar tidak brown-out
    esp_now_send(broadcastMAC, (uint8_t *)&myData, sizeof(myData));
    delay(50); // Jeda lebih lama agar power supply stabil
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
  // Pastikan protokol mendukung semua mode (B, G, N) agar C3 bisa masuk
  esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G |
                                         WIFI_PROTOCOL_11N);
  delay(500);
  deviceMac = WiFi.macAddress();
  deviceMac.replace(":", "");
  deviceMac.toUpperCase();

  WiFi.begin(config.ssid, config.pass);

  // Tunggu sejenak agar WiFi mendapatkan Channel dari Router
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  Serial.println("\n\n╔══════════════════════════════════════════╗");
  Serial.println("║       GATEWAY KOMANDAN — READY           ║");
  Serial.println("╚══════════════════════════════════════════╝");
  Serial.printf("  MAC ADDR : %s\n", deviceMac.c_str());
  Serial.printf("  WIFI SSID: %s\n", config.ssid);
  Serial.printf("  MQTT IP  : %s\n", config.mqtt_ip);
  Serial.printf("  CHANNEL  : %d\n",
                WiFi.status() == WL_CONNECTED ? WiFi.channel() : 0);
  Serial.println("════════════════════════════════════════════\n");

  if (esp_now_init() == ESP_OK) {
    esp_now_register_recv_cb(OnDataRecv);
    uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, bc, 6);
    peer.ifidx = WIFI_IF_STA;
    esp_now_add_peer(&peer);

    esp_wifi_config_espnow_rate(WIFI_IF_STA, WIFI_PHY_RATE_1M_L);
  }

  esp_timer_create_args_t timer_args = {};
  timer_args.callback = &beaconTimerCallback;
  esp_timer_handle_t beacon_timer;
  esp_timer_create(&timer_args, &beacon_timer);
  esp_timer_start_periodic(beacon_timer, 1000000); // 1 detik

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

    if (rpt.mesaId < 1 || rpt.mesaId > 29)
      continue;

    // Matikan throttling sementara agar Backend selalu mendapat update terbaru
    // (Anti-Manual Override Loop)
    bool shouldSend = true;
    unsigned long now = millis();

    /*
    if (rpt.cmd != tables[rpt.mesaId].lastCmd) {
      shouldSend = true;
    } else if (rpt.token != tables[rpt.mesaId].lastToken) {
      shouldSend = true;
    } else if (now - tables[rpt.mesaId].lastMqttSend > 30000) {
      shouldSend = true;
    }
    */

    if (!shouldSend)
      continue;
    tables[rpt.mesaId].lastCmd = rpt.cmd;
    tables[rpt.mesaId].lastToken = rpt.token;
    tables[rpt.mesaId].lastMqttSend = now;

    Serial.printf("[MQTT-OUT] Meneruskan status Meja %d ke Backend\n",
                  rpt.mesaId);
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
    doc["mode"] = "AUTO";
    doc["masterEnabled"] = true;

    serializeJson(doc, buffer);
    String topic = "billiard/table/" + String(macStr) + "/status";
    client.publish(topic.c_str(), buffer);
    client.publish(("billiard/heartbeat/" + String(macStr)).c_str(), buffer);

    Serial.printf("[REPORT] ID %d (MAC: %s) Sent to Backend\n", rpt.mesaId,
                  macStr);
  }
}
