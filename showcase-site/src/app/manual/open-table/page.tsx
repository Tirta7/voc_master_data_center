export default function OpenTablePage() {
  return (
    <div className="manual-content">
      <h1 style={{ marginBottom: '0.5rem' }}>Membuka Meja (Sesi Baru)</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Panduan langkah demi langkah saat Anda menekan tombol <strong>▶ MULAI</strong> pada kartu meja untuk menyewakannya kepada tamu.
      </p>

      {/* Area Gambar Screenshot 3 */}
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
          aspectRatio: '1/2', 
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '2rem',
          border: '2px dashed #d1d5db',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}>
          <em>(Simpan gambar pop-up Sesi Baru Anda sebagai <strong>open-table.png</strong> di folder <strong>showcase-site/public/images/</strong>)</em>
        </div>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Langkah Pengisian Formulir</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>1</span>
            Input Nama Pelanggan (Wajib)
          </h3>
          <p>
            Anda <strong>harus</strong> mengisi nama tamu pada kolom "KETIK NAMA TAMU...". Jika tamu tersebut adalah pelanggan VIP atau <em>Member</em>, Anda tidak perlu mengetik manual; cukup klik <strong>Ikon QR Code</strong> di sebelah kanan kolom untuk melakukan proses <em>scan</em> kartu <em>member</em> mereka.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>2</span>
            Pilih Mode Penyewaan
          </h3>
          <p>
            Sistem menyediakan 3 opsi mode penyewaan meja:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            <li><strong>PLAYTIME (Open Bill)</strong>: Tamu bermain bebas tanpa batas waktu awal. Mereka akan membayar di akhir sesuai total durasi bermain.</li>
            <li><strong>DURATION (Paket Jam)</strong>: Tamu bermain dengan batasan waktu yang ditentukan (misal: 2 jam). Lampu meja akan otomatis mati saat durasi habis.</li>
            <li><strong>PROMO</strong>: Memilih paket promosi khusus yang sedang ditawarkan oleh manajemen.</li>
          </ul>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>3</span>
            Konfirmasi Paket Harga (Rate)
          </h3>
          <p>
            Di bagian "Pilih Paket Open", sistem akan secara otomatis menampilkan harga per jam (<em>Rate</em>) yang berlaku saat itu berdasarkan jenis meja (contoh: VVIP) dan zona waktu (contoh: Shift Siang / Malam).
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#10b981' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
            Eksekusi: Mulai Open Table
          </h3>
          <p>
            Setelah Anda mengisi nama tamu, tombol <strong>MULAI OPEN TABLE</strong> di paling bawah yang tadinya berwarna abu-abu (mati) akan menyala. Klik tombol tersebut untuk mengonfirmasi. Sistem kasir akan langsung menyalakan lampu meja biliar yang bersangkutan melalui integrasi IoT (*Internet of Things*).
          </p>
        </div>
      </div>
    </div>
  );
}
