#include <Adafruit_Fingerprint.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <Adafruit_NeoPixel.h>
#include <Adafruit_PN532.h>
#include <ArduinoJson.h>
#include <DNSServer.h>
#include <Fonts/FreeSans9pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold24pt7b.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <WebServer.h>
#include <WiFi.h>
#include <time.h> // Tambahkan untuk Jam Real-time

/**
 * 📡 RFID ATTENDANCE SYSTEM - ESP32-S3 N16R8
 * Hardware: PN532 Blue Version (SPI Mode)
 * Pins: SCK: 13, MOSI: 11, MISO: 12, SS: 10
 */

// --- PN532 SPI ---
#define PN532_SCK (42)
#define PN532_MISO (41)
#define PN532_MOSI (40)
#define PN532_SS (39)

// --- FINGERPRINT SENSOR (AS608) ---
#define FP_RX 35            // Connect to Sensor TX (Yellow Wire)
#define FP_TX 36            // Connect to Sensor RX (Blue Wire)
HardwareSerial fpSerial(2); // Use Serial2
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&fpSerial);

// --- TFT SPI PINS (240x320) ---
#define TFT_CS 10
#define TFT_RST 11
#define TFT_DC 12
#define TFT_MOSI 13
#define TFT_SCLK 14
#define TFT_MISO 15

// --- CANVAS FOR ANTI-FLICKER CLOCK ---
GFXcanvas16 clockCanvas(250, 60); // Kanvas untuk jam (lebar x tinggi)
GFXcanvas16 dateCanvas(320, 25);  // Kanvas untuk tanggal

// Gunakan Hardware SPI agar refresh layar secepat kilat (Instan)
SPIClass hspi = SPIClass(HSPI);
Adafruit_ILI9341 tft = Adafruit_ILI9341(&hspi, TFT_DC, TFT_CS, TFT_RST);

// --- LCD I2C PINS (DEPRECATED, REPLACED BY TFT) ---
// SDA: 17, SCL: 18 -> Now used for TFT SPI

// --- PERIPHERALS ---
#define PIN_BUZZER 5
#define PIN_RGB_LED 48 // RGB LED Onboard ESP32-S3
#define NUM_PIXELS 1
Adafruit_NeoPixel rgbLed(NUM_PIXELS, PIN_RGB_LED, NEO_GRB + NEO_KHZ800);

// --- TOUCH BUTTONS ---
#define PIN_BOOT_BUTTON 0 // Tombol BOOT bawaan ESP32
#define PIN_TOUCH_MODE 4 // Pindah dari 19 karena 19 adalah jalur USB internal di S3
#define MULTI_TAP_WINDOW 800    // Jendela waktu untuk mengetuk (ms)
#define EMERGENCY_RESET_MS 5000 // 5 Detik untuk Reset Pabrik

// --- CONFIGURATION ---
Adafruit_PN532 nfc(PN532_SCK, PN532_MISO, PN532_MOSI, PN532_SS);
WiFiClient espClient;
PubSubClient client(espClient);
Preferences preferences;
WebServer server(80);
DNSServer dnsServer;

// --- GLOBAL VARIABLES ---
String deviceMac = "";
String mqtt_server = "192.168.1.5"; // Default
String mqtt_port = "1883";
String mqtt_user = "";
String mqtt_pass = "";
bool isConfigMode = false;
unsigned long lastWifiCheck = 0;

// --- FORWARD DECLARATIONS ---
void updateLCD(String line1, String line2);
void startBuzzer(int ms);
void showReady();
void processAttendance(String uid, int fingerId);
void readRFID();
void readFingerprint();
void enrollFingerprint(int id, int count);
void startPortal();
void handleButtons();
void reconnectMqtt();
void setLedColor(uint8_t r, uint8_t g, uint8_t b);
void updateLedMode();
void showLoading();
void handleRoot();
void requestAttendanceList();
void showAttendanceList(String jsonData);

// Mode State
String currentWorkMode = "AUTO";
bool isShowingList = false;
unsigned long listStartTime = 0;
bool shouldEnrollFinger = false;
int targetEnrollId = 0;
bool displayFeedback = false;
unsigned long lastTouchTime = 0;
unsigned long touchStartTime = 0;
bool lastTouchState = false;
bool modeChanged = false;
int touchCounter = 0;
String lastCheckedName = "";        // Simpan nama terakhir untuk highlight
unsigned long autoShowListTime = 0; // Timer untuk buka list otomatis
const char *ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7 * 3600; // WIB (UTC+7)
const int daylightOffset_sec = 0;

// --- START OF APP LOGIC ---

// RGB Helper
void setLedColor(uint8_t r, uint8_t g, uint8_t b) {
  rgbLed.setPixelColor(0, rgbLed.Color(r, g, b));
  rgbLed.show();
}

void updateLedMode() {
  if (currentWorkMode == "CHECKIN")
    setLedColor(0, 255, 0); // Hijau
  else if (currentWorkMode == "CHECKOUT")
    setLedColor(255, 0, 0); // Merah
  else if (currentWorkMode == "REGISTRASI")
    setLedColor(0, 0, 255); // Biru
  else if (currentWorkMode == "REG_FINGER")
    setLedColor(255, 0, 255); // Ungu Muda
  // Mode AUTO akan dihandle di loop untuk efek menari
}

const char *topicScan = "billiard/attendance/scan";
const char *topicRaw = "billiard/attendance/raw_scan";
const char *topicFeedback = "billiard/attendance/feedback";

// LCD Feedback State
unsigned long lastFeedbackTime = 0;
String lcdLine1 = "";
String lcdLine2 = "";
String lcdMsg = "";

// Anti-Spam State
String lastScannedUid = "";
unsigned long lastScanTime = 0;
const unsigned long SCAN_COOLDOWN =
    5000; // 5 detik cooldown untuk kartu yang sama

void startBuzzer(int ms) {
  digitalWrite(PIN_BUZZER, HIGH);
  // Non-blocking approach is better, but for now we shorten it significantly
  delay(ms); 
  digitalWrite(PIN_BUZZER, LOW);
}

void updateTFT(String line1, String line2, uint16_t color = ILI9341_WHITE) {
  static String lastL1 = "";
  static String lastL2 = "";
  static uint16_t lastCol = 0;

  // Anti-Flicker: Skip redraw if content is exactly the same
  if (line1 == lastL1 && line2 == lastL2 && color == lastCol && displayFeedback) {
    return; 
  }

  lastL1 = line1;
  lastL2 = line2;
  lastCol = color;
  
  displayFeedback = true;
  lastFeedbackTime = millis();

  tft.fillScreen(ILI9341_BLACK);
  tft.setFont(NULL); // Reset font untuk header

  // --- TOP HEADER ---
  tft.fillRect(0, 0, 320, 30, 0x18E3);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(1);
  tft.setCursor(110, 10);
  tft.print("SCAN FEEDBACK");

  // --- DRAW CARD BORDER ---
  uint16_t borderColor = (color == ILI9341_WHITE) ? 0x4B3D : color;
  tft.drawRoundRect(15, 45, 290, 150, 10, borderColor);

  // --- STATUS ICON (Center Top) ---
  if (color == ILI9341_GREEN) {
    tft.fillCircle(160, 80, 20, ILI9341_GREEN);
    tft.setTextColor(ILI9341_BLACK);
    tft.setCursor(155, 73);
    tft.print("V");
  } else if (color == ILI9341_RED) {
    tft.fillCircle(160, 80, 20, ILI9341_RED);
    tft.setTextColor(ILI9341_WHITE);
    tft.setCursor(157, 73);
    tft.print("!");
  }

  // --- NAME & STATUS (Centered Smooth Font) ---
  int16_t x1, y1;
  uint16_t w, h;
  tft.setFont(&FreeSans9pt7b);

  // Baris 1: Nama
  String cleanName = line1;
  if (cleanName.length() > 20)
    cleanName = cleanName.substring(0, 18) + "...";
  tft.getTextBounds(cleanName, 0, 0, &x1, &y1, &w, &h);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor((320 - w) / 2, 130);
  tft.print(cleanName);

  // Baris 2: Status
  tft.getTextBounds(line2, 0, 0, &x1, &y1, &w, &h);
  tft.setTextColor(color);
  tft.setCursor((320 - w) / 2, 165);
  tft.print(line2);

  // --- FOOTER ---
  tft.setFont(NULL);
  tft.fillRect(0, 210, 320, 30, 0x0841);
  tft.setTextColor(0xBDD7);
  tft.setCursor(85, 222);
  tft.print("VOC SMART ATTENDANCE");
}

void showAttendanceList(String jsonData) {
  DynamicJsonDocument doc(16384); // Match the MQTT buffer size
  DeserializationError error = deserializeJson(doc, jsonData);
  if (error) {
    Serial.println("[LIST] JSON Error: " + String(error.c_str()));
    Serial.println("[LIST] Payload size: " + String(jsonData.length()));
    // Tampilkan error di layar agar bisa diketahui tanpa PC
    tft.fillScreen(ILI9341_BLACK);
    tft.setTextColor(ILI9341_RED);
    tft.setTextSize(2);
    tft.setCursor(20, 100);
    tft.print("PARSE ERR:");
    tft.setCursor(20, 130);
    tft.print(error.c_str());
    delay(3000);
    isShowingList = false;
    showReady();
    return;
  }

  JsonArray list = doc["list"].as<JsonArray>();
  Serial.println("[LIST] Parsed OK. Items: " + String(list.size()));

  isShowingList = true;
  listStartTime = millis();

  tft.fillScreen(ILI9341_BLACK);

  // --- COMPACT HEADER ---
  tft.fillRect(0, 0, 320, 26, 0x18E3);
  tft.setFont(&FreeSans9pt7b);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(85, 18);
  tft.print("ABSENSI HARI INI");

  // --- COMPACT COLUMN HEADERS (Default Font for Space) ---
  tft.fillRect(0, 28, 320, 16, 0x4B3D); // Grey Bar
  tft.setFont(NULL);
  tft.setTextSize(1);
  tft.setTextColor(ILI9341_YELLOW);

  // Posisi X BARU untuk mengakomodasi Tanggal DD/MM
  tft.setCursor(4, 33);
  tft.print("TGL");
  tft.setCursor(42, 33);
  tft.print("USER");
  tft.setCursor(115, 33);
  tft.print("SFT");
  tft.setCursor(145, 33);
  tft.print("IN");
  tft.setCursor(182, 33);
  tft.print("OUT");
  tft.setCursor(220, 33);
  tft.print("DUR");
  tft.setCursor(258, 33);
  tft.print("OVT");
  tft.setCursor(294, 33);
  tft.print("STS");

  // --- RENDER DATA ---
  int yPos = 52;
  int count = 0;
  for (JsonObject item : list) {
    if (count >= 13)
      break;

    // Zebra Striping halus
    if (count % 2 == 1) {
      tft.fillRect(0, yPos - 3, 320, 13, 0x0841);
    }

    String dateStr = item["date"] | "-"; // Format dr backend: "23/04/2026"
    String name = item["name"] | "";
    String shift = item["shift"] | "-";
    String inTime = item["in"] | "-";
    String outTime = item["out"] | "-";
    String dur = item["dur"] | "-";
    String ovt = item["ovt"] | "-";
    String statusStr = item["status"] | "-";

    // Highlight yang lebih elegan
    bool isNew = (lastCheckedName != "" && name.indexOf(lastCheckedName) >= 0);
    if (isNew) {
      tft.fillRect(0, yPos - 3, 320, 13, 0x0108);
      tft.setTextColor(ILI9341_CYAN);
      tft.setCursor(1, yPos);
      tft.print(">");
    } else {
      tft.setTextColor(ILI9341_WHITE);
    }

    // Data Row dengan Tanggal DD/MM (Substring 5 karakter awal)
    tft.setCursor(4, yPos);
    tft.print(dateStr.substring(0, 5));
    tft.setCursor(42, yPos);
    tft.print(name.substring(0, 11));
    tft.setCursor(115, yPos);
    tft.print(shift.substring(0, 4));
    tft.setCursor(145, yPos);
    tft.print(inTime);
    tft.setCursor(182, yPos);
    tft.print(outTime);
    tft.setCursor(220, yPos);
    tft.print(dur);
    tft.setCursor(258, yPos);
    tft.print(ovt);

    // Status Logic
    if (!isNew) {
      if (statusStr == "PRESENT" || statusStr == "HADIR")
        tft.setTextColor(ILI9341_GREEN);
      else if (statusStr == "LATE" || statusStr == "TERLAMBAT")
        tft.setTextColor(ILI9341_YELLOW);
      else if (statusStr == "OVERTIME" || statusStr == "LEMBUR")
        tft.setTextColor(ILI9341_ORANGE);
    }
    tft.setCursor(294, yPos);
    tft.print(statusStr.substring(0, 4));

    yPos += 14;
    count++;
  }

  if (count == 0) {
    tft.setTextColor(ILI9341_WHITE);
    tft.setCursor(80, 120);
    tft.setTextSize(2);
    tft.print("BELUM ADA DATA");
  }

  tft.drawFastHLine(0, 220, 320, 0x4B3D);
  tft.setTextSize(1);
  tft.setTextColor(0xBDD7);
  tft.setCursor(85, 225);
  tft.print("SENTUH UNTUK KEMBALI");
}

void requestAttendanceList() {
  isShowingList =
      true; // Langsung set true agar sistem tahu sedang menunggu data
  listStartTime = millis();

  client.publish("billiard/attendance/request_list", "GET_LIST");

  updateTFT("LOADING LIST...", "MOHON TUNGGU", ILI9341_YELLOW);
}

// Wrapper for compatibility
void updateLCD(String line1, String line2) { updateTFT(line1, line2); }

void showLoading() {
  updateLCD("  MENGIRIM...  ", " MOHON TUNGGU  ");
  displayFeedback = true;
  lastFeedbackTime = millis();
}

void showReady() {
  lcdMsg = "";
  if (isShowingList || displayFeedback || isConfigMode)
    return;

  tft.fillScreen(ILI9341_BLACK);

  // --- JIKA MODE REGISTRASI RFID (TAMPILAN KHUSUS) ---
  if (currentWorkMode == "REGISTRASI") {
    // Header
    tft.fillRect(0, 0, 320, 35, ILI9341_BLUE);
    tft.setFont(&FreeSans9pt7b);
    tft.setTextColor(ILI9341_WHITE);
    tft.setCursor(90, 23);
    tft.print("RFID ENROLLMENT");

    // Ikon RFID Besar di Tengah
    tft.drawCircle(160, 110, 40, 0x4B3D);
    tft.drawCircle(160, 110, 30, 0x4B3D);
    tft.drawCircle(160, 110, 20, ILI9341_CYAN);
    tft.fillCircle(160, 110, 10, ILI9341_CYAN);

    // Animasi Gelap Terang (Motif)
    for (int i = 0; i < 3; i++) {
      tft.drawCircle(160, 110, 50 + (i * 10), 0x0841);
    }

    int16_t x1, y1;
    uint16_t w, h;
    tft.setFont(&FreeSansBold12pt7b);
    tft.getTextBounds("TEMPEL KARTU", 0, 0, &x1, &y1, &w, &h);
    tft.setTextColor(ILI9341_WHITE);
    tft.setCursor((320 - w) / 2, 190);
    tft.print("TEMPEL KARTU");

    tft.setFont(&FreeSans9pt7b);
    tft.setTextColor(ILI9341_YELLOW);
    tft.setCursor(65, 220);
    tft.print("Tap 1x untuk membatalkan");
    return;
  }

  // --- TAMPILAN STANDBY / AUTO (JAM DIGITAL) ---
  tft.setFont(NULL);
  tft.fillRect(0, 0, 320, 25, 0x18E3); // Deep Navy
  tft.setTextSize(1);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(12, 8);
  tft.print("WiFi: " + WiFi.SSID());

  uint16_t badgeColor = 0x4B3D;
  String modeText = "AUTO SCAN";
  if (currentWorkMode == "CHECKIN") {
    badgeColor = ILI9341_GREEN;
    modeText = "CHECK-IN";
  } else if (currentWorkMode == "CHECKOUT") {
    badgeColor = ILI9341_RED;
    modeText = "CHECK-OUT";
  } else if (currentWorkMode == "REG_FINGER") {
    badgeColor = ILI9341_MAGENTA;
    modeText = "REG JARI";
  }

  tft.fillRect(185, 4, 130, 17, badgeColor);
  tft.setCursor(195, 8);
  tft.setTextColor(ILI9341_WHITE);
  tft.print("MODE: " + modeText);

  tft.drawFastHLine(40, 158, 240, 0x4B3D); // Divider

  int16_t x1, y1;
  uint16_t w, h;
  tft.setFont(&FreeSansBold12pt7b);
  tft.getTextBounds("READY TO SCAN", 0, 0, &x1, &y1, &w, &h);
  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor((320 - w) / 2, 190);
  tft.print("READY TO SCAN");

  tft.setFont(&FreeSans9pt7b);
  tft.getTextBounds("Double Tap to view Today List", 0, 0, &x1, &y1, &w, &h);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor((320 - w) / 2, 220);
  tft.print("Double Tap to view Today List");
}

void updateIdleClock() {
  if (isShowingList || displayFeedback || isConfigMode)
    return;

  struct tm timeinfo;
  bool timeSync = getLocalTime(&timeinfo);

  if (WiFi.status() != WL_CONNECTED) {
    tft.setFont(&FreeSans9pt7b);
    tft.setTextColor(ILI9341_RED, ILI9341_BLACK);
    tft.setCursor(80, 85);
    tft.print("WIFI DISCONNECTED");
    return;
  }

  if (!timeSync) {
    tft.setFont(&FreeSans9pt7b);
    tft.setTextColor(ILI9341_YELLOW, ILI9341_BLACK);
    tft.setCursor(95, 85);
    tft.print("SYNCING TIME...");
    return;
  }

  char timeStr[15];
  char dateStr[30];
  strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
  strftime(dateStr, sizeof(dateStr), "%A, %d/%m/%Y", &timeinfo);

  // --- FLICKER-FREE JAM (Menggunakan Canvas) ---
  clockCanvas.fillScreen(ILI9341_BLACK); // Hapus isi kanvas di memori
  clockCanvas.setFont(&FreeSansBold24pt7b);

  int16_t x1, y1;
  uint16_t w, h;
  clockCanvas.getTextBounds(timeStr, 0, 0, &x1, &y1, &w, &h);

  clockCanvas.setTextColor(ILI9341_WHITE);
  clockCanvas.setCursor((250 - w) / 2, 45); // Center di dalam kanvas
  clockCanvas.print(timeStr);

  // Kirim kanvas ke layar TFT di posisi jam
  tft.drawRGBBitmap(35, 45, clockCanvas.getBuffer(), 250, 60);

  // --- FLICKER-FREE TANGGAL (Menggunakan Canvas) ---
  dateCanvas.fillScreen(ILI9341_BLACK);
  dateCanvas.setFont(&FreeSans9pt7b);
  dateCanvas.getTextBounds(dateStr, 0, 0, &x1, &y1, &w, &h);

  dateCanvas.setTextColor(ILI9341_YELLOW);
  dateCanvas.setCursor((320 - w) / 2, 18);
  dateCanvas.print(dateStr);

  // Kirim kanvas ke layar TFT di posisi tanggal
  tft.drawRGBBitmap(0, 115, dateCanvas.getBuffer(), 320, 25);
}

void sendErrorFeedback(String line1, String line2) {
  updateTFT(line1, line2, ILI9341_RED);
  startBuzzer(500);
  delay(2000);
  currentWorkMode = "AUTO";
  showReady();
}

void mqttCallback(char *topic, byte *payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++)
    message += (char)payload[i];

  String topicStr = String(topic);
  Serial.println("MQTT [" + topicStr + "]: " + message.substring(0, 50) +
                 "...");

  // Use a much larger buffer for heavy list data (16KB)
  DynamicJsonDocument doc(16384); 
  DeserializationError error = deserializeJson(doc, message);
  if (error) {
    // If it's too big even for 16KB or malformed
    Serial.println("JSON Parse Error: " + String(error.c_str()));
    return;
  }

  // 1. Handle ATTENDANCE LIST DATA (from feedback topic)
  if (doc["type"] == "LIST_DATA") {
    showAttendanceList(message);
    return;
  }

  // 2. Handle SYSTEM COMMANDS
  // --- GLOBAL COMMANDS ---
  String cmdType = doc["type"] | "";
  if (cmdType == "RESET_DEVICE" || cmdType == "CANCEL") {
    currentWorkMode = "AUTO";
    displayFeedback = false;
    isShowingList = false;
    lcdMsg = ""; // Crucial: Clear the registration lock
    showReady();
    return;
  }

  if (doc["type"] == "CAPTURE_FINGERPRINT") {
    currentWorkMode = "REG_FINGER";
    targetEnrollId = doc["id"] | 0; // Capture the requested ID
    enrollFingerprint(targetEnrollId, doc["count"] | 1);
    return;
  }

  if (doc["type"] == "DELETE_ID") {
    int idToDelete = doc["id"] | 0;
    if (idToDelete > 0) {
      finger.deleteModel(idToDelete);
      Serial.println("Deleted Finger ID: " + String(idToDelete));
    }
    return;
  }

  if (doc["type"] == "EMPTY_DATABASE" || doc["type"] == "EMPTY_SENSOR") {
    finger.emptyDatabase();
    Serial.println("Fingerprint Sensor Database CLEARED!");
    updateTFT("SENSOR CLEARED", "DATABASE EMPTY", ILI9341_GREEN);
    delay(2000);
    showReady();
    return;
  }

  if (doc["type"] == "REGISTRATION_MODE") {
    currentWorkMode = "REGISTRASI";
    lcdMsg = "REGISTRASI"; // Lock the display feedback
    displayFeedback = true;
    lastFeedbackTime = millis();
    updateTFT(doc["name"] | "REGISTRASI", doc["status"] | "TEMPEL KARTU", ILI9341_CYAN);
    return;
  }

  // 3. Handle VISUAL FEEDBACK
  const char *name = doc["name"] | "UNKNOWN";
  const char *status = doc["status"] | "RESET";
  lcdMsg = doc["msg"] | "";

  if (String(status) == "RESET") {
    displayFeedback = false;
    currentWorkMode = "AUTO";
    showReady();
    return;
  }

  lcdLine1 = String(name);
  lcdLine2 = String(status);
  displayFeedback = true;
  lastFeedbackTime = millis();

  // Color logic
  uint16_t statusColor = ILI9341_WHITE;
  String combinedFeedback = String(lcdLine2) + " " + String(lcdMsg);
  combinedFeedback.toUpperCase();

  if (combinedFeedback.indexOf("SUCCESS") >= 0 || combinedFeedback.indexOf("DONE") >= 0 ||
      combinedFeedback.indexOf("VERIFIED") >= 0 || combinedFeedback.indexOf("COCOK") >= 0) {
    statusColor = ILI9341_GREEN;
    setLedColor(0, 255, 0);
  } else if (combinedFeedback.indexOf("REJECTED") >= 0 ||
             combinedFeedback.indexOf("FAILED") >= 0 ||
             combinedFeedback.indexOf("ERROR") >= 0 ||
             combinedFeedback.indexOf("TIDAK COCOK") >= 0 ||
             combinedFeedback.indexOf("BELUM TERDAFTAR") >= 0) {
    statusColor = ILI9341_RED;
    setLedColor(255, 0, 0);
  } else if (combinedFeedback.indexOf("DUAL") >= 0 || combinedFeedback.indexOf("SCAN") >= 0 ||
             combinedFeedback.indexOf("TAP") >= 0 || combinedFeedback.indexOf("HALO") >= 0) {
    statusColor = ILI9341_YELLOW;
  }
  updateTFT(lcdLine1, lcdLine2, statusColor);
  startBuzzer(100);

  // Sesuai permintaan: Hanya buka list jika status BERHASIL (Hijau)
  if (statusColor == ILI9341_GREEN) {
    lastCheckedName = String(name);
    lastCheckedName.toUpperCase();
    autoShowListTime = millis() + 2000; // Open list after 2 seconds
  } else {
    // Jika Gagal (Merah) atau Info (Kuning), batalkan buka list otomatis
    autoShowListTime = 0;
  }
}

void handleButtons() {
  static bool lastTouch = false;
  static unsigned long lastTouchTime = 0;
  static int touchCount = 0;
  static unsigned long touchStartTime = 0;

  bool currentTouch = digitalRead(PIN_TOUCH_MODE);
  bool bootPressed = (digitalRead(PIN_BOOT_BUTTON) == LOW);

  // LONG PRESS FOR RESET (Existing Logic)
  if (currentTouch || bootPressed) {
    if (touchStartTime == 0)
      touchStartTime = millis();
    unsigned long pressDuration = millis() - touchStartTime;
    if (pressDuration > EMERGENCY_RESET_MS) {
      startBuzzer(2000);
      updateLCD(" FACTORY RESET  ", " REBOOTING...   ");
      preferences.begin("attendance", false);
      preferences.clear();
      ESP.restart();
    }
  } else {
    touchStartTime = 0;
  }

  // TAP DETECTION
  if (currentTouch && !lastTouch) {
    unsigned long now = millis();
    if (isShowingList) {
      isShowingList = false;
      showReady();
    } else {
      if (now - lastTouchTime < MULTI_TAP_WINDOW)
        touchCount++;
      else
        touchCount = 1;
      lastTouchTime = now;
    }
  }

  // Process Taps after window
  if (touchCount > 0 && !currentTouch &&
      (millis() - lastTouchTime > MULTI_TAP_WINDOW)) {
    startBuzzer(80);

    if (touchCount == 2) {
      requestAttendanceList();
    } else if (touchCount == 1) {
      // Toggle Antara Check-In & Check-Out
      if (currentWorkMode == "AUTO" || currentWorkMode == "CHECKOUT")
        currentWorkMode = "CHECKIN";
      else
        currentWorkMode = "CHECKOUT";
    } else if (touchCount == 3) {
      currentWorkMode = "REGISTRASI";
    } else if (touchCount == 4) {
      currentWorkMode = "REG_FINGER";
    } else if (touchCount == 5) {
      currentWorkMode = "AUTO";
    }

    updateLedMode();
    showReady();
    touchCount = 0;
  }

  lastTouch = currentTouch;

  // Auto-close list (FAILSAFE: Jika data tidak datang dalam 10 detik, tutup
  // loading) Timeout list dihapus agar tetap tampil sampai disentuh (Permintaan
  // User)
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_BOOT_BUTTON, INPUT_PULLUP); // Tombol BOOT biasanya aktif LOW
  pinMode(PIN_TOUCH_MODE, INPUT_PULLDOWN);

  // 0. Init Hardware SPI & TFT Display
  hspi.begin(TFT_SCLK, TFT_MISO, TFT_MOSI, TFT_CS);
  tft.begin(40000000); // SET TURBO SPEED: 40MHz
  tft.setRotation(1);  // Landscape (320x240)
  tft.fillScreen(ILI9341_BLACK);
  updateTFT("INITIALIZING", "VOC ATTENDANCE", ILI9341_CYAN);
  delay(500);

  deviceMac = WiFi.macAddress();
  deviceMac.replace(":", "");

  // --- INIT FINGERPRINT ---
  fpSerial.begin(57600, SERIAL_8N1, FP_RX, FP_TX);
  if (finger.verifyPassword()) {
    Serial.println("✅ AS608 Fingerprint Sensor ditemukan!");
  } else {
    Serial.println("❌ AS608 Fingerprint Sensor TIDAK ditemukan.");
  }

  // 1. Init PN532
  nfc.begin();
  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.println(
        "❌ PN532 tidak ditemukan! Periksa kabel & switch mode SPI.");
    while (1) {
      if ((millis() / 100) % 2)
        setLedColor(255, 0, 0); // Merah kedip cepat jika PN532 rusak
      else
        setLedColor(0, 0, 0);
      delay(10);
    }
  }
  nfc.SAMConfig();
  nfc.setPassiveActivationRetries(0x01); // Only check once, don't wait (Turbo)
  Serial.println("✅ PN532 SPI Ready (Turbo Mode)!");
  rgbLed.begin();
  rgbLed.setBrightness(50);
  setLedColor(0, 0, 0);

  // 2. Load Config
  preferences.begin("attendance", false);
  String ssid = preferences.getString("ssid", "");
  String pass = preferences.getString("pass", "");
  mqtt_server = preferences.getString("mqtt_server", "192.168.1.5");
  mqtt_port = preferences.getString("mqtt_port", "1883");

  if (ssid == "") {
    Serial.println("Entering Config Portal...");
    startPortal();
  } else {
    WiFi.begin(ssid.c_str(), pass.c_str());
    client.setBufferSize(
        4096); // WAJIB: HARUS SEBELUM setServer agar buffer aktif
    client.setServer(mqtt_server.c_str(), mqtt_port.toInt());
    client.setCallback(mqttCallback);
    updateLCD(" CONNECTING...", " WIFI & MQTT    ");
    setLedColor(128, 0, 128); // UNGGU saat koneksi
    startBuzzer(200);
  }
}

void loop() {
  handleButtons(); // Prioritas utama deteksi sentuhan

  // Auto-show list logic (Buka list otomatis setelah absen sukses)
  if (autoShowListTime > 0 && millis() > autoShowListTime) {
    autoShowListTime = 0;
    requestAttendanceList();
  }

  if (isConfigMode) {
    dnsServer.processNextRequest();
    server.handleClient();
    if ((millis() / 500) % 2)
      setLedColor(255, 100, 0);
    else
      setLedColor(0, 0, 0);
    return;
  }

  // WiFi & MQTT Maintenance
  if (WiFi.status() != WL_CONNECTED) {
    if ((millis() / 200) % 2)
      setLedColor(0, 0, 100);
    else
      setLedColor(0, 0, 0);

    if (millis() - lastWifiCheck > 1000) {
      Serial.println("Reconnecting WiFi...");
      lastWifiCheck = millis();
    }
  } else {
    // Update Jam Real-time setiap 1 detik
    static unsigned long lastClockUpdate = 0;
    if (millis() - lastClockUpdate > 1000) {
      lastClockUpdate = millis();
      updateIdleClock();
    }

    // RGB Dancing for AUTO mode (OPTIMIZED: Only every 30ms)
    static unsigned long lastRgbUpdate = 0;
    if (currentWorkMode == "AUTO" && !displayFeedback &&
        millis() - lastRgbUpdate > 30) {
      lastRgbUpdate = millis();
      uint32_t wheelColor = 0;
      static uint16_t j = 0;
      j = (j + 2) % 256;

      if (j < 85)
        wheelColor = rgbLed.Color(j * 3, 255 - j * 3, 0);
      else if (j < 170) {
        uint16_t k = j - 85;
        wheelColor = rgbLed.Color(255 - k * 3, 0, k * 3);
      } else {
        uint16_t k = j - 170;
        wheelColor = rgbLed.Color(0, k * 3, 255 - k * 3);
      }
      rgbLed.setPixelColor(0, wheelColor);
      rgbLed.show();
    } else if (currentWorkMode != "AUTO" || displayFeedback) {
      updateLedMode();
    }

    // Feedback Auto-Reset logic (DIPERCEPAT agar tidak terasa stuck)
    if (displayFeedback && millis() - lastFeedbackTime > 2500) {
      if (lcdMsg != "DUAL MODE" && lcdMsg != "REGISTRASI") {
        displayFeedback = false;
        showReady();
      }
    }

    if (!client.connected())
      reconnectMqtt();
    client.loop();
  }

  if (currentWorkMode == "REG_FINGER" || shouldEnrollFinger) {
    shouldEnrollFinger = false;
  } else {
    readRFID();
    readFingerprint();
  }
}

void readRFID() {
  uint8_t success;
  uint8_t uid[] = {0, 0, 0, 0, 0, 0, 0};
  uint8_t uidLength;

  success =
      nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength, 50);

  if (success) {
    String rfidUID = "";
    for (uint8_t i = 0; i < uidLength; i++) {
      if (uid[i] < 0x10)
        rfidUID += "0";
      rfidUID += String(uid[i], HEX);
    }
    rfidUID.toUpperCase();

    Serial.println("RFID detected: " + rfidUID);
    processAttendance(rfidUID, 0); // ID 0 means RFID used
  }
}

uint8_t getNextFreeID() {
  for (int id = 1; id <= 127; id++) {
    if (finger.loadModel(id) != FINGERPRINT_OK)
      return id;
  }
  return 0;
}

// Helper to wait for finger and capture slot
bool captureFingerStep(int step, String instruction, int slot) {
  // Notify web about progress
  StaticJsonDocument<256> progressDoc;
  progressDoc["type"] = "FINGERPRINT_PROGRESS";
  progressDoc["step"] = step;
  progressDoc["instruction"] = instruction;
  progressDoc["progress"] = step * 50; // Updated for 2 steps
  char buf[256];
  serializeJson(progressDoc, buf);
  client.publish("billiard/attendance/status", buf);
  client.publish("billiard/attendance/raw_scan", buf);

  updateLCD("SCAN " + String(step) + "/2", instruction);

  int p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (p == FINGERPRINT_OK) {
      startBuzzer(100);
      break;
    }
    yield();
    client.loop(); // Check for MQTT commands like RESET
    if (currentWorkMode != "REG_FINGER")
      return false;
    delay(10);
  }

  p = finger.image2Tz(slot);
  if (p != FINGERPRINT_OK) {
    updateLCD("EROR IMAGE", "COBA LAGI");
    delay(1000);
    return false;
  }

  updateLCD("ANGKAT JARI", "MOHON TUNGGU");
  delay(800);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
    yield();
    client.loop();
    if (currentWorkMode != "REG_FINGER")
      return false;
    delay(10);
  }
  return true;
}

void enrollFingerprint(int id, int count) {
  if (count <= 0)
    count = 1;

  for (int t = 0; t < count; t++) {
    // Check if cancelled during batch
    if (currentWorkMode != "REG_FINGER")
      return;

    uint8_t targetSlot = id;
    if (targetSlot == 0) {
      targetSlot = getNextFreeID();
    }
    
    // Auto increment for batch mode (Turbo 5x)
    targetSlot += t;

    if (targetSlot == 0 || targetSlot > 127) {
      sendErrorFeedback(" STORAGE FULL! ", "DELETE SOME FPs ");
      return;
    }

    // Visual feedback for current batch step
    String topMsg = "TURBO REG " + String(t + 1) + "/" + String(count);
    updateLCD(topMsg, "SIAPKAN JARI...");
    delay(1500);

    // 2 Step Robust Enrollment for AS608
    if (!captureFingerStep(1, "TEMPEL JARI", 1))
      return;
    if (!captureFingerStep(2, "TEMPEL LAGI", 2))
      return;

    uint8_t p = finger.createModel();
    if (p == FINGERPRINT_OK) {
      p = finger.storeModel(targetSlot);
      if (p == FINGERPRINT_OK) {
        updateLCD(" BERHASIL! ID:", String(targetSlot));
        startBuzzer(500);

        StaticJsonDocument<512> doc;
        doc["type"] = "FINGERPRINT_DATA_UPLOAD";
        doc["data"]["uid"] = "FINGER_" + String(targetSlot);
        doc["data"]["quality"] = 0.98;
        doc["data"]["points"] = 142;
        doc["current"] = t + 1;
        doc["total"] = count;

        char buffer[512];
        serializeJson(doc, buffer);
        client.publish("billiard/attendance/status", buffer);

        delay(1500); // Wait before next angle
      }
    } else {
      updateLCD(" GAGAL MATCH!  ", " COBA LAGI...   ");
      delay(2000);
      t--; // Retry this index
    }
  }

  // End of batch
  StaticJsonDocument<128> endDoc;
  endDoc["type"] = "BATCH_COMPLETE";
  char endBuf[128];
  serializeJson(endDoc, endBuf);
  client.publish("billiard/attendance/status", endBuf);

  updateLCD(" SEMUA SELESAI ", " KEMBALI STANDBY");
  delay(2000);
  currentWorkMode = "AUTO";
  showReady();
}

void readFingerprint() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK)
    return;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK)
    return;

  p = finger.fingerFastSearch();
  if (p == FINGERPRINT_OK) {
    String virtualUID = "FINGER_" + String(finger.fingerID);
    updateTFT("VERIFIKASI JARI", "MOHON TUNGGU...", ILI9341_YELLOW);
    processAttendance(virtualUID, finger.fingerID);
    startBuzzer(150);
  } else {
    updateTFT("BELUM TERDAFTAR", "AKSES DITOLAK", ILI9341_RED);
    startBuzzer(200);
    delay(100);
    startBuzzer(200);
    displayFeedback = true;
    lastFeedbackTime = millis();
  }
}

void processAttendance(String uid, int fingerId) {
  // Check if in special REG_FINGER mode but finger scan happened
  if (currentWorkMode == "REG_FINGER")
    return;

  // Anti-Spam Check: Lewati jika kartu sama dan belum lewat cooldown
  // KECUALI jika sedang mode REGISTRASI, maka perbolehkan scan cepat
  // berkali-kali
  bool isRegMode =
      (currentWorkMode == "REGISTRASI" || currentWorkMode == "REG_FINGER");
  if (!isRegMode && uid == lastScannedUid &&
      (millis() - lastScanTime < SCAN_COOLDOWN)) {
    return;
  }

  lastScannedUid = uid;
  lastScanTime = millis();

  Serial.print("📡 Attendance Scanned: ");
  Serial.println(uid);

  if (client.connected()) {
    StaticJsonDocument<200> doc;
    doc["uid"] = uid;
    doc["mac"] = deviceMac;
    doc["type"] = "ATTENDANCE";
    doc["mode"] = currentWorkMode; // Kirim mode (AUTO/CHECKIN/CHECKOUT)

    char buffer[200];
    serializeJson(doc, buffer);

    client.publish(topicScan, buffer);
    client.publish(topicRaw, buffer);

    // Tampilkan animasi loading agar karyawan lain antri sejenak
    showLoading();
    startBuzzer(100); // Single short beep for instant feedback
  } else {
    startBuzzer(1000); // Fail tone
  }
}

// mqttCallback was moved to the top

void reconnectMqtt() {
  while (!client.connected() && WiFi.status() == WL_CONNECTED) {
    Serial.print("Connecting to MQTT...");
    updateLCD(" MQTT CONNECTING", " PLEASE WAIT... ");
    if (client.connect(deviceMac.c_str())) {
      Serial.println("Connected!");
      client.subscribe(topicFeedback); // MUST SUBSCRIBE HERE
      client.subscribe("billiard/attendance/list_data");

      // SINKRONISASI JAM SETELAH KONEKSI STABIL
      configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

      showReady();
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      updateLCD(" MQTT FAILED", " RETRYING...    ");
      delay(5000);
    }
  }
}

// --- CONFIG PORTAL LOGIC ---
void startPortal() {
  isConfigMode = true;
  updateLCD(" CONFIG MODE", " IP: 192.168.4.1");
  WiFi.mode(WIFI_AP);
  WiFi.softAP("RFID_Attendance_Config", "billiard123");
  dnsServer.start(53, "*", WiFi.softAPIP());

  server.on("/", handleRoot);

  server.on("/save", []() {
    preferences.begin("attendance", false);
    preferences.putString("ssid", server.arg("ssid"));
    preferences.putString("pass", server.arg("pass"));
    preferences.putString("mqtt_server", server.arg("mqtt"));
    preferences.putString("mqtt_port", server.arg("port"));
    preferences.end();

    server.send(200, "text/html", "<h1>Saved. Rebooting...</h1>");
    delay(1000);
    ESP.restart();
  });

  server.begin();
}

void handleRoot() {
  String html = R"rawgh(
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>VOC Intelligence Hub</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root { --p: #6366f1; --s: #a855f7; --bg: #0f172a; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Outfit', sans-serif; 
            background: var(--bg); 
            color: white; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh;
            overflow-x: hidden;
        }
        .blob {
            position: absolute; width: 300px; height: 300px;
            background: linear-gradient(to right, var(--p), var(--s));
            filter: blur(80px); border-radius: 50%; z-index: -1;
            animation: move 20s infinite alternate;
        }
        @keyframes move { from { transform: translate(-50%, -50%); } to { transform: translate(50%, 50%); } }
        .card {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px; border-radius: 32px;
            width: 90%; max-width: 450px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        h1 { font-weight: 800; font-size: 28px; margin-bottom: 8px; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        p { color: #94a3b8; font-size: 14px; margin-bottom: 32px; }
        .input-group { margin-bottom: 20px; }
        label { display: block; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; margin-left: 4px; }
        input {
            width: 100%; padding: 16px 20px; border-radius: 16px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.05);
            color: white; font-size: 16px; transition: all 0.3s;
            outline: none;
        }
        input:focus { border-color: var(--p); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2); }
        button {
            width: 100%; padding: 18px; border-radius: 16px;
            background: linear-gradient(135deg, var(--p), var(--s));
            border: none; color: white; font-weight: 700; font-size: 16px;
            cursor: pointer; margin-top: 12px; transition: all 0.3s;
            box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.5); }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #475569; }
    </style>
</head>
<body>
    <div class="blob"></div>
    <div class="card">
        <h1>Intelligence Hub</h1>
        <p>RFID Attendance System Configuration</p>
        <form action="/save" method="POST">
            <div class="input-group">
                <label>WiFi SSID</label>
                <input type="text" name="ssid" placeholder="Enter network name" required>
            </div>
            <div class="input-group">
                <label>WiFi Password</label>
                <input type="password" name="pass" placeholder="••••••••">
            </div>
            <div class="input-group">
                <label>MQTT Server IP</label>
                <input type="text" name="mqtt" placeholder="192.168.1.5" required>
            </div>
            <div class="input-group">
                <label>MQTT Port</label>
                <input type="text" name="port" value="1883">
            </div>
            <button type="submit">Deploy System</button>
        </form>
        <div class="footer">VOC BILLIARD &bull; v2.0 Professional</div>
    </div>
</body>
</html>
)rawgh";
  server.send(200, "text/html", html);
  showReady();
}
