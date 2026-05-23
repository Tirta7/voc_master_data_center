function doGet() {
  return HtmlService.createHtmlOutputFromFile('gas_license_ui')
    .setTitle('VOC License CRM')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var clientsSheet = ss.getSheetByName('Clients');
  if (!clientsSheet) {
    clientsSheet = ss.insertSheet('Clients');
    clientsSheet.appendRow(['ID', 'Nama Tempat', 'Nama Pemilik', 'Alamat', 'Nomor WA', 'Tanggal Pemasangan', 'Tanggal Maintenance', 'Teknisi', 'MAC Address', 'Secret Salt', 'Timestamp']);
  }
  
  var licensesSheet = ss.getSheetByName('Licenses');
  if (!licensesSheet) {
    licensesSheet = ss.insertSheet('Licenses');
    licensesSheet.appendRow(['ID Lisensi', 'Client ID', 'Nama Tempat', 'MAC Address', 'Tanggal Expired', 'Serial Number', 'Timestamp']);
  }
  return { clients: clientsSheet, licenses: licensesSheet };
}

function saveClient(data) {
  try {
    var sheets = initSheets();
    var id = 'CL-' + new Date().getTime();
    var row = [
      id,
      data.namaTempat || '',
      data.namaPemilik || '',
      data.alamat || '',
      data.wa || '',
      data.tglPemasangan || '',
      data.tglMaintenance || '',
      data.teknisi || '',
      (data.mac || '').toUpperCase(),
      data.salt || 'VOC_SECRET_SALT',
      new Date()
    ];
    sheets.clients.appendRow(row);
    return { success: true, message: 'Klien berhasil didaftarkan!' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getClients() {
  try {
    var sheets = initSheets();
    var data = sheets.clients.getDataRange().getDisplayValues();
    if (data.length <= 1) return [];
    var headers = data[0];
    var clients = [];
    for (var i = 1; i < data.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = data[i][j];
      }
      clients.push(obj);
    }
    return clients.reverse();
  } catch (e) {
    return [];
  }
}

// Alias untuk kompatibilitas dengan deployment lama yang masih memanggil getClientsData
function getClientsData() {
  return getClients();
}

function getLicenses() {
  try {
    var sheets = initSheets();
    var data = sheets.licenses.getDataRange().getDisplayValues();
    if (data.length <= 1) return [];
    var headers = data[0];
    var licenses = [];
    for (var i = 1; i < data.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = data[i][j];
      }
      licenses.push(obj);
    }
    return licenses.reverse();
  } catch (e) {
    return [];
  }
}

function generateAndSaveLicense(clientId, namaTempat, mac, salt, dateInput) {
  try {
    var dateStr = dateInput.replace(/-/g, ''); // YYYYMMDD
    var dataToHash = salt + mac.toUpperCase() + dateStr;
    
    var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, dataToHash);
    var hash = signature.map(function(byte) {
      var v = (byte < 0) ? 256 + byte : byte;
      return ('0' + v.toString(16)).slice(-2);
    }).join('');
    var shortHash = hash.substring(0, 8).toUpperCase();
    var serialNumber = dateStr + '-' + shortHash;
    
    var sheets = initSheets();
    var licId = 'LIC-' + new Date().getTime();
    sheets.licenses.appendRow([
      licId,
      clientId,
      namaTempat,
      mac.toUpperCase(),
      dateInput,
      serialNumber,
      new Date()
    ]);
    
    return { success: true, serialNumber: serialNumber };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}
