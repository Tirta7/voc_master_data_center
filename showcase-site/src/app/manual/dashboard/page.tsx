export default function DashboardPage() {
  return (
    <div className="manual-content">
      <h1 style={{ marginBottom: '0.5rem' }}>Dashboard Utama (Rental Station)</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Halaman ini adalah pusat kendali operasional Anda untuk memantau, menyewakan, dan mengelola seluruh meja biliar secara <em>real-time</em>.
      </p>

      {/* Area Gambar Screenshot 1 */}
      <div style={{ 
        backgroundColor: 'var(--background)', 
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
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '2rem',
          border: '2px dashed #d1d5db',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <em>(Simpan gambar dashboard Anda sebagai <strong>dashboard.png</strong> di folder <strong>showcase-site/public/images/</strong>)</em>
        </div>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Fungsi pada Halaman Ini</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>1</span>
            Filter Status Meja
          </h3>
          <p>
            Di bagian atas, terdapat deretan tab navigasi cepat: <strong>Semua, Digunakan, Tersedia, Offline</strong>. Klik salah satu tab ini untuk menyaring tampilan meja sesuai kondisinya. Ini sangat berguna saat keadaan sedang ramai untuk mencari meja kosong dengan cepat.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>2</span>
            Indikator Antrean (Waiting List)
          </h3>
          <p>
            Tombol ungu besar bertuliskan <strong>ANTREAN</strong> memberikan informasi langsung mengenai jumlah pelanggan yang sedang masuk daftar tunggu. Anda bisa mengkliknya untuk memanggil pelanggan berikutnya.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>3</span>
            Kartu Meja (Table Card) & Tombol Mulai
          </h3>
          <p>
            Setiap meja ditampilkan dalam wujud "kartu" putih yang menginformasikan Nama Meja (misal: MEJA 1 VVIP) dan Statusnya (hijau untuk AVAILABLE). Jika meja kosong, tombol abu-abu gelap <strong>▶ MULAI</strong> akan aktif. Tekan tombol ini untuk menghidupkan lampu meja dan memulai perhitungan waktu/billing penyewaan.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px', borderLeft: '4px solid #6366f1' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#6366f1' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            Buka Menu Samping (Sidebar)
          </h3>
          <p>
            Di sisi kiri tengah layar, terdapat tab vertikal kecil bertuliskan <strong>MENU</strong>. Cukup klik atau geser (<em>swipe</em>) bagian ini untuk membuka laci navigasi (<em>Sidebar Menu</em>) yang memuat seluruh fitur aplikasi Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
