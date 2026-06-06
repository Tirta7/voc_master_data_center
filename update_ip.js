const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Deteksi IP Address WiFi aktif.
 * Memilih IP 192.168.x.x / 10.x.x.x / 172.16-31.x.x jika ada.
 */
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    let fallbackIp = 'localhost';

    for (const name of Object.keys(interfaces)) {
        // Skip virtual/docker interfaces
        if (/vethernet|virtual|docker|hyper-v|wsl|bridge/i.test(name)) continue;

        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const addr = iface.address;
                if (addr.startsWith('192.168.') ||
                    addr.startsWith('10.') ||
                    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(addr)) {
                    return addr;
                }
                fallbackIp = addr;
            }
        }
    }
    return fallbackIp;
}

const currentIp = getLocalIp();
console.log(`\x1b[36m%s\x1b[0m`, `[+] IP Server Terdeteksi: ${currentIp}`);

let totalChanges = 0;

function updateFile(filePath, key, newUrl) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Robust Regex to match KEY=value, KEY="value", or KEY='value'
        const regex = new RegExp(`^(${key}=)(['"]?)(?:https?:\\/\\/|ws?:\\/\\/)?[a-zA-Z0-9\\.]+(:\\d+)?(['"]?)$`, 'm');

        if (regex.test(content)) {
            const newContent = content.replace(regex, (match, p1, p2, p3, p4) => {
                return `${p1}${p2}${newUrl}${p4}`;
            });

            if (newContent !== content) {
                fs.writeFileSync(filePath, newContent);
                console.log(`\x1b[32m%s\x1b[0m`, `[OK] Updated ${key} in ${path.basename(filePath)}`);
                totalChanges++;
                return true;
            }
        } else {
            const simpleRegex = new RegExp(`^(${key}=).*$`, 'm');
            if (simpleRegex.test(content)) {
                const newContent = content.replace(simpleRegex, `${key}=${newUrl}`);
                if (newContent !== content) {
                    fs.writeFileSync(filePath, newContent);
                    console.log(`\x1b[32m%s\x1b[0m`, `[OK] Updated ${key} (simple) in ${path.basename(filePath)}`);
                    totalChanges++;
                    return true;
                }
            }
        }
        console.log(`\x1b[34m%s\x1b[0m`, `[-] No changes needed for ${key} in ${path.basename(filePath)}`);
    } else {
        console.log(`\x1b[31m%s\x1b[0m`, `[ERR] File not found: ${filePath}`);
    }
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Update Backend .env: APP_URL tetap pakai IP WiFi.
//    Backend perlu IP ini untuk generate URL publik (misal link QR member card).
// ─────────────────────────────────────────────────────────────────────────────
const backendEnv = path.join(__dirname, 'backend', '.env');
updateFile(backendEnv, 'APP_URL', `http://${currentIp}:4000`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Frontend .env.local: SELALU gunakan localhost.
//
//    ✅ DESAIN PERMANEN:
//    NEXT_PUBLIC_API_URL dan NEXT_PUBLIC_MQTT_URL di .env.local HANYA digunakan
//    oleh kode server-side Next.js (middleware, generateMetadata, manifest.ts).
//    Kode-kode tersebut SUDAH diubah untuk hardcode 'http://localhost:4000',
//    sehingga nilai di .env.local ini sebenarnya tidak terpakai lagi untuk
//    server-side. Nilainya kita biarkan localhost agar konsisten dan tidak pernah
//    perlu berubah.
//
//    Untuk browser klien (HP/Kasir), URL API dan MQTT sudah ditentukan secara
//    DINAMIS oleh urlUtils.ts dan MqttContext.tsx berdasarkan window.location.hostname.
//    Ini berarti HP/Kasir akan OTOMATIS menembak IP yang benar tanpa perlu build ulang.
// ─────────────────────────────────────────────────────────────────────────────
const frontendEnv = path.join(__dirname, 'frontend', '.env.local');
const frontendEnvContent = `NEXT_PUBLIC_API_URL=http://localhost:4000\nNEXT_PUBLIC_MQTT_URL=ws://localhost:8083\n`;

// Selalu tulis ulang .env.local dengan nilai localhost (tidak pernah pakai IP WiFi)
if (fs.existsSync(frontendEnv)) {
    const existingContent = fs.readFileSync(frontendEnv, 'utf8');
    if (existingContent !== frontendEnvContent) {
        fs.writeFileSync(frontendEnv, frontendEnvContent);
        console.log(`\x1b[32m%s\x1b[0m`, `[OK] frontend/.env.local direset ke localhost (tidak perlu build ulang saat IP ganti)`);
        // TIDAK menambah totalChanges karena perubahan ini tidak perlu trigger rebuild
    } else {
        console.log(`\x1b[34m%s\x1b[0m`, `[-] frontend/.env.local sudah localhost, tidak ada perubahan`);
    }
} else {
    fs.writeFileSync(frontendEnv, frontendEnvContent);
    console.log(`\x1b[32m%s\x1b[0m`, `[OK] frontend/.env.local dibuat dengan localhost`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Update SEMUA file firmware ESP32 (.ino) di folder esp32_mqtt_client.
//    Firmware ESP32 membutuhkan IP WiFi karena terhubung langsung ke MQTT broker.
// ─────────────────────────────────────────────────────────────────────────────
const espDir = path.join(__dirname, 'esp32_mqtt_client');
const espMqttRegex = /const char\s+\*mqtt_server\s*=\s*"[\d\.]+";/g;

if (fs.existsSync(espDir)) {
    const inoFiles = fs.readdirSync(espDir).filter(f => f.endsWith('.ino'));

    for (const fname of inoFiles) {
        const fpath = path.join(espDir, fname);
        let content = fs.readFileSync(fpath, 'utf8');
        const newContent = content.replace(espMqttRegex, `const char *mqtt_server = "${currentIp}";`);

        if (newContent !== content) {
            fs.writeFileSync(fpath, newContent);
            console.log(`\x1b[32m%s\x1b[0m`, `[OK] Firmware ${fname}: mqtt_server -> ${currentIp}`);
            totalChanges++;
        } else {
            console.log(`\x1b[34m%s\x1b[0m`, `[-] Firmware ${fname}: mqtt_server sudah ${currentIp}`);
        }
    }
} else {
    console.log(`\x1b[34m%s\x1b[0m`, `[-] Folder esp32_mqtt_client tidak ditemukan, skip firmware update.`);
}

console.log('--------------------------------------------------');
if (totalChanges > 0) {
    // Hanya backend APP_URL atau firmware ESP32 yang berubah.
    // Frontend TIDAK perlu direbuild karena pakai localhost dan URL dinamis.
    console.log(`\x1b[33m%s\x1b[0m`, `[!] IP berubah. IP baru: ${currentIp}`);
    console.log(`\x1b[32m%s\x1b[0m`, `[i] Frontend TIDAK perlu direbuild karena sudah IP-independent.`);
    console.log(`\x1b[33m%s\x1b[0m`, `[!] Jika ESP32 sudah di-flash, flash ulang firmware agar konek ke IP baru.`);
    process.exit(2);
} else {
    console.log(`\x1b[32m%s\x1b[0m`, `[i] Configuration is up to date at IP: ${currentIp}`);
    process.exit(0);
}
