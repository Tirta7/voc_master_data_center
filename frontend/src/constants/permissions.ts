export const PERMISSION_GROUPS = [
    {
        label: 'Dashboard & Analytics',
        permissions: [
            { id: 'DASHBOARD_STATS_VIEW', label: 'Lihat Angka Statistik (Total Rev, Omzet)' },
            { id: 'DASHBOARD_CHART_VIEW', label: 'Lihat Grafik Pendapatan & Tren' },
            { id: 'DASHBOARD_TABLE', label: 'Lihat Status Meja di Dashboard' },
        ]
    },
    {
        label: 'Antrean & Waiting List',
        permissions: [
            { id: 'WAITING_LIST_VIEW', label: 'Lihat Daftar Antrean Side-Bar' },
            { id: 'WAITING_LIST_MANAGE', label: 'Kelola Antrean (Tambah/SIKAT!/Hapus)' },
        ]
    },
    {
        label: 'Membership & CRM',
        permissions: [
            { id: 'MEMBER_VIEW', label: 'Akses Halaman Data Membership' },
            { id: 'MEMBER_MANAGE', label: 'Tambah/Edit/Hapus Member & Tier' },
            { id: 'MEMBER_TOPUP', label: 'Fitur Topup Saldo E-Wallet Member' },
            { id: 'CUSTOMER_FEEDBACK', label: 'Akses Feedback & Keluhan Pelanggan' },
        ]
    },
    {
        label: 'Billing & POS Billiard',
        permissions: [
            { id: 'BILLIARD_VIEW', label: 'Akses Halaman Billing Billiard' },
            { id: 'BILLIARD_CARD_VIEW', label: 'Lihat Kartu Meja Billiard' },
            { id: 'BILLIARD_START', label: 'Buka Sesi Meja (Mulai)' },
            { id: 'BILLIARD_EXTEND', label: 'Tambah Durasi / Perpanjang Sesi' },
            { id: 'BILLIARD_STOP', label: 'Stop Sesi (Checkout Sementara)' },
            { id: 'BILLIARD_PAY', label: 'Sinkronisasi & Proses Bayar (Final)' },
            { id: 'BILLIARD_MOVE', label: 'Pindah Sesi ke Meja Lain' },
            { id: 'BILLIARD_LIGHT', label: 'Kontrol Manual Lampu Meja' },
            { id: 'BILLIARD_ORDER', label: 'Tambah Pesan Makan/Minum ke Meja' },
            { id: 'BILLIARD_CANCEL_ITEM', label: 'Batalkan Item Pesanan F&B Meja' },
            { id: 'BILLIARD_PREVIEW', label: 'Lihat Preview Nota Sementara' },
            { id: 'BILLIARD_PRICING', label: 'Kelola Harga & Tarif Billiard' },
            { id: 'BILLIARD_SWITCH', label: 'Switch Paket / Member Sesi Aktif' },
            { id: 'BILLIARD_MANAGE_TABLES', label: 'Manajemen Data Meja Billiard' },
        ]
    },
    {
        label: 'Cafe POS (Meja Cafe)',
        permissions: [
            { id: 'CAFE_VIEW', label: 'Akses Dashboard & Daftar Meja Cafe' },
            { id: 'CAFE_CARD_VIEW', label: 'Lihat Kartu Meja Cafe' },
            { id: 'CAFE_START', label: 'Buka Meja Cafe Baru' },
            { id: 'CAFE_ORDER', label: 'Input / Tambah Pesanan Cafe' },
            { id: 'CAFE_PAY', label: 'Proses Pembayaran / Checkout Cafe' },
            { id: 'CAFE_TRANSFER', label: 'Pindah Order / Gabung ke Meja Billiard' },
            { id: 'CAFE_CANCEL_ITEM', label: 'Batalkan Item Pesanan Cafe' },
            { id: 'POS_ORDER_CREATE', label: 'Input Order Via POS / Admin' },
            { id: 'POS_PAYMENT', label: 'Proses Pembayaran Langsung POS' },
            { id: 'POS_SHIFT', label: 'Kontrol Shift POS Kasir' },
        ]
    },
    {
        label: 'Order Control & VOID',
        permissions: [
            { id: 'ORDER_CREATE', label: 'Buat Pesanan Baru' },
            { id: 'ORDER_EDIT', label: 'Edit Pesanan (Ubah Qty/Item)' },
            { id: 'ORDER_CANCEL', label: 'Batalkan Pesanan (Sebelum Proses)' },
            { id: 'ORDER_DISCOUNT', label: 'Berikan Diskon Item / Bill' },
            { id: 'ORDER_VOID', label: 'VOID Pesanan (Setelah Proses)' },
            { id: 'PAYMENT_PROCESS', label: 'Finalisasi Pembayaran' },
            { id: 'PAYMENT_REFUND', label: 'Refund / Pengembalian Dana' },
        ]
    },
    {
        label: 'Kitchen & Bar (KDS/BDS)',
        permissions: [
            { id: 'ACCESS_KDS', label: 'Masuk Menu KDS (Kitchen)' },
            { id: 'ACCESS_BDS', label: 'Masuk Menu BDS (Bar)' },
            { id: 'KDS_VIEW', label: 'Pantau Antrean Pesanan Kitchen' },
            { id: 'KDS_PROCESS', label: 'Proses / Siapkan Pesanan Kitchen' },
            { id: 'KDS_SET_READY', label: 'Selesaikan Pesanan Kitchen' },
            { id: 'KDS_HISTORY', label: 'Lihat Riwayat Pesanan Kitchen' },
            { id: 'BDS_VIEW', label: 'Pantau Antrean Pesanan Bar' },
            { id: 'BDS_PROCESS', label: 'Proses / Siapkan Pesanan Bar' },
            { id: 'BDS_SET_READY', label: 'Selesaikan Pesanan Bar' },
            { id: 'BDS_HISTORY', label: 'Lihat Riwayat Pesanan Bar' },
        ]
    },
    {
        label: 'Inventory & Stock Management',
        permissions: [
            { id: 'INV_VIEW', label: 'Lihat Daftar Stok & Inventaris' },
            { id: 'INV_UPDATE', label: 'Tambah/Edit Bahan & Menu' },
            { id: 'INV_RECIPE', label: 'Kelola Formula Resep' },
            { id: 'INV_ALERT', label: 'Akses Notifikasi Stok Kritis' },
            { id: 'INVENTORY_STOCK_IN', label: 'Penerimaan / Stok Masuk' },
            { id: 'INVENTORY_STOCK_OUT', label: 'Pemakaian / Stok Keluar' },
            { id: 'INVENTORY_STOCK_ADJUST', label: 'Adjustment / Koreksi Stok' },
            { id: 'INVENTORY_SUPPLIER_MANAGE', label: 'Manajemen Data Supplier' },
            { id: 'STOCK_TRANSFER', label: 'Transfer Stok Antar Gudang' },
            { id: 'STOCK_OPNAME', label: 'Akses Menu Stock Opname' },
        ]
    },
    {
        label: 'Keuangan, Piutang & Laporan',
        permissions: [
            { id: 'FIN_REVENUE', label: 'Lihat Laporan Omzet & Pendapatan' },
            { id: 'FIN_EXPENSES_VIEW', label: 'Lihat Riwayat Pengeluaran' },
            { id: 'FIN_EXPENSES_ADD', label: 'Input Pengeluaran Baru' },
            { id: 'FIN_LEDGER', label: 'Akses Buku Besar & Profit' },
            { id: 'FIN_PRINT_REPRINT', label: 'Cetak Ulang Invoice Lama' },
            { id: 'FIN_DEBTS', label: 'Manajemen Hutang / Piutang Bon' },
            { id: 'BUSINESS_DAY_VIEW', label: 'Lihat History Business Day' },
            { id: 'BUSINESS_DAY_CLOSE', label: 'Lakukan Tutup Buku (Close Day)' },
            { id: 'REPORT_EXPORT', label: 'Ekspor Laporan (Excel/PDF)' },
            { id: 'AR_LIST_VIEW', label: 'Lihat Daftar Piutang (AR)' },
            { id: 'AR_PAYMENT', label: 'Proses Pembayaran Piutang' },
            { id: 'AR_SETTLE', label: 'Finalisasi Pelunasan Piutang' },
            { id: 'SHIFT_REPORT', label: 'Lihat Laporan Detail Shift' },
        ]
    },
    {
        label: 'SDM, Audit & Keamanan',
        permissions: [
            { id: 'USER_MANAGE', label: 'Kelola Akun & Hak Akses' },
            { id: 'USER_ROLE', label: 'Konfigurasi Role & Matrix' },
            { id: 'USER_MONITOR', label: 'Monitor Aktivitas (Audit Trail)' },
            { id: 'USER_FORCE_LOGOUT', label: 'Paksa Logout Sesi Aktif' },
            { id: 'AUDIT_VIEW', label: 'Lihat Audit Log Aktivitas' },
            { id: 'AUDIT_EXPORT', label: 'Export Data Audit Trail' },
            { id: 'PAYROLL_VIEW', label: 'Lihat Laporan Gaji & Komisi' },
            { id: 'SHIFT_START', label: 'Mulai Shift (Buka Kasir)' },
            { id: 'SHIFT_MANAGE', label: 'Manajemen / Edit Shift' },
            { id: 'APPROVAL_OVERRIDE', label: 'Otoritas Bypass / Super-User' },
            { id: 'USER_ROLE_EDIT', label: 'Edit & Hapus Role Karyawan' },
        ]
    },
    {
        label: 'Review & Approvals',
        permissions: [
            { id: 'APPROVAL_VIEW', label: 'Akses Halaman Approval Center' },
            { id: 'APPROVAL_ACTION', label: 'Lakukan Setuju/Tolak Pengajuan' },
        ]
    },
    {
        label: 'Pengaturan Sistem (Settings)',
        permissions: [
            { id: 'SETTING_IDENTITY', label: 'Edit Profil & Identitas Bisnis' },
            { id: 'SETTING_POLICY', label: 'Atur Pajak, Biaya & Pembulatan' },
            { id: 'SETTING_OPERATION', label: 'Atur Jam Operasional' },
            { id: 'SETTING_HARDWARE', label: 'Konfigurasi IoT, IP & Printer' },
            { id: 'SETTING_INVOICE', label: 'Kustomisasi Invoice' },
            { id: 'SETTING_DATABASE', label: 'Maintenance & Pembersihan DB' },
            { id: 'SETTING_TABLES', label: 'Manajemen Meja Billiard & Cafe' },
            { id: 'PROMO_MANAGE', label: 'Kelola Promo & Bundling' },
            { id: 'PROMO_APPLY', label: 'Penerapan Promo ke Transaksi' },
            { id: 'SETTING_DISPLAY', label: 'Display & Digital Marketing' },
            { id: 'SETTING_GAMIFICATION', label: 'Gamifikasi & Poin' },
            { id: 'SETTING_PREFERENCES', label: 'Preferensi & Kustomisasi UI' },
        ]
    },
    {
        label: 'Advanced Maintenance & IoT',
        permissions: [
            { id: 'SYSTEM_CLEANUP', label: 'Pembersihan Data Berkala' },
            { id: 'SYSTEM_BACKUP', label: 'Ekspor / Backup Database' },
            { id: 'WEBSOCKET_MONITOR', label: 'Monitor Real-time Socket Connection' },
            { id: 'MQTT_MONITOR', label: 'Monitor Traffic MQTT IoT' },
            { id: 'IOT_CONTROL', label: 'Kontrol Manual Hardware IoT' },
            { id: 'IOT_MONITOR', label: 'Pantau Status Sensor Hardware' },
            { id: 'ERROR_LOGS', label: 'Akses Technical Error Logs' },
            { id: 'DEBUG_TOOLS', label: 'Akses Developer Debug Tools' },
            { id: 'EXPERIMENTAL_FEATURES', label: 'Aktifkan Fitur Eksperimental' },
            { id: 'DATABASE_SYNC', label: 'Trigger Sinkronisasi Database' },
            { id: 'API_KEYS_MANAGE', label: 'Kelola API Keys & Integrasi' },
            { id: 'USER_SESSIONS', label: 'Manajemen Sesi Login Aktif' },
            { id: 'NOTIFICATION_MANAGE', label: 'Pengaturan Notifikasi Sistem' },
            { id: 'VOUCHER_MANAGE', label: 'Manajemen Master Voucher' },
            { id: 'VOUCHER_REDEEM', label: 'Otoritas Penukaran Voucher' },
        ]
    },
    {
        label: 'Legacy & Compatibility (Compatibility Layers)',
        permissions: [
            { id: 'START_TABLE', label: '[Legacy] Mulai Sesi Meja' },
            { id: 'MOVE_TABLE', label: '[Legacy] Pindah Meja' },
            { id: 'SWITCH_PACKAGE', label: '[Legacy] Ganti Paket' },
            { id: 'SET_PRICE', label: '[Legacy] Atur Harga Manual' },
            { id: 'VOID_BILLING', label: '[Legacy] Void Billing' },
            { id: 'VIEW_MENU', label: '[Legacy] Lihat Menu & Produk' },
            { id: 'ORDER_MENU', label: '[Legacy] Input Pesanan F&B' },
            { id: 'MANAGE_RETAIL', label: '[Legacy] Manajemen Retail' },
            { id: 'VOID_ORDER', label: '[Legacy] Void Pesanan' },
            { id: 'VIEW_INVENTORY', label: '[Legacy] Lihat Inventaris' },
            { id: 'UPDATE_INVENTORY', label: '[Legacy] Update Stok' },
            { id: 'MANAGE_RECIPE', label: '[Legacy] Manajemen Resep' },
            { id: 'STOCK_ALERT', label: '[Legacy] Alert Stok Kritis' },
            { id: 'VIEW_REVENUE', label: '[Legacy] Lihat Laporan Omzet' },
            { id: 'VIEW_PROFIT_LOSS', label: '[Legacy] Laporan Laba Rugi' },
            { id: 'MANAGE_EXPENSES', label: '[Legacy] Manajemen Pengeluaran' },
            { id: 'REPRINT_INVOICE', label: '[Legacy] Cetak Ulang Nota' },
            { id: 'MANAGE_EMPLOYEES', label: '[Legacy] Manajemen Karyawan' },
            { id: 'MANAGE_PAYROLL', label: '[Legacy] Manajemen Payroll' },
            { id: 'MONITOR_ACTIVITY', label: '[Legacy] Monitor Aktivitas' },
            { id: 'FORCE_LOGOUT', label: '[Legacy] Paksa Logout' },
            { id: 'TABLE_CONTROL_PANEL', label: '[Legacy] Table Control' },
            { id: 'AI_ARME_GAMIFICATION', label: '[Legacy] AI ARME' },
            { id: 'GAMIFICATION_ANALYTICS', label: '[Legacy] Analytics' },
            { id: 'SCAN_REDEMPTION', label: '[Legacy] Scan Redeem' },
            { id: 'REWARDS_CATALOG', label: '[Legacy] Katalog Rewards' },
            { id: 'LOCKER_MANAGE', label: '[Legacy] Manajemen Locker' },
        ]
    }
];
