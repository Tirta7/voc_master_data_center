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
#include <Preferences.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <WebServer.h>
#include <DNSServer.h>

// ─── PINS ────────────────────────────────────────────────────────
#define PIN_RELAY  7
#define PIN_LED    8
#define PIN_BOOT   9   // BOOT button ESP32-C3 Super Mini

// ─── TIMING ──────────────────────────────────────────────────────
#define COMMANDER_TIMEOUT_MS  180000UL // ✅ v7.2: 180 detik (lebih toleran)
#define SCAN_WAIT_MS          600UL    // tunggu respons per channel
#define HEARTBEAT_INTERVAL_MS 10000UL  // heartbeat setiap 10 detik
#define SILENCE_AFTER_CMD_MS  3000UL   // jeda setelah menerima perintah

// ─── ESP-NOW PACKET ──────────────────────────────────────────────
typedef struct __attribute__((packed)) {
  int32_t  mesaId;
  int32_t  cmd;         // 0=OFF,1=ON,98=ACK,99=DISCOVERY,100=REGISTER
  int32_t  durationMin;
  uint32_t token;
  int32_t  wifiChannel;
} espnow_pkt_t;

// ─── NVS CONFIG ──────────────────────────────────────────────────
struct PrajuritConfig {
  char    commander_mac[18]; // "70:4B:CA:8F:72:54"
  int32_t mesa_id;
  int32_t saved_channel;
};

// ─── GLOBALS ─────────────────────────────────────────────────────
PrajuritConfig cfg;
uint8_t        cmdMacBytes[6]       = {0};
bool           hasCommander         = false;
bool           isLightOn            = false;
uint32_t       lastToken            = 0;
unsigned long  autoOffAt            = 0;
unsigned long  lastHeardCommander   = 0;
unsigned long  silenceUntil         = 0;
unsigned long  bootPressTime        = 0;
bool           portalMode           = false;
bool           registered           = false;

// ✅ v7.2: Global discovery state (bukan static lokal) agar bisa direset dengan benar
unsigned long  discLostAt           = 0;  // kapan koneksi hilang
int            discScanCh           = -1; // channel untuk FASE2 scan
unsigned long  discLastScan         = 0;  // kapan terakhir kirim discovery

volatile bool         hasNewCommand = false;
volatile espnow_pkt_t pendingCmd;

Preferences prefs;
WebServer   webServer(80);
DNSServer   dnsServer;

// ─── MAC HELPER ──────────────────────────────────────────────────
bool parseMac(const char* s, uint8_t* out) {
  int v[6];
  int n = sscanf(s, "%x:%x:%x:%x:%x:%x", &v[0],&v[1],&v[2],&v[3],&v[4],&v[5]);
  if (n != 6) n = sscanf(s, "%2x%2x%2x%2x%2x%2x",&v[0],&v[1],&v[2],&v[3],&v[4],&v[5]);
  if (n != 6) return false;
  for (int i=0;i<6;i++) out[i]=(uint8_t)v[i];
  return true;
}

bool isMacSet(const uint8_t* m) {
  for (int i=0;i<6;i++) if(m[i]) return true;
  return false;
}

// ─── RELAY ───────────────────────────────────────────────────────
void setLight(bool on) {
  if (isLightOn == on) return;
  isLightOn = on;
  digitalWrite(PIN_RELAY, on ? LOW : HIGH);
  digitalWrite(PIN_LED,   on ? LOW : HIGH);
  prefs.putBool("state", on);
  if (!on) { prefs.putInt("remMin", 0); autoOffAt = 0; }
}

// ─── ESP-NOW SENDS ───────────────────────────────────────────────
void sendToCommander(espnow_pkt_t* pkt) {
  if (isMacSet(cmdMacBytes))
    esp_now_send(cmdMacBytes, (uint8_t*)pkt, sizeof(espnow_pkt_t));
}

void sendAck(uint32_t token) {
  espnow_pkt_t ack = {};
  ack.mesaId = cfg.mesa_id; ack.cmd = 98; ack.token = token;
  ack.wifiChannel = cfg.saved_channel;
  sendToCommander(&ack);
  Serial.printf("[ACK] Token %u dikirim ke Komandan.\n", token);
}

void sendRegister() {
  espnow_pkt_t reg = {};
  reg.mesaId = cfg.mesa_id; reg.cmd = 100;
  reg.token  = (uint32_t)millis();
  reg.wifiChannel = cfg.saved_channel;
  sendToCommander(&reg);
  Serial.printf("[REGISTER] Meja %d → Komandan.\n", cfg.mesa_id);
}

void sendDiscovery(int ch) {
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);
  esp_wifi_set_promiscuous(false);
  espnow_pkt_t disc = {};
  disc.mesaId = cfg.mesa_id; disc.cmd = 99; disc.wifiChannel = ch;
  // Unicast ke Komandan jika MAC diketahui, else broadcast
  if (isMacSet(cmdMacBytes))
    esp_now_send(cmdMacBytes, (uint8_t*)&disc, sizeof(disc));
  else {
    uint8_t bc[]={0xFF,0xFF,0xFF,0xFF,0xFF,0xFF};
    esp_now_send(bc, (uint8_t*)&disc, sizeof(disc));
  }
  Serial.printf("[SCAN] Ch: %d\n", ch);
}

// ─── LOCK COMMANDER ──────────────────────────────────────────────
void lockCommander(const uint8_t* srcMac, int ch) {
  // Validasi MAC jika kita sudah punya target
  if (isMacSet(cmdMacBytes) && memcmp(srcMac, cmdMacBytes, 6) != 0) return;

  if (!hasCommander) {
    hasCommander = true;
    cfg.saved_channel = ch;
    prefs.putBytes("prajcfg", &cfg, sizeof(cfg));

    // Daftarkan sebagai peer unicast
    if (!esp_now_is_peer_exist(cmdMacBytes)) {
      esp_now_peer_info_t peer = {};
      memcpy(peer.peer_addr, cmdMacBytes, 6);
      peer.ifidx = WIFI_IF_STA;
      esp_now_add_peer(&peer);
    }
    Serial.printf("[LOCK] Komandan terkunci di Channel %d!\n", ch);
    delay(50);
    sendRegister();
    registered = true;
  }
  lastHeardCommander = millis();
}

// ─── ESP-NOW RECEIVE ─────────────────────────────────────────────
void OnDataRecv(const esp_now_recv_info_t* info, const uint8_t* data, int len) {
  if (len < (int)sizeof(espnow_pkt_t)) return;
  espnow_pkt_t pkt;
  memcpy(&pkt, data, sizeof(espnow_pkt_t));

  // Filter: hanya terima dari Komandan kita (jika MAC sudah set)
  if (isMacSet(cmdMacBytes) && memcmp(info->src_addr, cmdMacBytes, 6) != 0) return;

  // ✅ FIX: Paket APAPUN dari Komandan = tanda Komandan masih hidup
  // Ini mencegah Prajurit masuk scan mode padahal Komandan masih aktif mengirim perintah
  lastHeardCommander = millis();
  if (!hasCommander && isMacSet(cmdMacBytes)) {
    // Paksa lock ulang ke saved channel jika kita kenal MAC-nya
    lockCommander(info->src_addr, cfg.saved_channel > 0 ? cfg.saved_channel : 6);
  }

  // BEACON
  if (pkt.mesaId == 0) {
    int ch = pkt.wifiChannel;
    if (ch >= 1 && ch <= 13) lockCommander(info->src_addr, ch);
    return;
  }

  // ACK dari Komandan (cmd=98): hanya update lastHeardCommander (sudah dilakukan di atas)
  // JANGAN proses sebagai command agar tidak merusak lastToken dan silenceUntil
  if (pkt.cmd == 98 || pkt.cmd == 99 || pkt.cmd == 100) return;

  // PERINTAH untuk meja ini (hanya cmd=0 atau cmd=1)
  if (pkt.mesaId == cfg.mesa_id) {
    memcpy((void*)&pendingCmd, &pkt, sizeof(espnow_pkt_t));
    hasNewCommand = true;
  }
}

// ─── PORTAL HTML ─────────────────────────────────────────────────
void handleRoot() {
  String html = R"raw(<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PRAJURIT CONFIG</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
<style>
:root{--p:#00f2ff;--bg:#0b0e14}
body{font-family:'Outfit',sans-serif;background:var(--bg);color:#fff;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:rgba(255,255,255,.04);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:36px;width:90%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
h2{margin:0 0 4px;text-align:center;color:var(--p);font-size:1.1rem;letter-spacing:2px;text-transform:uppercase}
.sub{text-align:center;font-size:.8rem;color:rgba(255,255,255,.35);margin-bottom:24px}
.ig{margin-bottom:18px}
label{display:block;font-size:.82rem;color:rgba(255,255,255,.55);margin-bottom:7px}
input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:11px;padding:11px 14px;color:#fff;font-size:.95rem;box-sizing:border-box;transition:.3s}
input:focus{outline:none;border-color:var(--p);box-shadow:0 0 14px rgba(0,242,255,.15)}
.hint{font-size:.72rem;color:rgba(255,255,255,.3);margin-top:5px}
.btn{width:100%;margin-top:10px;padding:13px;border:none;border-radius:11px;background:var(--p);color:#000;font-weight:700;font-size:.9rem;letter-spacing:1px;cursor:pointer;transition:.3s}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,242,255,.3)}
</style></head><body>
<div class="card">
  <h2>⚔️ PRAJURIT</h2>
  <p class="sub">Node Billiard — Konfigurasi Unit</p>
  <form action="/save" method="POST">
    <div class="ig">
      <label>ID Meja (Mesa ID)</label>
      <input type="number" name="mesa_id" placeholder="Contoh: 4" min="1" max="100" required>
    </div>
    <div class="ig">
      <label>MAC Address Komandan</label>
      <input type="text" name="cmd_mac" placeholder="70:4B:CA:8F:72:54" maxlength="17" required>
      <p class="hint">Lihat di stiker unit Komandan atau Serial Monitor-nya</p>
    </div>
    <button type="submit" class="btn">SIMPAN &amp; REBOOT</button>
  </form>
</div></body></html>)raw";
  webServer.send(200, "text/html", html);
}

void handleSave() {
  String mesa   = webServer.arg("mesa_id");
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
  String s = "<html><body style='background:#0b0e14;color:#00f2ff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center'><div><h1>TERSIMPAN!</h1><p>Rebooting...</p></div></body></html>";
  webServer.send(200, "text/html", s);
  delay(2000);
  ESP.restart();
}

void startPortal() {
  portalMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.disconnect(true);
  delay(200);

  // Buat nama AP unik dari 6 karakter terakhir MAC address
  String mac = WiFi.macAddress();  // format: "20:6E:F1:6D:5F:00"
  mac.replace(":", "");
  mac.toUpperCase();
  String apName = "PRAJURIT_" + mac.substring(6); // contoh: PRAJURIT_6D5F00

  // ✅ FIX: Set IP statis eksplisit agar DHCP server berfungsi
  IPAddress apIP(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);
  WiFi.softAPConfig(apIP, gateway, subnet);

  WiFi.softAP(apName.c_str(), "12345678", 6);
  delay(500); // Tunggu AP & DHCP siap sebelum DNS start

  dnsServer.start(53, "*", apIP);
  webServer.on("/", handleRoot);
  webServer.on("/save", handleSave);
  webServer.onNotFound([]() { webServer.sendHeader("Location", "/", true); webServer.send(302); });
  webServer.begin();

  Serial.println("[PORTAL] ================================");
  Serial.printf ("[PORTAL] WiFi  : %s\n", apName.c_str());
  Serial.println("[PORTAL] Pass  : 12345678");
  Serial.printf ("[PORTAL] IP    : %s\n", apIP.toString().c_str());
  Serial.println("[PORTAL] Buka browser → 192.168.4.1");
  Serial.println("[PORTAL] ================================");
}

// ─── SETUP ───────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELAY, OUTPUT); digitalWrite(PIN_RELAY, HIGH);
  pinMode(PIN_LED,   OUTPUT); digitalWrite(PIN_LED,   HIGH);
  pinMode(PIN_BOOT,  INPUT_PULLUP);
  delay(500);

  prefs.begin("prajurit", false);

  // Hard Reset jika BOOT ditekan saat nyala
  if (digitalRead(PIN_BOOT) == LOW) {
    Serial.println("[SYSTEM] Hard Reset! Menghapus config...");
    prefs.clear();
    delay(2000);
  }

  bool hasConfig = (prefs.getBytes("prajcfg", &cfg, sizeof(cfg)) == sizeof(cfg));
  bool macOk     = hasConfig && parseMac(cfg.commander_mac, cmdMacBytes) && isMacSet(cmdMacBytes);

  if (!hasConfig || !macOk || cfg.mesa_id < 1) {
    Serial.println("[SYSTEM] Config belum ada → masuk Portal.");
    startPortal();
    return;
  }

  Serial.printf("\n[SYSTEM] Prajurit Meja %d | Komandan: %s | Ch Tersimpan: %d\n",
    cfg.mesa_id, cfg.commander_mac, cfg.saved_channel);

  // Power Recovery
  if (prefs.getBool("state", false)) {
    int rem = prefs.getInt("remMin", 0);
    if (rem > 0) { autoOffAt = millis() + (rem * 60000UL); setLight(true); }
  }

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  if (esp_now_init() != ESP_OK) { Serial.println("[ERROR] ESP-NOW gagal!"); ESP.restart(); }
  esp_now_register_recv_cb(OnDataRecv);

  // Daftar broadcast peer (untuk discovery awal)
  uint8_t bc[] = {0xFF,0xFF,0xFF,0xFF,0xFF,0xFF};
  esp_now_peer_info_t bpeer = {}; memcpy(bpeer.peer_addr, bc, 6); bpeer.ifidx = WIFI_IF_STA;
  esp_now_add_peer(&bpeer);

  // Daftar Komandan sebagai unicast peer (channel 1 dulu, akan diupdate saat lock)
  if (isMacSet(cmdMacBytes)) {
    esp_now_peer_info_t peer = {}; memcpy(peer.peer_addr, cmdMacBytes, 6); peer.ifidx = WIFI_IF_STA;
    esp_now_add_peer(&peer);
  }

  hasCommander = false;
  lastHeardCommander = millis();

  // ✅ v7.2: Paksa radio ke channel yang tersimpan sejak awal
  int initCh = (cfg.saved_channel >= 1 && cfg.saved_channel <= 13) ? cfg.saved_channel : 6;
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(initCh, WIFI_SECOND_CHAN_NONE);
  esp_wifi_set_promiscuous(false);

  Serial.printf("[SYSTEM] Radio dikunci ke Ch:%d. Mencari Komandan...\n", initCh);
}

// ─── LOOP ────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ── Hard Reset (tahan BOOT 5 detik saat operasional) ──────────
  if (digitalRead(PIN_BOOT) == LOW) {
    if (!bootPressTime) bootPressTime = now;
    if (now - bootPressTime > 5000) {
      Serial.println("[SYSTEM] HARD RESET!");
      prefs.clear(); ESP.restart();
    }
  } else bootPressTime = 0;

  // ── Portal Mode ────────────────────────────────────────────────
  if (portalMode) { dnsServer.processNextRequest(); webServer.handleClient(); return; }

  // ── Channel Discovery (2-Fase) ─────────────────────────────────
  // FASE 1 (0-60 detik): Tetap di saved_channel. Jangan scan ke channel lain.
  // FASE 2 (>60 detik): Full scan semua channel jika FASE 1 gagal.
  if (!hasCommander) {
    if (discLostAt == 0) discLostAt = now;

    if (now - discLostAt < 60000UL) {
      // ── FASE 1: Kirim discovery di saved channel, JANGAN ganti channel
      if (now - discLastScan > 3000) {
        discLastScan = now;
        int savedCh = (cfg.saved_channel >= 1 && cfg.saved_channel <= 13)
                      ? cfg.saved_channel : 6;
        esp_wifi_set_promiscuous(true);
        esp_wifi_set_channel(savedCh, WIFI_SECOND_CHAN_NONE);
        esp_wifi_set_promiscuous(false);
        espnow_pkt_t disc = {};
        disc.mesaId = cfg.mesa_id; disc.cmd = 99; disc.wifiChannel = savedCh;
        if (isMacSet(cmdMacBytes))
          esp_now_send(cmdMacBytes, (uint8_t*)&disc, sizeof(disc));
        Serial.printf("[FASE1] Menunggu Komandan di Ch:%d (%lus)...\n",
          savedCh, (now - discLostAt) / 1000);
      }
    } else {
      // ── FASE 2: Full Scan
      if (discScanCh < 0) discScanCh = 1;
      if (now - discLastScan > 500) {
        discLastScan = now;
        sendDiscovery(discScanCh);
        discScanCh = (discScanCh % 13) + 1;
        Serial.printf("[FASE2] Full Scan Ch:%d...\n", discScanCh);
      }
    }
  } else {
    // ✅ Reset global state saat sudah terhubung
    discLostAt   = 0;
    discScanCh   = -1;
    discLastScan = 0;
  }

  // ── Timeout: Komandan hilang → mulai scan ──────────────────────
  if (hasCommander && (now - lastHeardCommander > COMMANDER_TIMEOUT_MS)) {
    Serial.println("[SYSTEM] Komandan tidak terdengar 180 detik. Mulai scan ulang...");
    hasCommander = false;
    registered   = false;
    // ✅ JANGAN reset saved_channel agar FASE1 reconnect di channel yang sama
  }

  // ── Proses Perintah (dari ISR) ────────────────────────────────
  if (hasNewCommand) {
    hasNewCommand = false;
    espnow_pkt_t cmd;
    memcpy(&cmd, (void*)&pendingCmd, sizeof(espnow_pkt_t));

    if (cmd.token != 0 && cmd.token == lastToken) {
      Serial.printf("[CMD] Token %u duplikat, abaikan.\n", cmd.token);
    } else {
      lastToken = cmd.token;
      if (cmd.cmd == 1) {
        Serial.printf("[CMD] LAMPU NYALA | %d menit\n", cmd.durationMin);
        autoOffAt = millis() + (cmd.durationMin * 60000UL);
        setLight(true);
        prefs.putInt("remMin", cmd.durationMin);
      } else if (cmd.cmd == 0) {
        Serial.println("[CMD] LAMPU MATI");
        setLight(false);
      }
      sendAck(cmd.token);
      silenceUntil = millis() + SILENCE_AFTER_CMD_MS;
    }
  }

  // ── Auto-OFF ──────────────────────────────────────────────────
  if (isLightOn && autoOffAt > 0 && now >= autoOffAt) setLight(false);

  // ── Heartbeat ────────────────────────────────────────────────
  static unsigned long lastHb = 0;
  if (hasCommander && now > silenceUntil && now - lastHb > HEARTBEAT_INTERVAL_MS) {
    lastHb = now;
    espnow_pkt_t rpt = {};
    rpt.mesaId      = cfg.mesa_id;
    rpt.cmd         = isLightOn ? 1 : 0;
    rpt.durationMin = (autoOffAt > now) ? (long)(autoOffAt - now) / 60000 : 0;
    rpt.wifiChannel = cfg.saved_channel;
    rpt.token       = lastToken;
    sendToCommander(&rpt);
    Serial.printf("[HB] Meja %d | %s | Ch: %d\n",
      cfg.mesa_id, isLightOn ? "NYALA" : "MATI", cfg.saved_channel);

    // Kirim ulang register jika belum terkonfirmasi
    if (!registered) sendRegister();
  }
}
