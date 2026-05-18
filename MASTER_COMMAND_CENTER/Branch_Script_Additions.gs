// =====================================================================================
//  VOC BILLIARD - BRANCH INTEGRATION ADDITIONS
//  Tambahkan fungsi-fungsi berikut pada Google Apps Script di SETIAP Spreadsheet CABANG
//  agar merespon instruksi remote (Toast & Kunci Lisensi) dari Dashboard Master Anda.
// =====================================================================================


// ═══════════════════════════════════════════════
//  1. TAMBAHKAN KONDISI INI PADA FUNGSI doPost(e) CABANG
// ═══════════════════════════════════════════════
/*
  Copy dan letakkan blok kode ini di bagian teratas fungsi doPost(e) cabang Anda:
*/

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);

  // A. DITERIMA DARI MASTER DASHBOARD: Tambah Broadcast Toast Baru secara Instan
  if (payload.type === 'ADD_BROADCAST_FROM_MASTER') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Broadcasts');
    if (!sheet) return ContentService.createTextOutput("ERROR: Tab Broadcasts tidak ditemukan di cabang ini");
    
    const lastId = sheet.getLastRow() <= 1 ? 0 : Number(sheet.getRange(sheet.getLastRow(), 1).getValue() || 0);
    sheet.appendRow([
      lastId + 1,
      payload.target || 'ALL',
      payload.pesan,
      payload.tipe || 'WARNING',
      payload.jadwal || '',
      true // Aktif langsung
    ]);
    return ContentService.createTextOutput("BERHASIL: Toast berhasil ditambahkan ke antrian cabang!");
  }

  // B. DITERIMA DARI MASTER DASHBOARD: Update/Kunci Lisensi Cabang Jarak Jauh
  if (payload.type === 'UPDATE_LICENSE_FROM_MASTER') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Licenses');
    if (!sheet) return ContentService.createTextOutput("ERROR: Tab Licenses tidak ditemukan di cabang ini");
    
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
    return ContentService.createTextOutput("BERHASIL: Lisensi cabang berhasil disinkronkan dari Master!");
  }

  // ... (Sisa kode doPost bawaan Anda untuk Sync Data harian, Approval Request, dll. biarkan tetap ada di bawahnya)
}


// ═══════════════════════════════════════════════
//  2. PERBARUI FUNGSI getDashboardData() CABANG
// ═══════════════════════════════════════════════
/*
  Ganti fungsi getDashboardData() bawaan di Apps Script Cabang Anda dengan versi ini
  agar Dashboard Owner Online juga bisa menampilkan Toast yang sedang dikirim dari Master.
*/

function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Ambil pesan broadcast/toast yang sedang aktif saat ini
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
    broadcasts: broadcasts // Data broadcast aktif diikutkan agar dirender di dashboard owner online
  };
}
