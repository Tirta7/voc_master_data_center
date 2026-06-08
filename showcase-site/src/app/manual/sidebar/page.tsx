export default function SidebarPage() {
  return (
    <div className="manual-content">
      <h1 style={{ marginBottom: '0.5rem' }}>Navigasi Sidebar (Menu Utama)</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        <em>Sidebar</em> adalah laci navigasi vertikal yang memuat akses ke semua modul dalam sistem, dikelompokkan secara logis sesuai fungsi divisi.
      </p>

      {/* Area Gambar Screenshot 2 */}
      <div style={{ 
        backgroundColor: '#111827', 
        padding: '2rem', 
        borderRadius: '16px', 
        marginBottom: '2.5rem',
        display: 'flex',
        justifyContent: 'center',
        border: '1px solid var(--border)'
      }}>
        <div style={{ 
          maxWidth: '400px', 
          width: '100%', 
          aspectRatio: '9/16', 
          backgroundColor: '#1a1f36',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '2rem',
          border: '2px dashed #4b5563',
          boxShadow: '20px 0 25px -5px rgba(0, 0, 0, 0.5)'
        }}>
          <em>(Simpan gambar sidebar Anda sebagai <strong>sidebar.png</strong> di folder <strong>showcase-site/public/images/</strong>)</em>
        </div>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Kategori Modul Sistem</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>A</span>
            Kelompok OPERASIONAL
          </h3>
          <p>
            Menu-menu yang digunakan setiap hari oleh kru kasir dan staf lapangan. Termasuk di dalamnya:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            <li><strong>Rental Station:</strong> Halaman utama billing penyewaan biliar.</li>
            <li><strong>Meja Cafe & Table Management:</strong> Untuk pemesanan makanan/minuman di area kafe atau sofa.</li>
            <li><strong>Waiting List & Locker:</strong> Manajemen antrean dan penitipan barang pelanggan.</li>
            <li><strong>Kitchen (KDS) & Bartender (BDS):</strong> Monitor pesanan digital untuk koki dan bartender.</li>
          </ul>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>B</span>
            Kelompok FINANCE & INVENTORY
          </h3>
          <p>
            Ruang lingkup staf keuangan dan admin gudang:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            <li><strong>Inventory & Recipe:</strong> Pencatatan bahan baku dapur dan manajemen resep.</li>
            <li><strong>Finance & Ledger:</strong> Pembukuan kas, buku besar, dan jurnal harian.</li>
            <li><strong>Daftar Piutang:</strong> Mengelola catatan kasbon atau pelanggan prioritas.</li>
            <li><strong>Business Day Logic:</strong> Menjalankan prosedur tutup shift/buka shift kasir.</li>
          </ul>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>C</span>
            Kelompok MANAJEMEN
          </h3>
          <p>
            Fitur khusus level Supervisor dan Owner/Pemilik Bisnis:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            <li><strong>Laporan Owner:</strong> Laporan penjualan komprehensif tanpa bisa dimanipulasi kasir.</li>
            <li><strong>Audit Trail:</strong> Melacak setiap ketukan atau perubahan data (Anti-Fraud).</li>
            <li><strong>Kelola Karyawan & Absensi:</strong> Manajemen staf dan jam kerja.</li>
          </ul>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#ef4444' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Profil & Logout
          </h3>
          <p>
            Di bagian paling bawah <em>sidebar</em>, tertera nama dan peran akun yang sedang aktif (contoh: <strong>Super Admin</strong>). Anda bisa mengklik tombol bergambar <strong>Jam</strong> untuk mengunci layar kasir sementara saat pergi ke toilet, atau tombol bergambar <strong>Panah Keluar</strong> untuk <em>Logout</em> dari sistem dengan aman saat pergantian shift.
          </p>
        </div>
      </div>
    </div>
  );
}
