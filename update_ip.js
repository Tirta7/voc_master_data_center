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

let totalChanges = 0;

function updateFile(filePath, regex, replacement) {
    if (fs.existsSync(filePath)) {
        const originalContent = fs.readFileSync(filePath, 'utf8');
        if (regex.test(originalContent)) {
            const newContent = originalContent.replace(regex, replacement);
            if (newContent !== originalContent) {
                fs.writeFileSync(filePath, newContent);
                console.log(`\x1b[32m%s\x1b[0m`, `[OK] Berhasil memperbarui: ${path.basename(filePath)}`);
                totalChanges++;
                return true;
            } else {
                console.log(`\x1b[34m%s\x1b[0m`, `[-] Tidak ada perubahan: ${path.basename(filePath)}`);
            }
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

// 4. Update ESP32 Source Code
const espPath = path.join(__dirname, 'esp32_mqtt_client', 'esp32_mqtt_client.ino');
updateFile(
    espPath,
    /const char \*mqtt_server = "[a-zA-Z0-9\.]+";/g,
    `const char *mqtt_server = "${currentIp}";`
);

console.log('--------------------------------------------------');
if (totalChanges > 0) {
    console.log(`\x1b[33m%s\x1b[0m`, `[!] Terdeteksi perubahan IP Jaringan ke: http://${currentIp}:3000`);
    process.exit(2); // Exit code 2 indicates IP change
} else {
    console.log(`\x1b[32m%s\x1b[0m`, `[i] IP Jaringan tetap: http://${currentIp}:3000`);
    process.exit(0); // Exit code 0 indicates no change
}
