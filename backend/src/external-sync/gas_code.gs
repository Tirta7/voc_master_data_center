const SECRET_TOKEN = "billiard123";

function doGet(e) {
  // Mode fetch_decisions digunakan oleh backend untuk mengambil keputusan owner
  if (e.parameter.mode === 'fetch_decisions') {
    if (e.parameter.secret !== SECRET_TOKEN) return ContentService.createTextOutput("Unauthorized");
    
    const sheet = ensureSheet('Decisions', ['RequestID', 'Action', 'Note', 'Processed']);
    const values = sheet.getDataRange().getValues();
    const decisions = [];
    
    // Mulai dari baris 1 (lewati header)
    for (let i = 1; i < values.length; i++) {
      if (values[i][3] === false) { // Jika Processed == false
        decisions.push({
          row: i + 1,
          requestId: values[i][0],
          action: values[i][1],
          note: values[i][2]
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(decisions))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('VOC Billiard Owner Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.secret !== SECRET_TOKEN) return ContentService.createTextOutput("Unauthorized");

    if (payload.type === 'SYNC_DATA') {
      handleSyncData(payload.data);
    } else if (payload.type === 'APPROVAL_REQUEST') {
      handleApprovalRequest(payload.data);
    } else if (payload.type === 'AUDIT_LOG') {
      handleAuditLog(payload.data);
    } else if (payload.type === 'MARK_PROCESSED') {
      handleMarkProcessed(payload.requestId);
    }

    return ContentService.createTextOutput("Success");
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message);
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

function handleSyncData(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Tunggu maksimal 30 detik

    // 1. Sync Summary Report
    if (data.report) {
      const sheet = ensureSheet('Reports', ['Date', 'Payload']);
      // Simpan JSON mentah untuk diproses di Frontend GAS
      sheet.appendRow([new Date(), JSON.stringify(data.report)]);
      
      // Simpan "FULL_REPORT_JSON" di baris khusus untuk kemudahan fetch terbaru
      const lastRow = sheet.getLastRow();
      sheet.appendRow(['FULL_REPORT_JSON', JSON.stringify(data.report)]);
    }

    // 2. Sync Inventory
    if (data.allIngredients) {
      const stockSheet = ensureSheet('Stock', ['ID', 'Name', 'Stock', 'Unit', 'Min Level']);
      stockSheet.clear();
      SpreadsheetApp.flush();
      stockSheet.appendRow(['ID', 'Name', 'Stock', 'Unit', 'Min Level']);
      data.allIngredients.forEach(item => {
        const qty = parseFloat(item.stockQuantity) || 0;
        const min = parseFloat(item.minStockLevel) || 0;
        stockSheet.appendRow([item.id, item.name, qty, item.unit, min]);
      });
    }

    // 3. Sync Menu Ranking
    if (data.menuRanking) {
      const menuSheet = ensureSheet('MenuRanking', ['ID', 'Name', 'Category', 'Price', 'Qty', 'Revenue']);
      menuSheet.clear();
      SpreadsheetApp.flush();
      menuSheet.appendRow(['ID', 'Name', 'Category', 'Price', 'Qty', 'Revenue']);
      data.menuRanking.forEach(item => {
        menuSheet.appendRow([item.id, item.name, item.category, item.price, item.totalQty, item.totalRevenue]);
      });
    }

    SpreadsheetApp.flush();
  } catch (e) {
    console.error("Sync error: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

function handleApprovalRequest(data) {
  const sheet = ensureSheet('Approvals', ['ID', 'Module', 'Metadata', 'Status', 'Time', 'Requester']);
  sheet.appendRow([data.id, data.moduleType, JSON.stringify(data.metadata), data.status, new Date(), data.requestedBy?.name || 'Staff']);
}

function handleAuditLog(data) {
  const sheet = ensureSheet('AuditLogs', ['ID', 'Action', 'User', 'Details', 'Table', 'Invoice', 'Time']);
  sheet.appendRow([data.id, data.action, data.user, data.details, data.tableId, data.invoiceNumber, new Date()]);
}

function submitCommand(action, payload) {
  const sheet = ensureSheet('Decisions', ['RequestID', 'Action', 'Note', 'Processed']);
  sheet.appendRow([Date.now(), action, JSON.stringify(payload), false]);
  return "OK";
}

function submitDecision(requestId, action, note) {
  const sheet = ensureSheet('Decisions', ['RequestID', 'Action', 'Note', 'Processed']);
  sheet.appendRow([requestId, action, note, false]);
  return "OK";
}

function handleMarkProcessed(requestId) {
  const sheet = ensureSheet('Decisions', ['RequestID', 'Action', 'Note', 'Processed']);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] == requestId && values[i][3] === false) {
      sheet.getRange(i + 1, 4).setValue(true);
      break;
    }
  }
}

function getDashboardData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = {
      reports: [],
      stock: [],
      approvals: [],
      audit: [],
      menuRanking: []
    };

    const reportSheet = ss.getSheetByName('Reports');
    if (reportSheet) result.reports = reportSheet.getDataRange().getValues();

    const stockSheet = ss.getSheetByName('Stock');
    if (stockSheet) result.stock = stockSheet.getDataRange().getValues();

    const appSheet = ss.getSheetByName('Approvals');
    if (appSheet) result.approvals = appSheet.getDataRange().getValues().filter(row => row[3] === 'PENDING');

    const auditSheet = ss.getSheetByName('AuditLogs');
    if (auditSheet) result.auditLogs = auditSheet.getDataRange().getValues().slice(-20);

    const menuSheet = ss.getSheetByName('MenuRanking');
    if (menuSheet) {
      const vals = menuSheet.getDataRange().getValues();
      for(let i=1; i<vals.length; i++) {
        result.menuRanking.push({
          id: vals[i][0],
          name: vals[i][1],
          category: vals[i][2],
          price: vals[i][3],
          totalQty: vals[i][4],
          totalRevenue: vals[i][5]
        });
      }
    }

    return JSON.stringify(result);
  } catch (e) {
    return JSON.stringify({ error: e.message });
  }
}
