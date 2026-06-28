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
    'Status',
    'Sisa Hari',
    'Harga Dasar',
    'Tagihan Unik'
  ]);

  // Styling header premium
  sheet.getRange(1, 1, 1, 13)
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
    'ACTIVE',
    '=IF(ISBLANK(I2); ""; I2 - TODAY())',
    350000,
    350123
  ]);

  SpreadsheetApp.getUi().alert(
    '✅ Setup berhasil!\n\nTab "Clients" telah dibuat dengan kolom Sisa Hari.\n' +
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
  // Jika ini adalah request get_renewal_info dari aplikasi klien (PC Biliar)
  if (e && e.parameter && e.parameter.action === 'get_renewal_info') {
    var machineId = e.parameter.machineId;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Clients");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, message: 'Sheet Clients tidak ditemukan.' 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    var data = sheet.getDataRange().getValues();
    
    var nominalTagihan = null;
    for (var i = 1; i < data.length; i++) {
      if (data[i][3] === machineId) { // Kolom 4 (Index 3) = Machine ID
        nominalTagihan = data[i][12]; // Kolom 13 (Index 12) = Tagihan Unik
        break;
      }
    }
    
    if (nominalTagihan) {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true, 
        renewalPrice: parseInt(nominalTagihan) 
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        message: 'Tagihan untuk cabang ini belum diatur.' 
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Jika ini adalah request browser biasa (UI Dashboard)
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

    const nextRow = sheet.getLastRow() + 1;
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
      'ACTIVE',
      `=IF(ISBLANK(I${nextRow}); ""; I${nextRow} - TODAY())`,
      data.hargaDasar    || '',
      data.tagihanUnik   || ''
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

// ═══════════════════════════════════════════════
//  AMBIL ALERTS CABANG EXPIRED/MAU EXPIRED (<= 14 HARI)
// ═══════════════════════════════════════════════
function getExpiryAlerts() {
  try {
    const clients = getClientsData();
    return clients.filter(c => {
      const sisaHari = parseInt(c['Sisa Hari']);
      return !isNaN(sisaHari) && sisaHari <= 14;
    });
  } catch (e) {
    return [];
  }
}

// ═══════════════════════════════════════════════
//  REMOTE ACTION: Kirim Broadcast Reminder Lisensi ke Semua Cabang Mau Expired
// ═══════════════════════════════════════════════
function broadcastExpiryReminders() {
  try {
    const clients = getClientsData();
    let sentCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < clients.length; i++) {
      const c = clients[i];
      const sisaHari = parseInt(c['Sisa Hari']);
      if (!isNaN(sisaHari) && sisaHari <= 14) {
        const gasUrl = c['GAS Webapp URL'];
        const gasSecret = c['GAS Secret'];
        if (gasUrl && gasSecret) {
          const pesan = `⚠️ PERINGATAN LISENSI: Masa aktif lisensi software Anda akan berakhir dalam ${sisaHari} hari (${c['Tgl Expired']}). Silakan hubungi Admin VOC Pusat untuk memperpanjang lisensi Anda.`;
          const res = remoteKirimToast(gasUrl, gasSecret, pesan, 'WARNING', '');
          if (res.success) {
            sentCount++;
          } else {
            failCount++;
            errors.push(`${c['Nama Lokasi']}: ${res.message}`);
          }
        }
      }
    }

    return {
      success: true,
      message: `Berhasil mengirim reminder ke ${sentCount} cabang.${failCount > 0 ? ` Gagal pada ${failCount} cabang. Detail: ${errors.join(', ')}` : ''}`
    };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ═══════════════════════════════════════════════
//  MASS TOKEN ROTATION (OTA UPDATE KE CABANG-CABANG)
// ═══════════════════════════════════════════════
function executeMassTokenRotation(oldToken, newToken) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Clients");
    if (!sheet) return { success: false, error: "Sheet Clients tidak ditemukan." };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const webhookColIdx = headers.indexOf("GAS Webapp URL"); 
    const tokenColIdx = headers.indexOf("GAS Secret");
    
    if (webhookColIdx === -1 || tokenColIdx === -1) {
      return { success: false, error: "Kolom GAS Webapp URL atau GAS Secret tidak ditemukan." };
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i < data.length; i++) {
      const url = data[i][webhookColIdx];
      const currentToken = data[i][tokenColIdx];
      if (!url) continue;

      // Hanya jalankan jika token cabang saat ini sama dengan oldToken
      if (currentToken !== oldToken) {
        continue; 
      }

      try {
        const options = {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({
            type: 'UPDATE_SECRET_TOKEN',
            secret: currentToken,
            newSecret: newToken
          }),
          muteHttpExceptions: true
        };
        
        const response = UrlFetchApp.fetch(url, options);
        if (response.getResponseCode() === 200) {
          const result = JSON.parse(response.getContentText());
          if (result.success) {
            sheet.getRange(i + 1, tokenColIdx + 1).setValue(newToken);
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      } catch (e) {
        failCount++;
      }
    }
    
    return { success: true, countSuccess: successCount, countFail: failCount };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ═══════════════════════════════════════════════
//  WEBHOOK: MENERIMA NOTIFIKASI TRANSFER MOOTA
// ═══════════════════════════════════════════════
function doPost(e) {
  try {
    // Moota biasanya mengirim data dalam bentuk JSON POST Body
    var postData = JSON.parse(e.postData.contents);
    
    // Asumsi webhook moota mengirim array of mutasi
    if (Array.isArray(postData)) {
      postData.forEach(function(mutasi) {
        var tipe = mutasi.type; // "CR" (Credit/Uang Masuk) atau "DB"
        var amount = parseInt(mutasi.amount);
        
        if (tipe === "CR") {
          prosesPembayaranMasuk(amount);
        }
      });
    }
    
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString());
  }
}

function prosesPembayaranMasuk(amount) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Clients");
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    var tagihanUnikCabang = parseInt(data[i][12]); // Kolom ke-13 (Index 12) = Tagihan Unik
    
    // Jika mutasi uang yang masuk COCOK dengan Tagihan Unik milik suatu cabang
    if (tagihanUnikCabang === amount) {
      // 1. Ubah Status menjadi ACTIVE (Kolom ke-10)
      sheet.getRange(i + 1, 10).setValue("ACTIVE");
      
      // 2. Tambah Masa Aktif Lisensi 30 Hari (Kolom ke-9)
      var currentExpDate = new Date(data[i][8]);
      if (isNaN(currentExpDate.getTime())) currentExpDate = new Date();
      currentExpDate.setDate(currentExpDate.getDate() + 30);
      
      var formattedDate = currentExpDate.toISOString().split('T')[0];
      sheet.getRange(i + 1, 9).setValue(formattedDate);
      
      // 3. Tembak webhook/API ke PC Lokal Cabang agar PC otomatis buka kunci
      var gasUrl = data[i][1];
      var gasSecret = data[i][2];
      var machineId = data[i][3];
      var licKey = data[i][7];
      remotePerpanjang(gasUrl, gasSecret, machineId, licKey, formattedDate, data[i][0]);
      
      // Pembayaran sudah diproses untuk cabang ini, keluar dari loop
      break; 
    }
  }
}

// Update Field Generic dari Frontend
function updateClientField(idx, colIndex, newValue) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Clients');
    if (!sheet) return { success: false, message: 'Sheet Clients tidak ditemukan' };
    
    var rowIndex = parseInt(idx) + 2;
    sheet.getRange(rowIndex, colIndex).setValue(newValue);
    
    return { success: true };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}
