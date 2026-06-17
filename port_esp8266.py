import re
import os

with open('d:\\Billiard_APPS\\esp32_mqtt_client\\esp32_moc3062_singletable.ino', 'r', encoding='utf-8') as f:
    code = f.read()

# Includes
code = code.replace('#include <WiFi.h>', '#include <ESP8266WiFi.h>')
code = code.replace('#include <WebServer.h> // 🆕 Web Portal', '#include <ESP8266WebServer.h>')
code = code.replace('#include <Preferences.h> // 🆕 NVM Flash Storage', '')
code = code.replace('#include <SPIFFS.h>', '#include <FS.h>')
code = code.replace('#include <esp_efuse.h>', '')
code = code.replace('#include <esp_mac.h>', '')
code = code.replace('#include <esp_system.h>', '')
code = code.replace('#include <esp_task_wdt.h>', '')
code = code.replace('#include <esp_wifi.h>', '')

# Globals
code = code.replace('WebServer server(80);', 'ESP8266WebServer server(80);')
code = code.replace('Preferences preferences;', '')

# ESP32 specific macros / commands
code = code.replace('esp_task_wdt_reset();', 'ESP.wdtFeed();')
code = re.sub(r'#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL.*?#endif\n\s*esp_task_wdt_add\(NULL\);', '', code, flags=re.DOTALL)
code = code.replace('esp_wifi_set_ps(WIFI_PS_NONE);', 'WiFi.setSleepMode(WIFI_NONE_SLEEP);')

code = code.replace('SPIFFS.begin(true)', 'SPIFFS.begin()')
code = code.replace('FILE_WRITE', '"w"')
code = code.replace('FILE_READ', '"r"')

# MAC address
mac_code = '''
  String macStr = WiFi.macAddress();
  macStr.replace(":", "");
  deviceMac = macStr;
'''
code = re.sub(r'uint8_t baseMac\[6\];.*?deviceMac = String\(macStr\);', mac_code.strip(), code, flags=re.DOTALL)

# Preferences to SPIFFS
save_settings = '''
void saveSettings(const char *s, const char *p, const char *m, int pt, int mp, bool al) {
  DynamicJsonDocument doc(512);
  doc["ssid"] = s;
  doc["pass"] = p;
  doc["mqtt"] = m;
  doc["port"] = pt;
  doc["mocPin"] = mp;
  doc["activeLow"] = al;
  File f = SPIFFS.open("/voc_config.json", "w");
  if(f) {
    serializeJson(doc, f);
    f.close();
    Serial.println("[CONFIG] Settings saved successfully.");
  } else {
    Serial.println("[CONFIG] Failed to save settings!");
  }
}
'''

load_settings = '''
void loadSettings() {
  File f = SPIFFS.open("/voc_config.json", "r");
  if(f) {
    DynamicJsonDocument doc(512);
    if (!deserializeJson(doc, f)) {
      strlcpy(ssid, doc["ssid"] | "", sizeof(ssid));
      strlcpy(password, doc["pass"] | "", sizeof(password));
      strlcpy(mqtt_server, doc["mqtt"] | "", sizeof(mqtt_server));
      mqtt_port = doc["port"] | 1883;
      mocPin = doc["mocPin"] | 4;
      MOC_ACTIVE_LOW = doc["activeLow"] | true;
      Serial.println("[CONFIG] Settings loaded from memory.");
    }
    f.close();
  } else {
    Serial.println("[CONFIG] No config found, using defaults.");
  }
}
'''

factory_reset = '''
void factoryReset() {
  SPIFFS.remove("/voc_config.json");
  SPIFFS.remove("/moc_config.json");
  Serial.println("[CONFIG] All settings cleared! Rebooting...");
  startLongBuzzer();
  delay(2100);
  ESP.restart();
}
'''

code = re.sub(r'void loadSettings\(\) \{.*?\n\}\n', load_settings + '\n', code, flags=re.DOTALL)
code = re.sub(r'void saveSettings.*?\}\n', save_settings + '\n', code, flags=re.DOTALL)
code = re.sub(r'void factoryReset\(\) \{.*?ESP.restart\(\);\n\}', factory_reset.strip(), code, flags=re.DOTALL)
code = code.replace('preferences.begin("voc-config", false);\n      preferences.clear();\n      preferences.end();', 'SPIFFS.remove("/voc_config.json");\n      SPIFFS.remove("/moc_config.json");')

# Change default pins for ESP8266 (ESP-12F)
code = code.replace('#define PIN_LED_WIFI                                                           \\\n  8', '#define PIN_LED_WIFI 2')
code = code.replace('#define PIN_BUZZER 6', '#define PIN_BUZZER 14')
code = code.replace('#define PIN_BUTTON 9', '#define PIN_BUTTON 0')
code = code.replace('int mocPin = 7;', 'int mocPin = 4; // Default to GPIO4 (D2)')

# Write to new file
os.makedirs('d:\\Billiard_APPS\\esp_12F_moc3062_singletable', exist_ok=True)
with open('d:\\Billiard_APPS\\esp_12F_moc3062_singletable\\esp_12F_moc3062_singletable.ino', 'w', encoding='utf-8') as f:
    f.write(code)
print('Done!')
