/*
 * ESP32 Web Flash - Spot On Billiard
 */
#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  Serial.println("Booting...");
  
  // OTA setup will be handled here
  ArduinoOTA.setHostname("SpotOn-Custom");
  ArduinoOTA.begin();
}

void loop() {
  ArduinoOTA.handle();
  
  // Send heartbeat every 5 seconds
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 5000) {
    lastHeartbeat = millis();
    
    StaticJsonDocument<200> doc;
    doc["mac"] = WiFi.macAddress();
    doc["ip"] = WiFi.localIP().toString();
    doc["rssi"] = WiFi.RSSI();
    doc["uptime"] = millis() / 1000;
    
    String output;
    serializeJson(doc, output);
    // Logic to send to MQTT status topic would go here
  }
} / * Custom logic below * /