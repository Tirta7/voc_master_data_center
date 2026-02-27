---
description: Prosedur mengganti koneksi WiFi agar aplikasi tetap bisa diakses dari HP
---

# Cara Mengizinkan Kamera pada Koneksi WiFi Lokal (Google Chrome)

Browser seperti Google Chrome secara default memblokir akses kamera jika aplikasi dijalankan melalui IP address (contoh: `http://192.168.1.5:3000`) tanpa sertifikat SSL (HTTPS). 

Jika Anda mengganti WiFi atau menggunakan koneksi lokal, ikuti langkah ini pada HP/Laptop Waiter agar kamera tetap bisa digunakan untuk scan QR:

### Langkah 1: Buka Pengaturan Flag Chrome
1. Buka aplikasi Google Chrome.
2. Pada kolom alamat (Address Bar), ketik: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`

### Langkah 2: Masukkan Alamat Aplikasi
1. Cari opsi **"Insecure origins to be treated as secure"**.
2. Masukkan alamat IP server aplikasi Anda pada kotak teks yang tersedia. 
   - Contoh: `http://192.168.1.5:3000` (Ganti dengan IP yang tampil di Network Monitor).
3. Ubah pilihan di sebelah kanannya dari `Disabled` menjadi **`Enabled`**.

### Langkah 3: Restart Chrome
1. Klik tombol **"Relaunch"** yang muncul di pojok kanan bawah layar.
2. Buka kembali aplikasi Billiard Anda, dan coba scan QR lagi.

> [!TIP]
> Alamat IP server bisa dilihat pada tombol **Status Server** di dashboard utama aplikasi. Pastikan HP Waiter terhubung ke WiFi yang sama dengan komputer server.
