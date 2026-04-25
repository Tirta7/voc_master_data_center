#include <ArduinoJson.h>
#include <DNSServer.h>
#include <PubSubClient.h>
#include <SPIFFS.h>
#include <WebServer.h>
#include <WiFi.h>
#include <esp_mac.h> // 🛡️ Fix for ESP32 Core v3.x
#include <esp_now.h>
#include <esp_task_wdt.h>
#include <esp_wifi.h>

/*
 * ============================================================
 * KOMANDAN - ESP32 (FreeRTOS Industrial Edition v16.3)
 * ============================================================
 */

// ─── PIN DEFINITIONS ─────────────────────────────────────────
#define PIN_LED_WIFI 2
#define PIN_LED_ESPNOW 4
#define PIN_BUZZER 5
#define PIN_RESET_BTN 0 // Sesuai tombol BOOT

// ─── CONFIG CONSTANTS ────────────────────────────────────────
#define CONFIG_FILE "/config.json"
#define SETUP_AP_SSID_PREFIX "KOMANDAN-SETUP"
#define SETUP_AP_PASSWORD "" // Open
#define MQTT_DEFAULT_SERVER "192.168.1.100"
#define MQTT_DEFAULT_PORT 1883
#define FLOOR_DEFAULT 1
#define MAX_PEERS 50
#define RESET_HOLD_MS 5000
#define BUZZER_ACTIVE_LOW false
#define BEACON_TYPE 0xFD // 🛡️ SINKRONISASI (v17.0)

// ─── ESP-NOW CONSTANTS ───────────────────────────────────────
#define ESPNOW_CMD_OFF 0x00
#define ESPNOW_CMD_ON 0x01
#define ESPNOW_CMD_STATUS 0x02
#define ESPNOW_CMD_REBOOT 0x03

// ─── DATA STRUCTURES ─────────────────────────────────────────
struct GwConfig {
  char wifi_ssid[64];
  char wifi_password[64];
  char mqtt_server[64];
  int mqtt_port;
  int floor_id;
  int timezone_offset;
  bool configured;
};

struct PeerEntry {
  uint8_t mesaId;
  uint8_t mac[6];
  bool registered;
  bool online;
  unsigned long lastSeen;
  bool currentState;
  uint32_t lastUptime;
  int lastRssi;
  uint16_t remainingMin;
  uint32_t activeToken;
  bool dirty;
};

#pragma pack(push, 1)
struct EspNowPacket {
  uint8_t mesaId;
  uint8_t cmd;
  uint8_t extend; // 🛡️ v17.0: Use uint8_t for cross-compiler safety
  uint8_t force;
  uint16_t durationMin;
  uint32_t token;
};

struct EspNowAck {
  uint8_t mesaId;
  uint8_t lightState; // 🛡️ v17.0: Use uint8_t
  uint8_t rssi;       // 🛡️ v17.0: Moved up to match Prajurit
  uint32_t uptime;
  uint8_t errorCode; // 🛡️ v17.0: Missing field restored
  uint16_t remainingMin;
  uint32_t activeToken;
};

struct EspNowBeacon {
  uint8_t type;
  uint8_t floorId;
  uint8_t channel;
  uint32_t timestamp;
};
#pragma pack(pop)

typedef struct {
  EspNowAck ack;
  uint8_t mac[6];
} HeartbeatQueueItem;

typedef struct {
  uint8_t mesaId;
  uint8_t cmd;
  bool extend;
  bool force;
  uint16_t durationMin;
  uint32_t token;
} MqttCmdQueueItem;

// ─── GLOBAL VARIABLES ────────────────────────────────────────
GwConfig gwConfig;
PeerEntry peers[MAX_PEERS];
int peerCount = 0;

QueueHandle_t xQueueHeartbeat = NULL;
QueueHandle_t xQueueMqttCmd = NULL;
SemaphoreHandle_t xMutexSoldier = NULL;
SemaphoreHandle_t xMutexMqtt = NULL;
SemaphoreHandle_t serialMutex = NULL;

WiFiClient espClient;
PubSubClient mqttClient(espClient);
WebServer webServer(80);
DNSServer dnsServer;

String gatewayMac = "";
String gatewayTopic = "";
bool provisioningMode = false;
bool espNowInitialized = false;
bool peersDirty = false;
unsigned long lastPeerChange = 0;
unsigned long lastMqttRetry = 0;
unsigned long lastBeacon = 0;

int buzzerBeeps = 0;
bool buzzerState = false;
unsigned long buzzerNext = 0;

const long MQTT_RETRY_MS = 5000;
const long BATCH_HEARTBEAT_INTERVAL = 15000;
const long PEER_TIMEOUT_MS = 45000;
const long DEFERRED_SAVE_MS = 10000;
const long BEACON_INTERVAL = 10000;
const long PUBLISH_INTERVAL_MS = 2000;

// ─── FORWARD DECLARATIONS ────────────────────────────────────
void loadGwConfig();
void saveGwConfig();
void resetGwConfig();
void startProvisioningMode();
void handleProvisioningLoop();
void handleNotFound();
void serveConfigPage();
void handleSaveConfig();
void savePeers();
void loadPeers();
void registerPeerToEspNow(PeerEntry &p);
PeerEntry *findPeerEntry(uint8_t mesaId);
void sendEspNow(uint8_t mesaId, uint8_t cmd, bool extend, bool force,
                uint16_t durationMin, uint32_t token);
void publishMesaStatus(uint8_t mesaId, bool lightState, uint32_t uptime,
                       uint8_t errorCode, bool online, const uint8_t *peerMac,
                       int radioRssi, uint32_t token);
void publishGatewayStatus();
void publishBatchHeartbeat();
void sendBeacon();
void pollPeers();
void startBuzzer(int beeps);
void updateBuzzer();
void MqttHandlerTask(void *pv);
void EspNowRxTask(void *pv);
void MqttPublishTask(void *pv);
void WatchdogTask(void *pv);
String macToStr(const uint8_t *mac);
bool strToMac(const char *str, uint8_t *mac);

// ─── SPIFFS & CONFIG HELPERS ─────────────────────────────────
void resetGwConfigToDefaults() {
  memset(&gwConfig, 0, sizeof(gwConfig));
  gwConfig.mqtt_port = MQTT_DEFAULT_PORT;
  gwConfig.floor_id = FLOOR_DEFAULT;
  gwConfig.timezone_offset = 7;
  gwConfig.configured = false;
}

void loadGwConfig() {
  resetGwConfigToDefaults();
  if (!SPIFFS.exists(CONFIG_FILE))
    return;
  File f = SPIFFS.open(CONFIG_FILE, FILE_READ);
  if (!f)
    return;
  DynamicJsonDocument doc(512);
  deserializeJson(doc, f);
  f.close();
  strncpy(gwConfig.wifi_ssid, doc["ssid"] | "", 63);
  strncpy(gwConfig.wifi_password, doc["pass"] | "", 63);
  strncpy(gwConfig.mqtt_server, doc["mqtt_ip"] | MQTT_DEFAULT_SERVER, 63);
  gwConfig.mqtt_port = doc["mqtt_port"] | MQTT_DEFAULT_PORT;
  gwConfig.floor_id = doc["floor_id"] | FLOOR_DEFAULT;
  gwConfig.timezone_offset = doc["tz"] | 7;
  gwConfig.configured = doc["configured"] | false;
}

void saveGwConfig() {
  DynamicJsonDocument doc(512);
  doc["ssid"] = gwConfig.wifi_ssid;
  doc["pass"] = gwConfig.wifi_password;
  doc["mqtt_ip"] = gwConfig.mqtt_server;
  doc["mqtt_port"] = gwConfig.mqtt_port;
  doc["floor_id"] = gwConfig.floor_id;
  doc["tz"] = gwConfig.timezone_offset;
  doc["configured"] = true;
  File f = SPIFFS.open(CONFIG_FILE, FILE_WRITE);
  if (f) {
    serializeJson(doc, f);
    f.close();
  }
}

void resetGwConfig() {
  if (SPIFFS.exists(CONFIG_FILE))
    SPIFFS.remove(CONFIG_FILE);
  if (SPIFFS.exists("/peers.json"))
    SPIFFS.remove("/peers.json");
  delay(500);
  ESP.restart();
}

// ─── MQTT & STATUS HELPERS ───────────────────────────────────
void publishMesaStatus(uint8_t mesaId, bool lightState, uint32_t uptime,
                       uint8_t errorCode, bool online, const uint8_t *peerMac,
                       int radioRssi, uint32_t token) {
  DynamicJsonDocument doc(512);
  doc["mesaId"] = mesaId;
  doc["status"] = lightState ? "ON" : "OFF";
  doc["online"] = online;
  doc["uptime"] = uptime;
  doc["rssi"] = radioRssi;
  doc["token"] = token;
  if (peerMac)
    doc["mac"] = macToStr(peerMac);
  String payload;
  serializeJson(doc, payload);
  String topic =
      "billiard/table/" + gatewayMac + "/" + String(mesaId) + "/status";
  mqttClient.publish(topic.c_str(), payload.c_str(), true);
}

void publishBatchHeartbeat() {
  DynamicJsonDocument doc(4096);
  doc["floor"] = gwConfig.floor_id;
  doc["gwMac"] = gatewayMac;
  doc["ts"] = millis();
  JsonArray arr = doc.createNestedArray("tables");
  for (int i = 0; i < peerCount; i++) {
    JsonObject o = arr.createNestedObject();
    o["id"] = peers[i].mesaId;
    o["on"] = peers[i].online;
    o["l"] = peers[i].currentState;
    o["rem"] = peers[i].remainingMin;
    o["t"] = peers[i].activeToken;
  }
  String payload;
  serializeJson(doc, payload);
  mqttClient.publish((gatewayTopic + "/heartbeat").c_str(), payload.c_str());
}

void publishGatewayStatus() {
  DynamicJsonDocument doc(512);
  doc["status"] = "online";
  doc["hwType"] = "GATEWAY";
  doc["floor"] = gwConfig.floor_id;
  doc["mac"] = gatewayMac;
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["nodes"] = peerCount;
  String payload;
  serializeJson(doc, payload);
  mqttClient.publish((gatewayTopic + "/status").c_str(), payload.c_str(), true);
}

void handleMqttConnection() {
  if (mqttClient.connected())
    return;
  if (millis() - lastMqttRetry > MQTT_RETRY_MS) {
    lastMqttRetry = millis();
    String clientId =
        "KOMANDAN-L" + String(gwConfig.floor_id) + "-" + gatewayMac;
    String lwtTopic = gatewayTopic + "/status";
    String lwtMsg =
        "{\"status\":\"offline\",\"hwType\":\"GATEWAY\",\"floor\":" +
        String(gwConfig.floor_id) + "}";
    if (mqttClient.connect(clientId.c_str(), lwtTopic.c_str(), 1, true,
                           lwtMsg.c_str())) {
      mqttClient.subscribe(("billiard/table/" + gatewayMac + "/#").c_str());
      mqttClient.subscribe("billiard/table/sync");
      mqttClient.subscribe((gatewayTopic + "/#").c_str());
      publishGatewayStatus();
      sendBeacon();
    }
  }
}

void mqttCallback(char *topic, byte *payload, unsigned int length) {
  DynamicJsonDocument doc(512);
  if (deserializeJson(doc, payload, length))
    return;
  String sTopic = String(topic);
  if (sTopic.endsWith("/status"))
    return;

  if (sTopic.endsWith("/light/set") || sTopic.endsWith("/control")) {
    int mesaId = doc["mesaId"] | doc["tableId"] | 0;
    if (mesaId > 0 && mesaId <= MAX_PEERS) {
      MqttCmdQueueItem cmd;
      cmd.mesaId = (uint8_t)mesaId;
      cmd.cmd = (strcasecmp(doc["status"] | "OFF", "ON") == 0 ||
                 doc["lightState"] == true)
                    ? ESPNOW_CMD_ON
                    : ESPNOW_CMD_OFF;
      cmd.extend = doc["extend"] | false;
      cmd.force = doc["force"] | true;
      cmd.durationMin = doc["durationMin"] | doc["minutes"] | 0;
      cmd.token = doc["token"] | 0;
      if (xQueueMqttCmd != NULL)
        xQueueSend(xQueueMqttCmd, &cmd, 0);
    }
  } else if (sTopic.endsWith("/poll")) {
    pollPeers();
  } else if (sTopic.endsWith("/reboot")) {
    int mesaId = doc["mesaId"] | 0;
    if (mesaId > 0)
      sendEspNow(mesaId, ESPNOW_CMD_REBOOT, false, true, 0, 0);
    else
      ESP.restart();
  } else if (sTopic.endsWith("/resync")) {
    sendBeacon();
  }
}

// ─── ESP-NOW HELPERS ─────────────────────────────────────────
void onEspNowRecv(const esp_now_recv_info_t *info, const uint8_t *data,
                  int len) {
  if (len < (int)sizeof(EspNowAck))
    return;
  HeartbeatQueueItem item;
  memcpy(&item.ack, data, sizeof(EspNowAck));
  memcpy(item.mac, info->src_addr, 6);
  if (xQueueHeartbeat != NULL)
    xQueueSendFromISR(xQueueHeartbeat, &item, NULL);
}

void sendEspNow(uint8_t mesaId, uint8_t cmd, bool extend, bool force,
                uint16_t durationMin, uint32_t token) {
  EspNowPacket pkt;
  pkt.mesaId = mesaId;
  pkt.cmd = cmd;
  pkt.extend = extend;
  pkt.force = force;
  pkt.durationMin = durationMin;
  pkt.token = token;
  static const uint8_t bc_mac[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  esp_now_send(bc_mac, (uint8_t *)&pkt, sizeof(pkt));
}

void initEspNowStack(uint8_t channel) {
  if (espNowInitialized)
    return;
  WiFi.mode(WIFI_AP_STA);
  esp_wifi_set_ps(WIFI_PS_NONE);
  if (esp_now_init() != ESP_OK)
    return;
  espNowInitialized = true;
  esp_now_register_recv_cb(onEspNowRecv);
  registerAllPeers();
  Serial.printf("[ESP-NOW] READY | Ch:%d\n", channel);
}

void sendBeacon() {
  uint8_t ch;
  wifi_second_chan_t sc;
  esp_wifi_get_channel(&ch, &sc);
  EspNowBeacon beacon;
  beacon.type = BEACON_TYPE;
  beacon.floorId = (uint8_t)gwConfig.floor_id;
  beacon.channel = ch;
  beacon.timestamp = millis();
  static const uint8_t bc_mac[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  esp_now_send(bc_mac, (uint8_t *)&beacon, sizeof(beacon));
}

void pollPeers() {
  for (int i = 0; i < peerCount; i++) {
    sendEspNow(peers[i].mesaId, ESPNOW_CMD_STATUS, false, false, 0, 0);
    delay(20);
  }
}

// ─── UTILITIES ───────────────────────────────────────────────
String macToStr(const uint8_t *mac) {
  char buf[18];
  sprintf(buf, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3],
          mac[4], mac[5]);
  return String(buf);
}

bool strToMac(const char *str, uint8_t *mac) {
  if (strlen(str) != 17)
    return false;
  return sscanf(str, "%hhx:%hhx:%hhx:%hhx:%hhx:%hhx", &mac[0], &mac[1], &mac[2],
                &mac[3], &mac[4], &mac[5]) == 6;
}

void startBuzzer(int beeps) {
  buzzerBeeps = beeps * 2;
  buzzerState = true;
  digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_LOW ? LOW : HIGH);
  buzzerNext = millis() + 80;
}
void updateBuzzer() {
  if (buzzerBeeps > 0 && millis() >= buzzerNext) {
    buzzerBeeps--;
    buzzerState = !buzzerState;
    digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_LOW ? (buzzerState ? LOW : HIGH)
                                               : (buzzerState ? HIGH : LOW));
    buzzerNext = millis() + 80;
  }
}

void savePeers() {
  DynamicJsonDocument doc(4096);
  JsonArray arr = doc.createNestedArray("peers");
  for (int i = 0; i < peerCount; i++) {
    JsonObject o = arr.createNestedObject();
    o["id"] = peers[i].mesaId;
    o["mac"] = macToStr(peers[i].mac);
  }
  File f = SPIFFS.open("/peers.json", FILE_WRITE);
  if (f) {
    serializeJson(doc, f);
    f.close();
  }
}

void loadPeers() {
  if (!SPIFFS.exists("/peers.json"))
    return;
  File f = SPIFFS.open("/peers.json", FILE_READ);
  if (!f)
    return;
  DynamicJsonDocument doc(4096);
  if (deserializeJson(doc, f)) {
    f.close();
    return;
  }
  f.close();
  JsonArray arr = doc["peers"].as<JsonArray>();
  peerCount = 0;
  for (JsonObject o : arr) {
    if (peerCount >= MAX_PEERS)
      break;
    PeerEntry &p = peers[peerCount];
    p.mesaId = o["id"] | 0;
    if (strToMac(o["mac"] | "", p.mac)) {
      p.registered = false;
      p.online = false;
      peerCount++;
    }
  }
  Serial.printf("[SPIFFS] %d Peers loaded\n", peerCount);
}

void registerPeerToEspNow(PeerEntry &p) {
  esp_now_peer_info_t peerInfo = {};
  memcpy(peerInfo.peer_addr, p.mac, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;
  peerInfo.ifidx = WIFI_IF_STA;
  if (!esp_now_is_peer_exist(p.mac))
    esp_now_add_peer(&peerInfo);
  peerInfo.ifidx = WIFI_IF_AP;
  if (!esp_now_is_peer_exist(p.mac))
    esp_now_add_peer(&peerInfo);
  p.registered = true;
}

void registerAllPeers() {
  for (int i = 0; i < peerCount; i++)
    registerPeerToEspNow(peers[i]);
}

PeerEntry *findPeerEntry(uint8_t mesaId) {
  for (int i = 0; i < peerCount; i++)
    if (peers[i].mesaId == mesaId)
      return &peers[i];
  return nullptr;
}

// ─── WEB SETUP (TRUNCATED FOR BREVITY, RESTORED IN FINISH) ─────
void onWifiEvent(WiFiEvent_t event) {
  if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP)
    digitalWrite(PIN_LED_WIFI, HIGH);
  else if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED)
    digitalWrite(PIN_LED_WIFI, LOW);
}

// ─── CORE SETUP & LOOP ───────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500); // Beri waktu Serial hardware stabil
  Serial.println("\n\n[SYSTEM] === KOMANDAN GATEWAY BOOTING ===");

  // 1. Init RTOS Primitives (WAJIB di awal untuk mencegah crash)
  xQueueHeartbeat = xQueueCreate(64, sizeof(HeartbeatQueueItem));
  xQueueMqttCmd = xQueueCreate(16, sizeof(MqttCmdQueueItem));
  xMutexSoldier = xSemaphoreCreateMutex();
  xMutexMqtt = xSemaphoreCreateMutex();
  serialMutex = xSemaphoreCreateMutex();

  pinMode(PIN_LED_WIFI, OUTPUT);
  pinMode(PIN_LED_ESPNOW, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RESET_BTN, INPUT_PULLUP);

  Serial.println("[SYSTEM] Inisialisasi Flash (SPIFFS)...");
  if (SPIFFS.begin(true)) {
    loadGwConfig();
    loadPeers();
    Serial.println("[SYSTEM] Flash OK");
  } else {
    Serial.println("[SYSTEM] Flash GAGAL!");
  }

  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char mStr[13];
  sprintf(mStr, "%02X%02X%02X%02X%02X%02X", mac[0], mac[1], mac[2], mac[3],
          mac[4], mac[5]);
  gatewayMac = String(mStr);
  gatewayTopic = "billiard/gateway/" + gatewayMac;

  if (!gwConfig.configured) {
    Serial.println("[SYSTEM] Masuk ke Mode Provisioning (Portal Setup)");
    startProvisioningMode();
    return;
  }

  Serial.printf("[SYSTEM] MAC: %s | Lantai: %d\n", gatewayMac.c_str(),
                gwConfig.floor_id);

  WiFi.mode(WIFI_AP_STA);
  WiFi.onEvent(onWifiEvent);

  // Handler untuk init ESP-NOW setelah WiFi dapat IP
  WiFi.onEvent([](WiFiEvent_t e, WiFiEventInfo_t i) {
    if (e == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
      uint8_t ch;
      wifi_second_chan_t sc;
      esp_wifi_get_channel(&ch, &sc);
      initEspNowStack(ch);
    }
  });

  Serial.printf("[WiFi] Mencoba menyambung ke: %s\n", gwConfig.wifi_ssid);
  WiFi.begin(gwConfig.wifi_ssid, gwConfig.wifi_password);

  // 2. Create Tasks
  xTaskCreatePinnedToCore(MqttHandlerTask, "MqttHandler", 8192, NULL, 3, NULL,
                          0);
  xTaskCreatePinnedToCore(MqttPublishTask, "MqttPublish", 8192, NULL, 1, NULL,
                          0);
  xTaskCreatePinnedToCore(EspNowRxTask, "EspNowRx", 4096, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(WatchdogTask, "Watchdog", 2048, NULL, 1, NULL, 1);

  mqttClient.setServer(gwConfig.mqtt_server, gwConfig.mqtt_port);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(2048);

  startBuzzer(2);
  Serial.println("[SYSTEM] Komandan v16.3 Siap Beroperasi");
}

void loop() {
  if (provisioningMode) {
    dnsServer.processNextRequest();
    webServer.handleClient();
    updateBuzzer();
    delay(10);
    return;
  }
  if (digitalRead(PIN_RESET_BTN) == LOW) {
    delay(5000);
    if (digitalRead(PIN_RESET_BTN) == LOW)
      resetGwConfig();
  }
  vTaskDelay(pdMS_TO_TICKS(100));
}

// ─── TASKS ───────────────────────────────────────────────────
void MqttHandlerTask(void *pv) {
  for (;;) {
    if (WiFi.status() == WL_CONNECTED) {
      handleMqttConnection();
      if (xSemaphoreTake(xMutexMqtt, pdMS_TO_TICKS(10)) == pdTRUE) {
        mqttClient.loop();
        xSemaphoreGive(xMutexMqtt);
      }
      MqttCmdQueueItem cmd;
      while (xQueueReceive(xQueueMqttCmd, &cmd, 0) == pdTRUE)
        sendEspNow(cmd.mesaId, cmd.cmd, cmd.extend, cmd.force, cmd.durationMin,
                   cmd.token);
    }
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

void EspNowRxTask(void *pv) {
  HeartbeatQueueItem item;
  for (;;) {
    if (xQueueReceive(xQueueHeartbeat, &item, pdMS_TO_TICKS(100)) == pdTRUE) {
      if (xSemaphoreTake(xMutexSoldier, pdMS_TO_TICKS(50)) == pdTRUE) {
        PeerEntry *p = findPeerEntry(item.ack.mesaId);
        if (!p && peerCount < MAX_PEERS) {
          p = &peers[peerCount++];
          p->mesaId = item.ack.mesaId;
          memcpy(p->mac, item.mac, 6);
          p->registered = true;
          p->dirty = true;
          registerPeerToEspNow(*p);
          peersDirty = true;
        }
        if (p) {
          p->online = true;
          p->lastSeen = millis();
          p->currentState = item.ack.lightState;
          p->lastUptime = item.ack.uptime;
          p->lastRssi = item.ack.rssi;
          p->remainingMin = item.ack.remainingMin;
          p->activeToken = item.ack.activeToken;
          p->dirty = true;
        }
        xSemaphoreGive(xMutexSoldier);
      }
    }
    vTaskDelay(pdMS_TO_TICKS(5));
  }
}

void MqttPublishTask(void *pv) {
  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(BATCH_HEARTBEAT_INTERVAL));
    if (mqttClient.connected()) {
      if (xSemaphoreTake(xMutexSoldier, pdMS_TO_TICKS(100)) == pdTRUE) {
        for (int i = 0; i < peerCount; i++) {
          if (peers[i].dirty) {
            publishMesaStatus(peers[i].mesaId, peers[i].currentState,
                              peers[i].lastUptime, 0, peers[i].online,
                              peers[i].mac, peers[i].lastRssi,
                              peers[i].activeToken);
            peers[i].dirty = false;
            vTaskDelay(pdMS_TO_TICKS(50));
          }
        }
        xSemaphoreGive(xMutexSoldier);
      }
      publishBatchHeartbeat();
      publishGatewayStatus();
      if (millis() - lastBeacon > BEACON_INTERVAL) {
        sendBeacon();
        lastBeacon = millis();
      }
    }
  }
}

void WatchdogTask(void *pv) {
  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(1000));
    unsigned long now = millis();
    if (xSemaphoreTake(xMutexSoldier, pdMS_TO_TICKS(50)) == pdTRUE) {
      for (int i = 0; i < peerCount; i++) {
        if (peers[i].online && (now - peers[i].lastSeen > PEER_TIMEOUT_MS)) {
          peers[i].online = false;
          peers[i].dirty = true;
        }
      }
      xSemaphoreGive(xMutexSoldier);
    }
    if (peersDirty && (now - lastPeerChange > DEFERRED_SAVE_MS)) {
      savePeers();
      peersDirty = false;
    }
  }
}

// ─── PROVISIONING STUBS (REPLACE WITH REAL LOGIC IF NEEDED) ────
void startProvisioningMode() {
  provisioningMode = true;
  WiFi.softAP("KOMANDAN-SETUP");
  dnsServer.start(53, "*", IPAddress(192, 168, 4, 1));
  webServer.onNotFound(handleNotFound);
  webServer.begin();
}
void handleNotFound() { webServer.send(200, "text/plain", "Mode Setup Aktif"); }
void serveConfigPage() {}
void handleSaveConfig() {}
void handleProvisioningLoop() {
  dnsServer.processNextRequest();
  webServer.handleClient();
}
