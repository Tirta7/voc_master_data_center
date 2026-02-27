---
description: Prosedur mengaktifkan akses kamera di HP (Android & iOS) untuk Scan QR
---

Akses kamera di browser HP memerlukan koneksi yang aman (HTTPS) atau pengaturan khusus pada browser. Berikut adalah cara setting agar fitur Scan QR bisa berjalan di HP Waiter.

## opsi A: Untuk Android (Google Chrome)
Android memungkinkan kita "memaksa" browser menganggap koneksi IP lokal sebagai aman.

1. Buka aplikasi **Google Chrome** di HP.
2. Di kolom alamat, ketik: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
3. Cari bagian **"Insecure origins to be treated as secure"**.
4. Masukkan alamat IP server Anda:
   - Contoh: `http://192.168.1.15:3000`
5. Ubah dropdown menjadi **"Enabled"**.
6. Klik **"Relaunch"** di pojok bawah.
7. Sekarang kamera sudah bisa diakses.

---

## Opsi B: Untuk iOS / iPhone (Safari) - REKOMENDASI TERBAIK
iOS jauh lebih ketat dan **wajib** menggunakan HTTPS. Cara termudah adalah menggunakan **Ngrok** untuk membuat terowongan aman (Tunneling).

### 1. Persiapan Ngrok di Komputer Server
1. Download **Ngrok** (ngrok.com) dan install.
2. Buka Terminal/PowerShell dan jalankan terowongan untuk Frontend:
   ```bash
   # Jalankan di terminal 1
   ngrok http 3000
   ```
3. Buka Terminal baru dan jalankan terowongan untuk Backend:
   ```bash
   # Jalankan di terminal 2
   ngrok http 4000
   ```
4. Anda akan mendapatkan URL seperti `https://abcd-123.ngrok-free.app`.

### 2. Update Konfigurasi Aplikasi
Buka file `frontend/.env.local` dan update URL-nya:
```env
# Gunakan URL HTTPS dari Ngrok Terminal 2 (Backend)
NEXT_PUBLIC_API_URL=https://[URL_NGROK_BACKEND].ngrok-free.app
```

### 3. Jalankan Aplikasi
1. Restart Frontend (`npm run dev`) dan Backend (`npm run start:dev`).
2. Buka URL Ngrok dari terminal 1 di Safari iPhone:
   `https://[URL_NGROK_FRONTEND].ngrok-free.app`

---

## Opsi C: Menggunakan HTTPS Lokal (Static IP + SSL)
Jika Anda ingin setup yang lebih permanen tanpa Ngrok:
1. Gunakan **Mkcert** untuk membuat sertifikat SSL untuk IP lokal Anda.
2. Jalankan server dengan HTTPS di port 3000 dan 4000.
3. Install Root Certificate mkcert tersebut di iPhone (Profil & Trust Settings).

---

> [!IMPORTANT]
> **Selalu gunakan HTTPS** saat mengakses fitur kamera di iOS. Jika menggunakan Ngrok, pastikan HP dan Laptop terhubung ke internet.
