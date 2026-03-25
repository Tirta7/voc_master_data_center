/**
 * Reset Admin Password Script
 * Jalankan: node reset-admin-password.js
 */
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function resetAdminPassword() {
  const newPassword = 'admin123';

  // Sama persis seperti .env
  const client = new Client({
    host: '127.0.0.1',
    port: 4538,
    user: 'postgres',
    password: '1',
    database: 'billiard_db',
  });

  try {
    console.log('Menghubungkan ke database...');
    await client.connect();
    console.log('Terhubung!');

    // Hash password baru
    const hash = await bcrypt.hash(newPassword, 10);

    // Cek jumlah user yang ada
    const check = await client.query("SELECT id, username, name FROM users ORDER BY id ASC LIMIT 10");
    console.log('\n--- Daftar User yang Ada ---');
    check.rows.forEach(u => console.log(`  ID: ${u.id}, Username: ${u.username}, Name: ${u.name}`));

    // Update password user dengan username 'admin' ATAU user pertama di database
    const targetUser = check.rows.find(u => u.username === 'admin') || check.rows[0];
    if (!targetUser) {
      console.log('❌ Tidak ada user di database!');
      return;
    }

    const result = await client.query(
      `UPDATE users SET password = $1 WHERE id = $2`,
      [hash, targetUser.id]
    );

    console.log(`\n✅ Password berhasil direset! (${result.rowCount} baris diupdate)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Username  : ${targetUser.username}`);
    console.log(`  Password  : ${newPassword}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\nPastikan:');
    console.log('  1. PostgreSQL berjalan di port 4538');
  } finally {
    await client.end();
  }
}

resetAdminPassword();
