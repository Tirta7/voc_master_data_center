# Panduan Integrasi ESP32 MQTT - Billing Billiard

File ini berisi instruksi untuk menghubungkan ESP32 dengan sistem billing billiard Anda menggunakan protokol MQTT Mosquitto.

## Persyaratan Hardware
- **ESP32 DevKit V1** (atau varian lain).
- **Relay Module** (Disarankan 5V dengan input logic 3.3V).
- **Wiring**:
  - `GPIO 23` -> `Input Relay`
  - `GPIO 2` -> `LED Status` (Internal)
  - `VCC Relay` -> `VIN` (Jika 5V) atau `3.3V` (Jika 3.3V)
  - `GND` -> `GND`

## Persyaratan Software (Arduino IDE)
1. **Board Manager**: Pastikan board ESP32 sudah terinstall (masukkan `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json` di File > Preferences > Additional Boards Manager URLs).
2. **Library (WAJIB DIISI)**:
   Pergi ke **Sketch** > **Include Library** > **Manage Libraries...** dan cari lalu install:
   - **PubSubClient** oleh Nick O'Leary (Ini yang menyebabkan error `PubSubClient.h`).
   - **ArduinoJson** oleh Benoit Blanchon.
   - **PCF8575** oleh Rob Tillaart.

## Mengatasi Error "File not found"
Jika Anda melihat error `PubSubClient.h: No such file or directory`, itu artinya library tersebut belum terinstall di Arduino IDE Anda. Pastikan langkah nomor 2 di atas sudah dilakukan dengan benar.

## Konfigurasi Sketch (.ino)
Buka file `esp32_mqtt_client.ino` dan ganti nilai berikut:
- `ssid`: Nama WiFi Anda.
- `password`: Kata sandi WiFi Anda.
- `mqtt_server`: Alamat IP lokal server billing Anda (Saat ini: `192.168.0.104`).

## Cara Kerja
1. ESP32 akan mengambil Alamat MAC-nya sendiri (misalnya: `ABCDE123456`).
2. ESP32 berlangganan ke topik: `billiard/table/ABCDE123456/light/set`.
3. Pada sistem billing, pastikan nomor meja atau field `macAddress` di database diisi dengan `ABCDE123456` sesuai angka yang muncul di Serial Monitor.
4. Saat meja dimulai dari website, backend akan mengirim JSON ke topik tersebut dan ESP32 akan menyalakan relay.
