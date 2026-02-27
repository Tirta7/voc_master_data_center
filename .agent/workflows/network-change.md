---
description: Prosedur mengganti koneksi WiFi agar aplikasi tetap bisa diakses dari HP
---

Buka PowerShell atau Command Prompt sebagai Admin.
Jalankan perintah ini untuk mematikan proses yang nyangkut:
powershell

taskkill /F /PID 67128

(Atau jika PID-nya berubah, Anda bisa gunakan: Stop-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess -Force di PowerShell)

Setelah proses mati, jalankan kembali backend Anda:
bash

npm run start:dev

Setelah server berhasil menyala tanpa error EADDRINUSE, silakan coba klik "Bayar Struk" lagi. Sekarang rute multi-payer tersebut pasti sudah aktif.


Saat Anda mengganti WiFi atau router, IP Lokal komputer server biasanya akan berubah. Berikut adalah langkah-langkah untuk memperbaikinya:

### 1. Cek IP Baru Server
Buka terminal dan jalankan perintah:
```powershell
ipconfig
```
Cari bagian **IPv4 Address** (contoh: `192.168.1.15`).

### 2. Update File Konfigurasi Frontend
Buka file `frontend/.env.local` dan ganti alamat IP pada baris berikut dengan IP baru Anda:
// turbo
```env
NEXT_PUBLIC_API_URL=http://[IP_BARU_ANDA]:4000
```

### 3. Jalankan Kembali Layanan
Pastikan kedua layanan ini berjalan:

**Frontend (Web UI):**
// turbo
```powershell
cd frontend
npm run dev
```
*(Catatan: Perintah ini sudah menyertakan `-H 0.0.0.0` agar bisa diakses dari HP)*

**Backend (Server Data):**
// turbo
```powershell
cd backend
npm run start:dev
```

### 4. Akses dari HP
Di browser HP Anda, masukkan alamat:
**http://[IP_BARU_ANDA]:3000**

---
> [!TIP]
> Agar tidak repot setiap ganti WiFi, Anda bisa menyetel **Static IP** pada pengaturan Windows Anda untuk koneksi WiFi tersebut.