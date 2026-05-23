// =====================================================================================
//  VOC BILLIARD - MASTER COMMAND & LICENSE CENTER (Code.gs)
//  Pasang kode INI di editor Apps Script pada Spreadsheet MASTER (pusat).
//  Spreadsheet ini BERBEDA dari spreadsheet cabang.
//  Setelah paste, klik: Jalankan → setupMasterSheet (sekali saja untuk buat tab)
//  Lalu: Deploy → New Deployment → Web App → Anyone → Deploy
// =====================================================================================

const SECRET_TOKEN = 'billiard123'; // Samakan dengan GAS_SECRET di semua .env backend cabang

// ═══════════════════════════════════════════════
//  SETUP: Buat tab Clients di spreadsheet master
// ═══════════════════════════════════════════════
function setupMasterSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Clients');
  if (!sheet) sheet = ss.insertSheet('Clients');

  sheet.clear();
  sheet.appendRow([
    'Nama Lokasi',
    'GAS Webapp URL',
    'GAS Secret',
    'Machine ID',
    'Nama Owner',
    'Alamat Cabang',
    'Tgl Pemasangan',
    'License Key',
    'Tgl Expired',
    'Status'
  ]);

  // Styling header premium
  sheet.getRange(1, 1, 1, 10)
    .setFontWeight('bold')
    .setBackground('#0f172a')
    .setFontColor('#ffffff');

  // Contoh data awal — bisa diedit/dihapus
  sheet.appendRow([
    'Komputer Server',
    'https://script.google.com/macros/s/GANTI_URL_CABANG/exec',
    'billiard123',
    'VOC-2177-C6EC-13BF',
    'SuperAdmin',
    'Jl. Merdeka Raya No. 12',
    '2026-05-18',
    'LIC-REM-031F-R9HM',
    '2026-05-22',
    'ACTIVE'
  ]);

  SpreadsheetApp.getUi().alert(
    '✅ Setup berhasil!\n\nTab "Clients" telah dibuat.\n' +
    'Silakan isi data cabang Anda, lalu Deploy sebagai Web App.'
  );
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎱 Master Command')
    .addItem('⚙️ Setup Awal (Buat Tab Clients)', 'setupMasterSheet')
    .addToUi();
}


// ═══════════════════════════════════════════════
//  HTTP GET — Tampilkan dashboard HTML
// ═══════════════════════════════════════════════
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('VOC Central Command & License Center')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


// ═══════════════════════════════════════════════
//  AMBIL SEMUA DATA CLIENTS (dipanggil dari HTML)
// ═══════════════════════════════════════════════
function getClientsData() {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Clients');
    if (!sheet) return [];

    const rows    = sheet.getDataRange().getDisplayValues();
    const headers = rows[0]; // ['Nama Lokasi', 'GAS Webapp URL', ...]
    const clients = [];

    for (let i = 1; i < rows.length; i++) {
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = rows[i][j];
      }
      clients.push(obj);
    }
    return clients;
  } catch (e) {
    return [];
  }
}


// ═══════════════════════════════════════════════
//  TAMBAH CABANG BARU (dari form HTML)
// ═══════════════════════════════════════════════
function addClient(data) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Clients');
    if (!sheet) return { success: false, message: 'Sheet Clients belum dibuat. Jalankan setupMasterSheet terlebih dahulu.' };

    sheet.appendRow([
      data.namaLokasi    || '',
      data.gasUrl        || '',
      data.gasSecret     || 'billiard123',
      data.machineId     || '',
      data.namaOwner     || '',
      data.alamat        || '',
      data.tglPemasangan || new Date().toISOString().split('T')[0],
      data.licenseKey    || '',
      data.tglExpired    || '',
      'ACTIVE'
    ]);

    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}


// ═══════════════════════════════════════════════
//  UPDATE CLIENT (edit baris berdasarkan Machine ID)
// ═══════════════════════════════════════════════
function updateClient(machineId, field, value) {
  try {
    const ss     = SpreadsheetApp.getActiveSpreadsheet();
    const sheet  = ss.getSheetByName('Clients');
    const rows   = sheet.getDataRange().getValues();
    const headers= rows[0];
    const colIdx = headers.indexOf(field) + 1; // 1-based

    if (colIdx < 1) return { success: false, message: 'Field tidak ditemukan: ' + field };

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][3] === machineId) { // kolom 4 = Machine ID
        sheet.getRange(i + 1, colIdx).setValue(value);
        return { success: true };
      }
    }
    return { success: false, message: 'Machine ID tidak ditemukan.' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}


// ═══════════════════════════════════════════════
//  REMOTE ACTION: Kirim Toast ke Cabang
// ═══════════════════════════════════════════════
function remoteKirimToast(gasUrl, gasSecret, pesan, tipe, jadwal) {
  try {
    // Jika pesan adalah '__CLEAR__', kirim perintah hapus semua broadcast
    const isClear = (pesan === '__CLEAR__');
    const payload = isClear
      ? { secret: gasSecret, type: 'CLEAR_BROADCASTS' }
      : {
          secret: gasSecret,
          type:   'ADD_BROADCAST_FROM_MASTER',
          target: 'ALL',
          pesan:  pesan,
          tipe:   tipe  || 'WARNING',
          jadwal: jadwal || ''
        };

    const resp = UrlFetchApp.fetch(gasUrl, {
      method:      'post',
      contentType: 'application/json',
      payload:     JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const code = resp.getResponseCode();
    const body = resp.getContentText();

    if (code === 200) {
      return { success: true, message: body };
    } else {
      return { success: false, message: `HTTP ${code}: ${body}` };
    }
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}


// ═══════════════════════════════════════════════
//  REMOTE ACTION: Kunci / Blokir PC Cabang
// ═══════════════════════════════════════════════
function remoteKunciPC(gasUrl, gasSecret, machineId, licenseKey, action) {
  // action: 'BLOCK' atau 'UNBLOCK'
  try {
    const payload = {
      secret:     gasSecret,
      type:       'UPDATE_LICENSE_FROM_MASTER',
      machineId:  machineId,
      licenseKey: licenseKey,
      expiredDate:'2000-01-01', // tanggal jauh di masa lalu = sudah expired
      status:     action === 'BLOCK' ? 'BLOCKED' : 'ACTIVE'
    };

    // Jika UNBLOCK, ambil expiredDate asli dari sheet
    if (action === 'UNBLOCK') {
      const ss     = SpreadsheetApp.getActiveSpreadsheet();
      const sheet  = ss.getSheetByName('Clients');
      const rows   = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][3] === machineId) {
          payload.expiredDate = rows[i][8]; // kolom 9 = Tgl Expired
          break;
        }
      }
    }

    const resp = UrlFetchApp.fetch(gasUrl, {
      method:      'post',
      contentType: 'application/json',
      payload:     JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (resp.getResponseCode() === 200) {
      // Update status di sheet master juga
      updateClient(machineId, 'Status', action === 'BLOCK' ? 'BLOCKED' : 'ACTIVE');
      return { success: true };
    }
    return { success: false, message: resp.getContentText() };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}


// ═══════════════════════════════════════════════
//  REMOTE ACTION: Perpanjang Lisensi Cabang
// ═══════════════════════════════════════════════
function remotePerpanjang(gasUrl, gasSecret, machineId, licenseKey, tglExpiredBaru, storeName) {
  try {
    const payload = {
      secret:      gasSecret,
      type:        'UPDATE_LICENSE_FROM_MASTER',
      machineId:   machineId,
      licenseKey:  licenseKey,
      expiredDate: tglExpiredBaru,
      storeName:   storeName || '',
      status:      'ACTIVE'
    };

    const resp = UrlFetchApp.fetch(gasUrl, {
      method:      'post',
      contentType: 'application/json',
      payload:     JSON.stringify(payload),
      muteHttpExceptions: true
    });

  if (resp.getResponseCode() === 200) {
      // Update di sheet master juga
      updateClient(machineId, 'Tgl Expired', tglExpiredBaru);
      updateClient(machineId, 'Status', 'ACTIVE');
      return { success: true };
    }
    return { success: false, message: resp.getContentText() };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}


// ═══════════════════════════════════════════════
//  REMOTE ACTION: Ubah Password Owner Portal Cabang
// ═══════════════════════════════════════════════
function remoteUbahPassword(gasUrl, gasSecret, newPassword) {
  try {
    if (!newPassword || newPassword.length < 4) {
      return { success: false, message: 'Password minimal 4 karakter' };
    }

    const payload = {
      secret:      gasSecret,
      type:        'UPDATE_OWNER_PASSWORD',
      newPassword: newPassword
    };

    const resp = UrlFetchApp.fetch(gasUrl, {
      method:      'post',
      contentType: 'application/json',
      payload:     JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (resp.getResponseCode() === 200) {
      const result = JSON.parse(resp.getContentText());
      return result.success
        ? { success: true }
        : { success: false, message: result.message || 'Gagal di sisi cabang' };
    }
    return { success: false, message: 'HTTP ' + resp.getResponseCode() + ': ' + resp.getContentText() };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
