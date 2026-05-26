// =====================================================================================
//  VOC BILLIARD - BRANCH DASHBOARD & LICENSE HANDLER (Code.gs)
//  Pasang kode INI di editor Apps Script pada Spreadsheet CABANG Anda.
//  Ganti seluruh isi Code.gs dengan file ini, lalu Deploy ulang sebagai Web App.
// =====================================================================================

const SECRET_TOKEN = "billiard123"; // Samakan dengan GAS_SECRET di file .env backend kasir


// ═══════════════════════════════════════════════
//  OWNER PASSWORD — Server-side, aman & bisa diubah remote
// ═══════════════════════════════════════════════
function getOwnerPassword() {
  // Baca dari ScriptProperties (server-side, tidak terlihat di HTML)
  const stored = PropertiesService.getScriptProperties().getProperty('OWNER_PORTAL_PASSWORD');
  return stored || 'billiard123'; // Default awal
}

function setOwnerPassword(newPassword) {
  if (!newPassword || newPassword.length < 4) throw new Error('Password minimal 4 karakter');
  PropertiesService.getScriptProperties().setProperty('OWNER_PORTAL_PASSWORD', newPassword);
}

// Dipanggil dari HTML via google.script.run — TIDAK mengembalikan password,
// hanya mengembalikan true/false (aman dari inspeksi browser)
function verifyOwnerLogin(inputPassword) {
  const correct = getOwnerPassword();
  return (inputPassword === correct);
}


// ═══════════════════════════════════════════════
//  SETUP: Buat semua tab yang dibutuhkan
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
//  HTTP: GET HANDLER
// ═══════════════════════════════════════════════
function doGet(e) {
  const action = e.parameter.action;
  const secret = e.parameter.secret;
  const mode   = e.parameter.mode;

  // ── API-only routes (tidak menampilkan HTML) ──

  // License validation — tidak perlu secret
  if (action === 'validate_license') {
    return handleValidateLicense(e.parameter.machineId, e.parameter.licenseKey);
  }

  // Broadcast polling — tidak perlu secret
  if (action === 'get_broadcasts') {
    return handleGetBroadcasts(e.parameter.machineId);
  }

  // Decisions API — butuh secret
  if (mode === 'fetch_decisions') {
    if (secret !== SECRET_TOKEN) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    return handleFetchDecisions();
  }

  if (action === 'getDecisions') {
    if (secret !== SECRET_TOKEN) return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' })).setMimeType(ContentService.MimeType.JSON);
    return handleGetDecisions();
  }

  // getDashboardData via GET (butuh secret)
  if (action === 'getDashboardData') {
    if (secret !== SECRET_TOKEN) return ContentService.createTextOutput(JSON.stringify({ error: 'Unauthorized' })).setMimeType(ContentService.MimeType.JSON);
    return ContentService.createTextOutput(getDashboardData()).setMimeType(ContentService.MimeType.JSON);
  }

  // ─── CEK LISENSI SEBELUM TAMPILKAN DASHBOARD ───────────────────────────
  // Jika lisensi EXPIRED atau BLOCKED, tampilkan halaman terkunci
  const licStatus = checkLicenseStatusForDashboard();
  if (licStatus === 'EXPIRED' || licStatus === 'BLOCKED') {
    const html = buildLockedPageHtml(licStatus);
    return HtmlService.createHtmlOutput(html)
      .setTitle('Dashboard Terkunci — VOC Billiard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  // ────────────────────────────────────────────────────────────────────────

  // ── Dashboard HTML — SELALU ditampilkan, tidak butuh secret di URL ──
  // Autentikasi dilakukan di sisi client melalui input password di HTML
  const storeName = getStoreName();
  const pageTitle = storeName ? storeName + ' — Owner Portal' : 'VOC Owner Portal';
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle(pageTitle)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


// ═══════════════════════════════════════════════
//  AMBIL NAMA TOKO dari sheet Licenses
//  Dipanggil dari HTML via google.script.run
// ═══════════════════════════════════════════════
function getStoreName() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Licenses');
    if (!sheet || sheet.getLastRow() < 2) {
      // Fallback: coba baca dari nama spreadsheet itu sendiri
      const ssName = ss.getName();
      return ssName || 'VOC Owner Portal';
    }
    // Kolom 2 = Nama Toko (sesuai struktur setupSheets & handleUpdateLicenseFromMaster)
    const namaToko = sheet.getRange(2, 2).getValue();
    return namaToko ? String(namaToko).trim() : (ss.getName() || 'VOC Owner Portal');
  } catch (e) {
    return 'VOC Owner Portal';
  }
}


// ═══════════════════════════════════════════════
//  CEK STATUS LISENSI untuk lock dashboard
// ═══════════════════════════════════════════════
function checkLicenseStatusForDashboard() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Licenses');
    if (!sheet) return 'ACTIVE'; // Jika sheet belum ada, izinkan masuk

    const rows = sheet.getDataRange().getValues();
    const now  = new Date();

    for (let i = 1; i < rows.length; i++) {
      const status    = rows[i][6]; // kolom Status
      const expiredAt = rows[i][5]; // kolom Tgl Expired

      if (status === 'BLOCKED') return 'BLOCKED';

      if (expiredAt) {
        const expiredEndOfDay = new Date(expiredAt);
        expiredEndOfDay.setHours(23, 59, 59, 999);
        if (now > expiredEndOfDay) return 'EXPIRED';
      }
    }
    return 'ACTIVE';
  } catch (e) {
    return 'ACTIVE'; // Jika error, jangan blokir
  }
}


// ═══════════════════════════════════════════════
//  HALAMAN TERKUNCI (inline HTML)
// ═══════════════════════════════════════════════
function buildLockedPageHtml(reason) {
  const isBlocked  = reason === 'BLOCKED';
  const color      = isBlocked ? '#ef4444' : '#f59e0b';
  const bgColor    = isBlocked ? '#1a0505' : '#120f00';
  const icon       = isBlocked ? '🔒' : '⏰';
  const title      = isBlocked ? 'Akses Diblokir' : 'Lisensi Telah Berakhir';
  const badgeLabel = isBlocked ? 'AKSES DIBLOKIR' : 'LISENSI EXPIRED';

  const mainMsg = isBlocked
    ? 'Akses ke dashboard ini telah diblokir oleh administrator pusat.'
    : 'Masa aktif lisensi software VOC Billiard untuk cabang ini telah berakhir.';

  // Ambil info lisensi dari sheet untuk ditampilkan
  let machineId  = '-';
  let expiredAt  = '-';
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Licenses');
    if (sheet && sheet.getLastRow() > 1) {
      const row = sheet.getRange(2, 1, 1, 7).getValues()[0];
      machineId = row[0] || '-';
      expiredAt = row[5] ? new Date(row[5]).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : '-';
    }
  } catch(e) {}

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — VOC Billiard</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Outfit', sans-serif;
      background: radial-gradient(ellipse at 50% 0%, ${bgColor} 0%, #08090f 70%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #f8fafc;
      text-align: center;
      padding: 24px;
    }

    .card {
      background: rgba(15, 18, 30, 0.9);
      border: 1px solid ${color}33;
      border-radius: 28px;
      padding: 52px 44px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 0 100px ${color}18, 0 40px 80px rgba(0,0,0,0.6);
      animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1);
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(40px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .lock-ring {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${color}22, ${color}08);
      border: 2px solid ${color}55;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 38px;
      margin: 0 auto 24px;
      animation: pulse 2.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 ${color}40; }
      50%       { box-shadow: 0 0 0 18px ${color}00; }
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: ${color}18;
      border: 1px solid ${color}44;
      color: ${color};
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      padding: 5px 14px;
      border-radius: 100px;
      margin-bottom: 22px;
    }

    h1 {
      font-size: 26px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 12px;
      line-height: 1.2;
    }

    .subtitle {
      font-size: 14px;
      color: #64748b;
      line-height: 1.7;
      margin-bottom: 28px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .info-box {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px;
      padding: 14px;
      text-align: left;
    }

    .info-label {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }

    .info-value {
      font-size: 13px;
      font-weight: 700;
      color: #94a3b8;
      font-family: monospace;
      word-break: break-all;
    }

    .info-value.danger { color: ${color}; }

    .divider {
      height: 1px;
      background: rgba(255,255,255,0.06);
      margin: 20px 0;
    }

    .unlock-section {
      background: rgba(99,102,241,0.05);
      border: 1px solid rgba(99,102,241,0.15);
      border-radius: 16px;
      padding: 20px;
      text-align: left;
    }

    .unlock-title {
      font-size: 12px;
      font-weight: 800;
      color: #818cf8;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }

    .step:last-child { margin-bottom: 0; }

    .step-num {
      width: 22px;
      height: 22px;
      min-width: 22px;
      background: rgba(99,102,241,0.2);
      border: 1px solid rgba(99,102,241,0.4);
      border-radius: 50%;
      font-size: 11px;
      font-weight: 800;
      color: #818cf8;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 1px;
    }

    .step-text {
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
    }

    .step-text strong { color: #94a3b8; }

    .warning-note {
      margin-top: 20px;
      padding: 12px 16px;
      background: rgba(239,68,68,0.05);
      border: 1px solid rgba(239,68,68,0.15);
      border-radius: 10px;
      font-size: 12px;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 420px) {
      .card { padding: 36px 24px; }
      .info-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="lock-ring">${icon}</div>
    <div class="badge">🔴 ${badgeLabel}</div>
    <h1>${title}</h1>
    <p class="subtitle">${mainMsg}</p>

    <div class="info-grid">
      <div class="info-box">
        <div class="info-label">Machine ID Cabang</div>
        <div class="info-value">${machineId}</div>
      </div>
      <div class="info-box">
        <div class="info-label">Tanggal ${isBlocked ? 'Diblokir' : 'Expired'}</div>
        <div class="info-value danger">${expiredAt}</div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="unlock-section">
      <div class="unlock-title">🔓 Cara Membuka Kembali Akses</div>
      ${isBlocked ? `
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text">Hubungi <strong>Admin Pusat</strong> dan sampaikan Machine ID di atas.</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text">Admin buka <strong>Master Command Center</strong> → Klik <strong>"Buka Kunci PC"</strong> pada baris cabang ini.</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text">Setelah diaktifkan, <strong>refresh halaman ini</strong> untuk kembali ke dashboard.</div>
      </div>
      ` : `
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text">Hubungi <strong>Admin Pusat</strong> dan sampaikan Machine ID di atas.</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text">Admin buka <strong>Master Command Center</strong> → Klik <strong>"🔄 Perpanjang"</strong> pada baris cabang ini → Masukkan tanggal expired baru → Klik <strong>"Perpanjang Sekarang"</strong>.</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text">Setelah lisensi diperbarui, <strong>refresh halaman ini</strong> dan dashboard akan dapat diakses kembali.</div>
      </div>
      `}
    </div>

    <div class="warning-note">
      🛡️ Password tidak dapat digunakan untuk membuka akses selama lisensi dalam kondisi ini.
    </div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════

//  HTTP: POST HANDLER
// ═══════════════════════════════════════════════
function doPost(e) {
  const payload = JSON.parse(e.postData.contents);

  // Tidak perlu secret — machineId + licenseKey sudah cukup sebagai auth
  if (payload.type === 'ACTIVATE_LICENSE') {
    return handleActivateLicense(payload.machineId, payload.licenseKey);
  }

  if (payload.type === 'MARK_BROADCAST_SHOWN') {
    return handleMarkBroadcastShown(payload.broadcastId, payload.machineId);
  }

  // ✅ Handler perpanjangan/blokir lisensi remote dari Master Command Center
  if (payload.type === 'UPDATE_LICENSE_FROM_MASTER') {
    return handleUpdateLicenseFromMaster(payload);
  }

  // ✅ Update Password Owner dari Master Command Center
  if (payload.type === 'UPDATE_OWNER_PASSWORD') {
    if (payload.secret !== SECRET_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    try {
      setOwnerPassword(payload.newPassword);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Password berhasil diperbarui' }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Semua payload lain wajib menyertakan secret
  if (payload.secret !== SECRET_TOKEN) {
    return ContentService.createTextOutput('Unauthorized');
  }

  if (payload.type === 'ADD_BROADCAST_FROM_MASTER') {
    return handleAddBroadcastFromMaster(payload);
  }

  if (payload.type === 'CLEAR_BROADCASTS') {
    return handleClearBroadcasts();
  }

  if (payload.type === 'SYNC_DATA')         handleSyncData(payload.data);
  else if (payload.type === 'APPROVAL_REQUEST') handleApprovalRequest(payload.data);
  else if (payload.type === 'AUDIT_LOG')    handleAuditLog(payload.data);
  else if (payload.type === 'MARK_PROCESSED') handleMarkProcessed(payload.requestId);

  return ContentService.createTextOutput('Success');
}


// ═══════════════════════════════════════════════
//  LICENSE: Validasi dari kasir (polling 30 detik)
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
      const storedKey  = rows[i][3];
      const expiredAt  = rows[i][5];
      const status     = rows[i][6];

      if (status === 'BLOCKED') {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'BLOCKED',
          message: 'Lisensi diblokir. Hubungi support.',
          expiredAt: expiredAt ? new Date(expiredAt).toISOString() : null
        })).setMimeType(ContentService.MimeType.JSON);
      }

      const now     = new Date();
      const expired = expiredAt ? new Date(expiredAt) : null;

      // Hitung sisa hari: jika < 0 berarti sudah lewat
      const daysLeft = expired ? Math.ceil((expired - now) / (1000 * 60 * 60 * 24)) : 9999;

      let licStatus    = 'ACTIVE';
      let graceDaysLeft = 0;

      if (expired) {
        // Set expired ke akhir hari (23:59:59) agar tidak terkunci di tengah hari
        const expiredEndOfDay = new Date(expired);
        expiredEndOfDay.setHours(23, 59, 59, 999);

        if (now > expiredEndOfDay) {
          // Sudah lewat akhir hari expired → langsung EXPIRED, tanpa grace
          licStatus = 'EXPIRED';
          graceDaysLeft = 0;
        }
      }

      if (licStatus === 'EXPIRED') {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'EXPIRED',
          message: 'Lisensi telah kadaluarsa. Hubungi support.',
          expiredAt: expired ? expired.toISOString() : null,
          daysLeft
        })).setMimeType(ContentService.MimeType.JSON);
      }

      if (strictMatch && storedKey !== licenseKey) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'INVALID', message: 'License Key tidak valid' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: licStatus,
        expiredAt: expired ? expired.toISOString() : null,
        daysLeft,
        graceDaysLeft,
        licenseKey: storedKey
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'NOT_REGISTERED', message: 'Machine ID belum terdaftar' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleActivateLicense(machineId, licenseKey) {
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
//  LICENSE: Terima update remote dari Master Command Center
// ═══════════════════════════════════════════════
function handleUpdateLicenseFromMaster(payload) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Licenses');
  if (!sheet) {
    return ContentService.createTextOutput('ERROR: Sheet Licenses tidak ditemukan')
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
    payload.storeName  || 'Cabang VOC',
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


// ═══════════════════════════════════════════════
//  BROADCAST: Terima broadcast remote dari Master
// ═══════════════════════════════════════════════
function handleAddBroadcastFromMaster(payload) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Broadcasts');
  if (!sheet) return ContentService.createTextOutput('ERROR: Sheet Broadcasts tidak ditemukan');

  const lastId = sheet.getLastRow() <= 1 ? 0 : Number(sheet.getRange(sheet.getLastRow(), 1).getValue() || 0);
  sheet.appendRow([
    lastId + 1,
    payload.target || 'ALL',
    payload.pesan,
    payload.tipe   || 'WARNING',
    payload.jadwal || '',
    true
  ]);
  return ContentService.createTextOutput('BERHASIL: Toast berhasil ditambahkan!');
}

// Nonaktifkan semua broadcast aktif dari perintah Master
function handleClearBroadcasts() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Broadcasts');
  if (!sheet) return ContentService.createTextOutput('ERROR: Sheet Broadcasts tidak ditemukan');

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return ContentService.createTextOutput('BERHASIL: Tidak ada broadcast aktif.');

  let count = 0;
  const values = sheet.getRange(2, 6, lastRow - 1, 1).getValues(); // Kolom Aktif (F)
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === true || values[i][0] === 'TRUE') {
      sheet.getRange(i + 2, 6).setValue(false);
      count++;
    }
  }
  return ContentService.createTextOutput(`BERHASIL: ${count} broadcast dinonaktifkan.`);
}

function handleGetBroadcasts(machineId) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Broadcasts');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  const now  = new Date();
  const rows = sheet.getDataRange().getValues();
  const out  = [];

  for (let i = 1; i < rows.length; i++) {
    const [id, target, pesan, tipe, jadwal, aktif] = rows[i];
    if (aktif !== true && aktif !== 'TRUE') continue;
    if (target !== 'ALL' && target !== machineId) continue;
    if (jadwal) {
      const t = new Date(jadwal);
      if (!isNaN(t) && now < t) continue;
    }
    out.push({ id, target, pesan, tipe: tipe || 'INFO' });
  }

  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function handleMarkBroadcastShown(broadcastId, machineId) {
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ═══════════════════════════════════════════════
//  SYNC DATA, APPROVAL, AUDIT LOG
// ═══════════════════════════════════════════════
function handleSyncData(data) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    // 1. Sync Summary Report
    if (data.report) {
      const sheet = ensureSheet('Reports', ['Date', 'Payload']);
      const values = sheet.getDataRange().getValues();
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i][0] === 'FULL_REPORT_JSON') sheet.deleteRow(i + 1);
      }
      sheet.appendRow([new Date(), JSON.stringify(data.report)]);
      sheet.appendRow(['FULL_REPORT_JSON', JSON.stringify(data.report)]);
    }

    // 2. Sync Inventory
    if (data.allIngredients) {
      const stockSheet = ensureSheet('Stock', ['ID', 'Name', 'Stock', 'Unit', 'Min Level', 'Category', 'Department']);
      const rows = [['ID', 'Name', 'Stock', 'Unit', 'Min Level', 'Category', 'Department']];
      data.allIngredients.forEach(item => {
        rows.push([item.id, item.name, parseFloat(item.stockQuantity) || 0, item.unit,
          parseFloat(item.minStockLevel) || 0, item.category || 'General', item.department || 'CASHIER']);
      });
      stockSheet.clearContents();
      stockSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }

    // 3. Sync Menu Ranking
    if (data.menuRanking) {
      const menuSheet = ensureSheet('MenuRanking', ['ID', 'Name', 'Category', 'Price', 'Qty', 'Revenue']);
      const rows = [['ID', 'Name', 'Category', 'Price', 'Qty', 'Revenue']];
      data.menuRanking.forEach(item => {
        rows.push([item.id, item.name, item.category, item.price, item.totalQty, item.totalRevenue]);
      });
      menuSheet.clearContents();
      menuSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }

    // 4. Sync Pending Approvals
    if (data.pendingApprovals) {
      const appSheet = ensureSheet('Approvals', ['ID', 'Module', 'Metadata', 'Status', 'Time', 'Requester']);
      const rows = [['ID', 'Module', 'Metadata', 'Status', 'Time', 'Requester']];
      data.pendingApprovals.forEach(app => {
        rows.push([app.id, app.moduleType,
          typeof app.metadata === 'string' ? app.metadata : JSON.stringify(app.metadata),
          'PENDING', app.createdAt || new Date(), app.requestedBy?.name || 'Staff']);
      });
      appSheet.clearContents();
      appSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }

    // 5. Sync Shift Audits
    if (data.shiftAudits) {
      const shiftSheet = ensureSheet('ShiftAudits', ['ID', 'Shift', 'Staff', 'StartTime', 'EndTime', 'SystemCash', 'PhysicalCash', 'Diff', 'StockAudit', 'AIAnalysis']);
      const rows = [['ID', 'Shift', 'Staff', 'StartTime', 'EndTime', 'SystemCash', 'PhysicalCash', 'Diff', 'StockAudit', 'AIAnalysis']];
      data.shiftAudits.forEach(s => {
        rows.push([s.id, s.shiftName, s.userName, s.startTime, s.endTime,
          s.cashSystem, s.cashPhysical, s.discrepancy, JSON.stringify(s.stockReportsGrouped), s.aiAnalysis]);
      });
      shiftSheet.clearContents();
      if (rows.length > 1) shiftSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      else shiftSheet.appendRow(rows[0]);
    }

    SpreadsheetApp.flush();
  } catch (e) {
    console.error('Sync error: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

function ensureSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers) sheet.appendRow(headers);
  }
  return sheet;
}

function handleApprovalRequest(data) {
  const sheet = ensureSheet('Approvals', ['ID', 'Module', 'Metadata', 'Status', 'Time', 'Requester']);
  sheet.appendRow([data.id, data.moduleType, JSON.stringify(data.metadata), data.status, new Date(), data.requestedBy?.name || 'Staff']);
}

function handleAuditLog(data) {
  const sheet = ensureSheet('AuditLogs', ['ID', 'Action', 'User', 'Details', 'Table', 'Invoice', 'Time']);
  sheet.appendRow([data.id, data.action, data.user, data.details, data.tableId, data.invoiceNumber, new Date()]);
  if (sheet.getLastRow() > 500) sheet.deleteRow(2);
}

function handleMarkProcessed(requestId) {
  const sheet = ensureSheet('Decisions', ['RequestID', 'Action', 'Note', 'Processed']);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == requestId && rows[i][3] === false) {
      sheet.getRange(i + 1, 4).setValue(true);
      break;
    }
  }
}


// ═══════════════════════════════════════════════
//  DASHBOARD DATA (untuk Owner Web Dashboard)
// ═══════════════════════════════════════════════
function getDashboardData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = { reports: [], stock: [], approvals: [], auditLogs: [], shiftAudits: [], menuRanking: [], broadcasts: [] };

    const reportSheet = ss.getSheetByName('Reports');
    if (reportSheet) {
      const values = reportSheet.getDataRange().getValues();
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i][0] === 'FULL_REPORT_JSON') {
          result.reports = [values[i]];
          break;
        }
      }
    }

    const stockSheet = ss.getSheetByName('Stock');
    if (stockSheet) result.stock = stockSheet.getDataRange().getValues();

    const appSheet = ss.getSheetByName('Approvals');
    if (appSheet) result.approvals = appSheet.getDataRange().getValues().filter((row, i) => i === 0 || row[3] === 'PENDING');

    const auditSheet = ss.getSheetByName('AuditLogs');
    if (auditSheet) result.auditLogs = auditSheet.getDataRange().getValues().slice(-20);

    const shiftSheet = ss.getSheetByName('ShiftAudits');
    if (shiftSheet) {
      const vals = shiftSheet.getDataRange().getValues();
      for (let i = 1; i < vals.length; i++) {
        result.shiftAudits.push({
          id: vals[i][0], shiftName: vals[i][1], userName: vals[i][2],
          startTime: vals[i][3], endTime: vals[i][4], cashSystem: vals[i][5],
          cashPhysical: vals[i][6], discrepancy: vals[i][7],
          stockAudit: JSON.parse(vals[i][8] || '{}'), aiAnalysis: vals[i][9]
        });
      }
    }

    const menuSheet = ss.getSheetByName('MenuRanking');
    if (menuSheet) {
      const vals = menuSheet.getDataRange().getValues();
      for (let i = 1; i < vals.length; i++) {
        result.menuRanking.push({ id: vals[i][0], name: vals[i][1], category: vals[i][2], price: vals[i][3], totalQty: vals[i][4], totalRevenue: vals[i][5] });
      }
    }

    const bSheet = ss.getSheetByName('Broadcasts');
    if (bSheet) {
      const now  = new Date();
      const rows = bSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        const [id, target, pesan, tipe, jadwal, aktif] = rows[i];
        if (aktif === true || aktif === 'TRUE') {
          if (jadwal) { const d = new Date(jadwal); if (!isNaN(d) && now < d) continue; }
          result.broadcasts.push({ id, target, pesan, tipe: tipe || 'INFO' });
        }
      }
    }

    return JSON.stringify(result);
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}



function submitDecision(requestId, action, note) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheetByName('Decisions').appendRow([requestId, action, note, false]);
  const appSheet = ss.getSheetByName('Approvals');
  const appRows  = appSheet.getDataRange().getValues();
  for (let i = 1; i < appRows.length; i++) {
    if (appRows[i][0] == requestId) {
      appSheet.getRange(i + 1, 4).setValue(action === 'APPROVE' ? 'APPROVED' : 'REJECTED');
      break;
    }
  }
  return 'Decision recorded';
}

function handleGetDecisions() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Decisions');
  const rows  = sheet.getDataRange().getValues();
  const decisions = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][3] === false || rows[i][3] === '') {
      decisions.push({ requestId: rows[i][0], action: rows[i][1], note: rows[i][2] });
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ decisions })).setMimeType(ContentService.MimeType.JSON);
}

function handleFetchDecisions() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
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


// ═══════════════════════════════════════════════
//  GENERATE LICENSE (jalankan manual dari menu sheet)
// ═══════════════════════════════════════════════
function generateLicenseFromSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Licenses');
  const ui    = SpreadsheetApp.getUi();

  const machineIdResp = ui.prompt('Generate Lisensi', 'Masukkan Machine ID PC Client:', ui.ButtonSet.OK_CANCEL);
  if (machineIdResp.getSelectedButton() !== ui.Button.OK) return;
  const machineId = machineIdResp.getResponseText().trim();

  const namaTokoResp = ui.prompt('Generate Lisensi', 'Nama Toko:', ui.ButtonSet.OK_CANCEL);
  if (namaTokoResp.getSelectedButton() !== ui.Button.OK) return;
  const namaToko = namaTokoResp.getResponseText().trim();

  const expiredResp = ui.prompt('Generate Lisensi', 'Tanggal Expired (YYYY-MM-DD):\nContoh: 2027-05-18', ui.ButtonSet.OK_CANCEL);
  if (expiredResp.getSelectedButton() !== ui.Button.OK) return;
  const expiredDate = expiredResp.getResponseText().trim();

  const hash    = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, machineId + expiredDate + SECRET_TOKEN);
  const hashStr = hash.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').toUpperCase().slice(0, 8);
  const rand    = Math.random().toString(36).substring(2, 6).toUpperCase();
  const licenseKey = `LIC-${hashStr.slice(0,4)}-${hashStr.slice(4,8)}-${rand}`;

  const rows = sheet.getDataRange().getValues();
  let found  = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === machineId) {
      sheet.getRange(i+1, 1, 1, 7).setValues([[machineId, namaToko, rows[i][2], licenseKey, new Date(), expiredDate, 'ACTIVE']]);
      found = true;
      break;
    }
  }
  if (!found) sheet.appendRow([machineId, namaToko, '', licenseKey, new Date(), expiredDate, 'ACTIVE']);

  ui.alert(`✅ Lisensi Berhasil Dibuat!\n\nMachine ID : ${machineId}\nLicense Key: ${licenseKey}\nExpired    : ${expiredDate}\n\nSalin License Key dan kirimkan ke client.`);
}

function sendBroadcastMessage() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Broadcasts');
  const ui    = SpreadsheetApp.getUi();

  const targetResp  = ui.prompt('Broadcast', 'Target (ALL atau Machine ID):', ui.ButtonSet.OK_CANCEL);
  if (targetResp.getSelectedButton()  !== ui.Button.OK) return;
  const messageResp = ui.prompt('Broadcast', 'Isi Pesan:', ui.ButtonSet.OK_CANCEL);
  if (messageResp.getSelectedButton() !== ui.Button.OK) return;
  const tipeResp    = ui.prompt('Broadcast', 'Tipe (INFO/WARNING/DANGER/SUCCESS):', ui.ButtonSet.OK_CANCEL);
  if (tipeResp.getSelectedButton()    !== ui.Button.OK) return;
  const jadwalResp  = ui.prompt('Broadcast', 'Jadwal (kosong = segera)\nFormat: YYYY-MM-DD HH:MM', ui.ButtonSet.OK_CANCEL);
  if (jadwalResp.getSelectedButton()  !== ui.Button.OK) return;

  const lastId = sheet.getLastRow() <= 1 ? 0 : Number(sheet.getRange(sheet.getLastRow(), 1).getValue() || 0);
  sheet.appendRow([lastId + 1, targetResp.getResponseText().trim() || 'ALL', messageResp.getResponseText().trim(),
    (tipeResp.getResponseText().trim() || 'INFO').toUpperCase(), jadwalResp.getResponseText().trim(), true]);

  ui.alert('✅ Pesan broadcast berhasil ditambahkan!');
}
