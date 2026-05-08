/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║        ESP-NOW NODE — SI PRAJURIT (Billiard System)              ║
 * ║        VOC SYSTEM (Spot On Billiard)                             ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  Arsitektur : STAR ZONE — MQTT Backbone  [v7.0]                  ║
 * ║  Fitur      : Config Portal, ACK, Fast Unicast Discovery         ║
 * ║  Chip       : ESP32-C3 Super Mini                                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
#include <DNSServer.h>
#include <Preferences.h>
#include <WebServer.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

// ─── PINS ────────────────────────────────────────────────────────
#define PIN_RELAY 7
#define PIN_LED 8
#define PIN_BOOT 9 // BOOT button ESP32-C3 Super Mini

// ─── TIMING ──────────────────────────────────────────────────────
#define COMMANDER_TIMEOUT_MS 60000UL  // 60 detik (1 menit)
#define SCAN_WAIT_MS 600UL            // tunggu respons per channel
#define HEARTBEAT_INTERVAL_MS 1000UL // Heartbeat super cepat: 1 detik
#define SILENCE_AFTER_CMD_MS 3000UL   // jeda setelah menerima perintah

// ─── ESP-NOW PACKET ──────────────────────────────────────────────
typedef struct __attribute__((packed)) {
  int32_t mesaId;
  int32_t cmd; // 0=OFF,1=ON,98=ACK,99=DISCOVERY,100=REGISTER
  int32_t durationMin;
  uint32_t token;
  int32_t wifiChannel;
} espnow_pkt_t;

// ─── NVS CONFIG ──────────────────────────────────────────────────
struct PrajuritConfig {
  char commander_mac[18]; // "70:4B:CA:8F:72:54"
  int32_t mesa_id;
  int32_t saved_channel;
  bool isLightOn; // 🛡️ MEMORI PERMANEN: Simpan status lampu (v7.13)
};

// ─── GLOBALS ─────────────────────────────────────────────────────
PrajuritConfig cfg;
uint8_t cmdMacBytes[6] = {0};
bool hasCommander = false;
bool isLightOn = false;
uint32_t lastToken = 0;
unsigned long autoOffAt = 0;
unsigned long lastHeardCommander = 0;
unsigned long silenceUntil = 0;
unsigned long bootPressTime = 0;
bool portalMode = false;
bool registered = false;

// ✅ v7.2: Global discovery state (bukan static lokal) agar bisa direset dengan
// benar
unsigned long discLostAt = 0;   // kapan koneksi hilang
int discScanCh = -1;            // channel untuk FASE2 scan
unsigned long discLastScan = 0; // kapan terakhir kirim discovery

volatile bool hasNewCommand = false;
volatile espnow_pkt_t pendingCmd;
unsigned long commandFeedbackUntil = 0; // 🛡️ Untuk pola kedip 3x

Preferences prefs;
WebServer webServer(80);
DNSServer dnsServer;

// ─── MAC HELPER ──────────────────────────────────────────────────
bool parseMac(const char *s, uint8_t *out) {
  int v[6];
  int n =
      sscanf(s, "%x:%x:%x:%x:%x:%x", &v[0], &v[1], &v[2], &v[3], &v[4], &v[5]);
  if (n != 6)
    n = sscanf(s, "%2x%2x%2x%2x%2x%2x", &v[0], &v[1], &v[2], &v[3], &v[4],
               &v[5]);
  if (n != 6)
    return false;
  for (int i = 0; i < 6; i++)
    out[i] = (uint8_t)v[i];
  return true;
}

bool isMacSet(const uint8_t *m) {
  for (int i = 0; i < 6; i++)
    if (m[i])
      return true;
  return false;
}

// ─── RELAY ───────────────────────────────────────────────────────
void setLight(bool on) {
  // 🛡️ v7.48: FORCE PHYSICAL SYNC
  // Kita hapus pengecekan 'if (isLightOn == on)' agar fisik relay selalu dipaksa sinkron
  isLightOn = on;
  digitalWrite(PIN_RELAY, on ? LOW : HIGH);
  
  prefs.putBool("state", on);
  if (!on) {
    prefs.putInt("remMin", 0);
    autoOffAt = 0;
  }
}

// ─── LED STATUS MACHINE ──────────────────────────────────────────
void handleLedStatus() {
  static unsigned long lastTick = 0;
  static int step = 0;
  unsigned long now = millis();
  
  // 1. Pola 3x (Menerima Perintah) - Prioritas Tertinggi
  if (now < commandFeedbackUntil) {
    if (now - lastTick > 80) {
      lastTick = now;
      step++;
      digitalWrite(PIN_LED, (step % 2 == 0) ? HIGH : LOW);
    }
    return;
  }

  // 2. Pola Portal Mode (Kedip Cepat)
  if (portalMode) {
    if (now - lastTick > 100) {
      lastTick = now;
      digitalWrite(PIN_LED, !digitalRead(PIN_LED));
    }
    return;
  }

  // 3. Pola Terputus (2x Kedip - Jeda)
  if (!hasCommander) {
    if (now - lastTick > 200) {
      lastTick = now;
      step = (step + 1) % 10; // Cycle 10 langkah
      if (step == 0 || step == 2) digitalWrite(PIN_LED, LOW); // ON (Active Low)
      else digitalWrite(PIN_LED, HIGH); // OFF
    }
    return;
  }

  // 4. Pola Terhubung (Kedip 1 detik)
  if (now - lastTick > 1000) {
    lastTick = now;
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  }
}

// ─── ESP-NOW SENDS ───────────────────────────────────────────────
void sendToCommander(espnow_pkt_t *pkt) {
  if (isMacSet(cmdMacBytes))
    esp_now_send(cmdMacBytes, (uint8_t *)pkt, sizeof(espnow_pkt_t));
}

void sendAck(uint32_t token) {
  espnow_pkt_t ack = {};
  ack.mesaId = cfg.mesa_id;
  ack.cmd = 98;
  ack.token = token;
  ack.wifiChannel = cfg.saved_channel;
  sendToCommander(&ack);
  Serial.printf("[ACK] Token %u dikirim ke Komandan.\n", token);
}

void sendRegister() {
  espnow_pkt_t reg = {};
  reg.mesaId = cfg.mesa_id;
  reg.cmd = 100;
  reg.token = (uint32_t)millis();
  reg.wifiChannel = cfg.saved_channel;
  sendToCommander(&reg);
  Serial.printf("[REGISTER] Meja %d → Komandan.\n", cfg.mesa_id);
}

void sendDiscovery(int ch) {
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);
  esp_wifi_set_promiscuous(false);
  espnow_pkt_t disc = {};
  disc.mesaId = cfg.mesa_id;
  disc.cmd = 99;
  disc.wifiChannel = ch;
  // Unicast ke Komandan jika MAC diketahui, else broadcast
  if (isMacSet(cmdMacBytes))
    esp_now_send(cmdMacBytes, (uint8_t *)&disc, sizeof(espnow_pkt_t));
  else {
    uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    esp_now_send(bc, (uint8_t *)&disc, sizeof(espnow_pkt_t));
  }
  Serial.printf("[SCAN] Ch: %d\n", ch);
}

// ─── LOCK COMMANDER ──────────────────────────────────────────────
void lockCommander(const uint8_t *srcMac, int ch) {
  // Validasi MAC jika kita sudah punya target
  if (isMacSet(cmdMacBytes) && memcmp(srcMac, cmdMacBytes, 6) != 0)
    return;

  bool channelChanged = (ch != cfg.saved_channel);

  if (!hasCommander || channelChanged) {
    hasCommander = true;
    cfg.saved_channel = ch;
    prefs.putBytes("prajcfg", &cfg, sizeof(cfg));

    // Update Unicast Peer
    if (esp_now_is_peer_exist(cmdMacBytes))
      esp_now_del_peer(cmdMacBytes);
      
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, cmdMacBytes, 6);
    peer.ifidx = WIFI_IF_STA;
    esp_now_add_peer(&peer);
    
    // 🛡️ FORCE PHYSICAL SWITCH (v7.25)
    esp_wifi_set_promiscuous(true);
    esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE); 
    esp_wifi_set_promiscuous(false);
    
    Serial.printf("[CH] 🔄 Channel %s di Ch:%d\n", 
                  channelChanged ? "Berpindah (Mengikuti Komandan)" : "Terkunci", ch);
    
    // Kirim registrasi ulang jika channel pindah agar Komandan tahu kita di mana
    sendRegister();
    registered = true;
  }
  lastHeardCommander = millis(); // 🛡️ Pastikan terupdate tiap dapat paket
}

// ─── ESP-NOW RECEIVE ─────────────────────────────────────────────
void OnDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  if (len < (int)sizeof(espnow_pkt_t)) return;

  espnow_pkt_t pkt;
  memcpy(&pkt, data, sizeof(espnow_pkt_t));

  // 🛡️ v7.46: GLOBAL HEARTBEAT RESET
  // Siapapun pengirimnya (Remote/Gateway), asal paketnya valid, reset timer!
  lastHeardCommander = millis();
  
  if (!hasCommander) {
    hasCommander = true;
    discLostAt = 0; // Hentikan proses scanning
  }

  // 1. Identifikasi & Filter
  bool isBeacon = (pkt.mesaId == 0);
  bool isForUs = (pkt.mesaId == cfg.mesa_id || pkt.mesaId == 0);
  if (!isForUs) return;

  // 2. SMART LOCK: Jika kita mendengar Komandan (apapun paketnya), Kunci Channel!
  int remoteCh = pkt.wifiChannel;
  if (remoteCh >= 1 && remoteCh <= 13) {
    lockCommander(info->src_addr, remoteCh);
  }

  // Jika ini hanya Beacon/Discovery/Ack, stop proses relay di sini
  if (pkt.cmd == 98 || pkt.mesaId == 0 || pkt.cmd == 99 || pkt.cmd == 100) return;

  // 3. Masukkan ke Antrean Perintah
  memcpy((void *)&pendingCmd, &pkt, sizeof(espnow_pkt_t));
  hasNewCommand = true;
}

// ─── PORTAL HTML ─────────────────────────────────────────────────
void handleScan() {
  String json = "[";
  int count = 0;
  Serial.println("[SCAN] Memulai Pencarian Komandan...");

  // Kosongkan cache MAC agar hasil fresh
  memset(cmdMacBytes, 0, 6);

  for (int ch = 1; ch <= 13; ch++) {
    esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);
    unsigned long start = millis();
    while (millis() - start <
           300) { // Tunggu 300ms per channel agar tidak meleset
      delay(1);
    }
    if (isMacSet(cmdMacBytes))
      break; // Stop jika sudah ketemu satu
  }

  if (isMacSet(cmdMacBytes)) {
    char macStr[18];
    sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", cmdMacBytes[0],
            cmdMacBytes[1], cmdMacBytes[2], cmdMacBytes[3], cmdMacBytes[4],
            cmdMacBytes[5]);
    json += "\"" + String(macStr) + "\"";
    count++;
  }
  json += "]";
  webServer.send(200, "application/json; charset=utf-8", json);
}

void handleRoot() {
  String html = R"raw(<!DOCTYPE html><html lang="id"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PRAJURIT CONFIG — VOC BILLIARD</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
<style>
:root{--p:#00f2ff;--bg:#0b0e14;--card:rgba(255,255,255,0.03)}
body{font-family:'Outfit',sans-serif;background:var(--bg);color:#fff;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}
.bg-glow{position:fixed;top:50%;left:50%;width:500px;height:500px;background:radial-gradient(circle,rgba(0,242,255,0.08) 0%,transparent 70%);transform:translate(-50%,-50%);z-index:-1}
.card{background:var(--card);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);border-radius:32px;padding:40px;width:90%;max-width:400px;box-shadow:0 24px 80px rgba(0,0,0,0.6);animation:fadeIn 0.8s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
h2{margin:0 0 6px;text-align:center;color:var(--p);font-size:1.3rem;font-weight:600;letter-spacing:4px;text-transform:uppercase}
.sub{text-align:center;font-size:0.85rem;color:rgba(255,255,255,0.4);margin-bottom:32px;letter-spacing:0.5px}
.ig{margin-bottom:24px}
label{display:block;font-size:0.8rem;font-weight:400;color:rgba(255,255,255,0.5);margin-bottom:10px;text-transform:uppercase;letter-spacing:1px}
input{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px 18px;color:#fff;font-size:1rem;box-sizing:border-box;transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}
input:focus{outline:none;border-color:var(--p);background:rgba(0,242,255,0.03);box-shadow:0 0 20px rgba(0,242,255,0.15)}
.btn{width:100%;margin-top:12px;padding:16px;border:none;border-radius:14px;background:linear-gradient(135deg, #00f2ff 0%, #00d4ff 100%);color:#000;font-weight:700;font-size:0.95rem;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:all 0.3s}
.btn:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,242,255,0.4);filter:brightness(1.1)}
.btn:active{transform:translateY(-1px)}
.btn-scan{background:rgba(255,255,255,0.05);color:var(--p);font-size:0.75rem;font-weight:600;padding:8px 16px;border-radius:10px;text-decoration:none;border:1px solid rgba(0,242,255,0.2);transition:0.3s}
.btn-scan:hover{background:rgba(0,242,255,0.1);border-color:var(--p)}
#scanResult{background:rgba(0,242,255,0.05);border:1px solid rgba(0,242,255,0.2);border-radius:14px;padding:15px;margin-bottom:20px;display:none;font-size:0.9rem;animation:slideDown 0.4s ease}
@keyframes slideDown{from{opacity:0;height:0}to{opacity:1;height:auto}}
.mac-item{cursor:pointer;padding:10px;border-radius:8px;margin-top:5px;transition:0.2s}
.mac-item:hover{background:rgba(0,242,255,0.1);color:var(--p)}
</style></head><body>
<div class="bg-glow"></div>
<div class="card">
  <h2>⚔️ PRAJURIT</h2>
  <p class="sub">Node Billiard — Konfigurasi Sistem</p>
  <form action="/save" method="POST">
    <div class="ig">
      <label>ID Meja (Mesa ID)</label>
      <input type="number" name="mesa_id" placeholder="ID (1-100)" min="1" max="100" required>
    </div>
    <div class="ig">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <label style="margin:0">Komandan</label>
        <a href="#" class="btn-scan" id="scanBtn" onclick="startScan()">🔍 Cari Alat</a>
      </div>
      <div id="scanResult"></div>
      <input type="text" id="cmdMac" name="cmd_mac" placeholder="MAC Address Komandan" maxlength="17" required>
    </div>
    <button type="submit" class="btn">Simpan & Konfigurasi</button>
  </form>
</div>
<script>
function startScan(){
  const div = document.getElementById('scanResult');
  const btn = document.getElementById('scanBtn');
  div.style.display = 'block';
  div.innerHTML = '⚡ Menyapu sinyal...';
  btn.style.opacity = '0.5';
  btn.onclick = null;
  
  fetch('/scan').then(r=>r.json()).then(data=>{
    btn.style.opacity = '1';
    btn.onclick = startScan;
    if(data.length==0) {
      div.innerHTML = '❌ Tidak ditemukan. Pastikan Komandan menyala & ulangi scan.';
    } else {
      div.innerHTML = '<div style="color:rgba(255,255,255,0.5);font-size:0.75rem;margin-bottom:8px">KOMANDAN DITEMUKAN:</div>';
      data.forEach(mac=>{
        const item = document.createElement('div');
        item.className = 'mac-item';
        item.innerHTML = '📍 ' + mac;
        item.onclick = () => { document.getElementById('cmdMac').value = mac; div.style.display='none'; };
        div.appendChild(item);
      });
    }
  }).catch(e=> { 
    btn.style.opacity = '1'; btn.onclick = startScan;
    div.innerHTML = '⏳ Menunggu respons... Klik lagi jika terputus.'; 
  });
}
</script>
</body></html>)raw";
  webServer.send(200, "text/html; charset=utf-8", html);
}

void handleSave() {
  String mesa = webServer.arg("mesa_id");
  String macStr = webServer.arg("cmd_mac");
  uint8_t tmp[6];
  if (!parseMac(macStr.c_str(), tmp)) {
    webServer.send(400, "text/plain", "MAC Address tidak valid!");
    return;
  }
  cfg.mesa_id = mesa.toInt();
  macStr.toCharArray(cfg.commander_mac, 18);
  cfg.saved_channel = 1;
  prefs.putBytes("prajcfg", &cfg, sizeof(cfg));
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
  Serial.println("[PORTAL] Memulai WiFi AP...");

  WiFi.mode(WIFI_AP);
  WiFi.disconnect(true);
  delay(200);

  // Ambil MAC Address Station (Asli) dengan cara standar Arduino agar tidak
  // error
  WiFi.mode(WIFI_STA);
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  mac.toUpperCase();
  String apName = "VOC-PRAJURIT-" + mac.substring(6);

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
  Serial.begin(115200);
  
  // 🛡️ AMANKAN RELAY (v7.4): Paksa HIGH (OFF) SEBELUM jadi OUTPUT
  digitalWrite(PIN_RELAY, HIGH); 
  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_RELAY, HIGH); // Pastikan sekali lagi

  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, HIGH);
  pinMode(PIN_BOOT, INPUT_PULLUP);
  delay(100);

  prefs.begin("prajurit", false);

  // Hard Reset jika BOOT ditekan saat nyala
  if (digitalRead(PIN_BOOT) == LOW) {
    Serial.println("[SYSTEM] Hard Reset! Menghapus config...");
    prefs.clear();
    delay(2000);
  }

  bool hasConfig =
      (prefs.getBytes("prajcfg", &cfg, sizeof(cfg)) == sizeof(cfg));
  bool macOk = hasConfig && parseMac(cfg.commander_mac, cmdMacBytes) &&
               isMacSet(cmdMacBytes);

  if (!hasConfig || !macOk || cfg.mesa_id < 1) {
    Serial.println("[SYSTEM] Config belum ada → masuk Portal.");
    startPortal();
    return;
  }

  Serial.printf(
      "\n[SYSTEM] Prajurit Meja %d | Komandan: %s | Ch Tersimpan: %d\n",
      cfg.mesa_id, cfg.commander_mac, cfg.saved_channel);

  // Power Recovery
  if (prefs.getBool("state", false)) {
    int rem = prefs.getInt("remMin", 0);
    if (rem > 0) {
      autoOffAt = millis() + (rem * 60000UL);
      setLight(true);
    }
  }

  WiFi.mode(WIFI_STA);
  esp_wifi_set_ps(
      WIFI_PS_NONE); // 🛡️ SANGAT PENTING: Matikan hemat daya agar responsif
  WiFi.disconnect();

  if (esp_now_init() != ESP_OK) {
    Serial.println("[ERROR] ESP-NOW gagal!");
    ESP.restart();
  }
  esp_now_register_recv_cb(OnDataRecv);
  
  // 🛡️ HIGH STABILITY MODE (v7.25): 1Mbps PHY Rate untuk jarak jauh
  esp_wifi_config_espnow_rate(WIFI_IF_STA, WIFI_PHY_RATE_1M_L);

  // Daftar broadcast peer (untuk discovery awal)
  uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  esp_now_peer_info_t bpeer = {};
  memcpy(bpeer.peer_addr, bc, 6);
  bpeer.ifidx = WIFI_IF_STA;
  esp_now_add_peer(&bpeer);

  // Daftar Komandan sebagai unicast peer (channel 1 dulu, akan diupdate saat
  // lock)
  if (isMacSet(cmdMacBytes)) {
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, cmdMacBytes, 6);
    peer.ifidx = WIFI_IF_STA;
    esp_now_add_peer(&peer);
  }

  hasCommander = false;
  lastHeardCommander = millis();

  // ✅ v7.2: Paksa radio ke channel yang tersimpan sejak awal
  int initCh = (cfg.saved_channel >= 1 && cfg.saved_channel <= 13)
                   ? cfg.saved_channel
                   : 6;
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(initCh, WIFI_SECOND_CHAN_NONE);
  esp_wifi_set_promiscuous(false);

  Serial.printf("[SYSTEM] Radio dikunci ke Ch:%d. Mencari Komandan...\n",
                initCh);
}

// ─── HEARTBEAT ───────────────────────────────────────────────────
void sendHeartbeat() {
  // 🛡️ v7.55: Kirim secara BROADCAST agar Jendral bisa memantau status secara real-time
  espnow_pkt_t rpt = {cfg.mesa_id, 100, (int32_t)isLightOn, 0, (uint32_t)millis()};
  uint8_t bc[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  esp_now_send(bc, (uint8_t *)&rpt, sizeof(rpt));
  
  Serial.printf("[HB] Meja %d | %s | Ch: %d (Broadcast)\n", cfg.mesa_id, 
                isLightOn ? "NYALA" : "MATI", cfg.saved_channel);
}

// ─── LOOP ────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // 1. Web Server (Hanya jika mode portal)
  if (portalMode) {
    dnsServer.processNextRequest();
    webServer.handleClient();
    return;
  }

  // 2. Hard Reset (tahan BOOT 5 detik)
  if (digitalRead(PIN_BOOT) == LOW) {
    if (!bootPressTime) bootPressTime = now;
    if (now - bootPressTime > 5000) {
      Serial.println("[SYSTEM] HARD RESET!");
      prefs.clear(); ESP.restart();
    }
  } else bootPressTime = 0;

  // 3. Status Machine
  handleLedStatus();

  // 4. Channel Discovery
  if (!hasCommander) {
    if (discLostAt == 0) {
      discLostAt = now; discLastScan = 0;
      Serial.println("[BOOT] Memulai async discovery...");
    }
    if (now - discLostAt < 5000) { // FASE 1: Quick Scan
      int cachedCh = (cfg.saved_channel >= 1 && cfg.saved_channel <= 13) ? cfg.saved_channel : 6;
      if (now - discLastScan > 1000) {
        discLastScan = now;
        esp_wifi_set_channel(cachedCh, WIFI_SECOND_CHAN_NONE);
        sendDiscovery(cachedCh);
      }
    } else { // FASE 2: Full Scan
      if (discScanCh < 1) discScanCh = 1;
      if (now - discLastScan > 1000) {
        discLastScan = now;
        esp_wifi_set_channel(discScanCh, WIFI_SECOND_CHAN_NONE);
        sendDiscovery(discScanCh);
        discScanCh = (discScanCh % 13) + 1;
      }
    }
  } else {
    discLostAt = 0; discScanCh = -1;
  }

  // 5. Timeout Check
  if (hasCommander && (now - lastHeardCommander > COMMANDER_TIMEOUT_MS)) {
    Serial.println("[SYSTEM] Komandan tidak terdengar. Mulai scan...");
    hasCommander = false; registered = false;
  }

  // 6. Proses Perintah
  if (hasNewCommand) {
    hasNewCommand = false;
    espnow_pkt_t cmd;
    memcpy(&cmd, (void *)&pendingCmd, sizeof(espnow_pkt_t));

    if (cmd.token != 0 && cmd.token == lastToken) {
      Serial.printf("[CMD] Token %u duplikat.\n", cmd.token);
    } else {
      lastToken = cmd.token;
      bool isOn = (cmd.cmd == 1 || cmd.cmd == 1001);
      bool isOff = (cmd.cmd == 0 || cmd.cmd == 1000);
      if (isOn) {
        autoOffAt = (cmd.durationMin > 0) ? (now + (cmd.durationMin * 60000UL)) : 0;
        setLight(true);
      } else if (isOff) {
        setLight(false);
      }
      silenceUntil = now + SILENCE_AFTER_CMD_MS;
      commandFeedbackUntil = now + 1000;
    }
    sendAck(cmd.token);
  }

  // 7. Auto-OFF & Heartbeat
  if (isLightOn && autoOffAt > 0 && now >= autoOffAt) setLight(false);
  
  static unsigned long lastHb = 0;
  if (hasCommander && now > silenceUntil && now - lastHb > HEARTBEAT_INTERVAL_MS) {
    lastHb = now;
    sendHeartbeat();
    if (isLightOn && autoOffAt > now) {
      prefs.putInt("remMin", (int)((autoOffAt - now) / 60000));
    }
    if (!registered) sendRegister();
  }
}
