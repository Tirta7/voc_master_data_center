-- ================================================================
-- PERFORMANCE INDEXES - Billiard & Cafe Management System
-- Jalankan sekali, aman dijalankan berulang (IF NOT EXISTS)
-- ================================================================

-- 1. Index untuk lookup transaksi aktif per meja billiard
CREATE INDEX IF NOT EXISTS idx_transactions_table_status 
  ON transactions("tableId", status) 
  WHERE "tableId" IS NOT NULL;

-- 2. Index untuk lookup transaksi aktif per meja cafe
CREATE INDEX IF NOT EXISTS idx_transactions_cafe_status 
  ON transactions("cafeTableId", status) 
  WHERE "cafeTableId" IS NOT NULL;

-- 3. Index untuk order items per transaksi (dipakai KDS & billing)
CREATE INDEX IF NOT EXISTS idx_order_items_transaction 
  ON order_items("transactionId");

-- 4. Index untuk filter status order item (dipakai di KDS)
CREATE INDEX IF NOT EXISTS idx_order_items_status 
  ON order_items(status);

-- 5. Index untuk menu item active lookup (dipakai saat processOrder - batch fetch)
CREATE INDEX IF NOT EXISTS idx_menu_items_active 
  ON menu_items(id) 
  WHERE "isActive" = true AND "deletedAt" IS NULL;

-- 6. Index untuk transaksi per business day (dipakai laporan harian)
CREATE INDEX IF NOT EXISTS idx_transactions_business_day
  ON transactions("businessDayId");

-- 7. Index untuk transaksi per shift (dipakai laporan shift)
CREATE INDEX IF NOT EXISTS idx_transactions_shift
  ON transactions("shiftId")
  WHERE "shiftId" IS NOT NULL;

SELECT 'Semua index berhasil dibuat!' AS result;
