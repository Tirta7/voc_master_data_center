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
      
      // CLEANUP: Remove all existing FULL_REPORT_JSON markers to prevent Frontend finding stale data
      const values = sheet.getDataRange().getValues();
      for (let i = values.length - 1; i >= 0; i--) {
        if (values[i][0] === 'FULL_REPORT_JSON') {
          sheet.deleteRow(i + 1);
        }
      }
      
      // Log history
      sheet.appendRow([new Date(), JSON.stringify(data.report)]);
      
      // Authoritative LATEST entry
      sheet.appendRow(['FULL_REPORT_JSON', JSON.stringify(data.report)]);
    }

    // 2. Sync Inventory (Batch Optimized)
    if (data.allIngredients) {
      const stockSheet = ensureSheet('Stock', ['ID', 'Name', 'Stock', 'Unit', 'Min Level', 'Category', 'Department']);
      const rows = [['ID', 'Name', 'Stock', 'Unit', 'Min Level', 'Category', 'Department']];
      data.allIngredients.forEach(item => {
        rows.push([
          item.id, 
          item.name, 
          parseFloat(item.stockQuantity) || 0, 
          item.unit, 
          parseFloat(item.minStockLevel) || 0,
          item.category || 'General',
          item.department || 'CASHIER'
        ]);
      });
      stockSheet.clearContents();
      stockSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }

    // 3. Sync Menu Ranking (Batch Optimized)
    if (data.menuRanking) {
      const menuSheet = ensureSheet('MenuRanking', ['ID', 'Name', 'Category', 'Price', 'Qty', 'Revenue']);
      const rows = [['ID', 'Name', 'Category', 'Price', 'Qty', 'Revenue']];
      data.menuRanking.forEach(item => {
        rows.push([item.id, item.name, item.category, item.price, item.totalQty, item.totalRevenue]);
      });
      menuSheet.clearContents();
      menuSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }

    // 4. Sync Pending Approvals (Batch Optimized)
    if (data.pendingApprovals) {
      const appSheet = ensureSheet('Approvals', ['ID', 'Module', 'Metadata', 'Status', 'Time', 'Requester']);
      const rows = [['ID', 'Module', 'Metadata', 'Status', 'Time', 'Requester']];
      data.pendingApprovals.forEach(app => {
        rows.push([
          app.id, 
          app.moduleType, 
          typeof app.metadata === 'string' ? app.metadata : JSON.stringify(app.metadata), 
          'PENDING', 
          app.createdAt || new Date(), 
          app.requestedBy?.name || 'Staff'
        ]);
      });
      appSheet.clearContents();
      appSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    }
    
    // 5. Sync Shift Audits (Batch Optimized)
    if (data.shiftAudits) {
      const shiftSheet = ensureSheet('ShiftAudits', ['ID', 'Shift', 'Staff', 'StartTime', 'EndTime', 'SystemCash', 'PhysicalCash', 'Diff', 'StockAudit', 'AIAnalysis']);
      const rows = [['ID', 'Shift', 'Staff', 'StartTime', 'EndTime', 'SystemCash', 'PhysicalCash', 'Diff', 'StockAudit', 'AIAnalysis']];
      data.shiftAudits.forEach(s => {
        rows.push([
          s.id,
          s.shiftName,
          s.userName,
          s.startTime,
          s.endTime,
          s.cashSystem,
          s.cashPhysical,
          s.discrepancy,
          JSON.stringify(s.stockReportsGrouped),
          s.aiAnalysis
        ]);
      });
      shiftSheet.clearContents();
      if (rows.length > 1) {
        shiftSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      } else {
        shiftSheet.appendRow(rows[0]);
      }
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
      auditLogs: [],
      shiftAudits: [],
      menuRanking: []
    };

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
      for(let i=1; i<vals.length; i++) {
        result.shiftAudits.push({
          id: vals[i][0],
          shiftName: vals[i][1],
          userName: vals[i][2],
          startTime: vals[i][3],
          endTime: vals[i][4],
          cashSystem: vals[i][5],
          cashPhysical: vals[i][6],
          discrepancy: vals[i][7],
          stockAudit: JSON.parse(vals[i][8] || '{}'),
          aiAnalysis: vals[i][9]
        });
      }
    }

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
