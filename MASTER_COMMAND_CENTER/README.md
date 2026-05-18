# 🎱 VOC MASTER CENTRAL COMMAND & LICENSE CENTER

Folder ini khusus dibuat sebagai **Pusat Pengendali Jarak Jauh (Central Command & License Center)** milik Anda sebagai Owner Utama. 

Pekerjaan di folder ini terpisah dari domain kode transaksi lokal di cabang (`external-sync`), karena fungsinya adalah sebagai alat administrasi tertinggi untuk memantau, memperpanjang lisensi, memblokir/mengunci, dan mengirim pesan toast interaktif ke seluruh PC Client cabang dari satu dashboard online terpusat.

---

## 📂 Struktur Berkas Command Center
1. **[Master_Code.gs](file:///d:/Billiard_APPS/MASTER_COMMAND_CENTER/Master_Code.gs)**: Script Apps Script utama untuk Spreadsheet Master Anda.
2. **[Master_Index.html](file:///d:/Billiard_APPS/MASTER_COMMAND_CENTER/Master_Index.html)**: Halaman web panel administrasi premium yang diakses secara online oleh Owner untuk mengirim toast dan mengendalikan lisensi.
3. **[Branch_Script_Additions.gs](file:///d:/Billiard_APPS/MASTER_COMMAND_CENTER/Branch_Script_Additions.gs)**: Blok kode tambahan yang perlu disuntikkan ke dalam Apps Script di spreadsheet **masing-masing cabang** agar mereka siap menerima instruksi jarak jauh dari Dashboard Master Anda.

---

## 🗺️ Arsitektur Aliran Kontrol Terdistribusi

```
                                [ MASTER COMMAND CENTER (Spreadsheet Anda) ]
                                                     |
                                                     v
                                  [ SPREADSHEET CABANG (Database Cloud) ]
                                            /                  \
                                           /                    \
              (Di-poll oleh PC Kasir lokal)                      (Diakses langsung via HP/Laptop)
                                         /                        \
                                        v                          v
             [ TAMPIL TOAST DI BILLING KASIR ]            [ TAMPIL TOAST DI DASHBOARD ONLINE ]
```

---

## 🚀 Langkah Instalasi & Penggunaan

### Langkah 1: Siapkan Spreadsheet Master Owner Anda
1. Buat Google Spreadsheet baru di Google Drive Anda (beri nama misal: `VOC - MASTER COMMAND CENTER`).
2. Klik menu **Extensions** > **Apps Script**.
3. Di editor Apps Script:
   * Hapus file default `Code.gs`, buat file script baru bernama `Code.gs` dan isi dengan seluruh kode dari **[Master_Code.gs](file:///d:/Billiard_APPS/MASTER_COMMAND_CENTER/Master_Code.gs)**.
   * Buat file HTML baru bernama `index.html` dan isi dengan seluruh kode dari **[Master_Index.html](file:///d:/Billiard_APPS/MASTER_COMMAND_CENTER/Master_Index.html)**.
4. Simpan proyek, lalu klik menu **Run** > **setupMasterSheet** sekali untuk membuat tab database `Clients` secara otomatis.
5. Lakukan deployment:
   * Klik tombol **Deploy** > **New Deployment**.
   * Pilih tipe **Web App**.
   * Setel **Execute as**: `Me (email Anda)`.
   * Setel **Who has access**: `Anyone`.
   * Klik **Deploy** dan simpan URL Web App yang dihasilkan.

### Langkah 2: Tambahkan Cabang ke Database Master
Di Spreadsheet Master Anda pada tab `Clients`, daftarkan baris baru untuk setiap cabang yang Anda pasang:
* **Nama Lokasi**: (Misal: `Lokasi A - Jakarta`)
* **GAS Webapp URL**: URL Web App dari **Spreadsheet Cabang** tersebut.
* **GAS Secret**: Token secret cabang tersebut (samakan dengan `GAS_SECRET` di `.env` PC cabang).
* **Machine ID**: Serial Number unik PC cabang tersebut (bisa dibaca di file `backend/storage/machine-id.txt`).
* **Nama Owner, Alamat, Tgl Pemasangan**: Informasi pelengkap.
* **License Key, Tgl Expired, Status**: Status awal lisensi (Misal: `ACTIVE`).

### Langkah 3: Perbarui Script di Spreadsheet Cabang
Agar spreadsheet cabang Anda mengenali instruksi remote dari Dashboard Master:
1. Buka Apps Script pada Spreadsheet Cabang tersebut.
2. Sisipkan blok kode dari **[Branch_Script_Additions.gs](file:///d:/Billiard_APPS/MASTER_COMMAND_CENTER/Branch_Script_Additions.gs)** ke dalam fungsi `doPost(e)` dan ganti fungsi `getDashboardData()` bawaan dengan yang baru.
3. Simpan dan deploy ulang (New Deployment) dengan akses setelan **Who has access: Anyone**.

---

## 🎱 Cara Mengendalikan Cabang
1. Buka URL Web App dari **Spreadsheet Master** Anda di browser.
2. Anda akan disuguhkan Dashboard Admin Premium gelap yang menampilkan seluruh cabang terdaftar beserta status lisensi dan Serial Number PC mereka secara real-time.
3. **Kirim Toast**: Ketik pesan pengumuman di kolom cabang, lalu klik **Kirim Toast**. Pesan akan langsung terapung indah di aplikasi billing cabang kasir dan di dashboard laporan online mereka!
4. **Kunci / Blokir Cabang**: Klik **Kunci / Blokir PC** untuk menghentikan aplikasi di cabang secara instan!
5. **Perpanjang Lisensi**: Klik **Perpanjang**, tentukan durasi hari, dan masukkan lisensi key baru.
