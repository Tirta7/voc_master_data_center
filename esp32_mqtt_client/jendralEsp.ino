/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║        ESP-NOW REMOTE — SI JENDRAL (Billiard System)             ║
 * ║        VOC SYSTEM (Spot On Billiard)                             ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Fitur : Web Portal Premium, Dynamic Table List, Admin Security  ║
 * ║  Chip  : ESP32 (DevKit V1 / WROOM)                               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
#include <DNSServer.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <vector>

// ─── CONFIG ──────────────────────────────────────────────────────
#define PIN_LED 2
#define PIN_BOOT 0

// ─── ESP-NOW PACKET ──────────────────────────────────────────────
typedef struct __attribute__((packed)) {
  int32_t mesaId;
  int32_t cmd;
  int32_t durationMin;
  uint32_t token;
  int32_t wifiChannel;
} espnow_pkt_t;

#define CMD_OFF 0
#define CMD_ON 1
#define CMD_REMOTE_OFF 1000
#define CMD_REMOTE_ON 1001
#define CMD_DISCOVERY 99

// ─── GLOBALS ─────────────────────────────────────────────────────
Preferences prefs;
WebServer server(80);
DNSServer dnsServer;

struct JendralConfig {
  char adminPass[32];
  char tableList[128];
  char deviceTitle[32];
  char blacklist[256]; // 🛡️ MAC Terblokir (CSV)
  uint8_t cmdMac[6];
  int channel;
};
JendralConfig cfg;

struct DetectedCmd {
  uint8_t mac[6];
  int floor;
  char block;
  unsigned long lastSeen;
};
std::vector<DetectedCmd> nearby;

bool hasCommander = false;
int currentFloor = 0;
char currentBlock = '-';
unsigned long lastDiscovery = 0;
std::vector<int> tables;

// ─── TEST MODE GLOBALS ───────────────────────────────────────────
int currentTestMode = 0;
unsigned long lastTestStep = 0;
int testStepIdx = 0;

// ─── HELPERS ─────────────────────────────────────────────────────
bool isBlacklisted(const uint8_t *m) {
  char ms[13];
  sprintf(ms, "%02X%02X%02X%02X%02X%02X", m[0], m[1], m[2], m[3], m[4], m[5]);
  return (strstr(cfg.blacklist, ms) != NULL);
}
void parseTableList() {
  tables.clear();
  char buf[128];
  strcpy(buf, cfg.tableList);
  char *p = strtok(buf, ",");
  while (p != NULL) {
    int id = atoi(p);
    if (id > 0)
      tables.push_back(id);
    p = strtok(NULL, ",");
  }
}

void sendCmd(int id, int s) {
  espnow_pkt_t pkt = {};
  pkt.mesaId = id;
  pkt.cmd = (s == 1) ? CMD_REMOTE_ON : CMD_REMOTE_OFF;
  pkt.durationMin = 0;
  pkt.token = (uint32_t)millis();
  pkt.wifiChannel = cfg.channel;
  uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  esp_now_send(bc, (uint8_t *)&pkt, sizeof(pkt));
}

bool isMacSet(const uint8_t *m) {
  for (int i = 0; i < 6; i++)
    if (m[i])
      return true;
  return false;
}

// ─── ESP-NOW ─────────────────────────────────────────────────────
// ─── STATUS TRACKER ─────────────────────────────────────────────
struct TableState {
  int id;
  bool isOn;
};
std::vector<TableState> tableStatus;

void updateStatus(int id, bool on) {
  for (auto &s : tableStatus) {
    if (s.id == id) {
      s.isOn = on;
      return;
    }
  }
  tableStatus.push_back({id, on});
}

bool getStatus(int id) {
  for (auto &s : tableStatus) {
    if (s.id == id)
      return s.isOn;
  }
  return false;
}

// ─── ESP-NOW RECEIVE ─────────────────────────────────────────────
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  if (len < (int)sizeof(espnow_pkt_t))
    return;
  espnow_pkt_t pkt;
  memcpy(&pkt, data, sizeof(espnow_pkt_t));

  // 📝 LOG SETIAP PAKET (Hanya untuk Debug)
  // Serial.printf("[DEBUG] Mac: %02X:%02X | mesaId: %d | cmd: %d\n",
  // info->src_addr[4], info->src_addr[5], pkt.mesaId, pkt.cmd);

  // 🛡️ Identifikasi Komandan via Beacon (mesaId=0)
  if (pkt.mesaId == 0 && pkt.wifiChannel >= 1) {
    if (isBlacklisted(info->src_addr))
      return;

    // Update Registry Sekitar
    bool found = false;
    for (auto &c : nearby) {
      if (memcmp(c.mac, info->src_addr, 6) == 0) {
        c.lastSeen = millis();
        c.floor = pkt.durationMin;
        c.block = (char)pkt.token;
        found = true;
        break;
      }
    }
    if (!found) {
      DetectedCmd c;
      memcpy(c.mac, info->src_addr, 6);
      c.floor = pkt.durationMin;
      c.block = (char)pkt.token;
      c.lastSeen = millis();
      nearby.push_back(c);
    }

    // Auto-Sync ke Komandan yang valid
    if (!hasCommander || (memcmp(info->src_addr, cfg.cmdMac, 6) == 0) ||
        pkt.wifiChannel != cfg.channel) {
      memcpy(cfg.cmdMac, info->src_addr, 6);
      cfg.channel = pkt.wifiChannel;
      currentFloor = pkt.durationMin;
      currentBlock = (char)pkt.token;
      hasCommander = true;

      Serial.printf("[SYNC] Terkunci ke Komandan: %02X:%02X:%02X | Ch: %d\n",
                    cfg.cmdMac[3], cfg.cmdMac[4], cfg.cmdMac[5], cfg.channel);

      if (esp_now_is_peer_exist(cfg.cmdMac))
        esp_now_del_peer(cfg.cmdMac);
      esp_now_peer_info_t pinfo = {};
      memcpy(pinfo.peer_addr, cfg.cmdMac, 6);
      pinfo.ifidx = WIFI_IF_STA;
      esp_now_add_peer(&pinfo);

      esp_wifi_set_channel(cfg.channel, WIFI_SECOND_CHAN_NONE);
    }
  }

  // Monitoring Status (Heartbeat/ACK dari Prajurit)
  if (pkt.mesaId > 0) {
    bool st = false;
    bool recognized = false;
    if (pkt.cmd == 100) {
      st = (pkt.durationMin == 1);
      recognized = true;
    } else if (pkt.cmd == 1 || pkt.cmd == 1001) {
      st = true;
      recognized = true;
    } else if (pkt.cmd == 0 || pkt.cmd == 1000) {
      st = false;
      recognized = true;
    }

    if (recognized) {
      updateStatus(pkt.mesaId, st);
      Serial.printf("[HB] Meja %d | Cmd: %d | Status: %s\n", pkt.mesaId,
                    pkt.cmd, st ? "ON" : "OFF");
    }
  }
}

// ─── TEST MODE LOGIC ─────────────────────────────────────────────
void handleTestModes() {
  if (currentTestMode == 0 || tables.empty())
    return;
  unsigned long now = millis();

  if (currentTestMode == 1) { // WAVE
    if (now - lastTestStep > 500) {
      lastTestStep = now;
      sendCmd(tables[testStepIdx], 1);
      testStepIdx = (testStepIdx + 1) % tables.size();
      if (testStepIdx == 0) {
        delay(500);
        for (int id : tables)
          sendCmd(id, 0);
      }
    }
  } else if (currentTestMode == 2) { // DISCO
    if (now - lastTestStep > 200) {
      lastTestStep = now;
      int rid = tables[random(tables.size())];
      sendCmd(rid, random(2));
    }
  } else if (currentTestMode == 3) { // CHASE
    if (now - lastTestStep > 400) {
      lastTestStep = now;
      for (int id : tables)
        sendCmd(id, 0);
      sendCmd(tables[testStepIdx], 1);
      testStepIdx = (testStepIdx + 1) % tables.size();
    }
  }
}

// ─── WEB UI ──────────────────────────────────────────────────────
String getHeader(String title) {
  String html = "<!DOCTYPE html><html lang='id'><head>";
  html += "<meta charset='UTF-8'><meta name='viewport' "
          "content='width=device-width,initial-scale=1,viewport-fit=cover'>";
  html += "<title>" + title + "</title>";
  html += "<link "
          "href='https://fonts.googleapis.com/"
          "css2?family=Outfit:wght@300;400;600&display=swap' rel='stylesheet'>";
  html += "<script src='https://unpkg.com/lucide@latest'></script>";
  html += "<style>";
  html += ":root{--p:#00f2ff;--bg:#020617;--card:rgba(30,41,59,0.5);--on:#"
          "22c55e;--off:#64748b;--text:#f8fafc}";
  html += "*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-"
          "color:transparent}";
  html += "body{font-family:'Outfit',sans-serif;background:var(--bg);color:var("
          "--text);min-height:100vh;padding:25px 15px;line-height:1.5}";
  html += ".container{max-width:850px;margin:0 auto}";
  html += "header{display:flex;justify-content:space-between;align-items:"
          "center;margin-bottom:30px;padding:0 5px}";
  html += "h1{font-size:1.4rem;font-weight:600;letter-spacing:1px;background:"
          "linear-gradient(to "
          "right,#fff,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-"
          "color:transparent}";
  html += ".status{display:flex;align-items:center;gap:8px;font-size:0.7rem;"
          "background:rgba(255,255,255,0.05);padding:6px "
          "14px;border-radius:100px;border:1px solid rgba(255,255,255,0.1)}";
  html += ".dot{width:8px;height:8px;border-radius:50%;background:#444}.dot.on{"
          "background:var(--on);box-shadow:0 0 12px var(--on)}";
  html += ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax("
          "150px,1fr));gap:20px;margin-bottom:40px}";
  html += "@media(orientation:landscape){.grid{grid-template-columns:repeat("
          "auto-fill,minmax(200px,1fr))}}";
  html += ".card{background:var(--card);backdrop-filter:blur(20px);border:2px "
          "solid transparent;border-radius:28px;padding:25px;transition:all "
          "0.3s ease;text-align:center;position:relative}";
  html += ".card.active{border-color:var(--on);background:rgba(34,197,94,0.15);"
          "box-shadow:0 0 20px rgba(34,197,94,0.3)}";
  html += ".icon-box{margin-bottom:15px;color:rgba(255,255,255,0.05);"
          "transition:0.3s}";
  html += ".active .icon-box{color:var(--on);filter:drop-shadow(0 0 8px "
          "var(--on))}";
  html += ".mesa-num{font-size:2.4rem;font-weight:700;margin-bottom:20px;color:"
          "#fff;transition:0.3s}";
  html += ".active .mesa-num{color:var(--on);transform:scale(1.1)}";
  html += ".btn-grp{display:flex;gap:10px}";
  html += ".btn{flex:1;border:none;border-radius:16px;padding:14px;font-weight:"
          "700;font-size:0.8rem;cursor:pointer;transition:0.2s;display:flex;"
          "align-items:center;justify-content:center;gap:6px}";
  html += ".btn-on{background:var(--on);color:#fff}.btn-off{background:rgba("
          "255,255,255,0.1);color:var(--text)}";
  html += ".btn-dim{opacity:0.2!important;pointer-events:none}";
  html += ".section-title{font-size:0.7rem;font-weight:600;color:var(--p);text-"
          "transform:uppercase;margin:30px 0 "
          "15px;letter-spacing:2px;display:flex;align-items:center;gap:10px}";
  html += ".nav{position:fixed;bottom:25px;left:50%;transform:translateX(-50%);"
          "background:rgba(15,23,42,0.95);backdrop-filter:blur(20px);padding:"
          "10px;border-radius:100px;border:1px solid "
          "rgba(255,255,255,0.1);display:flex;gap:8px;z-index:1000}";
  html += ".nav-link{padding:12px "
          "28px;border-radius:50px;color:rgba(255,255,255,0.4);text-decoration:"
          "none;font-size:0.85rem;font-weight:600;transition:0.3s}";
  html += ".nav-link.active{background:#fff;color:#000}";
  html += ".manage-item{display:flex;justify-content:space-between;align-items:"
          "center;padding:12px "
          "15px;background:rgba(255,255,255,0.03);border-radius:12px;margin-"
          "bottom:8px}";
  html += ".del-btn{color:#ef4444;text-decoration:none;display:flex;align-"
          "items:center}";
  html += "input[type='text'],input[type='password'],input[type='number']{"
          "width:100%;padding:12px "
          "15px;margin-bottom:15px;border-radius:12px;border:1px solid "
          "rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;"
          "font-size:0.9rem}";
  html += "</style></head><body><div class='container'>";
  return html;
}

void handleRoot() {
  String html = getHeader(String(cfg.deviceTitle));

  // Header dengan status Komandan
  html += "<header><h1>" + String(cfg.deviceTitle) + "</h1>";
  char macStr[18];
  sprintf(macStr, "%02X:%02X:%02X", cfg.cmdMac[3], cfg.cmdMac[4],
          cfg.cmdMac[5]);
  html += "<div class='status'><div class='dot " +
          String(hasCommander ? "on" : "") + "'></div>";
  if (hasCommander)
    html += "SYNC: " + String(macStr) + " | CH:" + String(cfg.channel);
  else
    html += "SCANNING...";
  html += "</div></header>";

  // Grid kartu meja
  html += "<div class='grid'>";
  for (int m : tables) {
    bool isOn = getStatus(m);
    String active = isOn ? " active" : "";
    html += "<div class='card" + active + "' id='card-" + String(m) + "'>";
    html += "<div class='mesa-num'>" + String(m) + "</div>";
    html += "<div class='btn-grp'>";
    html += "<button class='btn btn-on" + String(isOn ? " btn-dim" : "") +
            "' id='on-" + String(m) + "' onclick='ctrl(" + String(m) +
            ",1)'>ON</button>";
    html += "<button class='btn btn-off" + String(!isOn ? " btn-dim" : "") +
            "' id='off-" + String(m) + "' onclick='ctrl(" + String(m) +
            ",0)'>OFF</button>";
    html += "</div></div>";
  }
  html += "</div>";
  html +=
      "<div class='nav'><a href='/' class='nav-link active'>DASHBOARD</a><a "
      "href='/settings' class='nav-link'>SETTINGS</a></div>";

  html += R"raw(<script>
let locks = {}; 
function applyState(id, isOn) {
  if (locks[id] && Date.now() < locks[id]) return;
  const card = document.getElementById('card-' + id);
  const btnOn = document.getElementById('on-' + id);
  const btnOff = document.getElementById('off-' + id);
  if (!card) return;
  if (isOn) { card.classList.add('active'); } else { card.classList.remove('active'); }
  if (isOn) { btnOn.classList.add('btn-dim'); btnOff.classList.remove('btn-dim'); }
  else { btnOn.classList.remove('btn-dim'); btnOff.classList.add('btn-dim'); }
  btnOn.disabled = false; btnOn.textContent = 'ON';
  btnOff.disabled = false; btnOff.textContent = 'OFF';
}
function ctrl(id, s) {
  locks[id] = Date.now() + 800; // Lock super pendek: 0.8 detik
  document.getElementById(s==1?'on-'+id:'off-'+id).textContent = '...';
  const card = document.getElementById('card-' + id);
  const btnOn = document.getElementById('on-' + id);
  const btnOff = document.getElementById('off-' + id);
  if (s==1) { card.classList.add('active'); btnOn.classList.add('btn-dim'); btnOff.classList.remove('btn-dim'); }
  else { card.classList.remove('active'); btnOn.classList.remove('btn-dim'); btnOff.classList.add('btn-dim'); }
  fetch('/ctrl?id='+id+'&s='+s).catch(()=>{ delete locks[id]; });
}
setInterval(() => {
  fetch('/status').then(r => r.json()).then(data => {
    for (const [id, isOn] of Object.entries(data)) { applyState(id, isOn); }
  }).catch(()=>{});
}, 400); // Poling Ultra-Fast: 0.4 detik
</script></div></body></html>)raw";

  server.send(200, "text/html", html);
}

void handleSettings() {
  if (!server.authenticate("admin", cfg.adminPass))
    return server.requestAuthentication();
  String html = getHeader("Settings");
  html += "<header><h1>Settings</h1></header>";

  html += "<div class='section-title'><i data-lucide='plus-circle' "
          "size='14'></i> Tambah Meja</div>";
  html += "<form action='/add' method='POST' "
          "style='display:flex;gap:10px;padding:15px'>";
  html += "<input type='number' name='new_id' placeholder='ID Meja' required "
          "style='margin:0'>";
  html += "<button type='submit' class='btn btn-on' style='flex:0 0 "
          "100px'>ADD</button></form>";

  html += "<div class='section-title'><i data-lucide='radio' size='14'></i> "
          "Komandan Terdeteksi</div>";
  html += "<div class='section-title'><i data-lucide='shield-check' "
          "size='14'></i> Keamanan & Branding</div>";
  html += "<form action='/save' method='POST'>";
  html += "<label "
          "style='display:block;font-size:0.6rem;color:#555;margin-bottom:5px'>"
          "JUDUL DASHBOARD</label>";
  html += "<input type='text' name='title' value='" + String(cfg.deviceTitle) +
          "'>";
  html += "<label "
          "style='display:block;font-size:0.6rem;color:#555;margin-bottom:5px'>"
          "PASSWORD ADMIN</label>";
  html += "<input type='password' name='pass' value='" + String(cfg.adminPass) +
          "'>";
  html += "<button type='submit' class='btn btn-on' style='width:100%'>SIMPAN "
          "PERUBAHAN</button></form>";

  html += "<div class='section-title'><i data-lucide='list' size='14'></i> "
          "Daftar Meja Terpasang</div>";
  if (tables.empty())
    html += "<div "
            "style='text-align:center;color:rgba(255,255,255,0.2);padding:20px'"
            ">Belum ada meja.</div>";
  for (int m : tables) {
    html += "<div class='manage-item'><span>Meja " + String(m) + "</span>";
    html += "<a href='/del?id=" + String(m) + "' class='del-btn' style='background:#ef4444;color:#fff;padding:5px 10px;border-radius:8px;font-size:0.6rem;text-decoration:none'>HAPUS</a></div>";
  }

  html += "<div style='height:100px'></div>";
  html += "<nav><a href='/' class='nav-link'>DASHBOARD</a><a href='/settings' "
          "class='nav-link active'>SETTINGS</a></nav>";
  html += "<script>lucide.createIcons();</script></div></body></html>";
  server.send(200, "text/html", html);
}

void handleSave() {
  if (!server.authenticate("admin", cfg.adminPass))
    return server.requestAuthentication();
  String p = server.arg("pass");
  String t = server.arg("title");
  if (p.length() > 0)
    strncpy(cfg.adminPass, p.c_str(), 32);
  if (t.length() > 0)
    strncpy(cfg.deviceTitle, t.c_str(), 32);
  prefs.putBytes("cfg", &cfg, sizeof(cfg));
  server.sendHeader("Location", "/settings", true);
  server.send(302);
}

void handleAdd() {
  if (!server.authenticate("admin", cfg.adminPass))
    return server.requestAuthentication();
  int newId = server.arg("new_id").toInt();
  if (newId > 0) {
    String current = String(cfg.tableList);
    if (current.length() > 0)
      current += ",";
    current += String(newId);
    strncpy(cfg.tableList, current.c_str(), 128);
    prefs.putBytes("cfg", &cfg, sizeof(cfg));
    parseTableList();
  }
  server.sendHeader("Location", "/settings", true);
  server.send(302);
}

void handleDel() {
  if (!server.authenticate("admin", cfg.adminPass))
    return server.requestAuthentication();
  int idToDel = server.arg("id").toInt();
  String newList = "";
  for (size_t i = 0; i < tables.size(); i++) {
    if (tables[i] != idToDel) {
      if (newList.length() > 0)
        newList += ",";
      newList += String(tables[i]);
    }
  }
  strncpy(cfg.tableList, newList.c_str(), 128);
  prefs.putBytes("cfg", &cfg, sizeof(cfg));
  parseTableList();
  server.sendHeader("Location", "/settings", true);
  server.send(302);
}

void handleIgnore() {
  if (!server.authenticate("admin", cfg.adminPass))
    return server.requestAuthentication();
  String mac = server.arg("mac");
  if (mac.length() == 12) {
    String current = String(cfg.blacklist);
    if (current.indexOf(mac) == -1) {
      if (current.length() > 0)
        current += ",";
      current += mac;
      strncpy(cfg.blacklist, current.c_str(), 256);
      prefs.putBytes("cfg", &cfg, sizeof(cfg));
      hasCommander = false; // Reset sync agar mencari yang lain
    }
  }
  server.sendHeader("Location", "/settings", true);
  server.send(302);
}

void handleClearBlock() {
  if (!server.authenticate("admin", cfg.adminPass))
    return server.requestAuthentication();
  memset(cfg.blacklist, 0, 256);
  prefs.putBytes("cfg", &cfg, sizeof(cfg));
  server.sendHeader("Location", "/settings", true);
  server.send(302);
}

void handleTest() {
  currentTestMode = server.arg("m").toInt();
  testStepIdx = 0;
  lastTestStep = millis();
  if (currentTestMode == 0) {
    for (int id : tables)
      sendCmd(id, 0);
  }
  server.send(200, "text/plain", "OK");
}

void handleCtrl() {
  int id = server.arg("id").toInt();
  int s = server.arg("s").toInt();
  Serial.printf("[UI-CTRL] Meja %d -> %s\n", id, s ? "ON" : "OFF");
  updateStatus(id,
               s == 1); // ⚡ UPDATE INSTAN: Dashboard akan langsung sinkron!
  sendCmd(id, s);
  server.send(200, "text/plain", "OK");
}

// ─── STATUS API ──────────────────────────────────────────────────
void handleStatus() {
  String json = "{";
  for (size_t i = 0; i < tables.size(); i++) {
    json += "\"" + String(tables[i]) +
            "\":" + (getStatus(tables[i]) ? "true" : "false");
    if (i < tables.size() - 1)
      json += ",";
  }
  json += "}";
  server.send(200, "application/json", json);
}

// ─── SETUP ───────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BOOT, INPUT_PULLUP);

  prefs.begin("jendral", false);
  if (digitalRead(PIN_BOOT) == LOW)
    prefs.clear();

  if (prefs.getBytes("cfg", &cfg, sizeof(cfg)) != sizeof(cfg)) {
    strcpy(cfg.adminPass, "12345678");
    strcpy(cfg.tableList, "1,2,3,4,5");
    strcpy(cfg.deviceTitle, "VOC JENDRAL");
    memset(cfg.blacklist, 0, 256);
    memset(cfg.cmdMac, 0, 6);
    cfg.channel = 1;
    prefs.putBytes("cfg", &cfg, sizeof(cfg));
  }
  parseTableList();

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAPdisconnect(false);
  delay(100);

  uint64_t chipid = ESP.getEfuseMac();
  uint16_t id_short = (uint16_t)(chipid >> 32);
  char suffix[5];
  sprintf(suffix, "%04X", id_short);

  String apName = "VOC-JENDRAL-" + String(suffix);
  WiFi.softAP(apName.c_str(), "12345678");

  if (esp_now_init() == ESP_OK) {
    esp_now_register_recv_cb(OnDataRecv);
    uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, bc, 6);
    peer.ifidx = WIFI_IF_STA;
    esp_now_add_peer(&peer);
  }

  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.on("/settings", handleSettings);
  server.on("/save", handleSave);
  server.on("/add", handleAdd);
  server.on("/del", handleDel);
  server.on("/ignore", handleIgnore);
  server.on("/clear_block", handleClearBlock);
  server.on("/ctrl", handleCtrl);
  server.on("/test", handleTest);
  server.begin();

  Serial.println("[SYSTEM] Jendral Aktif.");
  Serial.printf("[SYSTEM] AP: %s | Pass: 12345678\n", apName.c_str());
}

// ─── LOOP ────────────────────────────────────────────────────────
void loop() {
  server.handleClient();
  handleTestModes();
  unsigned long now = millis();
  if (!hasCommander && now - lastDiscovery > 2000) {
    lastDiscovery = now;
    static int ch = 1;
    esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);
    espnow_pkt_t disc = {0, CMD_DISCOVERY, 0, 0, (uint32_t)ch};
    uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_send(bc, (uint8_t *)&disc, sizeof(disc));
    ch = (ch % 13) + 1;
  }
  static unsigned long lastBlink = 0;
  if (now - lastBlink > (hasCommander ? 1000 : 200)) {
    lastBlink = now;
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  }
}
