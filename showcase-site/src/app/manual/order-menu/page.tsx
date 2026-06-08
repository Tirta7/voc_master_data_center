export default function OrderMenuPage() {
  return (
    <div className="manual-content">
      <h1 style={{ marginBottom: '0.5rem' }}>Menambahkan Pesanan F&B (Menu)</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Panduan lengkap cara memesankan makanan, minuman, atau barang retail (seperti sarung tangan biliar) ke meja pelanggan yang sedang aktif bermain.
      </p>

      {/* Area Gambar Screenshot 4 */}
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
          <em style={{ fontSize: '0.85rem' }}>(Screenshot 1: Ikon Menu di Meja. Simpan sebagai <strong>order-1.png</strong>)</em>
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
          <em style={{ fontSize: '0.85rem' }}>(Screenshot 2: Pilih Item Menu. Simpan sebagai <strong>order-2.png</strong>)</em>
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
          <em style={{ fontSize: '0.85rem' }}>(Screenshot 3: Keranjang & Catatan. Simpan sebagai <strong>order-3.png</strong>)</em>
        </div>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Langkah Pemesanan (Alur KDS)</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>1</span>
            Akses Menu Pesanan dari Meja Aktif
          </h3>
          <p>
            Di halaman utama (Dashboard), perhatikan meja yang berstatus <strong>IN USE</strong> (warna biru gelap). Di bagian bawah rincian durasi dan tagihan meja tersebut, terdapat barisan ikon. Klik <strong>Ikon Garpu & Pisau</strong> (warna kuning kecoklatan) untuk membuka lembar Menu Pesanan khusus untuk meja tersebut.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>2</span>
            Pilih Menu & Perhatikan Stok
          </h3>
          <p>
            Anda dapat mencari menu secara manual dengan menggulir (<em>scroll</em>), menggunakan tombol kategori (Paket Bundling, Makanan, dll), atau mengetikkan nama menu di kolom <strong>Cari menu favorit...</strong>.
          </p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            <li>Klik pada item (misal: Nasi Pecel) untuk memilihnya. Kotak menu akan berubah menjadi hitam (aktif) dengan tanda "1x".</li>
            <li>Perhatikan label di sudut kanan atas item. Jika tertulis <strong>STK: 209</strong>, artinya stok tersedia 209 porsi. Jika tertulis <strong>SOLDOUT</strong> (merah), sistem akan otomatis mengunci item tersebut agar tidak bisa dipesan.</li>
          </ul>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>3</span>
            Lanjut ke Keranjang (Cart)
          </h3>
          <p>
            Setelah semua pesanan pelanggan dipilih, cek panel yang muncul dari bawah layar. Di sana tertera indikator jumlah item (ikon keranjang) dan <strong>TOTAL ESTIMASI</strong> harga. Klik tombol biru <strong>LANJUT</strong>.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>4</span>
            Tulis Catatan Khusus (Optional) & Review
          </h3>
          <p>
            Pada halaman KERANJANG, Anda dapat melakukan penyesuaian akhir:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            <li>Menambah / mengurangi jumlah porsi menggunakan tombol <strong>+</strong> dan <strong>-</strong>.</li>
            <li>Menghapus menu dari keranjang dengan tombol ikon tempat sampah merah.</li>
            <li><strong>Sangat Penting:</strong> Gunakan kolom <em>"Tambah catatan..."</em> untuk menulis instruksi khusus bagi Dapur (contoh: "Tanpa Sayur", "Pedas Sedang", "Es Dipisah").</li>
          </ul>
          <p style={{ marginTop: '0.5rem' }}>
            Di bagian bawah, sistem akan merincikan SUBTOTAL, nominal biaya <strong>PAJAK & SC</strong> (Service Charge) secara transparan, hingga mendapatkan TOTAL AKHIR.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#3b82f6' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3"/></svg>
            Kirim ke Dapur Otomatis
          </h3>
          <p>
            Tahap terakhir adalah menekan tombol biru panjang <strong>KIRIM PESANAN KE DAPUR</strong>. Saat diklik, tagihan (*bill*) pesanan ini akan otomatis masuk ke tagihan meja pelanggan tersebut. Secara bersamaan, tiket pesanan (<em>Order Ticket</em>) akan seketika tercetak di printer dapur/bar dan muncul di layar monitor koki (*Kitchen Display System* / KDS) tanpa kasir perlu bolak-balik mengantar kertas pesanan!
          </p>
        </div>
      </div>
    </div>
  );
}
