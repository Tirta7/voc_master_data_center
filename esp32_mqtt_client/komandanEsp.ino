/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║        ESP-NOW GATEWAY — SI KOMANDAN (Billiard System)           ║
 * ║        VOC SYSTEM (Spot On Billiard)                             ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Arsitektur : STAR ZONE — MQTT Backbone  [v7.0]                  ║
 * ║  Fitur      : Prajurit Registry, Unicast, ACK, Portal Config     ║
 * ║  Chip       : ESP32 (DevKit V1 / WROOM)                          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
#include <ArduinoJson.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <WebServer.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

// ─── CONFIG ──────────────────────────────────────────────────────
#define PIN_LED_WIFI 2
#define PIN_BOOT 0
#define MAX_PRAJURIT 20
#define PRAJURIT_TIMEOUT_MS 90000UL // 90 detik → offline
#define BATCH_REPORT_MS 6000UL      // Siklus lapor borongan (6 detik)
#define GATEWAY_REPORT_MS 30000UL   // laporan ke MQTT setiap 30 detik
#define REPORT_QUEUE_SIZE 40

struct Config {
  char ssid[32];
  char pass[64];
  char mqtt_ip[32];
  int floor_id;
  char block_id; // 'A','B','C'... untuk >20 meja per lantai
};

// ─── ESP-NOW PACKET ──────────────────────────────────────────────
typedef struct __attribute__((packed)) {
  int32_t mesaId;
  int32_t cmd; // 0=OFF,1=ON,98=ACK,99=DISCOVERY,100=REGISTER
  int32_t durationMin;
  uint32_t token;
  int32_t wifiChannel;
} espnow_pkt_t;

// ─── PRAJURIT REGISTRY ───────────────────────────────────────────
struct PrajuritEntry {
  uint8_t mac[6];
  int32_t mesaId;
  unsigned long lastSeen;
  bool online;
  int32_t lastCmd;
  int32_t durationMin; // 🛡️ Tambahan durasi untuk Batch Report
  uint32_t lastToken;
  bool ackPending;
  uint32_t pendingToken;
  // ✅ v7.1: ACK Retry System
  espnow_pkt_t lastCmdPkt;  // Simpan paket terakhir untuk retry
  unsigned long lastSentAt; // Kapan terakhir dikirim
  uint8_t retryCount;       // Berapa kali sudah retry
};
PrajuritEntry registry[MAX_PRAJURIT];
int registryCount = 0;

// ─── REPORT QUEUE (Prajurit → MQTT) ─────────────────────────────
struct QueuedReport {
  espnow_pkt_t data;
  uint8_t mac[6];
};
QueuedReport reportQueue[REPORT_QUEUE_SIZE];
volatile int qHead = 0, qTail = 0;

// ─── TABLE STATE (change-based reporting) ────────────────────────
struct TableState {
  unsigned long lastSend;
  int lastCmd;
  uint32_t lastToken;
};
TableState tables[101]; // index = mesaId

// ─── NETWORKING ──────────────────────────────────────────────────
Config cfg;
Preferences prefs;
WiFiClient espClient;
PubSubClient mqttClient(espClient);
WebServer webServer(80);
DNSServer dnsServer;
String deviceMac;
bool portalMode = false;
unsigned long bootPressTime = 0;
TaskHandle_t logicTaskHandle; // Handle untuk Core 0
unsigned long globalLastCmdAt = 0; // 🛡️ Penanda waktu perintah terakhir

// ─── REGISTRY HELPERS ────────────────────────────────────────────
int findPrajurit(int32_t mesaId) {
  for (int i = 0; i < registryCount; i++)
    if (registry[i].mesaId == mesaId)
      return i;
  return -1;
}

int registerPrajurit(int32_t mesaId, const uint8_t *mac) {
  int idx = findPrajurit(mesaId);
  if (idx >= 0) {
    if (memcmp(registry[idx].mac, mac, 6) != 0) {
      memcpy(registry[idx].mac, mac, 6);
      // Re-register peer jika MAC berubah
      if (esp_now_is_peer_exist(mac))
        esp_now_del_peer(mac);
      esp_now_peer_info_t p = {};
      memcpy(p.peer_addr, mac, 6);
      p.ifidx = WIFI_IF_STA;
      esp_now_add_peer(&p);
      Serial.printf("[REGISTRY] Meja %d MAC diperbarui.\n", mesaId);
    }
    registry[idx].lastSeen = millis();
    registry[idx].online = true;
    return idx;
  }
  if (registryCount >= MAX_PRAJURIT) {
    Serial.println("[REGISTRY] PENUH! Max 20 Prajurit per Komandan.");
    return -1;
  }
  int i = registryCount++;
  memcpy(registry[i].mac, mac, 6);
  registry[i].mesaId = mesaId;
  registry[i].lastSeen = millis();
  registry[i].online = true;
  registry[i].lastCmd = -1;
  registry[i].lastToken = 0;
  registry[i].ackPending = false;
  registry[i].pendingToken = 0;

  esp_now_peer_info_t p = {};
  memcpy(p.peer_addr, mac, 6);
  p.ifidx = WIFI_IF_STA;
  if (!esp_now_is_peer_exist(mac))
    esp_now_add_peer(&p);

  char ms[18];
  snprintf(ms, 18, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2],
           mac[3], mac[4], mac[5]);
  Serial.printf("[REGISTRY] Prajurit Baru! Meja %d | MAC: %s\n", mesaId, ms);
  return i;
}

// ─── ESP-NOW RECEIVE ─────────────────────────────────────────────
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  if (len < (int)sizeof(espnow_pkt_t))
    return;
  espnow_pkt_t pkt;
  memcpy(&pkt, data, sizeof(espnow_pkt_t));

  // ─── DISCOVERY (v7.11): Jalur Ekspres ──────────────────────
  if (pkt.cmd == 99) {
    espnow_pkt_t res = {0};
    res.mesaId = pkt.mesaId;
    res.cmd = 98; // ACK/Status
    res.wifiChannel = WiFi.channel();
    esp_now_send(info->src_addr, (uint8_t *)&res, sizeof(espnow_pkt_t));
    Serial.printf(
        "[DISCOVERY] Meja %d mencari Komandan. Respon terkirim di Ch:%d\n",
        pkt.mesaId, res.wifiChannel);
    return;
  }

  // ─── HEARTBEAT / REPORT (v7.14): Hanya lapor status Nyala/Mati asli ──
  if (pkt.mesaId >= 1 && pkt.mesaId <= 100 && (pkt.cmd == 0 || pkt.cmd == 1)) {
    if (qTail == (qHead + REPORT_QUEUE_SIZE - 1) % REPORT_QUEUE_SIZE) {
      // Queue full, ignore
    } else {
      reportQueue[qTail].data = pkt;
      memcpy(reportQueue[qTail].mac, info->src_addr, 6);
      qTail = (qTail + 1) % REPORT_QUEUE_SIZE;
    }
  }

  if (pkt.cmd == 100) { // REGISTER
    registerPrajurit(pkt.mesaId, info->src_addr);
    return;
  }
  if (pkt.cmd == 98) { // ACK
    int idx = findPrajurit(pkt.mesaId);
    if (idx >= 0 && registry[idx].ackPending &&
        registry[idx].pendingToken == pkt.token) {
      registry[idx].ackPending = false;
      Serial.printf("[ACK✓] Meja %d | Token: %u\n", pkt.mesaId, pkt.token);
    }
    return;
  }
  if (pkt.mesaId > 0) { // HEARTBEAT
    int idx = registerPrajurit(pkt.mesaId, info->src_addr);
    if (idx >= 0) {
      registry[idx].lastSeen = millis();
      registry[idx].online = true;
      registry[idx].lastCmd = pkt.cmd;
      registry[idx].durationMin = pkt.durationMin; // 🛡️ Catat durasi

      // ✅ v7.2: Kirim ACK balik ke Prajurit agar lastHeardCommander-nya
      // terupdate Ini mencegah Prajurit timeout (180 detik) karena tidak
      // mendengar beacon
      espnow_pkt_t ackBack = {};
      ackBack.mesaId = pkt.mesaId;
      ackBack.cmd = 98; // ACK
      ackBack.token = pkt.token;
      ackBack.wifiChannel = (int32_t)WiFi.channel();
      esp_now_send(registry[idx].mac, (uint8_t *)&ackBack, sizeof(ackBack));
    }
    int next = (qTail + 1) % REPORT_QUEUE_SIZE;
    if (next != qHead) {
      memcpy((void *)&reportQueue[qTail].data, &pkt, sizeof(espnow_pkt_t));
      memcpy((void *)reportQueue[qTail].mac, info->src_addr, 6);
      qTail = next;
    }
  }
}

// ─── MQTT CALLBACK (Backend → Komandan) ──────────────────────────
void mqttCallback(char *topic, byte *payload, unsigned int length) {
  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, payload, length))
    return;

  // ✅ v7.2: Handle PING (Request status instan dari server)
  if (doc["command"] == "PING") {
    int mesaId = doc["tableId"] | 0;
    if (mesaId > 0 && mesaId <= 100) {
      // Paksa loop utama untuk mengirim laporan di tick berikutnya
      tables[mesaId].lastSend = 0;
      Serial.printf("[PING] Permintaan status Meja %d diterima.\n", mesaId);
    }
    return;
  }

  espnow_pkt_t cmd = {};
  cmd.mesaId = doc["relayPin"] | 0;
  cmd.cmd = (doc["status"] == "ON") ? 1 : 0;
  cmd.durationMin = doc["duration"] | 0;
  cmd.token = doc["token"] | (uint32_t)(millis() % 0xFFFFFFFFu);
  cmd.wifiChannel = WiFi.channel();

  Serial.printf("[MQTT→] Meja %d → %s | Token: %u\n", cmd.mesaId,
                cmd.cmd ? "NYALA" : "MATI", cmd.token);
  globalLastCmdAt = millis(); // 🛡️ Nyalakan "Jeda Tenang"

  int idx = findPrajurit(cmd.mesaId);
  if (idx >= 0) {
    // 🛡️ OPTIMISTIC UPDATE (v7.16): Langsung update registry agar Batch Report tidak kirim data lama
    registry[idx].lastCmd     = cmd.cmd;
    registry[idx].durationMin = cmd.durationMin;
    registry[idx].lastSeen    = millis(); // Segarkan waktu agar tidak dianggap offline

    registry[idx].ackPending   = true;
    registry[idx].pendingToken = cmd.token;
    registry[idx].lastCmdPkt   = cmd;
    registry[idx].lastSentAt   = millis();
    registry[idx].retryCount   = 0;
    esp_now_send(registry[idx].mac, (uint8_t*)&cmd, sizeof(cmd));

    char ms[13];
    sprintf(ms, "%02X%02X%02X%02X%02X%02X", registry[idx].mac[0],
            registry[idx].mac[1], registry[idx].mac[2], registry[idx].mac[3],
            registry[idx].mac[4], registry[idx].mac[5]);
    Serial.printf("[UNICAST→] Meja %d (%s) | Sended.\n", cmd.mesaId, ms);
  } else {
    // Fallback broadcast untuk meja yang belum terdaftar di registry
    uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_send(bc, (uint8_t *)&cmd, sizeof(cmd));
    delay(40);
    esp_now_send(bc, (uint8_t *)&cmd, sizeof(cmd));
    Serial.printf("[BROADCAST→] Meja %d belum terdaftar, pakai broadcast.\n",
                  cmd.mesaId);
  }
}

// ─── RETRY SYSTEM: BACKGROUND TASK (Akan dipindah ke Core 0) ─────
void handleRetry() {
  unsigned long now = millis();
  for (int i = 0; i < registryCount; i++) {
    if (registry[i].ackPending) {
      if (now - registry[i].lastSentAt > 500) {
        if (registry[i].retryCount < 3) {
          registry[i].retryCount++;
          registry[i].lastSentAt = now;
          esp_now_send(registry[i].mac, (uint8_t *)&registry[i].lastCmdPkt,
                       sizeof(espnow_pkt_t));
          Serial.printf("[RETRY] Meja %d | Token: %u | Percobaan ke-%d\n",
                        registry[i].mesaId, registry[i].pendingToken,
                        registry[i].retryCount);
        } else {
          registry[i].ackPending = false;
          Serial.printf("[FAIL] Meja %d tidak merespon (3x retry).\n",
                        registry[i].mesaId);
        }
      }
    }
  }
}

// ─── CORE 0: LOGIC TASK ──────────────────────────────────────────
void logicTask(void *pvParameters) {
  Serial.printf("[SYSTEM] Logic Task berjalan di Core %d\n", xPortGetCoreID());

  for (;;) {
    // 1. Tangani Retry ACK (Sangat kritis, butuh prioritas)
    handleRetry();

    // 2. Tangani Beacon (Broadcast setiap 2 detik - v7.18)
    static unsigned long lastBeacon = 0;
    if (millis() - lastBeacon > 2000) {
      lastBeacon = millis();
      espnow_pkt_t b = {0, 0, 0, 0, (int32_t)WiFi.channel()};
      uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
      esp_now_send(bc, (uint8_t *)&b, sizeof(b));
    }

    vTaskDelay(10 /
               portTICK_PERIOD_MS); // Istirahat 10ms agar WDT tidak trigger
  }
}

// ─── MQTT: PUBLISH GATEWAY STATUS ────────────────────────────────
void publishGatewayStatus() {
  if (!mqttClient.connected())
    return;
  unsigned long now = millis();

  // Update online/offline
  for (int i = 0; i < registryCount; i++)
    registry[i].online = (now - registry[i].lastSeen < PRAJURIT_TIMEOUT_MS);

  StaticJsonDocument<1024> doc;
  doc["floor_id"] = cfg.floor_id;
  doc["block_id"] = String(cfg.block_id);
  doc["mac"] = deviceMac;
  doc["uptime"] = now / 1000;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["channel"] = WiFi.channel();
  doc["prajurit_count"] = registryCount;

  int onlineCnt = 0;
  JsonArray arr = doc.createNestedArray("prajurit");
  for (int i = 0; i < registryCount; i++) {
    if (registry[i].online)
      onlineCnt++;
    JsonObject p = arr.createNestedObject();
    char ms[13];
    sprintf(ms, "%02X%02X%02X%02X%02X%02X", registry[i].mac[0],
            registry[i].mac[1], registry[i].mac[2], registry[i].mac[3],
            registry[i].mac[4], registry[i].mac[5]);
    p["mesaId"] = registry[i].mesaId;
    p["mac"] = ms;
    p["online"] = registry[i].online;
    p["lastCmd"] = registry[i].lastCmd;
    p["lastSeenS"] = (now - registry[i].lastSeen) / 1000;
    p["ackPending"] = registry[i].ackPending;
  }
  doc["online_count"] = onlineCnt;

  char buf[1024];
  serializeJson(doc, buf);

  // Topik baru: per lantai & blok
  char topic[80];
  snprintf(topic, sizeof(topic), "billiard/floor/%d/gateway/%s/status",
           cfg.floor_id, deviceMac.c_str());
  mqttClient.publish(topic, buf, true); // retain=true untuk status gateway

  // Backward compat
  char topic2[80];
  snprintf(topic2, sizeof(topic2), "billiard/gateway/%s/status",
           deviceMac.c_str());
  mqttClient.publish(topic2, buf, false);

  Serial.printf("[GW-REPORT] %d/%d Prajurit Online → %s\n", onlineCnt,
                registryCount, topic);
}

// ─── PORTAL ──────────────────────────────────────────────────────
void handleRoot() {
  String html = R"raw(<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KOMANDAN CONFIG</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
<style>
:root{--p:#00f2ff;--bg:#0b0e14}
body{font-family:'Outfit',sans-serif;background:var(--bg);color:#fff;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:rgba(255,255,255,.04);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:36px;width:90%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
h2{margin:0 0 4px;text-align:center;color:var(--p);font-size:1.1rem;letter-spacing:2px;text-transform:uppercase}
.sub{text-align:center;font-size:.8rem;color:rgba(255,255,255,.35);margin-bottom:24px}
.ig{margin-bottom:18px}.row{display:flex;gap:10px}
label{display:block;font-size:.82rem;color:rgba(255,255,255,.55);margin-bottom:7px}
input,select{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:11px;padding:11px 14px;color:#fff;font-size:.95rem;box-sizing:border-box;transition:.3s}
input:focus,select:focus{outline:none;border-color:var(--p)}
select option{background:#1a1f2e}
.btn{width:100%;margin-top:10px;padding:13px;border:none;border-radius:11px;background:var(--p);color:#000;font-weight:700;font-size:.9rem;cursor:pointer;transition:.3s}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,242,255,.3)}
.btn-scan{background:rgba(255,255,255,.1);color:#fff;width:90px;flex-shrink:0}
.results{margin-top:8px;max-height:140px;overflow-y:auto;background:rgba(0,0,0,.3);border-radius:10px;display:none}
.ssid-item{padding:9px 14px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;font-size:.88rem}
.ssid-item:hover{background:rgba(0,242,255,.1)}
.eye{position:absolute;right:14px;top:37px;cursor:pointer;color:rgba(255,255,255,.3)}
</style></head><body>
<div class="card">
  <h2>🎖️ KOMANDAN</h2>
  <p class="sub">Gateway Billiard — Konfigurasi Zona</p>
  <form action="/save" method="POST">
    <div class="ig">
      <label>WiFi Network (SSID)</label>
      <div class="row">
        <input type="text" name="ssid" id="ssid" placeholder="Pilih atau ketik..." required>
        <button type="button" class="btn btn-scan" onclick="scan()">SCAN</button>
      </div>
      <div class="results" id="res"></div>
    </div>
    <div class="ig" style="position:relative">
      <label>Password WiFi</label>
      <input type="password" name="pass" id="pass" placeholder="••••••••">
      <span class="eye" onclick="togglePass()">👁️</span>
    </div>
    <div class="ig">
      <label>MQTT Broker IP</label>
      <input type="text" name="mqtt" placeholder="192.168.1.100" required>
    </div>
    <div class="ig">
      <div class="row">
        <div style="flex:1"><label>Floor / Lantai</label><input type="number" name="floor" value="1" min="1" max="50" required></div>
        <div style="width:90px"><label>Blok</label>
          <select name="block">
            <option value="A">A</option><option value="B">B</option>
            <option value="C">C</option><option value="D">D</option>
          </select>
        </div>
      </div>
    </div>
    <button type="submit" class="btn">SIMPAN &amp; REBOOT</button>
  </form>
</div>
<script>
function togglePass(){var x=document.getElementById('pass');x.type=x.type==='password'?'text':'password';}
function scan(){var r=document.getElementById('res');r.style.display='block';r.innerHTML='<div class="ssid-item">Scanning...</div>';
fetch('/scan').then(x=>x.json()).then(d=>{r.innerHTML='';d.forEach(n=>{var e=document.createElement('div');e.className='ssid-item';e.innerText=n.ssid+' ('+n.rssi+'dBm)';e.onclick=()=>{document.getElementById('ssid').value=n.ssid;r.style.display='none';};r.appendChild(e);});});}
</script></body></html>)raw";
  webServer.send(200, "text/html", html);
}

void handleScan() {
  int n = WiFi.scanNetworks();
  String j = "[";
  for (int i = 0; i < n; i++) {
    j += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + WiFi.RSSI(i) + "}";
    if (i < n - 1)
      j += ",";
  }
  j += "]";
  webServer.send(200, "application/json", j);
}

void handleSave() {
  strncpy(cfg.ssid, webServer.arg("ssid").c_str(), 32);
  strncpy(cfg.pass, webServer.arg("pass").c_str(), 64);
  strncpy(cfg.mqtt_ip, webServer.arg("mqtt").c_str(), 32);
  cfg.floor_id = webServer.arg("floor").toInt();
  cfg.block_id =
      webServer.arg("block").length() > 0 ? webServer.arg("block")[0] : 'A';
  prefs.putBytes("config", &cfg, sizeof(cfg));
  String s =
      "<html><body "
      "style='background:#0b0e14;color:#00f2ff;font-family:sans-serif;display:"
      "flex;align-items:center;justify-content:center;height:100vh;text-align:"
      "center'><div><h1>TERSIMPAN!</h1><p>Rebooting...</p></div></body></html>";
  webServer.send(200, "text/html", s);
  delay(2000);
  ESP.restart();
}

void startPortal() {
  portalMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.disconnect(true);
  delay(200);

  // Ambil MAC Address Station (Asli) dengan cara standar Arduino agar tidak
  // error
  WiFi.mode(WIFI_STA);
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  mac.toUpperCase();
  String apName = "VOC-KOMANDAN-" + mac.substring(6);

  WiFi.mode(WIFI_AP); // Kembalikan ke mode AP setelah ambil MAC

  // ✅ FIX: Set IP statis eksplisit agar DHCP server berfungsi
  IPAddress apIP(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);
  WiFi.softAPConfig(apIP, gateway, subnet);

  WiFi.softAP(apName.c_str(), "12345678", 6);
  delay(500); // Tunggu AP & DHCP siap sebelum DNS start

  dnsServer.start(53, "*", apIP);
  webServer.on("/", handleRoot);
  webServer.on("/scan", handleScan);
  webServer.on("/save", handleSave);
  webServer.onNotFound([]() {
    webServer.sendHeader("Location", "/", true);
    webServer.send(302);
  });
  webServer.begin();

  Serial.println("[PORTAL] ================================");
  Serial.printf("[PORTAL] WiFi  : %s\n", apName.c_str());
  Serial.println("[PORTAL] Pass  : 12345678");
  Serial.printf("[PORTAL] IP    : %s\n", apIP.toString().c_str());
  Serial.println("[PORTAL] Buka browser → 192.168.4.1");
  Serial.println("[PORTAL] ================================");
}

// ─── SETUP ───────────────────────────────────────────────────────
void setup() {
  pinMode(PIN_BOOT, INPUT_PULLUP);
  pinMode(PIN_LED_WIFI, OUTPUT);
  Serial.begin(115200);
  delay(500);
  Serial.println("\n[SYSTEM] Komandan v7.0 Start...");

  prefs.begin("billiard", false);

  // Hard Reset saat boot
  if (digitalRead(PIN_BOOT) == LOW) {
    Serial.println("[SYSTEM] Hard Reset! Menghapus NVS...");
    prefs.clear();
    delay(2000);
  }

  bool hasConfig = (prefs.getBytes("config", &cfg, sizeof(cfg)) == sizeof(cfg));
  if (!hasConfig || strlen(cfg.ssid) == 0) {
    startPortal();
    return;
  }
  if (cfg.block_id == 0 || cfg.block_id < 'A')
    cfg.block_id = 'A';

  WiFi.mode(WIFI_STA);
  // 🛡️ HIGH SENSITIVITY MODE (v7.18 - SCALE READY)
  esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N);
  esp_wifi_set_ps(WIFI_PS_NONE); // Matikan hemat daya (Sangat Penting!)
  
  delay(300);
  deviceMac = WiFi.macAddress();
  deviceMac.replace(":", "");
  deviceMac.toUpperCase();

  WiFi.begin(cfg.ssid, cfg.pass);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 20) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  Serial.printf("\n\n╔══════════════════════════════════════════╗\n");
  Serial.printf("║   KOMANDAN v7.18 — SCALE READY ✓         ║\n");
  Serial.printf("╚══════════════════════════════════════════╝\n");
  Serial.printf("  MAC STA  : %s\n", WiFi.macAddress().c_str());
  Serial.printf("  SSID     : %s\n", cfg.ssid);
  Serial.printf("  LANTAI   : %d - BLOK %c\n", cfg.floor_id, cfg.block_id);
  Serial.printf("  RADIO    : 11b/g/n (High Sensitivity)\n\n");

  if (esp_now_init() == ESP_OK) {
    esp_now_register_recv_cb(OnDataRecv);
    uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_peer_info_t bp = {};
    memcpy(bp.peer_addr, bc, 6);
    bp.ifidx = WIFI_IF_STA;
    esp_now_add_peer(&bp);
    esp_wifi_config_espnow_rate(WIFI_IF_STA, WIFI_PHY_RATE_1M_L);
  }

  // ✅ v7.2: Dual-Core - Jalankan Logic Task di Core 0
  xTaskCreatePinnedToCore(logicTask, "LogicTask", 8192, NULL, 2,
                          &logicTaskHandle, 0);

  // 8. Konfigurasi MQTT (Tetap di Core 1 / Loop)
  mqttClient.setServer(cfg.mqtt_ip, 1883);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setBufferSize(2048); // ✅ FIX: Wajib 2048 agar GW-REPORT untuk 20
                                  // meja tidak gagal kirim!
  mqttClient.setKeepAlive(30);
  mqttClient.setSocketTimeout(5);

  Serial.println("[SYSTEM] Arsitektur Dual-Core Aktif.");
}

// ─── LOOP ────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ─── BATCH REPORT (v7.17): Lapor borongan tiap 6 detik ──────────
  static unsigned long lastBatch = 0;
  if (now - lastBatch > BATCH_REPORT_MS) {
    lastBatch = now;

    // 🛡️ JEDA TENANG: Jangan lapor jika baru saja ada perintah (mencegah tabrakan data basi)
    if (now - globalLastCmdAt < 5000) {
      Serial.println("[BATCH] Ditunda (Sedang ada perintah masuk)");
    } else {
      int onlineCount = 0;
      Serial.println("[BATCH] Memulai pengiriman status borongan ke Backend...");

    for (int i = 0; i < registryCount; i++) {
      // Cek apakah online berdasarkan timeout 90 detik Bapak
      bool isNodeOnline = (now - registry[i].lastSeen < PRAJURIT_TIMEOUT_MS);
      if (isNodeOnline)
        onlineCount++;

      char ms[13];
      sprintf(ms, "%02X%02X%02X%02X%02X%02X", registry[i].mac[0],
              registry[i].mac[1], registry[i].mac[2], registry[i].mac[3],
              registry[i].mac[4], registry[i].mac[5]);

      StaticJsonDocument<512> doc;
      doc["tableId"] = registry[i].mesaId;
      doc["status"] = registry[i].lastCmd == 1 ? "ON" : "OFF";
      doc["lightState"] = (registry[i].lastCmd == 1);
      doc["remainingMin"] = registry[i].durationMin;
      doc["online"] = isNodeOnline;
      doc["mac"] = ms;
      doc["hwType"] = "ESPNOW_NODE";
      doc["gatewayMac"] = deviceMac;
      doc["floor_id"] = cfg.floor_id;

      char buf[512];
      serializeJson(doc, buf);

      // Publish status ke Backend
      String tStatus = "billiard/heartbeat/" + String(ms);
      mqttClient.publish(tStatus.c_str(), buf);
    }
    Serial.printf("[BATCH] Selesai. %d Prajurit Online.\n", onlineCount);
    }
  }

  // 🛡️ RESTORED: Fitur Asli Bapak ──────────────────────────────────
  // Hard Reset (tahan BOOT 5 detik)
  if (digitalRead(PIN_BOOT) == LOW) {
    if (!bootPressTime)
      bootPressTime = now;
    if (now - bootPressTime > 5000) {
      Serial.println("[SYSTEM] HARD RESET!");
      prefs.clear();
      ESP.restart();
    }
  } else
    bootPressTime = 0;

  if (portalMode) {
    dnsServer.processNextRequest();
    webServer.handleClient();
    return;
  }

  // MQTT reconnect
  if (!mqttClient.connected()) {
    String cid = "Komandan-" + deviceMac;
    if (mqttClient.connect(cid.c_str())) {
      String subCmd = "billiard/table/" + deviceMac + "/#";
      mqttClient.subscribe(subCmd.c_str());
      mqttClient.subscribe("billiard/table/sync");
    } else {
      delay(3000);
      return;
    }
  }
  mqttClient.loop();
  // ────────────────────────────────────────────────────────────────

  // Gateway status report (semua Prajurit)
  static unsigned long lastGwReport = 0;
  if (now - lastGwReport > GATEWAY_REPORT_MS) {
    lastGwReport = now;
    publishGatewayStatus();
  }
}
