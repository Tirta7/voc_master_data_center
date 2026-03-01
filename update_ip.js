const os = require('os');
const fs = require('fs');
const path = require('path');

// 1. Dapatkan IP WiFi (Bukan Localhost/Virtual)
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        // Abaikan interface virtual seperti WSL atau VMWare (opsional, bisa disesuaikan)
        if (name.toLowerCase().includes('vEthernet') || name.toLowerCase().includes('virtual')) continue;

        for (const iface of interfaces[name]) {
            // Cari IPv4 yang bukan IP internal (bukan 127.0.0.1)
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const currentIp = getLocalIp();
console.log(`[+] IP Address WiFi Server terdeteksi: ${currentIp}`);

// 2. Perbarui file backend/.env
const backendEnvPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(backendEnvPath)) {
    let content = fs.readFileSync(backendEnvPath, 'utf8');

    // Ganti IP yang ada di APP_URL dengan IP baru
    content = content.replace(/APP_URL=(http:\/\/)[a-zA-Z0-9\.]+(:\d+)/g, `APP_URL=$1${currentIp}$2`);

    fs.writeFileSync(backendEnvPath, content);
    console.log('[+] Sukses memperbarui konfigurasi Backend (APP_URL)');
} else {
    console.log('[-] File backend/.env tidak ditemukan!');
}

// 3. Perbarui file frontend/.env.local
const frontendEnvPath = path.join(__dirname, 'frontend', '.env.local');
if (fs.existsSync(frontendEnvPath)) {
    let content = fs.readFileSync(frontendEnvPath, 'utf8');

    // Ganti IP yang ada di NEXT_PUBLIC_API_URL dan NEXT_PUBLIC_MQTT_URL
    content = content.replace(/NEXT_PUBLIC_API_URL=(http:\/\/)[a-zA-Z0-9\.]+(:\d+)/g, `NEXT_PUBLIC_API_URL=$1${currentIp}$2`);
    content = content.replace(/NEXT_PUBLIC_MQTT_URL=(ws:\/\/)[a-zA-Z0-9\.]+(:\d+)/g, `NEXT_PUBLIC_MQTT_URL=$1${currentIp}$2`);

    fs.writeFileSync(frontendEnvPath, content);
    console.log('[+] Sukses memperbarui konfigurasi Frontend (API_URL & MQTT_URL)');
} else {
    console.log('[-] File frontend/.env.local tidak ditemukan!');
}

console.log('[+] Proses deteksi dan pembaruan IP Selesai.');
