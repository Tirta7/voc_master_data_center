# Panduan Setup Google Apps Script (Owner Dashboard)

Ikuti langkah-langkah berikut untuk menyiapkan Dashboard Owner di Google Sheets.

## 1. Persiapan Google Sheet
1. Buat Google Sheet baru, beri nama (misal: **VOC Billiard Owner Dashboard**).
2. Buat 4 sheet (tab) dengan nama berikut:
   - `Reports`
   - `Stock`
   - `Approvals`
   - `Decisions`
3. Pada sheet `Decisions`, isi baris pertama (Header) dengan:
   `RequestID`, `Action`, `Note`, `Processed`

## 2. Memasang Script
1. Di Google Sheets, klik menu **Extensions** > **Apps Script**.
2. Hapus semua kode di `Code.gs` dan ganti dengan kode dari bagian **[Code.gs]** di bawah.
3. Buat file baru (klik ikon + di samping Files) pilih **HTML**, beri nama `index`. Isi dengan kode dari bagian **[index.html]**.
4. Klik tombol **Deploy** > **New Deployment**.
   - Select type: **Web App**
   - Description: **Billiard Owner Dashboard v1**
   - Execute as: **Me (Email Anda)**
   - Who has access: **Anyone** (Jangan khawatir, kita menggunakan `GAS_SECRET` untuk keamanan data).
5. Salin **Web App URL** yang muncul.

## 3. Konfigurasi di Backend (PC Billiard)
Buka file `.env` di folder `backend` dan tambahkan:
```env
GAS_WEBAPP_URL=URL_YANG_ANDA_SALIN_TADI
GAS_SECRET=PilihKataKunciRahasiaAnda
```
Lalu restart backend.

---

## [Code.gs]

```javascript
const SECRET_TOKEN = "PilihKataKunciRahasiaAnda"; // Ganti dengan secret yang sama di .env

// ═══════════════════════════════════════════════
//  SETUP: Buat tab yang dibutuhkan jika belum ada
// ═══════════════════════════════════════════════
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const requiredSheets = ['Reports', 'Stock', 'Approvals', 'Decisions', 'Licenses', 'Broadcasts', 'AuditLogs'];
  requiredSheets.forEach(name => {
    if (!ss.getSheetByName(name)) {
      const sheet = ss.insertSheet(name);
      if (name === 'Licenses') {
        sheet.appendRow(['Machine ID', 'Nama Toko', 'Nama Pemilik', 'License Key', 'Tgl Aktif', 'Tgl Expired', 'Status']);
        sheet.getRange(1,1,1,7).setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff');
      }
      if (name === 'Broadcasts') {
        sheet.appendRow(['ID', 'Target', 'Pesan', 'Tipe', 'Jadwal', 'Aktif']);
        sheet.getRange(1,1,1,6).setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff');
      }
      if (name === 'Decisions') {
        sheet.appendRow(['RequestID', 'Action', 'Note', 'Processed']);
      }
    }
  });
  SpreadsheetApp.getUi().alert('Setup selesai! Semua tab telah dibuat.');
}

// ═══════════════════════════════════════════════
//  GENERATE LICENSE KEY (jalankan dari sheet)
// ═══════════════════════════════════════════════
function generateLicenseFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Licenses');
  const ui = SpreadsheetApp.getUi();

  const machineIdResp = ui.prompt('Generate Lisensi', 'Masukkan Machine ID PC Client:', ui.ButtonSet.OK_CANCEL);
  if (machineIdResp.getSelectedButton() !== ui.Button.OK) return;
  const machineId = machineIdResp.getResponseText().trim();

  const namaTokoResp = ui.prompt('Generate Lisensi', 'Nama Toko:', ui.ButtonSet.OK_CANCEL);
  if (namaTokoResp.getSelectedButton() !== ui.Button.OK) return;
  const namaToko = namaTokoResp.getResponseText().trim();

  const expiredResp = ui.prompt('Generate Lisensi', 'Tanggal Expired (YYYY-MM-DD):\nContoh: 2027-05-18', ui.ButtonSet.OK_CANCEL);
  if (expiredResp.getSelectedButton() !== ui.Button.OK) return;
  const expiredDate = expiredResp.getResponseText().trim();

  // Generate License Key: LIC-[8 char hash dari machineId]-[4 char random]
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, machineId + expiredDate + SECRET_TOKEN);
  const hashStr = hash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').toUpperCase().slice(0, 8);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const licenseKey = `LIC-${hashStr.slice(0,4)}-${hashStr.slice(4,8)}-${rand}`;

  // Cek apakah Machine ID sudah ada, update jika ada
  const rows = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === machineId) {
      sheet.getRange(i+1, 1, 1, 7).setValues([[machineId, namaToko, rows[i][2], licenseKey, new Date(), expiredDate, 'ACTIVE']]);
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([machineId, namaToko, '', licenseKey, new Date(), expiredDate, 'ACTIVE']);
  }

  ui.alert(`✅ Lisensi Berhasil Dibuat!\n\nMachine ID: ${machineId}\nLicense Key: ${licenseKey}\nExpired: ${expiredDate}\n\nSalin License Key di atas dan kirimkan ke client.`);
}

// ═══════════════════════════════════════════════
//  BROADCAST: Kirim pesan ke semua / satu client
// ═══════════════════════════════════════════════
function sendBroadcastMessage() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Broadcasts');
  const ui = SpreadsheetApp.getUi();

  const targetResp = ui.prompt('Kirim Pesan Broadcast', 'Target (ALL atau Machine ID tertentu):', ui.ButtonSet.OK_CANCEL);
  if (targetResp.getSelectedButton() !== ui.Button.OK) return;

  const messageResp = ui.prompt('Kirim Pesan Broadcast', 'Isi Pesan:', ui.ButtonSet.OK_CANCEL);
  if (messageResp.getSelectedButton() !== ui.Button.OK) return;

  const tipeResp = ui.prompt('Kirim Pesan Broadcast', 'Tipe (INFO / WARNING / DANGER / SUCCESS):', ui.ButtonSet.OK_CANCEL);
  if (tipeResp.getSelectedButton() !== ui.Button.OK) return;

  const jadwalResp = ui.prompt('Kirim Pesan Broadcast', 'Jadwal (kosongkan = segera)\nFormat: YYYY-MM-DD HH:MM', ui.ButtonSet.OK_CANCEL);
  if (jadwalResp.getSelectedButton() !== ui.Button.OK) return;

  const lastId = sheet.getLastRow() <= 1 ? 0 : Number(sheet.getRange(sheet.getLastRow(), 1).getValue() || 0);
  sheet.appendRow([
    lastId + 1,
    targetResp.getResponseText().trim() || 'ALL',
    messageResp.getResponseText().trim(),
    (tipeResp.getResponseText().trim() || 'INFO').toUpperCase(),
    jadwalResp.getResponseText().trim(),
    true
  ]);

  ui.alert('✅ Pesan broadcast berhasil ditambahkan! Akan tampil di aplikasi client dalam 30 detik.');
}

// ═══════════════════════════════════════════════
//  MENU CUSTOM DI GOOGLE SHEET
// ═══════════════════════════════════════════════
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎱 VOC Billiard')
    .addItem('⚙️ Setup Awal (Buat Semua Tab)', 'setupSheets')
    .addSeparator()
    .addItem('🔑 Generate Lisensi Baru', 'generateLicenseFromSheet')
    .addItem('📢 Kirim Pesan Broadcast', 'sendBroadcastMessage')
    .addToUi();
}

// ═══════════════════════════════════════════════
//  HTTP HANDLERS
// ═══════════════════════════════════════════════
function doGet(e) {
  const action = e.parameter.action;
  const secret = e.parameter.secret;
  const mode = e.parameter.mode;

  // License validation — tidak perlu secret karena machineId + key sudah unik
  if (action === 'validate_license') {
    return handleValidateLicense(e.parameter.machineId, e.parameter.licenseKey);
  }

  // Broadcast polling — tidak perlu secret
  if (action === 'get_broadcasts') {
    return handleGetBroadcasts(e.parameter.machineId);
  }

  // Existing: fetch_decisions for owner dashboard
  if (mode === 'fetch_decisions') {
    if (secret !== SECRET_TOKEN) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    return handleFetchDecisions();
  }

  if (action === 'getDecisions') {
    if (secret !== SECRET_TOKEN) return ContentService.createTextOutput("Unauthorized");
    return handleGetDecisions();
  }

  if (secret !== SECRET_TOKEN) {
    return ContentService.createTextOutput("Unauthorized").setMimeType(ContentService.MimeType.TEXT);
  }

  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('VOC Billiard Owner Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);

  // License activation (tidak perlu secret, key sudah cukup)
  if (payload.type === 'ACTIVATE_LICENSE') {
    return handleActivateLicense(payload.machineId, payload.licenseKey);
  }

  // Mark broadcast shown
  if (payload.type === 'MARK_BROADCAST_SHOWN') {
    return handleMarkBroadcastShown(payload.broadcastId, payload.machineId);
  }

  if (payload.secret !== SECRET_TOKEN) {
    return ContentService.createTextOutput("Unauthorized");
  }

  if (payload.type === 'SYNC_DATA') {
    handleSyncData(payload.data);
  } else if (payload.type === 'APPROVAL_REQUEST') {
    handleApprovalRequest(payload.data);
  } else if (payload.type === 'AUDIT_LOG') {
    handleAuditLog(payload.data);
  } else if (payload.type === 'MARK_PROCESSED') {
    handleMarkProcessed(payload.requestId);
  } else if (payload.type === 'UPDATE_LICENSE_FROM_MASTER') {
    return handleUpdateLicenseFromMaster(payload);
  }

  return ContentService.createTextOutput("Success");
}

function handleSyncData(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Update Reports Sheet
  const reportSheet = ss.getSheetByName('Reports');
  reportSheet.clear();
  reportSheet.appendRow(['Metric', 'Value']);
  Object.entries(data.summary).forEach(([key, val]) => {
    reportSheet.appendRow([key, JSON.stringify(val)]);
  });

  // Update Stock Sheet
  const stockSheet = ss.getSheetByName('Stock');
  stockSheet.clear();
  stockSheet.appendRow(['ID', 'Name', 'Stock', 'Unit', 'Min Level', 'Cost Price']);
  data.allIngredients.forEach(item => {
    stockSheet.appendRow([item.id, item.name, item.stockQuantity, item.unit, item.minStockLevel, item.costPrice]);
  });
}

function handleApprovalRequest(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Approvals');
  
  // Find if already exists to update or append
  const rows = sheet.getDataRange().getValues();
  let foundIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      foundIndex = i + 1;
      break;
    }
  }

  const rowData = [
    data.id, 
    data.moduleType, 
    JSON.stringify(data.metadata), 
    data.status, 
    new Date(),
    data.requestedBy?.name || 'Staff'
  ];

  if (foundIndex > 0) {
    sheet.getRange(foundIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function handleAuditLog(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('AuditLogs');
  if (!sheet) {
    sheet = ss.insertSheet('AuditLogs');
    sheet.appendRow(['ID', 'Action', 'User', 'Details', 'Table', 'Invoice', 'Time']);
  }
  
  sheet.appendRow([
    data.id,
    data.action,
    data.user,
    data.details,
    data.tableId,
    data.invoiceNumber,
    new Date()
  ]);
  
  // Keep only last 500 logs to prevent sheet bloat
  if (sheet.getLastRow() > 500) {
    sheet.deleteRow(2);
  }
}

function handleGetDecisions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Decisions');
  const rows = sheet.getDataRange().getValues();
  
  const decisions = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][3] === false || rows[i][3] === "") {
      decisions.push({
        requestId: rows[i][0],
        action: rows[i][1],
        note: rows[i][2]
      });
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ decisions }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleMarkProcessed(requestId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Decisions');
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == requestId) {
      sheet.getRange(i + 1, 4).setValue(true);
      break;
    }
  }
}

// ═══════════════════════════════════════════════
//  TERIMA UPDATE LISENSI DARI MASTER COMMAND CENTER
// ═══════════════════════════════════════════════
function handleUpdateLicenseFromMaster(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Licenses');
  if (!sheet) {
    return ContentService.createTextOutput('ERROR: Sheet Licenses tidak ditemukan di cabang ini')
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const rows = sheet.getDataRange().getValues();
  let foundIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === payload.machineId) {
      foundIndex = i + 1;
      break;
    }
  }

  const rowData = [
    payload.machineId,
    payload.storeName || 'Cabang VOC',
    '',
    payload.licenseKey,
    new Date(),
    payload.expiredDate,
    payload.status
  ];

  if (foundIndex > 0) {
    sheet.getRange(foundIndex, 1, 1, 7).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return ContentService.createTextOutput('BERHASIL: Lisensi berhasil disinkronkan dari Master!')
    .setMimeType(ContentService.MimeType.TEXT);
}

// User Actions from Web Interface
function submitDecision(requestId, action, note) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Decisions');
  sheet.appendRow([requestId, action, note, false]);
  
  // Also update status in Approvals sheet
  const appSheet = ss.getSheetByName('Approvals');
  const appRows = appSheet.getDataRange().getValues();
  for (let i = 1; i < appRows.length; i++) {
    if (appRows[i][0] == requestId) {
      appSheet.getRange(i + 1, 4).setValue(action === 'APPROVE' ? 'APPROVED' : 'REJECTED');
      break;
    }
  }
  return "Decision recorded";
}

function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Ambil data broadcasts yang aktif
  const bSheet = ss.getSheetByName('Broadcasts');
  const broadcasts = [];
  if (bSheet) {
    const now = new Date();
    const rows = bSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const [id, target, pesan, tipe, jadwal, aktif] = rows[i];
      if (aktif === true || aktif === 'TRUE' || aktif === 'true' || aktif === 1) {
        if (jadwal) {
          const jadwalDate = new Date(jadwal);
          if (!isNaN(jadwalDate) && now < jadwalDate) continue;
        }
        broadcasts.push({ id, target, pesan, tipe: tipe || 'INFO' });
      }
    }
  }

  return {
    reports: ss.getSheetByName('Reports').getDataRange().getValues(),
    stock: ss.getSheetByName('Stock').getDataRange().getValues(),
    approvals: ss.getSheetByName('Approvals').getDataRange().getValues().filter(r => r[3] === 'PENDING'),
    auditLogs: ss.getSheetByName('AuditLogs') ? ss.getSheetByName('AuditLogs').getDataRange().getValues().slice(-20).reverse() : [],
    broadcasts: broadcasts
  };
}

// ═══════════════════════════════════════════════
//  LICENSE HANDLERS
// ═══════════════════════════════════════════════
//  LICENSE HANDLERS
// ═══════════════════════════════════════════════
function handleValidateLicense(machineId, licenseKey, strictMatch) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Licenses');
  if (!sheet || !machineId) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'INVALID', message: 'Sheet Licenses tidak ditemukan' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === machineId) {
      const storedKey = rows[i][3];
      const expiredAt = rows[i][5];
      const status = rows[i][6];

      // Cek status manual (BLOCKED)
      if (status === 'BLOCKED') {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'BLOCKED',
          message: 'Lisensi diblokir. Hubungi support.',
          expiredAt: expiredAt ? new Date(expiredAt).toISOString() : null
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Hitung tanggal expired & sisa hari
      const now = new Date();
      const expired = expiredAt ? new Date(expiredAt) : null;
      const daysLeft = expired ? Math.ceil((expired - now) / (1000 * 60 * 60 * 24)) : 9999;

      let licStatus = 'ACTIVE';
      let graceDaysLeft = 0;

      if (expired) {
        // Kunci tepat di akhir hari expiry (23:59:59) — tidak ada grace period
        const expiredEndOfDay = new Date(expired);
        expiredEndOfDay.setHours(23, 59, 59, 999);
        if (now > expiredEndOfDay) {
          licStatus = 'EXPIRED';
        }
      }

      // Jika expired, batasi
      if (licStatus === 'EXPIRED') {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'EXPIRED',
          message: 'Lisensi telah kadaluarsa. Hubungi support.',
          expiredAt: expired ? expired.toISOString() : null,
          daysLeft
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Cek kesesuaian license key
      // Jika strictMatch aktif (misal dari input aktivasi manual), key HARUS cocok persis.
      // Jika tidak strict (polling biasa), kita izinkan mismatch jika status ACTIVE/GRACE untuk mendukung auto-update key baru!
      if (strictMatch && storedKey !== licenseKey) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'INVALID', message: 'License Key tidak valid' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Jika key mismatch tapi status aktif, kita return status dengan key yang benar agar client bisa auto-save!
      return ContentService.createTextOutput(JSON.stringify({
        status: licStatus,
        expiredAt: expired ? expired.toISOString() : null,
        daysLeft,
        graceDaysLeft,
        licenseKey: storedKey // Kirim key yang benar untuk auto-sinkronisasi kasir
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Machine ID tidak ditemukan di sheet
  return ContentService.createTextOutput(JSON.stringify({ status: 'NOT_REGISTERED', message: 'Machine ID belum terdaftar' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleActivateLicense(machineId, licenseKey) {
  // Panggil validate dengan strictMatch = true agar wajib mencocokkan key yang diinput
  const validateResponse = handleValidateLicense(machineId, licenseKey, true);
  const result = JSON.parse(validateResponse.getContent());
  if (['ACTIVE', 'GRACE'].includes(result.status)) {
    return ContentService.createTextOutput(JSON.stringify({ success: true, ...result }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ success: false, ...result }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════
//  BROADCAST HANDLERS
// ═══════════════════════════════════════════════
function handleGetBroadcasts(machineId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Broadcasts');
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const now = new Date();
  const rows = sheet.getDataRange().getValues();
  const broadcasts = [];

  for (let i = 1; i < rows.length; i++) {
    const [id, target, pesan, tipe, jadwal, aktif] = rows[i];

    // Skip jika tidak aktif
    if (aktif !== true && aktif !== 'TRUE') continue;

    // Filter target: ambil jika ALL atau cocok dengan machineId
    if (target !== 'ALL' && target !== machineId) continue;

    // Filter jadwal: skip jika jadwal belum tiba
    if (jadwal) {
      const scheduledTime = new Date(jadwal);
      if (!isNaN(scheduledTime) && now < scheduledTime) continue;
    }

    broadcasts.push({ id, target, pesan, tipe: tipe || 'INFO' });
  }

  return ContentService.createTextOutput(JSON.stringify(broadcasts))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleMarkBroadcastShown(broadcastId, machineId) {
  // TIDAK menghapus broadcast — hanya return sukses.
  // Broadcast terus aktif sampai owner ubah kolom Aktif=FALSE di sheet.
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleFetchDecisions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Decisions');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  const rows = sheet.getDataRange().getValues();
  const decisions = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][3] === false || rows[i][3] === '') {
      decisions.push({ requestId: rows[i][0], action: rows[i][1], note: rows[i][2] });
    }
  }
  return ContentService.createTextOutput(JSON.stringify(decisions)).setMimeType(ContentService.MimeType.JSON);
}
```


## [index.html]

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #6366f1;
      --bg: #0f172a;
      --card: #1e293b;
      --text: #f8fafc;
      --danger: #ef4444;
      --success: #22c55e;
    }
    body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
    .tab { padding: 10px 20px; background: var(--card); border-radius: 8px; cursor: pointer; transition: 0.3s; }
    .tab.active { background: var(--primary); }
    .card { background: var(--card); padding: 20px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #334155; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .badge-pending { background: #f59e0b; color: #fff; }
    .btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; }
    .btn-approve { background: var(--success); color: white; margin-right: 10px; }
    .btn-reject { background: var(--danger); color: white; }
    .loading { text-align: center; padding: 50px; }
    
    /* Toast styles */
    .toast-box {
      background: #1e293b;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      position: relative;
      overflow: hidden;
      margin-bottom: 10px;
      text-align: left;
    }
    
    @keyframes toastSlideIn {
      from { transform: translateX(120%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .toast-border-accent {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      width: 4px;
    }
    
    .toast-INFO .toast-border-accent { background: #3b82f6; }
    .toast-WARNING .toast-border-accent { background: #f59e0b; }
    .toast-DANGER .toast-border-accent { background: #ef4444; }
    .toast-SUCCESS .toast-border-accent { background: #10b981; }

    .toast-close-btn {
      background: none;
      border: none;
      color: #64748b;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .toast-close-btn:hover {
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>VOC Owner Center</h1>
      <button class="btn" style="background:#334155" onclick="loadData()">Refresh</button>
    </div>

    <div class="tabs">
      <div class="tab active" onclick="showTab('approvals')">Approval Center</div>
      <div class="tab" onclick="showTab('reports')">Reports</div>
      <div class="tab" onclick="showTab('stock')">Stock</div>
      <div class="tab" onclick="showTab('audit')">Audit Logs</div>
    </div>

    <div id="content">
      <div class="loading">Memuat data...</div>
    </div>
  </div>

  <!-- Toast Container untuk menampilkan pesan broadcast secara online -->
  <div id="toast-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; max-width: 380px; width: 100%;"></div>

  <script>
    let currentData = null;

    function showTab(tabName) {
      const tabs = document.querySelectorAll('.tab');
      tabs.forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      render(tabName);
    }

    function loadData() {
      google.script.run.withSuccessHandler(data => {
        currentData = data;
        render('approvals');
        renderToasts(data.broadcasts); // Render toast di dashboard online!
      }).getDashboardData();
    }

    function renderToasts(broadcasts) {
      const container = document.getElementById('toast-container');
      container.innerHTML = '';
      if (!broadcasts || broadcasts.length === 0) return;

      broadcasts.forEach(b => {
        const toast = document.createElement('div');
        toast.className = `toast-box toast-${b.tipe}`;
        toast.innerHTML = `
          <div class="toast-border-accent"></div>
          <div style="flex: 1; padding-left: 8px;">
            <div style="font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px;">
              📢 PENGUMUMAN AKTIF (${b.tipe})
            </div>
            <div style="font-size: 13px; line-height: 1.4; font-weight: 600; color: #f8fafc;">${b.pesan}</div>
          </div>
          <button class="toast-close-btn" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(toast);
        
        // Hilang otomatis dalam 10 detik jika tipenya INFO atau SUCCESS
        if (b.tipe === 'INFO' || b.tipe === 'SUCCESS') {
          setTimeout(() => {
            if (toast && toast.parentElement) {
              toast.style.animation = 'toastSlideIn 0.3s reverse forwards';
              setTimeout(() => toast.remove(), 300);
            }
          }, 10000);
        }
      });
    }

    function render(tab) {
      const content = document.getElementById('content');
      if (!currentData) return;

      if (tab === 'approvals') {
        const apps = currentData.approvals;
        if (apps.length <= 1) {
          content.innerHTML = '<div class="card">Tidak ada permintaan persetujuan baru.</div>';
          return;
        }
        let html = '';
        for(let i=1; i<apps.length; i++) {
          const meta = JSON.parse(apps[i][2]);
          html += `
            <div class="card">
              <div style="display:flex; justify-content:space-between">
                <strong>${apps[i][1]} #${apps[i][0]}</strong>
                <span class="badge badge-pending">${apps[i][3]}</span>
              </div>
              <p>Requested by: ${apps[i][5]}</p>
              <p style="color:#94a3b8">${JSON.stringify(meta.changes || meta)}</p>
              <div style="margin-top:15px">
                <button class="btn btn-approve" onclick="handleDecision(${apps[i][0]}, 'APPROVE')">Setujui</button>
                <button class="btn btn-reject" onclick="handleDecision(${apps[i][0]}, 'REJECT')">Tolak</button>
              </div>
            </div>
          `;
        }
        content.innerHTML = html;
      } else if (tab === 'reports') {
        let html = '<div class="card"><h3>Ringkasan Harian</h3>';
        currentData.reports.forEach((row, i) => {
          if(i === 0) return;
          let val = row[1];
          try { 
            const parsed = JSON.parse(val);
            if (typeof parsed === 'object') val = JSON.stringify(parsed, null, 2);
          } catch(e) {}
          html += `<div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #334155; padding-bottom:5px">
                    <span style="color:#94a3b8">${row[0]}</span>
                    <strong style="color:#22c55e">${val}</strong>
                  </div>`;
        });
        html += '</div>';
        content.innerHTML = html;
      } else if (tab === 'stock') {
        let html = '<div class="card"><h3>Monitoring Stok</h3>';
        html += '<table style="width:100%; text-align:left; border-collapse:collapse">';
        html += '<tr style="color:#94a3b8; border-bottom:1px solid #334155"><th>Item</th><th>Stok</th><th>Min</th></tr>';
        currentData.stock.forEach((row, i) => {
          if(i === 0) return;
          const isLow = Number(row[2]) <= Number(row[4]);
          html += `<tr style="border-bottom:1px solid #334155; height:40px; ${isLow ? 'color:#ef4444' : ''}">
                    <td>${row[1]}</td>
                    <td>${row[2]} ${row[3]}</td>
                    <td>${row[4]}</td>
                  </tr>`;
        });
        html += '</table></div>';
        content.innerHTML = html;
      } else if (tab === 'audit') {
        let html = '<div class="card"><h3>Log Audit Kritis</h3>';
        currentData.auditLogs.forEach((row, i) => {
          if(i === currentData.auditLogs.length - 1 && currentData.auditLogs.length > 0) return; // Skip header if at end
          html += `<div style="border-bottom:1px solid #334155; padding:10px 0">
                    <div style="display:flex; justify-content:space-between">
                      <strong style="color:#f59e0b">${row[1]}</strong>
                      <small>${row[2]}</small>
                    </div>
                    <p style="font-size:13px; margin:5px 0">${row[3]}</p>
                    <small style="color:#64748b">${new Date(row[6]).toLocaleString()}</small>
                  </div>`;
        });
        html += '</div>';
        content.innerHTML = html;
      }
    }

    function handleDecision(id, action) {
      const note = prompt("Masukkan catatan (opsional):");
      google.script.run.withSuccessHandler(() => {
        alert("Keputusan berhasil dikirim!");
        loadData();
      }).submitDecision(id, action, note);
    }

    loadData();
  </script>
</body>
</html>
```
