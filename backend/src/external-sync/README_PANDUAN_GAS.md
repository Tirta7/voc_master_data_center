# 📋 PANDUAN FILE GOOGLE APPS SCRIPT (GAS)

## ⚠️ PENTING: Ada 2 GAS Project yang BERBEDA!

---

## 🔵 PROJECT 1: MASTER_COMMAND_CENTER
**Nama di GAS Editor:** `MASTER_COMMAND_CENTER`
**Spreadsheet:** Google Sheet khusus MASTER (bukan spreadsheet cabang)
**Tampilan hasil:** "VOC Central Command & License Center" (monitor semua cabang)

| File di GAS Editor | Copy dari file lokal ini |
|---|---|
| `Code.gs` | `MASTER_COMMAND_CENTER/Code.gs` |
| `Index.html` | `MASTER_COMMAND_CENTER/Index.html` |

---

## 🟢 PROJECT 2: VOC Billiard Owner Dashboard (CABANG)
**Nama di GAS Editor:** `VOC Billiard Owner Dashboard`
**Spreadsheet:** Google Sheet masing-masing CABANG (VOC Sulawesi, Sampang, dll.)
**Tampilan hasil:** "Ringkasan Operasional" (dashboard keuangan cabang)

| File di GAS Editor | Copy dari file lokal ini |
|---|---|
| `Code.gs` | `BRANCH_OWNER_DASHBOARD/Code.gs` |
| `Index.html` | `BRANCH_OWNER_DASHBOARD/Index.html` |

---

## 📁 Struktur Folder Lokal

```
external-sync/
│
├── 📁 MASTER_COMMAND_CENTER/          ← Untuk GAS "MASTER_COMMAND_CENTER"
│   ├── Code.gs                         ← Paste ke Code.gs di GAS Master
│   └── Index.html                      ← Paste ke Index.html di GAS Master
│
├── 📁 BRANCH_OWNER_DASHBOARD/         ← Untuk GAS "VOC Billiard Owner Dashboard"
│   ├── Code.gs                         ← Paste ke Code.gs di GAS Cabang
│   └── Index.html                      ← Paste ke Index.html di GAS Cabang
│
└── README_PANDUAN_GAS.md              ← File panduan ini
```

---

## 🚀 Cara Deploy/Update GAS

### Langkah-langkah (berlaku untuk Master maupun Cabang):
1. Buka GAS editor (dari Google Sheets → Extensions → Apps Script)
2. Pilih file `Code.gs` di panel kiri
3. Hapus semua isi, paste konten dari file lokal sesuai tabel di atas
4. Pilih file `Index.html` di panel kiri
5. Hapus semua isi, paste konten dari file lokal sesuai tabel di atas
6. Klik **Save** (Ctrl+S)
7. Klik **Deploy** → **Manage Deployments**
8. Klik ikon pensil (Edit) pada deployment aktif
9. Ubah **Version** ke "New version"
10. Klik **Deploy**

---

## 🔐 Password Dashboard

| Dashboard | Password |
|---|---|
| Branch Owner Dashboard (Ringkasan Operasional) | `billiard123` |
| Master Command Center | *(tidak perlu password, langsung terbuka)* |

---

## ❓ Cara Membedakan GAS Project

Lihat **nama project** di pojok kiri atas GAS Editor:
- Tulisan **"MASTER_COMMAND_CENTER"** → pakai file dari folder `MASTER_COMMAND_CENTER/`
- Tulisan **"VOC Billiard Owner Dashboard"** → pakai file dari folder `BRANCH_OWNER_DASHBOARD/`
