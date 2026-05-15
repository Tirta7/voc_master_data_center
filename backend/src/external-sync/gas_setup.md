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

function doGet(e) {
  const action = e.parameter.action;
  const secret = e.parameter.secret;

  if (secret !== SECRET_TOKEN) {
    return ContentService.createTextOutput("Unauthorized").setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === 'getDecisions') {
    return handleGetDecisions();
  }

  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('VOC Billiard Owner Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
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
  return {
    reports: ss.getSheetByName('Reports').getDataRange().getValues(),
    stock: ss.getSheetByName('Stock').getDataRange().getValues(),
    approvals: ss.getSheetByName('Approvals').getDataRange().getValues().filter(r => r[3] === 'PENDING'),
    auditLogs: ss.getSheetByName('AuditLogs') ? ss.getSheetByName('AuditLogs').getDataRange().getValues().slice(-20).reverse() : []
  };
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
      }).getDashboardData();
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
