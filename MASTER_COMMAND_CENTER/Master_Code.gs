// =====================================================================================
//  VOC BILLIARD - MASTER COMMAND & LICENSE CENTER SCRIPT (Code.gs)
//  Pasang kode ini di editor Apps Script pada Spreadsheet Central Master Owner Anda
// =====================================================================================

const SECRET_TOKEN = "billiard123"; // Ganti dengan secret key yang Anda inginkan (samakan dengan GAS_SECRET di .env backend cabang)

// ═══════════════════════════════════════════════
//  SETUP TAB DATABASE MASTER CLIENT
// ═══════════════════════════════════════════════
function setupMasterSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Clients');
  if (!sheet) {
    sheet = ss.insertSheet('Clients');
  }
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
  
  // Styling Header Premium (Navy slate background, white text, bold)
  sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
  
  // Contoh data awal (bisa Anda edit/hapus nanti)
  sheet.appendRow([
    'Lokasi A - Jakarta', 
    'https://script.google.com/macros/s/xxxx/exec', 
    'billiard123', 
    'VOC-2177-C6EC-13BF', 
    'Pak Budi', 
    'Jl. Merdeka Raya No. 12', 
    '2026-05-18', 
    'LIC-ABCD-EFGH-IJKL', 
    '2027-05-18', 
    'ACTIVE'
  ]);
  
  // Hapus Sheet1 bawaan spreadsheet jika masih ada agar bersih
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet) ss.deleteSheet(defaultSheet);
  
  SpreadsheetApp.getUi().alert('Setup Selesai! Tab database cabang "Clients" berhasil dibuat.');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎱 VOC Master Center')
    .addItem('⚙️ Setup Awal Database Client', 'setupMasterSheet')
    .addToUi();
}

// ═══════════════════════════════════════════════
//  WEB VIEW HANDLERS & FETCHERS
// ═══════════════════════════════════════════════
function doGet(e) {
  try {
    return HtmlService.createHtmlOutputFromFile('Master_Index')
      .setTitle('VOC Master Command Center')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    // Fallback jika user membuat file HTML dengan nama 'index'
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('VOC Master Command Center')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
}

function getClientsData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Clients');
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  const clients = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue;
    const tz = Session.getScriptTimeZone();
    clients.push({
      index: i + 1,
      namaLokasi: row[0],
      webappUrl: row[1],
      secret: row[2],
      machineId: row[3],
      owner: row[4],
      alamat: row[5],
      tglPasang: row[6] ? Utilities.formatDate(new Date(row[6]), tz, 'yyyy-MM-dd') : '',
      licenseKey: row[7],
      tglExpired: row[8] ? Utilities.formatDate(new Date(row[8]), tz, 'yyyy-MM-dd') : '',
      status: row[9]
    });
  }
  return clients;
}

// ═══════════════════════════════════════════════
//  API BROADCAST INSTAN KE CLIENT SECARA REMOTE
// ═══════════════════════════════════════════════
function sendRemoteBroadcast(clientIndex, message, tipe, jadwal) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Clients');
  const webappUrl = sheet.getRange(clientIndex, 2).getValue();
  const secret = sheet.getRange(clientIndex, 3).getValue();
  const machineId = sheet.getRange(clientIndex, 4).getValue();

  if (!webappUrl) return "ERROR: URL Web App untuk cabang ini belum diset!";

  const payload = {
    secret: secret,
    type: 'ADD_BROADCAST_FROM_MASTER',
    target: machineId,
    pesan: message,
    tipe: tipe || 'WARNING',
    jadwal: jadwal || ''
  };

  try {
    const response = UrlFetchApp.fetch(webappUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    return "SUKSES: " + response.getContentText();
  } catch (err) {
    return "ERROR KONEKSI: " + err.toString();
  }
}

// ═══════════════════════════════════════════════
//  API NONAKTIFKAN SEMUA TOAST DI CABANG (REMOTE)
// ═══════════════════════════════════════════════
function sendClearBroadcasts(clientIndex) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName('Clients');
  const webappUrl = sheet.getRange(clientIndex, 2).getValue();
  const secret    = sheet.getRange(clientIndex, 3).getValue();

  if (!webappUrl) return "ERROR: URL Web App belum diset!";

  const payload = {
    secret: secret,
    type: 'CLEAR_BROADCASTS'
  };

  try {
    const response = UrlFetchApp.fetch(webappUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    return "SUKSES: " + response.getContentText();
  } catch (err) {
    return "ERROR KONEKSI: " + err.toString();
  }
}

// ═══════════════════════════════════════════════
//  API UPDATE/KUNCI LISENSI REMOTELY KE CLIENT
// ═══════════════════════════════════════════════
function sendRemoteLicenseUpdate(clientIndex, licenseKey, expiredDate, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Clients');
  
  // 1. Update di database lokal master kita dulu
  sheet.getRange(clientIndex, 8).setValue(licenseKey);
  sheet.getRange(clientIndex, 9).setValue(expiredDate);
  sheet.getRange(clientIndex, 10).setValue(status);

  // 2. Hubungi spreadsheet cabang secara remote untuk sinkronisasi lisensi di sana
  const webappUrl = sheet.getRange(clientIndex, 2).getValue();
  const secret = sheet.getRange(clientIndex, 3).getValue();
  const machineId = sheet.getRange(clientIndex, 4).getValue();
  const storeName = sheet.getRange(clientIndex, 1).getValue();

  if (!webappUrl) return "ERROR: URL Web App untuk cabang ini belum diset!";

  const payload = {
    secret: secret,
    type: 'UPDATE_LICENSE_FROM_MASTER',
    machineId: machineId,
    storeName: storeName,
    licenseKey: licenseKey,
    expiredDate: expiredDate,
    status: status
  };

  try {
    const response = UrlFetchApp.fetch(webappUrl, {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    return "SUKSES UPDATE CABANG: " + response.getContentText();
  } catch (err) {
    return "ERROR UPDATE CABANG: " + err.toString();
  }
}

// ═══════════════════════════════════════════════
//  API REGISTER DATA CABANG BARU SECARA WEB FORM
// ═══════════════════════════════════════════════
function addNewClient(clientData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Clients');
  if (!sheet) {
    setupMasterSheet();
    sheet = ss.getSheetByName('Clients');
  }
  
  // Hitung Tanggal Pemasangan & Expired
  const now = new Date();
  const tglPasang = now.toISOString().split('T')[0];
  
  const days = parseInt(clientData.initialDays) || 365;
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + days);
  const tglExpired = expDate.toISOString().split('T')[0];
  
  // Generate License Key acak
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  const licenseKey = `LIC-REM-${rand.slice(0,4)}-${rand.slice(4,8)}`;
  
  const rowData = [
    clientData.namaLokasi,
    clientData.webappUrl,
    clientData.secret || 'billiard123',
    clientData.machineId,
    clientData.owner || '-',
    clientData.alamat || '-',
    tglPasang,
    licenseKey,
    tglExpired,
    'ACTIVE'
  ];
  
  sheet.appendRow(rowData);
  return "SUKSES: Cabang baru '" + clientData.namaLokasi + "' berhasil didaftarkan dengan lisensi aktif " + days + " hari!";
}
