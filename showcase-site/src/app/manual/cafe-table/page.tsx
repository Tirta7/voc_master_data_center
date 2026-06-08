export default function CafeTablePage() {
  return (
    <div className="manual-content">
      <h1 style={{ marginBottom: '0.5rem' }}>Mengelola Meja Cafe (F&B Only)</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Sistem ini tidak hanya mengatur biliar, tetapi juga memiliki modul khusus <strong>Meja Cafe</strong> (Resto/Lounge) untuk tamu yang datang hanya untuk bersantai, makan, dan minum.
      </p>

      {/* Area Gambar Screenshot 5 */}
      <div style={{ 
        backgroundColor: 'var(--background)', 
        padding: '2rem', 
        borderRadius: '16px', 
        marginBottom: '2.5rem',
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        border: '1px solid var(--border)'
      }}>
        <div style={{ 
          maxWidth: '300px', 
          flex: '1 1 200px',
          aspectRatio: '1/2', 
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '1.5rem',
          border: '2px dashed #d1d5db',
        }}>
          <em style={{ fontSize: '0.85rem' }}>(Screenshot 1: Dashboard Cafe. Simpan sebagai <strong>cafe-1.png</strong>)</em>
        </div>
        <div style={{ 
          maxWidth: '300px', 
          flex: '1 1 200px',
          aspectRatio: '1/2', 
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '1.5rem',
          border: '2px dashed #d1d5db',
        }}>
          <em style={{ fontSize: '0.85rem' }}>(Screenshot 2: Buka Meja Cafe. Simpan sebagai <strong>cafe-2.png</strong>)</em>
        </div>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Langkah Melayani Tamu Cafe</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>1</span>
            Dashboard Meja Cafe
          </h3>
          <p>
            Buka menu <strong>Meja Cafe</strong> dari navigasi <em>Sidebar</em>. Halaman ini mirip dengan Rental Station, namun khusus menampilkan meja makan/sofa.
          </p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            <li>Meja yang kosong akan menampilkan ikon cangkir kopi dengan tulisan <em>READY FOR GUEST</em> dan status <strong>TERSEDIA</strong>.</li>
            <li>Klik tombol hitam <strong>+ ORDER BARU</strong> pada meja yang diduduki oleh pelanggan.</li>
          </ul>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>2</span>
            Registrasi & Konfirmasi Nama Tamu
          </h3>
          <p>
            Pada jendela <em>Buka Meja Cafe</em> yang muncul, ketikkan <strong>Nama Pelanggan</strong>. 
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <em>Catatan:</em> Jika Anda melakukan <em>scan QR Code Member</em> (menggunakan ikon QR), sistem akan memvalidasi data dan memunculkan ikon <strong>Centang Hijau</strong> (Tamu Sudah Terdaftar) di sebelah nama pelanggan. Setelah nama dipastikan benar, klik tombol ungu <strong>BUKA MEJA SEKARANG</strong>.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>3</span>
            Pemesanan Langsung (Seamless Order)
          </h3>
          <p>
            Berbeda dengan biliar (yang hanya menyalakan lampu lalu menunggu dipesan), pada <strong>Meja Cafe</strong>, segera setelah Anda menekan tombol "Buka Meja", sistem akan <strong>langsung</strong> memunculkan halaman <strong>Menu Pesanan F&B</strong>.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            Proses pemilihannya sama persis seperti sebelumnya:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            <li>Pilih Makanan / Minuman.</li>
            <li>Buka keranjang dan tulis catatan khusus untuk dapur.</li>
            <li>Kirim pesanan ke KDS Dapur.</li>
          </ul>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#f59e0b' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Billing Terpisah (Tanpa Tarif Waktu)
          </h3>
          <p>
            Tagihan (<em>Bill</em>) pada Meja Cafe murni hanya menghitung total harga makanan, minuman, barang retail yang dibeli, beserta Pajak & <em>Service Charge</em>. Tidak ada argometer tarif waktu penyewaan (<em>Playtime</em>) yang berjalan seperti halnya pada meja biliar.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px', borderLeft: '4px solid #8b5cf6' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#8b5cf6' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            Fitur Canggih: Gabung Billing (Pindah ke Biliar)
          </h3>
          <p>
            <strong>Skenario Umum:</strong> Pelanggan datang saat meja biliar penuh, sehingga mereka duduk di Meja Cafe untuk makan/minum sambil menunggu (<em>Waiting List</em>). Saat meja biliar kosong, mereka pindah untuk bermain. Anda <strong>tidak perlu menagih tagihan cafe secara terpisah!</strong>
          </p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            <li>Pada kartu Meja Cafe yang sedang digunakan, perhatikan barisan ikon di bawah tombol <em>Checkout</em> biru. Klik ikon <strong>Dua Panah Bolak-Balik</strong> (Gabung Meja).</li>
            <li>Sistem akan memunculkan jendela <strong>Gabung Billing</strong> dan cerdas mendeteksi daftar meja biliar mana saja yang sedang aktif bermain saat ini.</li>
            <li>Cukup klik kartu meja biliar tujuan pelanggan tersebut (contoh: Meja 1 - Hadi).</li>
            <li>Secara instan, seluruh total tagihan makanan/minuman dari Meja Cafe akan "terbang" dan dilebur ke dalam tagihan meja biliar tersebut. Meja Cafe pun otomatis kembali bersih dan berstatus <strong>TERSEDIA</strong> untuk tamu berikutnya!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
