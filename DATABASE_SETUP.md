# Tutorial Migrasi & Seeding Database Baru

Berikut adalah langkah-langkah untuk memindahkan aplikasi ke database baru yang bersih dan mengisinya dengan data awal.

## 1. Persiapan Database (Manual)
Sebelum menghubungkan aplikasi, Anda harus membuat database kosong di MySQL (melalui phpMyAdmin atau MySQL CLI):

```sql
CREATE DATABASE voc_billiard_db;
```

## 2. Konfigurasi Aplikasi (Otomatis)
Aplikasi telah saya arahkan ke database baru melalui file `backend/.env`:
- `DB_DATABASE=voc_billiard_db`

## 3. Sinkronisasi Tabel (Otomatis)
Saat backend dijalankan (`npm run start:dev`), sistem akan otomatis mendeteksi database kosong dan membuat seluruh tabel yang diperlukan (karena fitur `synchronize: true` aktif).

## 4. Pengisian Data Awal (Seeder)
Untuk mengisi data awal (Pengaturan Bisnis, 10 Meja, 100 Bahan Baku, dan 50 Menu Cafe), Anda bisa menjalankan perintah berikut di terminal:

**Windows (PowerShell):**
```powershell
Invoke-WebRequest -Method Post -Uri http://localhost:4000/seeder/bulk
```

**Atau melalui browser/Postman:**
POST ke: `http://localhost:4000/seeder/bulk`

---

## Data Awal yang Akan Terbuat:
- **Settings**: Nama bisnis "VOC BILLIARD", PPN 11%, Biaya Layanan 5%.
- **Meja**: Meja 1 saja.
- **Cafe**: 0 (Bahan baku dan Menu dikosongkan).
- **Member**: 0 (Member dikosongkan).
