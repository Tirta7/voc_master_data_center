const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * 1. Deteksi IP Address WiFi
 * Memilih IP 192.168.x.x jika ada, karena biasanya itu IP WiFi Lokal
 */
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    let bestIp = 'localhost';
    
    for (const name of Object.keys(interfaces)) {
        if (name.toLowerCase().includes('vethernet') || name.toLowerCase().includes('virtual') || name.toLowerCase().includes('docker')) continue;

        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                // Prioritaskan range 192.168.x.x
                if (iface.address.startsWith('192.168.')) {
                    return iface.address;
                }
                bestIp = iface.address;
            }
        }
    }
    return bestIp;
}

const currentIp = getLocalIp();
console.log(`\x1b[36m%s\x1b[0m`, `[+] IP Server Terdeteksi: ${currentIp}`);

// Helper function to update files
function updateFile(filePath, regex, replacement) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (regex.test(content)) {
            content = content.replace(regex, replacement);
            fs.writeFileSync(filePath, content);
            console.log(`\x1b[32m%s\x1b[0m`, `[OK] Berhasil memperbarui: ${path.basename(filePath)}`);
            return true;
        }
    } else {
        console.log(`\x1b[31m%s\x1b[0m`, `[ERR] File tidak ditemukan: ${filePath}`);
    }
    return false;
}

// 2. Update Backend .env
updateFile(
    path.join(__dirname, 'backend', '.env'),
    /APP_URL=http:\/\/[a-zA-Z0-9\.]+(:\d+)?/g,
    `APP_URL=http://${currentIp}:4000`
);

// 3. Update Frontend .env.local
updateFile(
    path.join(__dirname, 'frontend', '.env.local'),
    /NEXT_PUBLIC_API_URL=http:\/\/[a-zA-Z0-9\.]+(:\d+)?/g,
    `NEXT_PUBLIC_API_URL=http://${currentIp}:4000`
);
updateFile(
    path.join(__dirname, 'frontend', '.env.local'),
    /NEXT_PUBLIC_MQTT_URL=ws:\/\/[a-zA-Z0-9\.]+(:\d+)?/g,
    `NEXT_PUBLIC_MQTT_URL=ws://${currentIp}:8083`
);

// 4. Update ESP32 Source Code (Otomatis ganti IP MQTT Broker)
const espPath = path.join(__dirname, 'esp32_mqtt_client', 'esp32_mqtt_client.ino');
updateFile(
    espPath,
    /const char \*mqtt_server = "[a-zA-Z0-9\.]+";/g,
    `const char *mqtt_server = "${currentIp}";`
);

console.log('--------------------------------------------------');
console.log(`\x1b[33m%s\x1b[0m`, `PENTING: Jika IP berubah, silakan Update IP di HP/Browser Client.`);
console.log(`\x1b[33m%s\x1b[0m`, `Alamat baru: http://${currentIp}:3000`);
console.log('--------------------------------------------------');
