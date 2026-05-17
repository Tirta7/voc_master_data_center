# ═══════════════════════════════════════════════════════════════════════════════════════
# PANDUAN SETUP GOOGLE APPS SCRIPT - VOC BILLIARD SYSTEM
# Multi-Location Ready - Setiap Lokasi Butuh GAS Berbeda
# ═══════════════════════════════════════════════════════════════════════════════════════

## 📋 PANDUAN SINGKAT

### Langkah 1: Buat Google Spreadsheet Baru

```
1. Buka https://sheets.google.com
2. Klik "Buat spreadsheet baru"
3. Beri nama: "VOC Billiard Owner - [Nama Lokasi]"
   Contoh: "VOC Billiard Owner - Spot On PIK"
4. Buat 4 sheet (tab) dengan nama:
   - Reports
   - Stock
   - Approvals
   - Decisions
5. Di sheet "Decisions", isi header kolom:
   - A1: RequestID
   - B1: Action
   - C1: Note
   - D1: Processed
```

### Langkah 2: Buka Apps Script Editor

```
1. Di spreadsheet, klik menu "Ekstensi" (Extensions)
2. Pilih "Apps Script"
3. Hapus semua kode default di Code.gs
4. Copy-paste kode dari:
   backend/src/external-sync/gas_code.gs
```

### Langkah 3: Buat HTML File

```
1. Di Apps Script, klik ikon "+" di sebelah File
2. Pilih "HTML"
3. Beri nama: "index"
4. Copy-paste kode dari:
   backend/src/external-sync/gas_index.html
```

### Langkah 4: Edit Secret Token

```
1. Di Code.gs, edit baris:
   const SECRET_TOKEN = "ganti_dengan_secret_rahasia_anda";

2. Ganti dengan string unik, contoh:
   const SECRET_TOKEN = "spot_on_pik_2024_secret";

3. CATAT secret ini - akan dipakai di .env backend
```

### Langkah 5: Deploy sebagai Web App

```
1. Klik "Deploy" > "New deployment"
2. Klik ikon roda gigi di sebelah "Select type"
3. Pilih "Web app"
4. Konfigurasi:
   - Description: "VOC Billiard Owner - [Nama Lokasi]"
   - Execute as: "Me"
   - Who has access: "Anyone"
5. Klik "Deploy"
6. Copy URL Web App yang muncul
7. URL пример: https://script.google.com/macros/s/ABC123XYZ/exec
```

### Langkah 6: Konfigurasi di Backend (.env)

```
Edit file .env:

GAS_WEBAPP_URL=https://script.google.com/macros/s/ABC123XYZ/exec
GAS_SECRET=spot_on_pik_2024_secret
LOCATION_ID=SPOT_ON_PIK
LOCATION_NAME=Spot On Billiard PIK
```

---

## 🔐 KEAMANAN

### Mengapa Setiap Lokasi Butuh GAS Berbeda?

```
┌─────────────────────────────────────────────────────────────────────┐
│  KEAMANAN DATA MULTI-LOCATION                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Setiap owner HANYA boleh melihat data lokasinya sendiri            │
│                                                                      │
│  ├── Lokasi A (PIK)                                                 │
│  │     └── GAS Project A → Spreadsheet A → Data Lokal A            │
│  │                                                                      │
│  ├── Lokasi B (Bandung)                                             │
│  │     └── GAS Project B → Spreadsheet B → Data Lokal B            │
│  │                                                                      │
│  └── Lokasi C (Jakarta)                                             │
│        └── GAS Project C → Spreadsheet C → Data Lokal C            │
│                                                                      │
│  Owner A tidak bisa melihat data Owner B!                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Mekanisme Keamanan:

```
1. SECRET_TOKEN berbeda di setiap GAS
2. Backend HANYA bisa menulis ke GAS yang punya secret matching
3. Web App URL unik per deployment
4. Setiap Spreadsheet terpisah dan privat
```

---

## 📝 TEMPLATE KODE GAS

Kode GAS lengkap ada di:
- `backend/src/external-sync/gas_code.gs`
- `backend/src/external-sync/gas_index.html`

### File Structure di Apps Script:

```
📁 GAS Project (VOC Billiard - [Nama Lokasi])
├── 📄 Code.gs          ← Logic utama (doGet, doPost, dll)
└── 📄 index.html       ← Dashboard UI (HTML + CSS + JS)
```

### Fungsi Utama:

| Function | Deskripsi |
|----------|-----------|
| `doGet(e)` | Endpoint untuk mengambil data keputusan owner |
| `doPost(e)` | Endpoint untuk menerima data dari backend |
| `handleSyncData(data)` | Sync laporan dan inventory ke spreadsheet |
| `submitDecision()` | Owner mengirim keputusan (approve/reject) |
| `getDashboardData()` | Ambil semua data untuk dashboard |

---

## 🚨 TROUBLESHOOTING

### Error: "Unauthorized"

```
Penyebab: SECRET_TOKEN di GAS tidak cocok dengan GAS_SECRET di .env

Solusi:
1. Cek SECRET_TOKEN di Code.gs
2. Samakan dengan GAS_SECRET di .env
3. Restart backend: docker compose restart backend
```

### Error: "Script function not found"

```
Penyebab: Nama fungsi di frontend tidak cocok dengan Apps Script

Solusi:
1. Pastikan nama fungsi persis sama
2. Contoh: getDashboardData() bukan GetDashboardData()
```

### Error: "Permission Denied"

```
Penyebab: Web App belum di-deploy atau access level salah

Solusi:
1. Deploy > Manage deployments
2. Pastikan "Who has access" = "Anyone"
3. Buat deployment baru jika perlu
```

---

## 📞 KONTAK

Jika ada pertanyaan tentang setup GAS:
- Lihat dokumentasi lengkap di `backend/src/external-sync/gas_setup.md`