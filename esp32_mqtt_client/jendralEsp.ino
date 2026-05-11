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
#include <MD5Builder.h>
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

// ─── TYPES ───────────────────────────────────────────────────────
struct PriceSlot {
  int startH, endH, price;
};

struct Packet {
  String name;
  int duration; // 0 = Open Play
  std::vector<PriceSlot> slots;
};
std::vector<Packet> packets;

struct TableState {
  int id;
  bool isOn;
  int32_t remMin;      // Menit tersisa
  int32_t initialMin;  // Menit awal (untuk hitungan harga paket)
  uint32_t startMs;    // Waktu mulai (millis)
  String activePkg;    // Nama paket yang sedang aktif
  String custName;     // Nama Customer
  bool waitingPayment; // Menunggu pembayaran setelah waktu habis
  String pkgHistory;   // Riwayat paket (Format: Pkg|Price|Time;...)
};
std::vector<TableState> tableStatus;

// ─── DUAL CORE TASK ─────────────────────────────────────────────
TaskHandle_t TaskBackground;
void BackgroundLoop(void *pvParameters);

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
int currentHour = 10;              // Jam default
String licenseExpiry = "20261231"; // YYYYMMDD (Default)
String currentDate = "20260101";   // YYYYMMDD (Akan diupdate oleh browser)

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

void sendCmd(int id, int s, int duration = 0) {
  espnow_pkt_t pkt = {};
  pkt.mesaId = id;
  pkt.cmd = (s == 1) ? CMD_REMOTE_ON : CMD_REMOTE_OFF;
  pkt.durationMin = duration;
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

// ─── STATUS TRACKER ─────────────────────────────────────────────

void parsePackets() {
  packets.clear();
  // Format: Name:Dur|H1-H2:Price,H1-H2:Price;Name2:Dur|...
  String raw = prefs.getString("pkgs", "");
  if (raw.length() == 0 || raw.indexOf(':') == -1) {
    raw = "1 Jam:60|10-17:20000,17-02:30000,02-10:35000;3 "
          "Jam:180|10-17:45000,17-02:55000,02-10:65000;Open "
          "Table:0|10-17:20000,17-02:30000,02-10:50000";
  }

  int start = 0;
  int end = raw.indexOf(';');
  while (true) {
    String pStr =
        (end == -1) ? raw.substring(start) : raw.substring(start, end);
    if (pStr.length() > 0) {
      Packet pkg;
      int sep1 = pStr.indexOf(':');
      int sep2 = pStr.indexOf('|');
      if (sep1 != -1 && sep2 != -1) {
        pkg.name = pStr.substring(0, sep1);
        pkg.duration = pStr.substring(sep1 + 1, sep2).toInt();

        String sStr = pStr.substring(sep2 + 1);
        int sStart = 0;
        int sEnd = sStr.indexOf(',');
        while (true) {
          String slot = (sEnd == -1) ? sStr.substring(sStart)
                                     : sStr.substring(sStart, sEnd);
          int dash = slot.indexOf('-');
          int colon = slot.indexOf(':');
          if (dash != -1 && colon != -1) {
            PriceSlot ps;
            ps.startH = slot.substring(0, dash).toInt();
            ps.endH = slot.substring(dash + 1, colon).toInt();
            ps.price = slot.substring(colon + 1).toInt();
            pkg.slots.push_back(ps);
          }
          if (sEnd == -1)
            break;
          sStart = sEnd + 1;
          sEnd = sStr.indexOf(',', sStart);
        }
        packets.push_back(pkg);
      }
    }
    if (end == -1)
      break;
    start = end + 1;
    end = raw.indexOf(';', start);
  }
}

void updateStatus(int id, bool on, int rem = 0, String pkgName = "",
                  int init = -1, String customer = "") {
  for (auto &s : tableStatus) {
    if (s.id == id) {
      if ((!s.isOn && on) ||
          (on && pkgName != "")) { // Baru dinyalakan atau sesi baru
        s.startMs = millis();
        if (pkgName != "")
          s.activePkg = pkgName;
        s.initialMin = (init != -1) ? init : rem;
        if (customer != "")
          s.custName = customer;
      }

      // Transisi dari ON ke OFF untuk paket berwaktu (Belum Dibayar)
      if (s.isOn && !on && s.initialMin > 0) {
        s.waitingPayment = true;
      }
      // Jika dinyalakan lagi (Extend atau Sesi Baru), reset waitingPayment
      if (on) {
        s.waitingPayment = false;
      }

      s.isOn = on;
      s.remMin = rem;
      if (pkgName != "")
        s.activePkg = pkgName;
      if (customer != "")
        s.custName = customer;

      // Simpan ke NVS jika ON atau sedang menunggu pembayaran
      if (s.isOn || s.waitingPayment) {
        prefs.putString(("c_" + String(id)).c_str(), s.custName);
        prefs.putString(("p_" + String(id)).c_str(), s.activePkg);
        prefs.putInt(("i_" + String(id)).c_str(), s.initialMin);
        prefs.putBool(("w_" + String(id)).c_str(), s.waitingPayment);
        prefs.putString(("h_" + String(id)).c_str(), s.pkgHistory);
      }
      return;
    }
  }
  tableStatus.push_back({id, on, rem, (init != -1 ? init : rem), millis(),
                         pkgName, customer, false, ""});

  // Simpan ke NVS jika ON untuk item baru
  if (on) {
    prefs.putString(("c_" + String(id)).c_str(), customer);
    prefs.putString(("p_" + String(id)).c_str(), pkgName);
    prefs.putInt(("i_" + String(id)).c_str(), (init != -1 ? init : rem));
    prefs.putBool(("w_" + String(id)).c_str(), false);
    prefs.putString(("h_" + String(id)).c_str(), "");
  }
}

TableState getStatus(int id) {
  for (auto &s : tableStatus) {
    if (s.id == id)
      return s;
  }
  TableState ts = {id, false, 0, 0, 0, "", "NONE"};
  return ts;
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
    int rem = 0;
    bool recognized = false;
    if (pkt.cmd == 100) {
      st = (pkt.durationMin >= 1);
      rem = pkt.durationMin;
      recognized = true;

      // Jika di Jendral statusnya ON, maka meskipun Prajurit kirim durasi 0,
      // kita tetap anggap ON (mencegah mati di menit terakhir atau saat Open
      // Table).
      TableState ts = getStatus(pkt.mesaId);
      if (pkt.durationMin == 0 && ts.isOn) {
        st = true;
      }
    } else if (pkt.cmd == 1 || pkt.cmd == 1001) {
      st = true;
      recognized = true;
    } else if (pkt.cmd == 0 || pkt.cmd == 1000) {
      st = false;
      recognized = true;
    }

    if (recognized) {
      TableState ts = getStatus(pkt.mesaId);
      
      // 🛡️ Abaikan heartbeat jika baru saja dinyalakan/extend (mencegah race condition)
      if (ts.isOn && (millis() - ts.startMs < 5000)) {
        return;
      }
      
      bool finalSt = st;

      // 1. Jika di Jendral sudah ON, jangan biarkan laporan OFF dari Prajurit
      // mereset status
      if (ts.isOn && !st) {
        finalSt = true;
      }

      // 2. Jika di Jendral masih OFF, jangan biarkan laporan ON dari Prajurit
      // (latensi/bekas sesi) mengaktifkan meja
      if (!ts.isOn && st) {
        finalSt = false;
      }

      updateStatus(pkt.mesaId, finalSt, rem);
      Serial.printf("[HB] Meja %d | Cmd: %d | Status: %s | Rem: %d\n",
                    pkt.mesaId, pkt.cmd, finalSt ? "ON" : "OFF", rem);

      // State Enforcer
      int remMin = 0;
      long remSec = 0;
      if (ts.initialMin > 0) {
        unsigned long elapSec = (millis() - ts.startMs) / 1000;
        long totSec = (long)ts.initialMin * 60;
        remSec = (totSec > (long)elapSec) ? (totSec - elapSec) : 0;
        remMin = remSec / 60;
      }

      bool shouldBeOff = (ts.initialMin > 0 && remSec == 0);

      if ((ts.isOn && (pkt.durationMin == 0 || !st)) || (shouldBeOff && st)) {
        int cmdToSend = shouldBeOff ? 0 : 1;
        int timeToSend = shouldBeOff ? 0 : remMin;

        static unsigned long lastEnforce[101] = {0};
        if (pkt.mesaId > 0 && pkt.mesaId <= 100) {
          if (millis() - lastEnforce[pkt.mesaId] > 5000) {
            sendCmd(pkt.mesaId, cmdToSend, timeToSend);
            lastEnforce[pkt.mesaId] = millis();
            Serial.printf("[ENFORCER] Koreksi Meja %d: Cmd=%d, Rem=%d\n",
                          pkt.mesaId, cmdToSend, timeToSend);
          }
        }
      }
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
  html +=
      "<link "
      "href='https://fonts.googleapis.com/"
      "css2?family=Outfit:wght@300;400;600;700&display=swap' rel='stylesheet'>";
  html += "<script src='https://unpkg.com/lucide@latest'></script>";
  html += "<style>";
  html += ":root{--p:#00f2ff;--bg:#020617;--card:rgba(30,41,59,0.5);--on:#"
          "22c55e;--off:#64748b;--text:#f8fafc;--accent:#3b82f6}";
  html += "*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-"
          "color:transparent}";
  html += "body{font-family:'Outfit',sans-serif;background:var(--bg);color:var("
          "--text);min-height:100vh;padding:20px 15px;line-height:1.5}";
  html += ".container{max-width:900px;margin:0 auto}";
  html += "header{display:flex;justify-content:space-between;align-items:"
          "center;margin-bottom:24px;padding:0 4px}";
  html += "h1{font-size:1.4rem;font-weight:700;letter-spacing:1px;background:"
          "linear-gradient(to "
          "right,#fff,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-"
          "color:transparent}";
  html += ".status{display:flex;align-items:center;gap:8px;font-size:0.7rem;"
          "background:rgba(255,255,255,0.05);padding:6px "
          "14px;border-radius:100px;border:1px solid rgba(255,255,255,0.1)}";
  html += ".dot{width:8px;height:8px;border-radius:50%;background:#444}.dot.on{"
          "background:var(--on);box-shadow:0 0 12px var(--on)}";
  // ─ Grid Layout ────────────────────────────────────────────────
  html += ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax("
          "160px,1fr));gap:14px;margin-bottom:90px}";
  html += "@media(max-width:360px){.grid{grid-template-columns:1fr}}";
  // ─ CSS Card & Toolbar ─────────────────────────────────────────────
  html +=
      ".card{background:var(--card);backdrop-filter:blur(20px);border:2px "
      "solid "
      "rgba(255,255,255,0.06);border-radius:24px;padding:0;transition:all 0.3s "
      "cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;display:"
      "flex;flex-direction:column;min-height:240px}";
  html += ".card.active{border-color:var(--on);box-shadow:0 12px 30px "
          "rgba(0,0,0,0.35),0 0 0 1px rgba(34,197,94,0.15)}";
  // Toolbar atas
  html += ".card-toolbar{display:flex;justify-content:space-between;align-"
          "items:center;padding:12px 12px 0;gap:6px}";
  html += ".tb-btn{background:rgba(255,255,255,0.06);border:1px solid "
          "rgba(255,255,255,0.09);color:rgba(255,255,255,0.45);border-radius:"
          "8px;padding:5px "
          "9px;font-size:0.6rem;font-weight:700;cursor:pointer;transition:0.2s;"
          "white-space:nowrap}";
  html += ".tb-btn:active{transform:scale(0.93)}";
  html += ".tb-btn:hover{background:rgba(255,255,255,0.13);color:#fff}";
  html += ".tb-btn.active-free{background:rgba(139,92,246,0.22);border-color:"
          "rgba(139,92,246,0.5);color:#c4b5fd}";
  html += ".tb-btn.move{color:rgba(0,242,255,0.55);border-color:rgba(0,242,255,"
          "0.12)}";
  html += ".tb-btn.move:hover{background:rgba(0,242,255,0.08);color:var(--p)}";
  html += ".card-mesa-num{font-size:0.65rem;font-weight:700;color:rgba(255,255,"
          "255,0.18);letter-spacing:2px}";
  html += ".active .card-mesa-num{color:rgba(34,197,94,0.55)}";
  // Body
  html += ".card-body{padding:10px 14px "
          "8px;text-align:center;flex:1;display:flex;flex-direction:column;"
          "justify-content:center}";
  html += ".timer-display{font-size:1.5rem;font-weight:800;letter-spacing:2px;"
          "color:rgba(255,255,255,0.13);font-variant-numeric:tabular-nums;"
          "transition:color 0.4s;margin-bottom:3px}";
  html += ".active .timer-display{color:#fff}";
  html +=
      ".pkg-name{font-size:0.55rem;font-weight:700;text-transform:uppercase;"
      "color:rgba(255,255,255,0.28);letter-spacing:1px;margin-bottom:4px}";
  html += ".active .pkg-name{color:rgba(0,242,255,0.65)}";
  html += ".cust-label{font-size:0.8rem;font-weight:700;color:var(--on);margin-"
          "bottom:2px;min-height:18px;overflow:hidden;text-overflow:ellipsis;"
          "white-space:nowrap}";
  html += ".price-val{font-size:0.95rem;font-weight:700;color:rgba(255,255,255,"
          "0.45);margin-bottom:2px}";
  html += ".active .price-val{color:var(--p)}";
  // Footer tombol
  html += ".card-footer{display:flex;gap:8px;padding:8px 12px 12px}";
  html += ".btn{flex:1;border:none;border-radius:12px;padding:11px "
          "6px;font-weight:700;font-size:0.75rem;cursor:pointer;transition:0."
          "2s;display:flex;align-items:center;justify-content:center}";
  html += ".btn-on{background:linear-gradient(135deg,var(--on),#16a34a);color:#"
          "fff;box-shadow:0 3px 10px rgba(34,197,94,0.25)}";
  html += ".btn-off{background:rgba(255,255,255,0.04);color:rgba(255,255,255,0."
          "6);border:1px solid rgba(255,255,255,0.09)}";
  html += ".btn:active{transform:scale(0.94)}";
  html += ".btn-dim{opacity:0.15!important;pointer-events:none}";
  // Misc
  html += ".occupied{opacity:0.4;cursor:not-allowed!important}";
  html +=
      ".cf-row{display:flex;justify-content:space-between;align-items:center;"
      "padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)}";
  html += ".cf-label{font-size:0.72rem;color:rgba(255,255,255,0.4)}";
  html += ".cf-val{font-size:0.85rem;font-weight:700;text-align:right}";
  html += "input:focus{outline:none;border-color:var(--p)!important;box-shadow:"
          "0 0 0 3px rgba(0,242,255,0.1)}";
  html += "#custError{animation:shake 0.3s}@keyframes "
          "shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)"
          "}75%{transform:translateX(5px)}}";

  html +=
      ".section-title{font-size:0.75rem;font-weight:700;color:var(--p);text-"
      "transform:uppercase;margin:35px 0 "
      "20px;letter-spacing:2px;display:flex;align-items:center;gap:10px}";
  html += ".nav{position:fixed;bottom:25px;left:50%;transform:translateX(-50%);"
          "background:rgba(15,23,42,0.8);backdrop-filter:blur(20px);padding:"
          "8px;border-radius:100px;border:1px solid "
          "rgba(255,255,255,0.1);display:flex;gap:5px;z-index:1000;box-shadow:"
          "0 10px 30px rgba(0,0,0,0.5)}";
  html += ".nav-link{padding:12px "
          "25px;border-radius:50px;color:rgba(255,255,255,0.5);text-decoration:"
          "none;font-size:0.8rem;font-weight:700;transition:0.3s}";
  html += ".nav-link.active{background:#fff;color:#000}";
  html +=
      ".modal{display:none;position:fixed;top:0;left:0;width:100%;height:"
      "100%;background:rgba(2,6,23,0.85);backdrop-filter:blur(10px);z-index:"
      "2000;justify-content:center;align-items:center;padding:20px;animation:"
      "fadeIn 0.3s ease}";
  html += ".modal-content{background:#0f172a;border:1px solid "
          "rgba(255,255,255,0.1);border-radius:35px;padding:30px;width:100%;"
          "max-width:420px;box-shadow:0 30px 60px rgba(0,0,0,0.6)}";
  html += "@keyframes fadeIn{from{opacity:0}to{opacity:1}}";
  html += ".pkg-list{display:grid;gap:12px;margin-top:20px;max-height:400px;"
          "overflow-y:auto;padding-right:5px}";
  html += ".pkg-item{background:rgba(255,255,255,0.03);border:1px solid "
          "rgba(255,255,255,0.08);padding:18px;border-radius:20px;text-align:"
          "left;cursor:pointer;transition:0.2s;display:flex;justify-content:"
          "space-between;align-items:center}";
  html +=
      ".pkg-item:hover{background:rgba(0,242,255,0.08);border-color:var(--p)}";
  html += ".pkg-item h3{font-size:0.95rem;font-weight:600;margin-bottom:2px}";
  html += ".pkg-item p{font-size:0.7rem;color:rgba(255,255,255,0.4)}";
  html += "input{width:100%;padding:15px;margin-bottom:15px;border-radius:15px;"
          "border:1px solid "
          "rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:#fff;"
          "font-family:inherit}";
  html += "</style></head><body><div class='container'>";
  return html;
}

void handleRoot() {
  String html = getHeader(String(cfg.deviceTitle));

  // Cek Lisensi
  bool isLocked = (currentDate >= licenseExpiry);

  if (isLocked) {
    uint8_t mac[6];
    WiFi.macAddress(mac);
    char macStr[13];
    sprintf(macStr, "%02X%02X%02X%02X%02X%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

    html += "<div "
            "style='position:fixed;top:0;left:0;width:100%;height:100%;"
            "background:rgba(2,6,23,0.95);backdrop-filter:blur(20px);z-index:"
            "9999;display:flex;flex-direction:column;justify-content:center;"
            "align-items:center;padding:20px'>";
    html += "<div style='text-align:center;margin-bottom:30px'>";
    html += "<div style='font-size:4rem;margin-bottom:10px'>🔒</div>";
    html += "<h2 "
            "style='font-size:1.5rem;font-weight:700;margin-bottom:10px'>"
            "Aplikasi Terkunci</h2>";
    html += "<p "
            "style='color:rgba(255,255,255,0.6);font-size:0.9rem;margin-bottom:"
            "20px'>Harap periksa hardware untuk maintenance rutin.</p>";
    html += "<a "
            "href='https://wa.me/"
            "628999964538?text=Halo,%20saya%20ingin%20perpanjang%20license%"
            "20aplikasi%20billiard' target='_blank' "
            "style='display:inline-block;background:#25d366;color:#fff;padding:"
            "12px "
            "24px;border-radius:12px;text-decoration:none;font-weight:700;"
            "margin-bottom:20px'>Hubungi Teknisi</a>";
    html += "</div>";
    html += "<div "
            "style='width:100%;max-width:300px;background:rgba(255,255,255,0."
            "05);padding:20px;border-radius:20px;border:1px solid "
            "rgba(255,255,255,0.1)'>";
    html += "<p style='font-size:0.75rem;color:rgba(255,255,255,0.4);margin-bottom:15px;text-align:center'>MAC Device: <span style='color:var(--p);font-weight:700'>" + String(macStr) + "</span></p>";
    html += "<label "
            "style='font-size:0.7rem;color:rgba(255,255,255,0.4);margin-bottom:"
            "5px;display:block'>MASUKKAN SERIAL NUMBER</label>";
    html += "<input type='text' id='licenseKey' placeholder='YYYYMMDD-XXXX' "
            "style='margin-bottom:10px;text-align:center;background:rgba(255,"
            "255,255,0.05);border:1px solid "
            "rgba(255,255,255,0.1);color:#fff;border-radius:10px;padding:10px;"
            "width:100%'>";
    html += "<button onclick='activateLicense()' "
            "style='width:100%;background:var(--p);color:#000;border:none;"
            "padding:12px;border-radius:12px;font-weight:700;cursor:pointer'>"
            "AKTIFKAN</button>";
    html += "<p id='licError' "
            "style='color:#ef4444;font-size:0.7rem;margin-top:5px;text-align:"
            "center;display:none'>Kode Invalid!</p>";
    html += "</div>";
    html += "</div>";

    html += "<script>";
    html += "function activateLicense() {";
    html += "  var key = document.getElementById('licenseKey').value;";
    html += "  fetch('/activate?key=' + key).then(r => {";
    html += "    if(r.ok) { alert('Aktivasi Berhasil!'); location.reload(); }";
    html += "    else { document.getElementById('licError').style.display = "
            "'block'; }";
    html += "  });";
    html += "}";
    html += "</script>";

    html += "</body></html>";
    server.send(200, "text/html", html);
    return;
  }

  // Tampilkan banner jika H-3 atau H-2 (Akan diatur oleh JS)
  html += "<div id='licBanner' "
          "style='display:none;background:#f59e0b;color:#000;padding:10px;text-"
          "align:center;font-weight:700;font-size:0.8rem;position:fixed;top:0;"
          "left:0;width:100%;z-index:9999'></div>";

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
    TableState ts = getStatus(m);
    String ac = ts.isOn ? " active" : "";
    String ms = String(m);
    html += "<div class='card" + ac + "' id='card-" + ms + "'>";
    // Toolbar atas
    html += "<div class='card-toolbar'><span class='card-mesa-num'>MEJA " + ms +
            "</span>";
    html += "<div style='display:flex;gap:6px'>";
    html += "<button class='tb-btn' id='free-" + ms + "' onclick='toggleFree(" +
            ms + ")'>CEK</button>";
    html += "<button class='tb-btn move' onclick='openMove(" + ms +
            ")'>PINDAH</button>";
    html += "</div></div>";
    // Body
    html += "<div class='card-body'>";
    html += "<div class='timer-display' id='timer-" + ms + "'>00:00:00</div>";
    html += "<div class='pkg-name' id='pkg-" + ms + "'>STANDBY</div>";
    html += "<div class='cust-label' id='cust-" + ms + "'></div>";
    html += "<div class='price-val' id='price-" + ms + "'>Rp 0</div>";
    html += "</div>";
    // Footer
    html += "<div class='card-footer'>";
    html += "<button class='btn btn-on' id='on-" + ms + "' onclick='openPkg(" +
            ms + ")'>" + String(ts.isOn ? "EXTEND" : "START") + "</button>";
    html += "<button class='btn btn-off" + String(!ts.isOn ? " btn-dim" : "") +
            "' id='off-" + ms + "' onclick='stopSession(" + ms +
            ")'>STOP</button>";
    html += "</div></div>";
  }
  html += "</div>";

  html += "<div id='pkgModal' class='modal'><div class='modal-content'>";
  html += "<h2 style='font-size:1.3rem;font-weight:700;margin-bottom:4px'>🎱 "
          "Mulai Sesi Baru</h2>";
  html += "<p "
          "style='font-size:0.75rem;color:rgba(255,255,255,0.35);margin-bottom:"
          "20px'>Meja <span id='selMesa' "
          "style='color:var(--p);font-weight:700'></span></p>";
  html += "<label "
          "style='font-size:0.7rem;font-weight:700;color:rgba(255,255,255,0.5);"
          "display:block;margin-bottom:6px'>NAMA CUSTOMER <span "
          "style='color:#ef4444'>*WAJIB</span></label>";
  html += "<input type='text' id='customerInput' placeholder='Contoh: Budi, "
          "Ani, John...' autocomplete='off'>";
  html += "<div id='custError' "
          "style='display:none;font-size:0.75rem;color:#ef4444;font-weight:600;"
          "margin-top:6px;padding:8px "
          "12px;background:rgba(239,68,68,0.1);border-radius:10px;border:1px "
          "solid rgba(239,68,68,0.3)'></div>";
  html +=
      "<div style='font-size:0.7rem;color:var(--p);font-weight:700;margin:15px "
      "0 8px;letter-spacing:1px'>📦 PILIH PAKET:</div>";
  html += "<div class='pkg-list' id='pkgList'></div>";
  html += "<button class='btn btn-off' "
          "style='width:100%;margin-top:20px;border-radius:20px' "
          "onclick='closePkg()'>✗ BATAL</button>";
  html += "</div></div>";

  html += "<div id='moveModal' class='modal'><div class='modal-content'>";
  html += "<h2 style='font-size:1.3rem;font-weight:700;margin-bottom:4px'>🔄 "
          "Pindah Meja</h2>";
  html += "<p "
          "style='font-size:0.75rem;color:rgba(255,255,255,0.35);margin-bottom:"
          "10px'>Dari <span id='moveFrom' "
          "style='color:var(--p);font-weight:700'></span></p>";
  html += "<div "
          "style='font-size:0.7rem;color:rgba(255,255,255,0.35);margin-bottom:"
          "12px'>🟢 Pilih meja tujuan yang tersedia:</div>";
  html += "<div class='pkg-list' id='moveList'></div>";
  html += "<button class='btn btn-off' "
          "style='width:100%;margin-top:20px;border-radius:20px' "
          "onclick='closeMove()'>✗ BATAL</button>";
  html += "</div></div>";

  // Modal Konfirmasi
  html += "<div id='confirmModal' class='modal'><div class='modal-content' "
          "style='max-width:380px'>";
  html += "<div style='text-align:center;margin-bottom:18px'><div "
          "style='font-size:2.2rem'>🎱</div>";
  html +=
      "<h2 style='font-size:1.1rem;font-weight:700;margin-top:8px'>Konfirmasi "
      "Mulai Sesi</h2>";
  html += "<p "
          "style='font-size:0.72rem;color:rgba(255,255,255,0.3);margin-top:3px'"
          ">Periksa detail sebelum memulai</p></div>";
  html += "<div style='background:rgba(255,255,255,0.03);border:1px solid "
          "rgba(255,255,255,0.08);border-radius:18px;padding:15px;margin-"
          "bottom:18px'>";
  html += "<div class='cf-row'><span class='cf-label'>🎯 Meja</span><span "
          "class='cf-val' id='cfMeja'></span></div>";
  html += "<div class='cf-row'><span class='cf-label'>👤 Customer</span><span "
          "class='cf-val' id='cfNama'></span></div>";
  html += "<div class='cf-row'><span class='cf-label'>📦 Paket</span><span "
          "class='cf-val' id='cfPaket'></span></div>";
  html += "<div class='cf-row'><span class='cf-label'>⏱ Durasi</span><span "
          "class='cf-val' id='cfDurasi'></span></div>";
  html +=
      "<div class='cf-row'><span class='cf-label'>💰 Est. Harga</span><span "
      "class='cf-val' id='cfHarga' style='color:var(--p)'></span></div>";
  html += "<div class='cf-row' style='border:none;padding-bottom:0'><span "
          "class='cf-label'>🕐 Pukul</span><span class='cf-val' "
          "id='cfWaktu'></span></div>";
  html += "</div>";
  html += "<div style='display:flex;gap:10px'>";
  html += "<button class='btn btn-off' style='flex:1;border-radius:20px' "
          "onclick='cancelConfirm()'>✗ Tidak</button>";
  html += "<button class='btn btn-on' style='flex:2;border-radius:20px' "
          "onclick='doConfirm()'>✓ Ya, Mulai!</button>";
  html += "</div></div></div>";

  html +=
      "<div class='nav'><a href='/' class='nav-link active'>DASHBOARD</a><a "
      "href='/settings' class='nav-link'>SETTINGS</a></div>";

  html += "<script>\n";
  html +=
      "// ── Global Variables ─────────────────────────────────────────────\n";
  html += "let locks = {};\n";
  html += "let activeMesa = 0, pendingPkg = null;\n";
  html += "let rules = {}, allPkgs = [], tables = [], tableData = {};\n";
  html += "let freeTables = new Set();\n";
  html += "let expiredTables = new Set();\n";
  html += "let currentHour = new Date().getHours();\n";
  html += "\n";
  html +=
      "// ── Formatters ───────────────────────────────────────────────────\n";
  html += "function fmt(n) { return \"Rp \" + "
          "n.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, \".\"); }\n";
  html += "function fmtTime(s) {\n";
  html += "  if (s < 0) s = 0;\n";
  html += "  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = "
          "s%60;\n";
  html += "  return [h,m,sec].map(v=>v<10?\"0\"+v:v).join(\":\");\n";
  html += "}\n";
  html += "function getPrice(pkgName, hour, durMin) {\n";
  html += "  const pkgRules = rules[pkgName]; if (!pkgRules) return 0;\n";
  html += "  let price = 0;\n";
  html += "  for (const r of pkgRules) {\n";
  html += "    const match = r.s < r.e ? (hour>=r.s && hour<r.e) : (hour>=r.s "
          "|| hour<r.e);\n";
  html += "    if (match) { price = r.p; break; }\n";
  html += "  }\n";
  html += "  const pkg = allPkgs.find(p => p.n === pkgName);\n";
  html +=
      "  return (pkg && pkg.d > 0) ? price : Math.floor((durMin/60)*price);\n";
  html += "}\n";
  html += "\n";
  html +=
      "// ── Toast ────────────────────────────────────────────────────────\n";
  html += "function showToast(msg, type, persistent) {\n";
  html += "  type = type || 'info';\n";
  html += "  let t = document.getElementById('toast');\n";
  html += "  if (!t) {\n";
  html += "    t = document.createElement('div');\n";
  html += "    t.id = 'toast';\n";
  html +=
      "    t.style.cssText = "
      "'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:"
      "12px "
      "22px;border-radius:100px;font-size:0.8rem;font-weight:700;z-index:9999;"
      "transition:opacity 0.4s;white-space:nowrap';\n";
  html += "    document.body.appendChild(t);\n";
  html += "  }\n";
  html += "  var colors = { info:'#3b82f6', success:'#22c55e', "
          "error:'#ef4444', warn:'#f59e0b' };\n";
  html += "  t.style.background = colors[type] || colors.info;\n";
  html += "  t.style.color = '#fff';\n";
  html += "  t.style.opacity = '1';\n";
  html += "  clearTimeout(t._timer);\n";
  html += "  if (persistent) {\n";
  html += "    t.innerHTML = msg + \" <span onclick='this.parentElement.style.opacity=\\\"0\\\"' style='margin-left:10px;cursor:pointer;font-weight:900;background:rgba(0,0,0,0.2);padding:2px 6px;border-radius:50%'>X</span>\";\n";
  html += "    t.style.pointerEvents = 'auto';\n";
  html += "  } else {\n";
  html += "    t.textContent = msg;\n";
  html += "    t.style.pointerEvents = 'none';\n";
  html += "    t._timer = setTimeout(function(){ t.style.opacity='0'; }, 2800);\n";
  html += "  }\n";
  html += "}\n";
  html += "\n";
  html +=
      "// ── Validasi Customer ────────────────────────────────────────────\n";
  html += "function validateCustomerName(name) {\n";
  html += "  if (!name || name.trim().length === 0) return { ok: false, msg: "
          "'Nama customer wajib diisi!' };\n";
  html += "  if (name.trim().length < 2) return { ok: false, msg: 'Nama "
          "minimal 2 karakter.' };\n";
  html += "  if (name.trim().length > 30) return { ok: false, msg: 'Nama "
          "maksimal 30 karakter.' };\n";
  html += "  if (/[<>\"']/.test(name)) return { ok: false, msg: 'Karakter "
          "tidak valid pada nama.' };\n";
  html += "  return { ok: true };\n";
  html += "}\n";
  html += "\n";
  html +=
      "// ── Apply State ke Card ──────────────────────────────────────────\n";
  html += "function applyState(id, data) {\n";
  html += "  if (locks[id] && Date.now() < locks[id]) return;\n";
  html += "  if (data.waitingPayment) {\n";
  html += "    markExpired(String(id));\n";
  html += "    var custL = document.getElementById('cust-'+id);\n";
  html += "    if (custL) custL.textContent = data.cust || '';\n";
  html += "    var priceV = document.getElementById('price-'+id);\n";
  html += "    if (priceV) {\n";
  html += "      var total = 0;\n";
  html += "      var history = data.history || '';\n";
  html += "      var items = history.split(';');\n";
  html += "      items.forEach(function(item) {\n";
  html += "        if (!item) return;\n";
  html += "        var parts = item.split('|');\n";
  html += "        var pkgName = parts[0];\n";
  html += "        var time = parts[1];\n";
  html += "        var hour = parseInt(time.split(':')[0]) || currentHour;\n";
  html += "        var pkgObj = allPkgs.find(function(p){ return p.n === pkgName; });\n";
  html += "        var dur = pkgObj ? pkgObj.d : 60;\n";
  html += "        total += getPrice(pkgName, hour, dur);\n";
  html += "      });\n";
  html += "      var curHour = new Date().getHours();\n";
  html += "      total += getPrice(data.pkg || '', curHour, Math.floor(data.elap/60));\n";
  html += "      priceV.textContent = fmt(total);\n";
  html += "    }\n";
  html += "    return;\n";
  html += "  }\n";

  html += "  var card = document.getElementById('card-'+id);\n";
  html += "  var btnOn = document.getElementById('on-'+id);\n";
  html += "  var btnOff = document.getElementById('off-'+id);\n";
  html += "  var timer = document.getElementById('timer-'+id);\n";
  html += "  var pkgL = document.getElementById('pkg-'+id);\n";
  html += "  var custL = document.getElementById('cust-'+id);\n";
  html += "  var priceV = document.getElementById('price-'+id);\n";
  html += "  if (!card) return;\n";
  html += "  if (data.on) {\n";
  html += "    card.classList.add('active');\n";
  html += "    card.style.borderColor = '';\n";
  html += "    card.style.background = '';\n";
  html += "    if (btnOn) btnOn.textContent = 'EXTEND';\n";
  html += "    if (btnOff) btnOff.classList.remove('btn-dim');\n";
  html += "    var isOpen = (data.init === 0);\n";
  html += "    var sec = isOpen ? data.elap : data.rem;\n";
  html += "    if (timer) {\n";
  html +=
      "      var curSec = timer.textContent.split(':').reduce(function(a,v){ "
      "return 60*a + (+v); }, 0);\n";
  html += "      if (Math.abs(curSec - sec) > 3 || curSec === 0) {\n";
  html += "        timer.textContent = fmtTime(sec);\n";
  html += "      }\n";
  html += "    }\n";
  html +=
      "    if (pkgL) {\n";
  html += "      var isExtended = data.history && data.history.length > 0;\n";
  html += "      pkgL.textContent = isOpen ? 'OPEN TABLE' : (isExtended ? 'EXTEND ' + data.pkg : data.pkg);\n";
  html += "    }\n";
  html += "    if (custL) custL.textContent = data.cust || '';\n";
  html += "    if (priceV) {\n";
  html += "      var total = 0;\n";
  html += "      var history = data.history || '';\n";
  html += "      var items = history.split(';');\n";
  html += "      items.forEach(function(item) {\n";
  html += "        if (!item) return;\n";
  html += "        var parts = item.split('|');\n";
  html += "        var pkgName = parts[0];\n";
  html += "        var time = parts[1];\n";
  html += "        var hour = parseInt(time.split(':')[0]) || currentHour;\n";
  html += "        var pkgObj = allPkgs.find(function(p){ return p.n === pkgName; });\n";
  html += "        var dur = pkgObj ? pkgObj.d : 60;\n";
  html += "        total += getPrice(pkgName, hour, dur);\n";
  html += "      });\n";
  html += "      total += getPrice(data.pkg || '', currentHour, Math.floor(data.elap/60));\n";
  html += "      priceV.textContent = fmt(total);\n";
  html += "    }\n";
  html += "  } else {\n";
  html += "    card.classList.remove('active');\n";
  html += "    if (card) { card.style.borderColor = ''; card.style.background = ''; }\n";
  html += "    if (btnOn) btnOn.classList.remove('btn-dim');\n";
  html += "    if (btnOn) btnOn.textContent = 'START';\n";
  html += "    if (btnOff) {\n";
  html += "      btnOff.classList.add('btn-dim');\n";
  html += "      btnOff.style.background = ''; btnOff.style.color = ''; btnOff.style.fontWeight = '';\n";
  html += "      btnOff.textContent = 'STOP';\n";
  html += "      btnOff.onclick = function() { stopSession(id); };\n";
  html += "    }\n";
  html += "    if (pkgL) pkgL.textContent = 'STANDBY';\n";
  html += "    if (custL) custL.textContent = '';\n";
  html += "    if (priceV) priceV.textContent = 'Rp 0';\n";
  html += "    if (timer) {\n";
  html += "      timer.textContent = '00:00:00';\n";
  html += "      timer.style.color = '';\n";
  html += "      timer.style.animation = '';\n";
  html += "    }\n";
  html += "  }\n";
  html += "}\n";
  html += "\n";
  html +=
      "// ── Free / CEK Mode ──────────────────────────────────────────────\n";
  html += "function toggleFree(id) {\n";
  html += "  id = String(id);\n";
  html += "  var state = tableData[id];\n";
  html += "  // if (state && state.on && !freeTables.has(id)) {\n";
  html += "  //   showToast('Meja ' + id + ' sedang billing aktif. STOP "
          "dahulu.', 'warn'); return;\n";
  html += "  // }\n";
  html += "  if (expiredTables.has(id)) {\n";
  html += "    showToast('Meja ' + id + ' belum dibayar! Selesaikan pembayaran "
          "dahulu.', 'error'); return;\n";
  html += "  }\n";
  html += "  var btn = document.getElementById('free-' + id);\n";
  html += "  if (freeTables.has(id)) {\n";
  html += "    freeTables.delete(id);\n";
  html += "    fetch('/free?id=' + id + '&s=0').catch(function(){});\n";
  html += "    if (btn) { btn.textContent = 'CEK'; "
          "btn.classList.remove('active-free'); }\n";
  html += "    showToast('Lampu Meja ' + id + ' dimatikan (Cek selesai).', "
          "'info');\n";
  html += "  } else {\n";
  html += "    freeTables.add(id);\n";
  html += "    fetch('/free?id=' + id + '&s=1').catch(function(){});\n";
  html += "    if (btn) { btn.textContent = 'STOP CEK'; "
          "btn.classList.add('active-free'); }\n";
  html += "    showToast('Meja ' + id + ' menyala (Cek/Owner) - tidak masuk "
          "billing.', 'info');\n";
  html += "  }\n";
  html += "}\n";
  html += "\n";
  html +=
      "// ── Modal Paket ──────────────────────────────────────────────────\n";
  html += "function openPkg(id) {\n";
  html += "  id = String(id);\n";
  html += "  if (freeTables.has(id)) {\n";
  html += "    showToast('Meja ' + id + ' mode Cek/Owner. Matikan CEK "
          "dahulu.', 'warn'); return;\n";
  html += "  }\n";
  html += "  var state = tableData[id];\n";
  html += "  activeMesa = id;\n";
  html += "  document.getElementById('selMesa').textContent = 'Meja ' + id;\n";
  html += "  var ci = document.getElementById('customerInput');\n";
  html += "  if (ci) {\n";
  html += "    ci.value = (state && (state.on || state.waitingPayment)) ? (state.cust || '') : '';\n";
  html += "    ci.disabled = (state && (state.on || state.waitingPayment));\n";
  html += "  }\n";
  html += "  var errEl = document.getElementById('custError');\n";
  html += "  if (errEl) { errEl.textContent = ''; errEl.style.display = "
          "'none'; }\n";
  html += "  var list = document.getElementById('pkgList');\n";
  html += "  list.innerHTML = '';\n";
  html += "  allPkgs.forEach(function(p) {\n";
  html += "    var curPrice = getPrice(p.n, currentHour, p.d);\n";
  html += "    var item = document.createElement('div');\n";
  html += "    item.className = 'pkg-item';\n";
  html += "    item.onclick = function() { selectPkg(p.n, p.d, curPrice); };\n";
  html += "    var durLabel = p.d > 0 ? p.d + ' Menit' : 'Open Table (Hitung "
          "Maju)';\n";
  html += "    item.innerHTML = '<div><h3>' + p.n + '</h3><p>' + durLabel + "
          "'</p></div><div style=\"text-align:right\"><div "
          "style=\"color:var(--p);font-weight:700;font-size:0.9rem\">' + "
          "fmt(curPrice) + '</div></div>';\n";
  html += "    list.appendChild(item);\n";
  html += "  });\n";
  html += "  if (allPkgs.length === 0) {\n";
  html += "    list.innerHTML = '<div "
          "style=\"color:#ef4444;text-align:center;padding:20px;font-size:0."
          "8rem;font-weight:600\">⚠️ Tidak ada paket tersedia.<br>Silakan buat "
          "di menu Settings atau tunggu sinkronisasi.</div>';\n";
  html += "  }\n";
  html += "  document.getElementById('pkgModal').style.display = 'flex';\n";
  html +=
      "  setTimeout(function(){ var ci = "
      "document.getElementById('customerInput'); if(ci) ci.focus(); }, 300);\n";
  html += "}\n";
  html += "\n";
  html += "function selectPkg(name, dur, price) {\n";
  html += "  var custInput = document.getElementById('customerInput');\n";
  html += "  var errEl = document.getElementById('custError');\n";
  html += "  var cust = custInput.value.trim();\n";
  html += "  var v = validateCustomerName(cust);\n";
  html += "  if (!v.ok) {\n";
  html += "    errEl.textContent = v.msg;\n";
  html += "    errEl.style.display = 'block';\n";
  html += "    custInput.style.borderColor = '#ef4444';\n";
  html += "    custInput.focus();\n";
  html += "    return;\n";
  html += "  }\n";
  html += "  errEl.style.display = 'none';\n";
  html += "  custInput.style.borderColor = '';\n";
  html +=
      "  pendingPkg = { name: name, dur: dur, cust: cust, price: price };\n";
  html += "  closePkg();\n";
  html += "  showConfirm();\n";
  html += "}\n";
  html += "\n";
  html +=
      "// ── Modal Konfirmasi ─────────────────────────────────────────────\n";
  html += "function showConfirm() {\n";
  html += "  if (!pendingPkg) return;\n";
  html += "  var p = pendingPkg;\n";
  html += "  var durLabel = p.dur > 0 ? p.dur + ' Menit' : 'Open Table (Hitung "
          "Maju)';\n";
  html += "  var now = new Date();\n";
  html += "  document.getElementById('cfMeja').textContent = 'Meja ' + "
          "activeMesa;\n";
  html += "  document.getElementById('cfNama').textContent = p.cust;\n";
  html += "  document.getElementById('cfPaket').textContent = p.name;\n";
  html += "  document.getElementById('cfDurasi').textContent = durLabel;\n";
  html += "  document.getElementById('cfHarga').textContent = fmt(p.price);\n";
  html += "  document.getElementById('cfWaktu').textContent = "
          "now.toLocaleTimeString('id-ID');\n";
  html += "  document.getElementById('confirmModal').style.display = 'flex';\n";
  html += "}\n";
  html += "function doConfirm() {\n";
  html += "  if (!pendingPkg) return;\n";
  html += "  var p = pendingPkg;\n";
  html += "  expiredTables.delete(activeMesa);\n";
  html += "  var state = tableData[activeMesa];\n";
  html += "  if (state && (state.on || state.waitingPayment)) {\n";
  html += "    var timer = document.getElementById('timer-'+activeMesa);\n";
  html += "    var curSec = timer ? timer.textContent.split(':').reduce(function(a,v){ return 60*a + (+v); }, 0) : 0;\n";
  html += "    var curMin = Math.ceil(curSec / 60);\n";
  html += "    var newDur = curMin + p.dur;\n";
  html += "    var history = state.history || '';\n";
  html += "    if (state.pkg) {\n";
  html += "      if (history.length > 0) history += ';';\n";
  html += "      var now = new Date();\n";
  html += "      var timeStr = now.getHours() + ':' + ('0' + now.getMinutes()).slice(-2);\n";
  html += "      history += state.pkg + '|' + timeStr;\n";
  html += "    }\n";
  html += "    state.rem = newDur * 60;\n";
  html += "    state.init = newDur;\n";
  html += "    state.pkg = p.name;\n";
  html += "    state.history = history;\n";
  html += "    state.waitingPayment = false;\n";
  html += "    state.on = true;\n";
  html += "    applyState(activeMesa, state);\n";
  html += "    ctrl(activeMesa, 1, newDur, p.name, state.cust, history);\n";
  html += "    showToast('Sesi Meja ' + activeMesa + ' diperpanjang ' + p.dur "
          "+ ' menit.', 'success');\n";
  html += "  } else {\n";
  html += "    tableData[activeMesa] = { on: true, rem: p.dur * 60, init: "
          "p.dur, pkg: p.name, cust: p.cust, elap: 0 };\n";
  html += "    applyState(activeMesa, tableData[activeMesa]);\n";
  html += "    ctrl(activeMesa, 1, p.dur, p.name, p.cust);\n";
  html += "    showToast('Sesi dimulai untuk ' + p.cust + ' di Meja ' + "
          "activeMesa, 'success');\n";
  html += "  }\n";
  html += "  document.getElementById('confirmModal').style.display = 'none';\n";
  html += "  pendingPkg = null;\n";
  html += "}\n";
  html += "function cancelConfirm() {\n";
  html += "  document.getElementById('confirmModal').style.display = 'none';\n";
  html += "  showToast('Sesi dibatalkan.', 'warn');\n";
  html += "  pendingPkg = null;\n";
  html += "}\n";
  html += "\n";
  html +=
      "// ── Modal Pindah ─────────────────────────────────────────────────\n";
  html += "function openMove(id) {\n";
  html += "  id = String(id);\n";
  html += "  var state = tableData[id];\n";
  html += "  if (!state || !state.on) {\n";
  html += "    showToast('Meja ' + id + ' tidak aktif, tidak bisa dipindah.', "
          "'warn'); return;\n";
  html += "  }\n";
  html += "  activeMesa = id;\n";
  html += "  document.getElementById('moveFrom').textContent = 'Meja ' + id + "
          "' (' + (state.cust||'Guest') + ')';\n";
  html += "  var list = document.getElementById('moveList');\n";
  html += "  list.innerHTML = '';\n";
  html += "  Object.keys(tableData).forEach(function(t) {\n";
  html += "    if (t != id) {\n";
  html += "      var ts = tableData[t];\n";
  html += "      var isOccupied = ts && ts.on;\n";
  html += "      var item = document.createElement('div');\n";
  html +=
      "      item.className = 'pkg-item' + (isOccupied ? ' occupied' : '');\n";
  html += "      if (!isOccupied) item.onclick = function() { doMove(t); };\n";
  html += "      item.innerHTML = '<div><h3>Meja ' + t + '</h3><p>' + "
          "(isOccupied ? 'Sedang terisi' : 'Tersedia') + '</p></div>';\n";
  html += "      list.appendChild(item);\n";
  html += "    }\n";
  html += "  });\n";
  html += "  document.getElementById('moveModal').style.display = 'flex';\n";
  html += "}\n";
  html += "function doMove(to) {\n";
  html += "  var fromState = tableData[activeMesa];\n";
  html += "  closeMove();\n";
  html += "  if (!fromState) return;\n";
  html += "  if (!confirm('Pindahkan sesi \"' + (fromState.cust||'Guest') + "
          "'\" dari Meja ' + activeMesa + ' ke Meja ' + to + '?')) {\n";
  html += "    showToast('Pemindahan dibatalkan.', 'warn'); return;\n";
  html += "  }\n";
  html += "  fetch('/move?from=' + activeMesa + '&to=' + to)\n";
  html += "    .then(function(r) { if(!r.ok) throw r; showToast('Sesi dipindah "
          "ke Meja ' + to, 'success'); })\n";
  html += "    .catch(function(){ showToast('Gagal memindah meja. Cek "
          "koneksi.', 'error'); });\n";
  html += "}\n";
  html += "\n";
  html +=
      "// ── STOP Session ─────────────────────────────────────────────────\n";
  html += "function stopSession(id) {\n";
  html += "  id = String(id);\n";
  html += "  var state = tableData[id];\n";
  html += "  if (!state || !state.on) { showToast('Meja ' + id + ' sudah mati.', 'info'); return; }\n";
  html += "  var cust = state.cust || 'Guest';\n";
  html += "  var elapsed = fmtTime(state.elap || 0);\n";
  html += "  var total = 0;\n";
  html += "  var history = state.history || '';\n";
  html += "  var items = history.split(';');\n";
  html += "  items.forEach(function(item) {\n";
  html += "    if (!item) return;\n";
  html += "    var parts = item.split('|');\n";
  html += "    var pkgName = parts[0];\n";
  html += "    var time = parts[1];\n";
  html += "    var hour = parseInt(time.split(':')[0]) || currentHour;\n";
  html += "    var pkgObj = allPkgs.find(function(p){ return p.n === pkgName; });\n";
  html += "    var dur = pkgObj ? pkgObj.d : 60;\n";
  html += "    total += getPrice(pkgName, hour, dur);\n";
  html += "  });\n";
  html += "  total += getPrice(state.pkg || '', currentHour, Math.floor((state.elap||0)/60));\n";
  html += "  var extCount = items.filter(Boolean).length;\n";
  html += "  if (!confirm('Akhiri sesi \"' + cust + '\" di Meja ' + id + '?\\n\\n' +\n";
  html += "               'Total Extend: ' + extCount + ' kali\\n' +\n";
  html += "               'Durasi Sesi Ini: ' + elapsed + '\\n' +\n";
  html += "               'Total Tagihan: ' + fmt(total) + '\\n\\n' +\n";
  html += "               'Tekan OK untuk mematikan meja.')) {\n";
  html += "    showToast('Stop dibatalkan.', 'warn'); return;\n";
  html += "  }\n";
  html += "  ctrl(id, 0);\n";
  html += "  showToast('Sesi Meja ' + id + ' dihentikan.', 'info');\n";
  html += "}\n";
  html += "\n";
  html += "function closePkg() { "
          "document.getElementById('pkgModal').style.display = 'none'; }\n";
  html += "function doBayar(id) {\n";
  html += "  id = String(id);\n";
  html += "  var state = tableData[id];\n";
  html += "  var cust = (state && state.cust) || 'Guest';\n";
  html += "  var elapSec = (state && state.elap) || 0;\n";
  html += "  var history = (state && state.history) || '';\n";
  html += "  var modal = document.createElement('div');\n";
  html += "  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(10px);z-index:10000;display:flex;justify-content:center;align-items:center;padding:20px';\n";
  html += "  var content = document.createElement('div');\n";
  html += "  content.style.cssText = 'background:rgba(30,41,59,0.9);padding:30px;border-radius:25px;width:100%;max-width:400px;border:1px solid rgba(255,255,255,0.1);color:#fff';\n";
  html += "  content.innerHTML = '<h2 style=\"font-size:1.2rem;font-weight:bold;margin-bottom:20px;text-align:center\">Rincian Pembayaran</h2>';\n";
  html += "  content.innerHTML += '<div style=\"margin-bottom:10px;font-size:0.85rem\"><span style=\"color:rgba(255,255,255,0.5)\">Customer:</span> <span style=\"font-weight:bold\">' + cust + '</span></div>';\n";
  html += "  content.innerHTML += '<div style=\"margin-bottom:10px;font-size:0.85rem\"><span style=\"color:rgba(255,255,255,0.5)\">Meja:</span> <span style=\"font-weight:bold\">' + id + '</span></div>';\n";
  html += "  var extCount = history.split(';').filter(Boolean).length;\n";
  html += "  content.innerHTML += '<div style=\"margin-bottom:15px;font-size:0.85rem\"><span style=\"color:rgba(255,255,255,0.5)\">Total Extend:</span> <span style=\"font-weight:bold\">' + extCount + ' kali</span></div>';\n";
  html += "  content.innerHTML += '<div style=\"border-top:1px solid rgba(255,255,255,0.1);padding-top:15px;margin-bottom:15px\"><h3 style=\"font-size:0.85rem;font-weight:bold;margin-bottom:10px\">Riwayat Sesi:</h3>';\n";
  html += "  var items = history.split(';');\n";
  html += "  var total = 0;\n";
  html += "  items.forEach(function(item) {\n";
  html += "    if (!item) return;\n";
  html += "    var parts = item.split('|');\n";
  html += "    var pkgName = parts[0];\n";
  html += "    var time = parts[1];\n";
  html += "    var hour = parseInt(time.split(':')[0]) || currentHour;\n";
  html += "    var pkgObj = allPkgs.find(function(p){ return p.n === pkgName; });\n";
  html += "    var dur = pkgObj ? pkgObj.d : 60;\n";
  html += "    var price = getPrice(pkgName, hour, dur);\n";
  html += "    total += price;\n";
  html += "    content.innerHTML += '<div style=\"display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:5px\"><span style=\"color:rgba(255,255,255,0.7)\">' + pkgName + ' (' + time + ')</span><span>' + fmt(price) + '</span></div>';\n";
  html += "  });\n";
  html += "  var curHour = new Date().getHours();\n";
  html += "  var curPrice = getPrice((state&&state.pkg)||'', curHour, Math.floor(elapSec/60));\n";
  html += "  total += curPrice;\n";
  html += "  content.innerHTML += '<div style=\"display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:5px;font-weight:bold\"><span style=\"color:rgba(255,255,255,0.7)\">' + ((state&&state.pkg)||'Open Table') + ' (Sesi Terakhir)</span><span>' + fmt(curPrice) + '</span></div>';\n";
  html += "  content.innerHTML += '</div>';\n";
  html += "  content.innerHTML += '<div style=\"border-top:1px solid rgba(255,255,255,0.1);padding-top:15px;margin-bottom:20px;display:flex;justify-content:space-between;font-size:1rem;font-weight:bold\"><span>Total Tagihan:</span><span style=\"color:var(--p)\">' + fmt(total) + '</span></div>';\n";
  html += "  var btnContainer = document.createElement('div');\n";
  html += "  btnContainer.style.cssText = 'display:flex;gap:10px';\n";
  html += "  var btnCancel = document.createElement('button');\n";
  html += "  btnCancel.className = 'btn btn-off';\n";
  html += "  btnCancel.style.flex = '1';\n";
  html += "  btnCancel.textContent = 'Batal';\n";
  html += "  btnCancel.onclick = function() { document.body.removeChild(modal); };\n";
  html += "  var btnConfirm = document.createElement('button');\n";
  html += "  btnConfirm.className = 'btn btn-on';\n";
  html += "  btnConfirm.style.flex = '2';\n";
  html += "  btnConfirm.textContent = 'Bayar & Selesai';\n";
  html += "  btnConfirm.onclick = function() {\n";
  html += "    document.body.removeChild(modal);\n";
  html += "    fetch('/bayar?id=' + id)\n";
  html += "    .then(function(r) {\n";
  html += "      if (!r.ok) throw r;\n";
  html += "      expiredTables.delete(id);\n";
  html += "      applyState(id, {on:false, waitingPayment:false, elap:0, rem:0, cust:'', pkg:''});\n";
  html += "      locks[id] = Date.now() + 5000;\n";
  html += "      showToast('Pembayaran selesai! Meja ' + id + ' siap digunakan.', 'success');\n";
  html += "    })\n";
  html += "    .catch(function(){ showToast('Gagal proses pembayaran. Cek koneksi.', 'error'); });\n";
  html += "  };\n";
  html += "  btnContainer.appendChild(btnCancel);\n";
  html += "  btnContainer.appendChild(btnConfirm);\n";
  html += "  content.appendChild(btnContainer);\n";
  html += "  modal.appendChild(content);\n";
  html += "  document.body.appendChild(modal);\n";
  html += "}\n";
  html += "function closeMove() { "
          "document.getElementById('moveModal').style.display = 'none'; }\n";
  html += "\n";
  html += "function ctrl(id, s, d, pkg, cust, history) {\n";
  html += "  d = d || 0; pkg = pkg || ''; cust = cust || ''; history = history || '';\n";
  html += "  locks[id] = Date.now() + 5000;\n";
  html += "  fetch('/ctrl?id='+id+'&s='+s+'&d='+d+'&pkg='+encodeURIComponent(pkg)+'&c='+encodeURIComponent(cust)+'&history='+encodeURIComponent(history))\n";
  html += "    .catch(function(){ delete locks[id]; showToast('Gagal kirim perintah!', 'error'); });\n";
  html += "}\n";
  html += "\n";
  html +=
      "// ── Expired / BAYAR ──────────────────────────────────────────────\n";
  html += "function markExpired(id) {\n";
  html += "  id = String(id);\n";
  html += "  if (expiredTables.has(id)) return;\n";
  html += "  expiredTables.add(id);\n";
  html += "  var card = document.getElementById('card-'+id);\n";
  html += "  if (card) { card.style.borderColor='#f59e0b'; "
          "card.style.background='rgba(245,158,11,0.08)'; }\n";
  html += "  var btnOn = document.getElementById('on-'+id);\n";
  html += "  var btnOff = document.getElementById('off-'+id);\n";
  html += "  if (btnOn) {\n";
  html += "    btnOn.textContent = 'EXTEND';\n";
  html += "    btnOn.classList.remove('btn-dim');\n";
  html += "    btnOn.onclick = function() { openPkg(id); };\n";
  html += "  }\n";
  html += "  if (btnOff) {\n";
  html += "    btnOff.textContent = 'BAYAR';\n";
  html += "    btnOff.classList.remove('btn-dim');\n";
  html += "    btnOff.onclick = function() { doBayar(id); };\n";
  html += "    btnOff.style.background='#f59e0b'; btnOff.style.color='#000'; "
          "btnOff.style.fontWeight='800';\n";
  html += "  }\n";
  html += "  var pkgL = document.getElementById('pkg-'+id);\n";
  html += "  if (pkgL) pkgL.textContent = 'WAKTU HABIS - BELUM DIBAYAR';\n";
  html += "  var timer = document.getElementById('timer-'+id);\n";
  html += "  if (timer) {\n";
  html += "    timer.textContent = '00:00:00';\n";
  html += "    timer.style.color = '#f59e0b';\n";
  html += "    timer.style.animation = 'blink 1s infinite';\n";
  html += "  }\n";
  html += "  if (!document.getElementById('blinkStyle')) {\n";
  html += "    var s2 = document.createElement('style');\n";
  html += "    s2.id = 'blinkStyle';\n";
  html += "    s2.textContent = '@keyframes "
          "blink{0%,100%{opacity:1}50%{opacity:0.3}}';\n";
  html += "    document.head.appendChild(s2);\n";
  html += "  }\n";
  html += "  showToast('Meja ' + id + ' waktu habis! Harap lakukan "
          "pembayaran.', 'warn');\n";
  html += "}\n";
  html += "\n";

  html += "\n";
  html +=
      "// ── Polling Status (1 detik) ─────────────────────────────────────\n";
  html += "setInterval(function() {\n";
  html += "  currentHour = new Date().getHours();\n";
  html += "  fetch('/status?h=' + currentHour + '&t=' + "
          "Date.now()).then(function(r){ return r.json(); "
          "}).then(function(data) {\n";
  html +=
      "    rules = data.rules; allPkgs = data.pkgs; tableData = data.tables;\n";
  html += "    tables = Object.keys(data.tables);\n";
  html +=
      "    for (var id in data.tables) { applyState(id, data.tables[id]); }\n";
  html += "  }).catch(function(){});\n";
  html += "}, 1000);\n";
  html += "\n";
  html +=
      "// ── Timer Client-side (1 detik) ──────────────────────────────────\n";
  html += "setInterval(function() {\n";
  html += "  for (var id in tableData) {\n";
  html += "    var state = tableData[id];\n";
  html += "    if (!state.on) continue;\n";
  html += "    if (expiredTables.has(String(id))) continue;\n";
  html +=
      "    var el = document.getElementById('timer-'+id); if (!el) continue;\n";
  html += "    var s = el.textContent.split(':').reduce(function(a,v){ return "
          "60*a + (+v); }, 0);\n";
  html += "    if (state.init === 0) {\n";
  html += "      s++; // Open Table: hitung MAJU\n";
  html += "    } else {\n";
  html += "      if (s > 0) s--;\n";
  html += "      else { markExpired(String(id)); continue; }\n";
  html += "    }\n";
  html += "    el.textContent = fmtTime(s);\n";
  html += "  }\n";
  html += "}, 1000);\n";
  html += "  var d = new Date();\n";
  html += "  var dateStr = d.getFullYear() + ('0' + "
          "(d.getMonth()+1)).slice(-2) + ('0' + d.getDate()).slice(-2);\n";
  html += "  fetch('/sync_time?date=' + dateStr);\n";
  html += "  var exp = '" + licenseExpiry + "';\n";
  html += "  function checkLic() {\n";
  html += "    var d = new Date();\n";
  html += "    var exp = '" + licenseExpiry + "';\n";
  html += "    if (exp) {\n";
  html += "      var expDate = new Date(exp.substring(0,4), exp.substring(4,6)-1, exp.substring(6,8));\n";
  html += "      var diff = (expDate - d) / (1000*60*60*24);\n";
  html += "      if (diff <= 3 && diff > 2) { showToast('Ada kendala, perangkat anda perlu dilakukan pengecekan rutin', 'warn', true); }\n";
  html += "      else if (diff <= 2 && diff > 1) { showToast('Besok License anda akan habis, segerah hubungi teknisi untuk memperpanjang license', 'error', true); }\n";
  html += "    }\n";
  html += "  }\n";
  html += "  checkLic();\n";
  html += "  setInterval(checkLic, 60000);\n";
  html += "if (typeof lucide !== 'undefined') lucide.createIcons();\n";
  html += "</script></div></body></html>";

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

  html += "<div class='section-title'><i data-lucide='timer' size='14'></i> "
          "Konfigurasi Paket & Happy Hour</div>";
  html += "<div "
          "style='background:rgba(255,255,255,0.03);padding:20px;border-radius:"
          "25px;margin:15px;border:1px solid rgba(255,255,255,0.05)'>";
  html += "<form action='/add_pkg' method='POST' "
          "style='display:flex;flex-direction:column;gap:15px'>";
  html += "<div><label "
          "style='font-size:0.7rem;color:rgba(255,255,255,0.4);margin-bottom:"
          "5px;display:block'>NAMA PAKET</label>";
  html +=
      "<input type='text' name='name' placeholder='ex: 1 Jam' required></div>";
  html += "<div><label "
          "style='font-size:0.7rem;color:rgba(255,255,255,0.4);margin-bottom:"
          "5px;display:block'>DURASI (MENIT) - Isi 0 untuk Open Play</label>";
  html +=
      "<input type='number' name='dur' placeholder='ex: 60' required></div>";

  html +=
      "<div id='slots' style='display:flex;flex-direction:column;gap:10px'>";
  html +=
      "<label style='font-size:0.7rem;color:var(--p);font-weight:700'>HAPPY "
      "HOUR SLOTS</label>";
  for (int i = 0; i < 3; i++) {
    html += "<div style='display:flex;gap:5px;align-items:center'>";
    html +=
        "<input type='number' name='s" + String(i) +
        "' placeholder='Dari' style='margin:0;padding:10px;font-size:0.8rem'>";
    html += "<span style='color:rgba(255,255,255,0.2)'>-</span>";
    html +=
        "<input type='number' name='e" + String(i) +
        "' placeholder='Ke' style='margin:0;padding:10px;font-size:0.8rem'>";
    html +=
        "<input type='number' name='p" + String(i) +
        "' placeholder='Harga' style='margin:0;padding:10px;font-size:0.8rem'>";
    html += "</div>";
  }
  html += "</div>";
  html += "<button type='submit' class='btn btn-on' "
          "style='margin-top:10px'>SIMPAN PAKET</button></form></div>";

  html += "<div style='margin:15px'>";
  for (auto &p : packets) {
    html += "<div style='background:rgba(255,255,255,0.02);border:1px solid "
            "rgba(255,255,255,0.05);padding:15px;border-radius:20px;margin-"
            "bottom:10px'>";
    html += "<div "
            "style='display:flex;justify-content:space-between;align-items:"
            "center;margin-bottom:10px'>";
    html += "<div><h3 style='font-size:1rem;font-weight:700'>" + p.name +
            "</h3><p style='font-size:0.7rem;color:rgba(255,255,255,0.4)'>" +
            String(p.duration) + "m</p></div>";
    html += "<a href='/del_pkg?n=" + p.name +
            "' style='background:#ef4444;color:#fff;padding:8px "
            "15px;border-radius:12px;font-size:0.7rem;text-decoration:none;"
            "font-weight:700'>HAPUS</a></div>";

    html +=
        "<div style='display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px'>";
    for (auto &s : p.slots) {
      html += "<div "
              "style='background:rgba(255,255,255,0.03);padding:8px;border-"
              "radius:10px;text-align:center'>";
      html += "<div style='font-size:0.6rem;color:rgba(255,255,255,0.3)'>" +
              String(s.startH) + "-" + String(s.endH) + "</div>";
      html += "<div style='font-size:0.7rem;font-weight:700;color:var(--p)'>" +
              String(s.price / 1000) + "k</div></div>";
    }
    html += "</div></div>";
  }
  html += "</div>";

  html += "<div class='section-title'><i data-lucide='shield-check' "
          "size='14'></i> Keamanan & Branding</div>";
  html += "<form action='/save' method='POST' style='padding:15px'>";
  html += "<label "
          "style='display:block;font-size:0.6rem;color:rgba(255,255,255,0.4);"
          "margin-bottom:5px'>JUDUL DASHBOARD</label>";
  html += "<input type='text' name='title' value='" + String(cfg.deviceTitle) +
          "'>";
  html += "<label "
          "style='display:block;font-size:0.6rem;color:rgba(255,255,255,0.4);"
          "margin-bottom:5px'>PASSWORD ADMIN</label>";
  html += "<input type='password' name='pass' value='" + String(cfg.adminPass) +
          "'>";
  html += "<button type='submit' class='btn btn-on' style='width:100%'>SIMPAN "
          "PERUBAHAN</button></form>";

  html += "<div class='section-title'><i data-lucide='shield' size='14'></i> Aktivasi Lisensi</div>";
  html += "<div style='background:rgba(255,255,255,0.03);padding:20px;border-radius:25px;margin:15px;border:1px solid rgba(255,255,255,0.05)'>";
  html += "<p style='font-size:0.75rem;color:rgba(255,255,255,0.4);margin-bottom:10px'>Lisensi aktif sampai: <span style='color:var(--p);font-weight:700'>" + licenseExpiry + "</span></p>";
  html += "<input type='text' id='settingsLicKey' placeholder='YYYYMMDD-XXXX' style='background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:10px;padding:10px;width:100%;margin-bottom:10px;text-align:center'>";
  html += "<button onclick='activateFromSettings()' class='btn btn-on' style='width:100%'>AKTIFKAN</button>";
  html += "</div>";

  html += "<div class='section-title'><i data-lucide='list' size='14'></i> "
          "Daftar Meja Terpasang</div>";
  for (int m : tables) {
    html += "<div "
            "style='display:flex;justify-content:space-between;align-items:"
            "center;padding:12px "
            "15px;background:rgba(255,255,255,0.03);border-radius:15px;margin:"
            "0 15px 10px'>";
    html += "<span>Meja " + String(m) + "</span>";
    html += "<a href='/del?id=" + String(m) +
            "' "
            "style='color:#ef4444;text-decoration:none;font-size:0.7rem;font-"
            "weight:700'>HAPUS</a></div>";
  }

  html += "<div style='height:100px'></div>";
  html += "<div class='nav'><a href='/' class='nav-link'>DASHBOARD</a><a "
          "href='/settings' class='nav-link active'>SETTINGS</a></div>";
  html += "<script>\n";
  html += "function activateFromSettings() {\n";
  html += "  var key = document.getElementById('settingsLicKey').value;\n";
  html += "  fetch('/activate?key=' + key).then(function(r) {\n";
  html += "    if(r.ok) { alert('Aktivasi Berhasil!'); location.reload(); }\n";
  html += "    else { alert('Kode Invalid!'); }\n";
  html += "  });\n";
  html += "}\n";
  html += "lucide.createIcons();\n";
  html += "</script></div></body></html>";
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

void handleAddPkg() {
  if (!server.authenticate("admin", cfg.adminPass))
    return server.requestAuthentication();
  String name = server.arg("name");
  int dur = server.arg("dur").toInt();
  if (name.length() > 0) {
    String current = prefs.getString("pkgs", "");
    if (current.length() > 0)
      current += ";";
    current += name + ":" + String(dur) + "|";

    for (int i = 0; i < 3; i++) {
      String s = server.arg("s" + String(i));
      String e = server.arg("e" + String(i));
      String p = server.arg("p" + String(i));
      if (s.length() > 0 && e.length() > 0 && p.length() > 0) {
        current += s + "-" + e + ":" + p;
        if (i < 2 && server.arg("s" + String(i + 1)).length() > 0)
          current += ",";
      }
    }

    prefs.putString("pkgs", current);
    parsePackets();
  }
  server.sendHeader("Location", "/settings", true);
  server.send(302);
}

void handleDelPkg() {
  if (!server.authenticate("admin", cfg.adminPass))
    return server.requestAuthentication();
  String nameToDel = server.arg("n");
  String newList = "";

  // Parse ulang secara manual untuk menghapus agar aman
  String raw = prefs.getString("pkgs", "");
  int start = 0;
  int end = raw.indexOf(';');
  while (true) {
    String pStr =
        (end == -1) ? raw.substring(start) : raw.substring(start, end);
    if (pStr.length() > 0) {
      int sep1 = pStr.indexOf(':');
      if (sep1 != -1) {
        String name = pStr.substring(0, sep1);
        if (name != nameToDel) {
          if (newList.length() > 0)
            newList += ";";
          newList += pStr;
        }
      }
    }
    if (end == -1)
      break;
    start = end + 1;
    end = raw.indexOf(';', start);
  }

  prefs.putString("pkgs", newList);
  parsePackets();
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
  int d = server.arg("d").toInt();
  String pkgName = server.arg("pkg");
  String customer = server.arg("c"); // Nama Customer
  String history = server.arg("history"); // Riwayat dari JS
  
  Serial.printf("[UI-CTRL] Meja %d -> %s (Dur: %d, Pkg: %s, Cust: %s)\n", id,
                s ? "ON" : "OFF", d, pkgName.c_str(), customer.c_str());
  updateStatus(id, s == 1, d, pkgName, d, customer); // ⚡ UPDATE INSTAN
  
  // Simpan history jika ada
  if (history != "") {
    for (auto &ts : tableStatus) {
      if (ts.id == id) {
        ts.pkgHistory = history;
        prefs.putString(("h_" + String(id)).c_str(), ts.pkgHistory);
      }
    }
  }
  
  sendCmd(id, s, d);
  server.send(200, "text/plain", "OK");
}

void handleMove() {
  int from = server.arg("from").toInt();
  int to = server.arg("to").toInt();
  if (from == to)
    return server.send(400, "text/plain", "Meja sama");

  TableState tsFrom = getStatus(from);
  if (!tsFrom.isOn)
    return server.send(400, "text/plain", "Meja asal mati");

  // Pindahkan data ke meja tujuan
  updateStatus(to, true, tsFrom.remMin, tsFrom.activePkg, tsFrom.initialMin, tsFrom.custName);
  
  TableState *tsTo = nullptr;
  for (auto &s : tableStatus) {
    if (s.id == to) {
      tsTo = &s;
      break;
    }
  }
  
  if (tsTo) {
    tsTo->startMs = tsFrom.startMs;
    tsTo->pkgHistory = tsFrom.pkgHistory; // 🌟 TRANSFER HISTORY
    prefs.putString(("h_" + String(to)).c_str(), tsTo->pkgHistory);
  }

  // Matikan lampu meja asal
  sendCmd(from, 0);
  
  // Reset meja asal agar kembali ke STANDBY (Bukan Waiting Payment)
  for (auto &s : tableStatus) {
    if (s.id == from) {
      s.isOn = false;
      s.waitingPayment = false;
      s.pkgHistory = "";
    }
  }
  
  // Hapus data meja asal dari NVS
  prefs.remove(("c_" + String(from)).c_str());
  prefs.remove(("p_" + String(from)).c_str());
  prefs.remove(("i_" + String(from)).c_str());
  prefs.remove(("w_" + String(from)).c_str());
  prefs.remove(("h_" + String(from)).c_str());

  // Nyalakan lampu meja tujuan dengan sisa waktu
  sendCmd(to, 1, tsFrom.remMin);

  Serial.printf("[MOVE] %d -> %d (%s, %dm) | History Transferred\n", from, to,
                tsFrom.activePkg.c_str(), tsFrom.remMin);
  server.send(200, "text/plain", "OK");
}

// ─── STATUS API ──────────────────────────────────────────────────
void handleStatus() {
  if (server.hasArg("h"))
    currentHour = server.arg("h").toInt();

  String json = "{\"h\":" + String(currentHour);

  // 1. Tables Status
  json += ",\"tables\":{";
  for (size_t i = 0; i < tables.size(); i++) {
    TableState ts = getStatus(tables[i]);
    unsigned long elapSec = 0;
    unsigned long remSec = 0;
    if (ts.isOn) {
      elapSec = (millis() - ts.startMs) / 1000;
      if (ts.initialMin > 0) {
        long totSec = (long)ts.initialMin * 60;
        remSec = (totSec > (long)elapSec) ? (totSec - elapSec) : 0;
      }
    }

    json += "\"" + String(tables[i]) + "\":{";
    json += "\"on\":" + String(ts.isOn ? "true" : "false") + ",";
    json += "\"rem\":" + String(remSec) + ",";
    json += "\"init\":" + String(ts.initialMin) + ",";
    json += "\"elap\":" + String(elapSec) + ",";
    json += "\"cust\":\"" + ts.custName + "\",";
    json += "\"pkg\":\"" + ts.activePkg + "\",";
    json += "\"waitingPayment\":" + String(ts.waitingPayment ? "true" : "false") + ",";
    json += "\"history\":\"" + ts.pkgHistory + "\"";
    json += "}";
    if (i < tables.size() - 1)
      json += ",";
  }
  json += "}";

  // 2. Rules (Price Slots)
  json += ",\"rules\":{";
  for (size_t i = 0; i < packets.size(); i++) {
    json += "\"" + packets[i].name + "\":[";
    for (size_t j = 0; j < packets[i].slots.size(); j++) {
      json += "{\"s\":" + String(packets[i].slots[j].startH) +
              ",\"e\":" + String(packets[i].slots[j].endH) +
              ",\"p\":" + String(packets[i].slots[j].price) + "}";
      if (j < packets[i].slots.size() - 1)
        json += ",";
    }
    json += "]";
    if (i < packets.size() - 1)
      json += ",";
  }
  json += "}";

  // 3. Pkgs (Packet Info)
  json += ",\"pkgs\":[";
  for (size_t i = 0; i < packets.size(); i++) {
    json += "{\"n\":\"" + packets[i].name +
            "\",\"d\":" + String(packets[i].duration) + "}";
    if (i < packets.size() - 1)
      json += ",";
  }
  json += "]}";

  server.send(200, "application/json", json);
}

// ─── FREE / CEK MEJA (Tanpa Billing) ──────────────────────────────
void handleFree() {
  int id = server.arg("id").toInt();
  int s = server.arg("s").toInt();
  Serial.printf("[FREE] Meja %d -> %s (tanpa billing)\n", id, s ? "ON" : "OFF");
  sendCmd(id, s); // Kirim relay, TIDAK update billing
  server.send(200, "text/plain", "OK");
}

// ─── BAYAR (Selesai Billing) ──────────────────────────────────────
void handleBayar() {
  int id = server.arg("id").toInt();
  Serial.printf("[BAYAR] Meja %d selesai.\n", id);
  sendCmd(id, 0);
  updateStatus(id, false, 0, "");

  // Reset waiting payment & history
  for (auto &s : tableStatus) {
    if (s.id == id) {
      s.waitingPayment = false;
      s.pkgHistory = "";
    }
  }

  // Hapus dari NVS
  prefs.remove(("c_" + String(id)).c_str());
  prefs.remove(("p_" + String(id)).c_str());
  prefs.remove(("i_" + String(id)).c_str());
  prefs.remove(("w_" + String(id)).c_str());
  prefs.remove(("h_" + String(id)).c_str());

  server.send(200, "text/plain", "OK");
}

// ─── SYNC TIME ───────────────────────────────────────────────────
void handleSyncTime() {
  if (server.hasArg("date")) {
    currentDate = server.arg("date");
    Serial.printf("[TIME] Synced date: %s\n", currentDate.c_str());
  }
  server.send(200, "text/plain", "OK");
}

// ─── ACTIVATE LICENSE ────────────────────────────────────────────
void handleActivate() {
  if (server.hasArg("key")) {
    String key = server.arg("key");
    int dash = key.indexOf('-');
    if (dash != -1) {
      String dateStr = key.substring(0, dash);
      String hashStr = key.substring(dash + 1);

      uint8_t mac[6];
      WiFi.macAddress(mac);
      char macStr[13];
      sprintf(macStr, "%02X%02X%02X%02X%02X%02X", mac[0], mac[1], mac[2],
              mac[3], mac[4], mac[5]);

      String secret = "VOC_SECRET_SALT";
      String dataToHash = secret + String(macStr) + dateStr;

      MD5Builder md5;
      md5.begin();
      md5.add(dataToHash);
      md5.calculate();
      String expectedHash = md5.toString().substring(0, 8); // Ambil 8 karakter
      expectedHash.toUpperCase(); // Samakan dengan generator.html (UpperCase)

      if (hashStr == expectedHash) {
        licenseExpiry = dateStr;
        prefs.putString("lic_exp", licenseExpiry);
        Serial.printf("[LIC] Activated until %s\n", licenseExpiry.c_str());
        server.send(200, "text/plain", "OK");
        return;
      }
    }
  }
  server.send(400, "text/plain", "INVALID KEY");
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

  licenseExpiry = prefs.getString("lic_exp", "20260101");

  parseTableList();
  parsePackets();

  // Load saved sessions from NVS
  for (int id : tables) {
    String cust = prefs.getString(("c_" + String(id)).c_str(), "");
    String pkg = prefs.getString(("p_" + String(id)).c_str(), "");
    if (cust != "" || pkg != "") {
      int init = prefs.getInt(("i_" + String(id)).c_str(), 0);
      bool waitPay = prefs.getBool(("w_" + String(id)).c_str(), false);
      String history = prefs.getString(("h_" + String(id)).c_str(), "");
      
      // Jika sedang menunggu pembayaran, status ON = false
      bool isOn = !waitPay;
      
      tableStatus.push_back({id, isOn, init, init, millis(), pkg, cust, waitPay, history});
      Serial.printf("[RESTORE] Meja %d -> %s (%s) | Init: %d | WaitPay: %d\n", id,
                    cust.c_str(), pkg.c_str(), init, waitPay);
    }
  }

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
  server.on("/sync_time", handleSyncTime);
  server.on("/activate", handleActivate);
  server.on("/settings", handleSettings);
  server.on("/save", handleSave);
  server.on("/add", handleAdd);
  server.on("/del", handleDel);
  server.on("/add_pkg", handleAddPkg);
  server.on("/del_pkg", handleDelPkg);
  server.on("/ignore", handleIgnore);
  server.on("/clear_block", handleClearBlock);
  server.on("/ctrl", handleCtrl);
  server.on("/move", handleMove);
  server.on("/test", handleTest);
  server.on("/bayar", handleBayar);
  server.on("/free", handleFree);
  server.begin();

  // 🚀 JALANKAN BACKGROUND TASK DI CORE 0
  xTaskCreatePinnedToCore(BackgroundLoop, "TaskBG", 10000, NULL, 1,
                          &TaskBackground, 0);

  Serial.println("[SYSTEM] Jendral Aktif (Dual Core Mode).");
}

void loop() {
  server.handleClient();
  delay(1);
}

// ─── CORE 0 BACKGROUND LOGIC ──────────────────────────────────────
void BackgroundLoop(void *pvParameters) {
  for (;;) {
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
    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}
