#include <WiFi.h>
#include <WiFiUdp.h>
#include "esp_wifi.h"

// ========== ISIKAN DENGAN NAMA & PASSWORD WIFI RUMAH ANDA ==========
const char *ssid = "ALI MUHAMMAD";
const char *password = "alimuhammad";
// ===================================================================

WiFiUDP udp;
IPAddress gatewayIP;

// Callback CSI: Dipanggil otomatis setiap kali ESP32 menangkap paket sinyal Wi-Fi dari Router
void _csi_rx_cb(void *ctx, wifi_csi_info_t *info) {
  if (!info || !info->buf || info->mac[0] == 0) return;
  
  // Format data: CSI_DATA,rssi,len,data0,data1...
  Serial.printf("CSI_DATA,%d,%d", info->rx_ctrl.rssi, info->len);
  
  int8_t *csi_data = (int8_t *)info->buf;
  for (int i = 0; i < info->len; i++) {
    Serial.printf(",%d", csi_data[i]);
  }
  Serial.println();
}

void setup() {
  Serial.begin(921600); // Speed 921600 Baud untuk Zero Latency
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  Serial.print("Menghubungkan ke Wi-Fi Rumah...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  gatewayIP = WiFi.gatewayIP();
  Serial.println("\n[OK] Terhubung ke Router Wi-Fi!");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
  Serial.print("IP Gateway (Router): ");
  Serial.println(gatewayIP);
  
  // Konfigurasi Fitur CSI ESP32
  wifi_csi_config_t csi_config = {
      .lltf_en           = true,
      .htltf_en          = true,
      .stbc_htltf2_en    = true,
      .ltf_merge_en      = true,
      .channel_filter_en = true,
      .manu_scale        = false,
      .shift             = false,
  };
  
  ESP_ERROR_CHECK(esp_wifi_set_csi_config(&csi_config));
  ESP_ERROR_CHECK(esp_wifi_set_csi_rx_cb(_csi_rx_cb, NULL));
  ESP_ERROR_CHECK(esp_wifi_set_csi(true));
  
  Serial.println("[OK] CSI Engine Aktif. Memulai Ping ke Router...");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // Kirim UDP Ping ke Router setiap 20ms agar Router membalas dengan paket Wi-Fi
    // Ini memicu balasan CSI berkelanjutan secara real-time dari Router
    udp.beginPacket(gatewayIP, 80);
    udp.printf("PING");
    udp.endPacket();
  }
  delay(20); // 50 paket per detik
}
