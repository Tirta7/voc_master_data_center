require('dotenv').config();
const { Client } = require('pg');

async function fix() {
  console.log("=========================================");
  console.log("🔧 TOOL PEMULIHAN ITEM PIUTANG (HAND GLOVE)");
  console.log("=========================================\n");
  
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 4538,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1',
    database: process.env.DB_DATABASE || 'billiard_db'
  });

  try {
    console.log("Menyambungkan ke database...");
    await client.connect();
    console.log("Berhasil tersambung!\n");

    console.log("Mencari item yang terhapus tetapi masih nyangkut di Piutang (DEBT) / Transaksi Aktif...");
    
    // Cari dan kembalikan (restore) menu_items yang deletedAt-nya tidak null
    // TETAPI id-nya masih dipakai di order_items yang transaksinya berstatus DEBT/UNPAID/PARTIAL
    const query = `
      UPDATE menu_items 
      SET "deletedAt" = NULL, 
          "isActive" = true,
          name = REPLACE(name, '(DELETED-', '(RESTORED-') -- Menghilangkan tanda deleted agar nama sedikit rapi
      WHERE id IN (
        SELECT DISTINCT oi."menuItemId" 
        FROM order_items oi
        JOIN transactions t ON t.id = oi."transactionId"
        WHERE t.status IN ('UNPAID', 'PARTIAL', 'DEBT')
      ) AND "deletedAt" IS NOT NULL;
    `;
    
    const res = await client.query(query);
    
    if (res.rowCount > 0) {
      console.log(`✅ BERHASIL: Ditemukan dan dipulihkan ${res.rowCount} menu item yang menyangkut!`);
      console.log("Silakan coba lunaskan pembayaran piutang tersebut di layar kasir sekarang.");
    } else {
      console.log("⚠️ INFO: Tidak ditemukan item yang terhapus pada transaksi/piutang aktif.");
      console.log("Pastikan masalahnya benar-benar karena item terhapus, atau invoice sudah lunas.");
    }

  } catch (err) {
    console.error("❌ ERROR GAGAL MEMULIHKAN:", err.message);
  } finally {
    await client.end();
    console.log("\nTekan Ctrl + C untuk keluar (atau tutup jendela ini).");
  }
}

fix();
