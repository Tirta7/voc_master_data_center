const fs = require('fs');
const path = require('path');
const puppeteer = require(path.join(__dirname, '../backend/node_modules/puppeteer'));

function img(file) {
  const p = path.join('/Users/tirtaaditya/.gemini/antigravity/brain/80fdcf90-9a88-473a-bcd6-f7e5aa0e7ced/.user_uploaded', file);
  if (!fs.existsSync(p)) return '';
  const mime = /\.jpe?g$/i.test(p) ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
}

const IMG = {
  rentalStation: img('media_1794788987020_ba5a94fe.png'),
  mejaCafe: img('media_1794788996157_064c99b2.png'),
  kasir: img('media_1794621417251_254b0673.png'),
  cfd: img('media_1794621430487_0c5ad6f2.jpg'),
  dashboard: img('media_1794600865417_b30faf8c.png'),
  member: img('media_1794615022162_2d1ad9bf.png'),
  license: img('media_1794790224630_790b524b.png'),
};

const CONTACT = { wa: '08999964538', email: 'Virtualoperationcontrol@gmail.com', web: 'vocbilliard.online' };

const html = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><title>Proposal Penawaran VOC Billiard</title>
<style>
  @page { size: A4; margin: 18mm 18mm 18mm 18mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1f2328; font-size: 9.3pt; line-height: 1.55; background: #fff; }
  h1, h2, h3, h4 { color: #111; margin: 0; letter-spacing: -0.01em; }
  h2 { font-size: 16pt; font-weight: 700; margin-bottom: 3px; }
  h3 { font-size: 11pt; font-weight: 700; margin: 14px 0 5px; }
  h4 { font-size: 9.6pt; font-weight: 700; margin: 0 0 2px; }
  p { margin: 0 0 7px; }
  ul { margin: 3px 0 8px; padding-left: 16px; }
  li { margin-bottom: 2px; }
  .muted { color: #6b7280; }
  .label { font-size: 7.2pt; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
  .rule { height: 1px; background: #e5e7eb; margin: 12px 0; }
  .section { page-break-before: always; }
  .lead { font-size: 10pt; color: #374151; margin-bottom: 12px; }

  /* Cover */
  .cover { height: 260mm; display: flex; flex-direction: column; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand-mark { width: 34px; height: 34px; border: 2px solid #111; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15pt; }
  .brand-name { font-weight: 800; font-size: 12pt; letter-spacing: 0.04em; }
  .cover-title { font-size: 28pt; font-weight: 800; line-height: 1.15; letter-spacing: -0.025em; margin: 0 0 14px; color: #111; }
  .cover-sub { font-size: 11pt; color: #4b5563; max-width: 92%; }
  .quote { border-left: 3px solid #111; padding: 7px 0 7px 16px; margin: 20px 0 0; font-size: 10.2pt; color: #111; font-style: italic; max-width: 95%; background: #fafafa; border-radius: 0 6px 6px 0; }
  .cover-preview { margin-top: 16px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
  .cover-preview img { display: block; width: 100%; height: auto; }
  .cover-foot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 8.5pt; }
  .cover-foot b { display: block; font-size: 7.2pt; color: #6b7280; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 700; }

  /* Blocks */
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
  .box p:last-child, .box ul:last-child { margin-bottom: 0; }
  .shot { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 8px 0 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.03); }
  .shot img { display: block; width: 100%; height: auto; }
  .caption { font-size: 7.8pt; color: #6b7280; margin-bottom: 10px; font-weight: 500; }

  /* Steps */
  .steps { counter-reset: s; margin: 6px 0 0; padding: 0; list-style: none; }
  .steps li { counter-increment: s; position: relative; padding: 0 0 9px 32px; margin: 0; }
  .steps li::before { content: counter(s); position: absolute; left: 0; top: 0; width: 20px; height: 20px; border: 1px solid #111; border-radius: 50%; font-size: 8pt; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .steps b { color: #111; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 8.6pt; }
  th { text-align: left; font-size: 7.2pt; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; font-weight: 700; padding: 6px 8px; border-bottom: 1.5px solid #111; }
  td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  td.r, th.r { text-align: right; white-space: nowrap; }
  tr.hl td { background: #f6f7f8; font-weight: 600; }

  /* Pricing */
  .plan { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .plan.featured { border: 1.5px solid #111; }
  .plan-tag { font-size: 6.8pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #6b7280; height: 11px; }
  .plan-name { font-size: 10.5pt; font-weight: 700; color: #111; margin: 3px 0 1px; }
  .plan-price { font-size: 18pt; font-weight: 800; color: #111; letter-spacing: -0.02em; margin: 5px 0 0; }
  .plan-unit { font-size: 8.2pt; color: #6b7280; margin-bottom: 8px; }
  .plan ul { font-size: 8.2pt; }

  .note { background: #f6f7f8; border-radius: 8px; padding: 9px 12px; font-size: 8.5pt; color: #374151; margin: 8px 0; }
  .contact-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px; }
  .contact-row .box b { display: block; font-size: 7.2pt; letter-spacing: 0.1em; text-transform: uppercase; color: #6b7280; }
  .contact-row .box span { font-size: 9.5pt; font-weight: 600; color: #111; }
</style></head><body>

<!-- ============ COVER ============ -->
<div class="cover">
  <div class="brand"><div class="brand-mark">V</div><div class="brand-name">VOC BILLIARD</div></div>
  <div>
    <div class="label">Proposal Penawaran Resmi</div>
    <h1 class="cover-title">Sistem Kasir & Otomasi Meja<br/>untuk Usaha Billiard Modern</h1>
    <p class="cover-sub">Satu aplikasi terintegrasi untuk sewa meja, saklar lampu otomatis (IoT), layar pelanggan (CFD), pembayaran QRIS otomatis lunas, resto/cafe, member, hingga kontrol pemilik &mdash; tanpa biaya sewa bulanan.</p>
    
    <div class="quote">"Pak/Bu, untuk aplikasi VOC Billiard &amp; Kasir ini, kami tidak menarik biaya sewa software jutaan rupiah di depan. Anda cukup isi kuota transaksi Rp 250 ribu untuk 600 transaksi (jatuhnya cuma Rp 400-an per main meja). Dari tarif sewa meja Rp 40.000 – Rp 50.000 per jam, biaya sistem cuma Rp 400 perak, bahkan lebih murah dari sebatang rokok. Kalau meja lagi sepi, saldo tidak akan berkurang dan tidak ada masa kedaluwarsa. Lebih hemat dan adil untuk usaha Bapak/Ibu."</div>

    <div class="cover-preview">
      <img src="${IMG.rentalStation}" alt="Layar Rental Station VOC Billiard" />
    </div>
  </div>
  <div class="cover-foot">
    <div><b>WhatsApp</b>${CONTACT.wa}</div>
    <div><b>Email</b>${CONTACT.email}</div>
    <div><b>Website</b>${CONTACT.web}</div>
  </div>
</div>

<!-- ============ 1. RINGKASAN & MASALAH LAPANGAN ============ -->
<div class="section">
  <div class="label">01 &mdash; Ringkasan</div>
  <h2>Solusi Menjawab Tantangan Bisnis Billiard</h2>
  <p class="lead">VOC Billiard dirancang dari kebutuhan nyata pemilik arena billiard. Sistem menggabungkan software kasir (POS), controller kelistrikan meja (IoT), layar pelanggan ganda, dan pembukuan dalam satu jaringan lokal yang aman dan stabil.</p>

  <h3>Tabel masalah operasional vs solusi VOC Billiard</h3>
  <table>
    <tr><th style="width:40%">Masalah Nyata di Lapangan</th><th>Solusi Nyata di VOC Billiard</th></tr>
    <tr><td><b>Kebocoran jam meja</b> (karyawan menyalakan lampu tanpa input transaksi di kasir).</td><td>Lampu meja dikunci saklar IoT. Lampu hanya menyala jika sesi aktif di kasir dan otomatis padam saat waktu habis.</td></tr>
    <tr><td><b>Perhitungan tarif manual rawan keliru</b> saat ramai atau ada tarif khusus.</td><td>Timer per meja presisi per detik. Sistem menghitung paket jam, jam open, atau tarif malam secara otomatis.</td></tr>
    <tr><td><b>Kasir repot verifikasi bukti transfer</b> QRIS pelanggan satu per satu.</td><td>Aplikasi notifier menangkap mutasi masuk secara instan dan mencocokkan tagihan meja. Kasir langsung auto-lunas.</td></tr>
    <tr><td><b>Pesanan makanan/minuman terpisah</b> dari sewa meja billiard.</td><td>Pesanan cafe langsung digabung ke tagihan meja (Merge Bill) dan diteruskan ke printer/display dapur & bar.</td></tr>
    <tr><td><b>Pemilik sulit memantau omzet</b> saat tidak berada di lokasi.</td><td>Dashboard pemilik menampilkan omzet kotor, laba bersih, metode bayar, dan audit trail kasir secara real-time.</td></tr>
    <tr><td><b>Beban biaya software bulanan tetap</b> meskipun pengunjung sepi.</td><td>Sistem kuota transaksi: biaya hanya berkurang saat ada transaksi meja. Kuota tidak pernah hangus.</td></tr>
  </table>

  <h3>Komponen arsitektur sistem</h3>
  <div class="grid3">
    <div class="box"><h4>1. Server & Kasir POS</h4><p class="muted">Pusat data di PC kasir outlet. Mengatur seluruh meja, pesanan resto, stok, dan laporan.</p></div>
    <div class="box"><h4>2. Layar Pelanggan (CFD)</h4><p class="muted">Monitor kedua menghadap pemain untuk transparansi timer, tagihan, dan QRIS dinamis.</p></div>
    <div class="box"><h4>3. Modul Kontrol IoT</h4><p class="muted">Perangkat saklar relay optocoupler terpasang di panel listrik untuk kendali lampu meja.</p></div>
  </div>
</div>

<!-- ============ 2. ALUR OPERASIONAL HARIAN ============ -->
<div class="section">
  <div class="label">02 &mdash; Cara Kerja</div>
  <h2>Alur operasional meja dari awal hingga selesai</h2>
  <p class="lead">Seluruh siklus permainan dikelola sistem secara terstruktur sehingga meminimalkan kelalaian manusia.</p>
  <ol class="steps">
    <li><b>Buka shift & modal kasir.</b> Kasir login dan mencatat modal kas masuk. Sistem merekam jam mulai dan petugas yang bertanggung jawab.</li>
    <li><b>Buka sesi meja.</b> Pelanggan memilih meja yang tersedia. Kasir memilih paket (misal 1 Jam, 2 Jam) atau Jam Open (hitung per menit). Pelanggan dapat dihubungkan ke ID Member.</li>
    <li><b>Lampu meja menyala otomatis.</b> Seketika perintah dikirim ke modul IoT meja, lampu menyala terang dan timer di layar kasir serta layar pelanggan mulai berjalan.</li>
    <li><b>Pemesanan F&B cafe & rokok.</b> Pemain memesan makanan atau minuman. Kasir memasukkan order ke nomor meja yang sama. Dapur menerima pesanan, stok bahan otomatis terpotong resep.</li>
    <li><b>Waktu sewa selesai.</b> Untuk paket jam, lampu meja padam otomatis tepat saat waktu habis. Meja masuk status menunggu pembayaran. Untuk jam open, kasir menghentikan timer saat pelanggan selesai main.</li>
    <li><b>Pembayaran di kasir & CFD.</b> Rincian tagihan tampil di layar pelanggan. Pelanggan dapat memilih tunai, transfer debit, saldo member, atau scan QRIS dinamis.</li>
    <li><b>Verifikasi otomatis & cetak struk.</b> Saat dana masuk, sistem mendeteksi pembayaran, melunaskan transaksi, dan mencetak struk. Layar CFD menampilkan status pembayaran berhasil.</li>
    <li><b>Tutup shift & serah terima kas.</b> Di akhir jam kerja, kasir melakukan tutup shift. Sistem menampilkan rekap omzet per metode bayar untuk memudahkan audit fisik uang di laci.</li>
  </ol>
  <div class="note"><b>Catatan Penggunaan Kuota:</b> Kuota transaksi hanya terpotong 1 poin ketika transaksi meja selesai dilunaskan. Sesi meja yang dibatalkan tidak memotong kuota.</div>
</div>

<!-- ============ 3. MODUL MEJA BILLIARD (DENGAN GAMBAR RENTAL STATION) ============ -->
<div class="section">
  <div class="label">03 &mdash; Modul Meja Billiard</div>
  <h2>Monitoring Seluruh Meja Secara Visual</h2>
  <p class="lead">Layar Rental Station menampilkan denah dan status seluruh meja secara real-time dengan kode warna yang jelas.</p>
  
  <div class="shot"><img src="${IMG.rentalStation}"/></div>
  <div class="caption">Gambar 1: Layar Rental Station &mdash; Status Meja 1 s/d Meja 13 (Tersedia, Digunakan, Selesai, Offline) dengan tombol Mulai cepat.</div>

  <div class="grid2">
    <div class="box"><h4>Fitur kendali operasional meja</h4><ul>
      <li>Indikator status meja real-time (Tersedia / Hijau, Digunakan / Biru, Selesai / Kuning).</li>
      <li>Pilihan durasi fleksibel: Jam Open, Paket 1 Jam, 2 Jam, Paket Siang/Malam.</li>
      <li>Fitur darurat <b>E-Stop</b> untuk memadamkan seluruh lampu meja saat kondisi darurat.</li>
      <li>Pindah meja (Move Table) tanpa mengulang hitungan durasi.</li>
      <li>Tambah waktu (Extend Session) langsung saat permainan masih berlangsung.</li>
      <li>Daftar tunggu (Waiting List) pelanggan saat arena sedang penuh.</li>
    </ul></div>
    <div class="box"><h4>Keunggulan saklar lampu IoT</h4><ul>
      <li>Koneksi nirkabel Wi-Fi lokal, tidak memerlukan kabel panjang ke kasir.</li>
      <li>Mendukung modul relay industri dengan proteksi optocoupler anti-noise listrik.</li>
      <li>Lampu otomatis mati saat aplikasi ditutup atau komputer dimatikan.</li>
      <li>Setiap aktivasi lampu tercatat dalam log audit sistem (mencegah manipulasi).</li>
    </ul></div>
  </div>
</div>

<!-- ============ 4. TERMINAL KASIR POS (DENGAN GAMBAR TERMINAL KASIR) ============ -->
<div class="section">
  <div class="label">04 &mdash; Terminal Kasir POS</div>
  <h2>Pembayaran Cepat, Akurat & Mendukung Multi-Metode</h2>
  <p class="lead">Layar kasir dirancang bersih dan ergonomis agar staf dapat memproses pembayaran dalam hitungan detik tanpa antrean panjang.</p>
  
  <div class="shot"><img src="${IMG.kasir}"/></div>
  <div class="caption">Gambar 2: Layar Terminal Billing Meja &mdash; Timer aktif sesi, fee rental, voucher promo, cluster metode bayar, dan tombol Split/Merge.</div>

  <div class="grid2">
    <div class="box"><h4>Manajemen pembayaran tagihan</h4><ul>
      <li><b>Split Bill:</b> Membagi tagihan satu meja menjadi beberapa pembayaran terpisah saat pemain patungan.</li>
      <li><b>Merge Bill:</b> Menggabungkan tagihan beberapa meja atau tagihan meja dengan cafe menjadi satu struk.</li>
      <li><b>Hold Transaction:</b> Menahan tagihan sementara saat kasir melayani transaksi cepat lainnya.</li>
      <li><b>Voucher & Diskon:</b> Penerapan kode voucher promo, potongan nominal, atau diskon persentase.</li>
      <li>Pilihan nominal uang pas dan pembulatan kembalian otomatis.</li>
    </ul></div>
    <div class="box"><h4>Cluster metode pembayaran</h4><ul>
      <li><b>Tunai (Cash):</b> Perhitungan kembalian otomatis.</li>
      <li><b>QRIS Dinamis:</b> QRIS tampil di layar kedua dengan nominal pas.</li>
      <li><b>Kartu Debit/Kredit EDC:</b> EDC BCA, Mandiri, BRI, BNI.</li>
      <li><b>E-Wallet:</b> GoPay, OVO, DANA, ShopeePay.</li>
      <li><b>Saldo Member:</b> Pembayaran potong saldo e-wallet member.</li>
    </ul></div>
  </div>
</div>

<!-- ============ 5. LAYAR PELANGGAN CFD & QRIS (DENGAN GAMBAR CFD & NOTIFIER) ============ -->
<div class="section">
  <div class="label">05 &mdash; Layar Pelanggan (CFD) &amp; QRIS</div>
  <h2>Layar Pelanggan Interaktif &amp; Verifikasi QRIS Seketika</h2>
  <p class="lead">Layar kedua (Customer Facing Display) memberikan transparansi penuh kepada tamu dan mempercepat proses transaksi.</p>
  
  <div class="shot"><img src="${IMG.cfd}"/></div>
  <div class="caption">Gambar 3: Layar Customer Facing Display (CFD) &mdash; Menampilkan nomor meja, rincian durasi bermain, subtotal, dan QRIS pembayaran dinamis.</div>

  <div class="grid2">
    <div class="box"><h4>Keunggulan layar pelanggan (CFD)</h4><ul>
      <li>Terhubung sinkron secara real-time dengan meja yang sedang diakses kasir.</li>
      <li>Menampilkan nama meja, nama member tamu, durasi main, dan pesanan F&B.</li>
      <li>Menampilkan gambar QRIS dengan nominal yang sudah terkunci (pelanggan tinggal scan tanpa input nominal manual).</li>
      <li>Begitu pembayaran diterima, layar seketika berganti ke animasi centang hijau <b>"PEMBAYARAN BERHASIL!"</b>.</li>
      <li>Dapat menggunakan monitor kedua komputer, tablet Android, atau smart TV.</li>
    </ul></div>
    <div class="box"><h4>Sistem verifikasi QRIS otomatis</h4><ul>
      <li>Menggunakan aplikasi pendamping Android (VOC ML Notifier) di smartphone kasir.</li>
      <li>Membaca notifikasi resmi mutasi masuk dari bank atau merchant QRIS (GoPay/BCA).</li>
      <li>Sistem backend mencocokkan nominal masuk dengan meja yang aktif di kasir.</li>
      <li>Transaksi lunas seketika tanpa kasir perlu meminta bukti transfer foto.</li>
      <li>Aman dari modus penipuan bukti transfer palsu.</li>
    </ul></div>
  </div>
</div>

<!-- ============ 6. INTEGRASI CAFE & RESTO (DENGAN GAMBAR MEJA CAFE) ============ -->
<div class="section">
  <div class="label">06 &mdash; Integrasi Cafe &amp; Resto</div>
  <h2>Kelola Area Billiard dan Cafe dalam Satu Sistem</h2>
  <p class="lead">Tidak perlu memakai dua software berbeda untuk meja billiard dan cafe. VOC Billiard mengintegrasikan keduanya secara menyeluruh.</p>
  
  <div class="shot"><img src="${IMG.mejaCafe}"/></div>
  <div class="caption">Gambar 4: Layar Manajemen Meja Cafe &mdash; Grid 20 Meja Cafe mandiri untuk tamu yang hanya memesan makanan/minuman tanpa bermain billiard.</div>

  <div class="grid2">
    <div class="box"><h4>Operasional cafe terpadu</h4><ul>
      <li>Tamu billiard dapat memesan makanan/minuman langsung dititipkan ke tagihan meja main.</li>
      <li>Tersedia area khusus <b>Meja Cafe</b> bagi tamu non-billiard yang hanya nongkrong.</li>
      <li>Dukungan <b>Kitchen Display System (KDS)</b> dan <b>Bartender Display (BDS)</b> untuk memonitor antrean masak.</li>
      <li>Pemisahan pesanan dapur dan bar (cetak struk pesanan ke printer dapur terpisah).</li>
    </ul></div>
    <div class="box"><h4>Manajemen stok & resep menu</h4><ul>
      <li>Pengurangan stok bahan baku otomatis berdasarkan resep porsi (misal 1 porsi Kopi Susu memotong susu 100ml dan kopi 18gr).</li>
      <li>Peringatan otomatis saat stok bahan mencapai batas minimum (stok kritis).</li>
      <li>Pencatatan barang masuk, barang rusak, dan stok opname.</li>
      <li>Impor daftar menu dan harga dari file Excel secara instan.</li>
    </ul></div>
  </div>
</div>

<!-- ============ 7. MEMBERSHIP & LOYALITAS (DENGAN GAMBAR MEMBER) ============ -->
<div class="section">
  <div class="label">07 &mdash; Membership &amp; Loyalitas</div>
  <h2>Bangun Komunitas Pemain Setia dengan Sistem Loyalitas</h2>
  <p class="lead">Tingkatkan kunjungan berulang pelanggan melalui kartu digital, poin royalty, dan sistem saldo e-wallet.</p>
  
  <div class="shot"><img src="${IMG.member}"/></div>
  <div class="caption">Gambar 5: Layar Manajemen Membership &mdash; Data member, kategori tier (Silver/Gold), saldo deposit e-wallet, dan poin royalty.</div>

  <div class="grid3">
    <div class="box"><h4>Saldo Deposit Member</h4><p class="muted">Pelanggan dapat melakukan top-up saldo deposit e-wallet untuk pembayaran bermain lebih praktis tanpa uang tunai.</p></div>
    <div class="box"><h4>Poin Royalty & Rewards</h4><p class="muted">Setiap transaksi menghasilkan poin reward yang dapat dikumpulkan dan ditukar dengan jam gratis atau merchandise.</p></div>
    <div class="box"><h4>Kategori Tier Eksklusif</h4><p class="muted">Tingkatan member (Reguler, Silver, Gold, VIP) dengan diskon tarif sewa khusus yang terpotong otomatis di kasir.</p></div>
  </div>

  <div class="note" style="margin-top:10px;">
    <b>Kartu Digital & Identifikasi Cepat:</b> Kasir dapat mencari member berdasarkan nama, nomor telepon, atau melakukan scan barcode kartu member fisik/digital dari layar smartphone pelanggan.
  </div>
</div>

<!-- ============ 8. DASHBOARD OWNER & KONTROL (DENGAN GAMBAR DASHBOARD) ============ -->
<div class="section">
  <div class="label">08 &mdash; Kontrol &amp; Laporan Pemilik</div>
  <h2>Pantau Seluruh Kinerja Usaha dari Mana Saja</h2>
  <p class="lead">Pemilik usaha mendapatkan visibilitas penuh atas omzet, margin laba, kinerja shift, dan catatan audit keamanan.</p>
  
  <div class="shot"><img src="${IMG.dashboard}"/></div>
  <div class="caption">Gambar 6: Dashboard Pemilik &mdash; Total omzet kotor, laba bersih, piutang, sumber pendapatan, dan distribusi metode bayar real-time.</div>

  <div class="grid2">
    <div class="box"><h4>Laporan keuangan & analitik</h4><ul>
      <li>Ringkasan omzet harian, mingguan, dan bulanan secara grafis.</li>
      <li>Pemisahan sumber pendapatan: sewa billiard, cafe/resto, PlayStation, top-up member, pajak, dan service.</li>
      <li>Laporan laba kotor & margin operasional bersih.</li>
      <li>Analisis jam ramai (peak hours) untuk strategi promosi diskon jam sepi.</li>
      <li>Ekspor laporan ke format PDF dan pengiriman ringkasan harian via WhatsApp.</li>
    </ul></div>
    <div class="box"><h4>Audit keamanan & absensi karyawan</h4><ul>
      <li>Pemisahan hak akses bertingkat: Owner, Manager, Kasir, Waiter, dan Dapur.</li>
      <li><b>Audit Trail:</b> Setiap pembatalan nota, diskon, atau void terekam lengkap beserta nama petugas.</li>
      <li>Approval Center untuk persetujuan tindakan khusus kasir.</li>
      <li>Sistem absensi karyawan berbasis QR rolling anti-titip absen.</li>
      <li>Laporan selisih kas per shift kasir.</li>
    </ul></div>
  </div>
</div>

<!-- ============ 9. MODEL BIAYA KUOTA VS SEWA BULANAN ============ -->
<div class="section">
  <div class="label">09 &mdash; Model Biaya Kuota</div>
  <h2>Sistem Kuota Transaksi: Lebih Hemat, Adil &amp; Tanpa Beban</h2>
  <p class="lead">Kami percaya pengusaha tidak seharusnya dibebani biaya sewa software tetap jutaan rupiah saat pengunjung sedang sepi. Sistem kuota VOC Billiard menawarkan fleksibilitas penuh yang terintegrasi langsung di dalam aplikasi.</p>

  <div class="shot"><img src="${IMG.license}"/></div>
  <div class="caption">Gambar 7: Layar Lisensi &amp; Kuota Aplikasi &mdash; Pemantauan sisa kuota sesi rental real-time (contoh: 101/600 sesi terpakai), Machine ID perangkat unik, status koneksi server VOCML, dan aktivasi perpanjangan otomatis.</div>

  <div class="quote" style="margin: 0 0 10px 0;">
    "Anda cukup isi kuota transaksi Rp 250 ribu untuk 600 transaksi (jatuhnya cuma Rp 400-an per main meja). Dari tarif sewa meja Rp 40.000 – Rp 50.000 per jam, biaya sistem cuma Rp 400 perak, bahkan lebih murah dari sebatang rokok. Kalau meja lagi sepi, saldo tidak akan berkurang dan tidak ada masa kedaluwarsa."
  </div>

  <table>
    <tr><th style="width:34%">Parameter</th><th>Sewa Bulanan Tradisional</th><th>Sistem Kuota VOC Billiard</th></tr>
    <tr><td>Biaya saat outlet sepi / libur</td><td>Tetap wajib bayar penuh</td><td><b>Rp 0</b> (kuota tidak berkurang sama sekali)</td></tr>
    <tr><td>Masa berlaku saldo</td><td>Hangus tiap akhir bulan</td><td><b>Selamanya (Tanpa Kedaluwarsa)</b></td></tr>
    <tr><td>Resiko software terkunci</td><td>Sering terkunci jika lupa transfer</td><td>Tidak pernah terkunci mendadak, kuota habis tinggal top-up</td></tr>
    <tr><td>Biaya riil per transaksi meja</td><td>Tidak terukur (&plusmn;Rp 800 &ndash; Rp 1.500)</td><td><b>Hanya &plusmn;Rp 280 &ndash; Rp 416 per meja</b></td></tr>
  </table>

  <h3>Simulasi penghematan biaya operasional per bulan</h3>
  <table>
    <tr><th>Ukuran Arena Billiard</th><th class="r">Rata-rata Transaksi/Bulan</th><th class="r">Biaya Kuota VOC</th><th class="r">Biaya Sewa Software Lain</th><th class="r">Penghematan Anda</th></tr>
    <tr><td><b>Outlet 4 Meja</b> (&plusmn;15 sesi/hari)</td><td class="r">&plusmn;450 transaksi</td><td class="r">Rp 180.000 /bulan</td><td class="r">Rp 500.000 /bulan</td><td class="r"><b>Hemat 64%</b></td></tr>
    <tr><td><b>Outlet 8 Meja</b> (&plusmn;40 sesi/hari)</td><td class="r">&plusmn;1.200 transaksi</td><td class="r">Rp 400.000 /bulan</td><td class="r">Rp 800.000 /bulan</td><td class="r"><b>Hemat 50%</b></td></tr>
    <tr><td><b>Outlet 15 Meja</b> (&plusmn;80 sesi/hari)</td><td class="r">&plusmn;2.400 transaksi</td><td class="r">Rp 670.000 /bulan</td><td class="r">Rp 1.200.000 /bulan</td><td class="r"><b>Hemat 45%</b></td></tr>
  </table>
  <p class="muted" style="font-size:7.8pt">*Dihitung proporsional dari harga paket kuota. Saldo kuota yang belum terpakai di bulan berjalan tetap tersimpan utuh untuk bulan berikutnya.</p>
</div>

<!-- ============ 10. PAKET HARGA & ESTIMASI BIAYA INVESTASI ============ -->
<div class="section">
  <div class="label">10 &mdash; Penawaran Investasi</div>
  <h2>Pilihan Paket Kuota &amp; Rincian Biaya Setup Awal</h2>
  <p class="lead">Tidak ada biaya tersembunyi. Seluruh fitur software sudah aktif di semua paket tanpa perlu upgrade tier.</p>
  
  <div class="grid3">
    <div class="plan">
      <div class="plan-tag">Pemula</div>
      <div class="plan-name">Paket Starter</div>
      <div class="plan-price">Rp 250.000</div>
      <div class="plan-unit">600 transaksi &middot; ~Rp 416/sesi meja</div>
      <ul>
        <li>Seluruh fitur kasir & meja lengkap</li>
        <li>Integrasi saklar lampu IoT</li>
        <li>Customer Facing Display (CFD)</li>
        <li>Kuota aktif selamanya (No Expired)</li>
        <li>Bantuan teknis via WhatsApp</li>
      </ul>
    </div>
    <div class="plan featured">
      <div class="plan-tag">Paling Populer 🔥</div>
      <div class="plan-name">Paket Business</div>
      <div class="plan-price">Rp 450.000</div>
      <div class="plan-unit">1.350 transaksi &middot; ~Rp 333/sesi meja</div>
      <ul>
        <li>Semua fitur Paket Starter</li>
        <li>Modul Membership & E-Wallet</li>
        <li>Auto-Matching Notifier QRIS</li>
        <li>Prioritas dukungan teknis 24/7</li>
        <li>Pendampingan update sistem</li>
      </ul>
    </div>
    <div class="plan">
      <div class="plan-tag">Hemat Maksimal</div>
      <div class="plan-name">Paket Enterprise</div>
      <div class="plan-price">Rp 900.000</div>
      <div class="plan-unit">3.200 transaksi &middot; ~Rp 280/sesi meja</div>
      <ul>
        <li>Biaya per sesi meja paling murah</li>
        <li>Semua fitur Paket Business</li>
        <li>Dukungan Multi-Cabang</li>
        <li>Custom header logo nota struk</li>
        <li>Prioritas respon teknis utama</li>
      </ul>
    </div>
  </div>

  <h3>Biaya setup awal (one-time / sekali di awal)</h3>
  <table>
    <tr><th>Item Pekerjaan</th><th>Deskripsi</th><th class="r">Biaya</th></tr>
    <tr><td><b>Jasa Setup &amp; Instalasi Software</b></td><td>Instalasi database server, konfigurasi jaringan kasir, pairing CFD, input master meja &amp; tarif, pelatihan kasir dan owner.</td><td class="r">Rp 500.000 &ndash; Rp 1.000.000</td></tr>
    <tr><td><b>Modul Controller IoT Lampu Meja (ESP32)</b></td><td>Modul relay industri optocoupler per meja, box panel, firmware terprogram siap pasang di panel listrik. (Opsional)</td><td class="r">Rp 150.000 &ndash; Rp 250.000 /meja</td></tr>
  </table>

  <h3>Perangkat keras pendukung (opsional / dapat memakai milik outlet)</h3>
  <table>
    <tr><th>Perangkat</th><th>Spesifikasi &amp; Fungsi</th><th class="r">Estimasi Harga</th></tr>
    <tr><td>Komputer Kasir / Laptop</td><td>Windows 10/11 atau macOS, RAM min 4GB. Bisa memakai komputer yang sudah ada.</td><td class="r">Rp 0 (pakai eksisting)</td></tr>
    <tr><td>Printer Struk Kasir</td><td>Printer thermal 58mm atau 80mm (USB / LAN / Bluetooth).</td><td class="r">Rp 300.000 &ndash; Rp 650.000</td></tr>
    <tr><td>Layar Pelanggan (CFD)</td><td>Monitor kedua, tablet Android, atau smart TV untuk tampilan pelanggan.</td><td class="r">Rp 0 &ndash; Rp 700.000</td></tr>
    <tr><td>HP Android Notifier QRIS</td><td>Smartphone Android (bisa HP bekas) untuk menangkap notifikasi m-banking/QRIS.</td><td class="r">Rp 0 (pakai HP kasir)</td></tr>
  </table>

  <div class="box" style="margin-top:8px;">
    <b>Contoh Total Investasi Awal Outlet 8 Meja:</b><br/>
    Jasa Instalasi & Pelatihan (Rp 750.000) + Modul IoT 8 Meja (8 &times; Rp 200.000 = Rp 1.600.000) + Paket Kuota Starter (Rp 250.000 / 600 transaksi) = <b>Total Rp 2.600.000</b> (siap langsung beroperasi).
  </div>
</div>

<!-- ============ 11. JADWAL LIVE DEMO & KONTAK ============ -->
<div class="section">
  <div class="label">11 &mdash; Jadwal Demo</div>
  <h2>Jadwalkan Live Demo Gratis Sebelum Memutuskan</h2>
  <p class="lead">Kami siap memberikan demonstrasi langsung fitur aplikasi dan simulasi otomasi lampu meja tanpa kewajiban apa pun.</p>

  <h3>Pilihan format sesi demo</h3>
  <table>
    <tr><th style="width:30%">Format Demo</th><th style="width:20%">Durasi</th><th>Rincian yang Ditampilkan</th></tr>
    <tr><td><b>Demo Online (Interaktif)</b></td><td>&plusmn;40 &ndash; 50 menit</td><td>Live screen sharing via Google Meet / Zoom: alur kasir, layar pelanggan CFD, dashboard owner di HP, dan simulasi auto-lunas QRIS.</td></tr>
    <tr><td><b>Demo On-Site (Kunjungan)</b></td><td>&plusmn;60 &ndash; 90 menit</td><td>Tim kami mengunjungi outlet Anda, menguji prototype modul lampu di panel listrik meja, dan melakukan survei kebutuhan teknis.</td></tr>
  </table>

  <h3>Jadwal waktu demo yang tersedia</h3>
  <table>
    <tr><th>Hari</th><th>Pilihan Sesi Waktu</th></tr>
    <tr><td><b>Senin &ndash; Jumat</b></td><td>Sesi Pagi (10.00 &ndash; 12.00 WIB) &nbsp;|&nbsp; Sesi Siang (14.00 &ndash; 16.00 WIB) &nbsp;|&nbsp; Sesi Malam (19.00 &ndash; 21.00 WIB)</td></tr>
    <tr><td><b>Sabtu</b></td><td>Sesi Pagi (10.00 &ndash; 12.00 WIB) &nbsp;|&nbsp; Sesi Siang (14.00 &ndash; 16.00 WIB)</td></tr>
  </table>

  <h3>4 langkah mudah setelah sesi demo</h3>
  <ol class="steps">
    <li><b>Survei kebutuhan</b> &mdash; Menghitung jumlah meja, mengecek jalur panel listrik, dan memeriksa PC/printer yang ada.</li>
    <li><b>Penawaran biaya final</b> &mdash; Rincian biaya transparan sesuai paket dan hardware yang disetujui.</li>
    <li><b>Instalasi & konfigurasi</b> &mdash; Pemasangan modul lampu dan setup software selesai dalam 1 &ndash; 2 hari kerja.</li>
    <li><b>Pelatihan & pendampingan</b> &mdash; Kasir dan manajer didampingi langsung pada hari pertama operasional outlet.</li>
  </ol>

  <div class="rule"></div>
  <p><b>Silakan hubungi kami untuk memesan jadwal demo atau konsultasi:</b></p>
  <div class="contact-row">
    <div class="box"><b>WhatsApp / Telepon</b><span>${CONTACT.wa}</span></div>
    <div class="box"><b>Email Resmi</b><span style="font-size:8.4pt">${CONTACT.email}</span></div>
    <div class="box"><b>Website</b><span>${CONTACT.web}</span></div>
  </div>
</div>

</body></html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const out = path.join(__dirname, '../PROPOSAL_PENAWARAN_VOC_BILLIARD.pdf');
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="width:100%;font-size:7px;color:#9ca3af;padding:0 18mm;display:flex;justify-content:space-between;font-family:Helvetica,Arial,sans-serif;">
      <span>VOC Billiard &middot; Smart POS &amp; IoT Automation &middot; ${CONTACT.wa} &middot; ${CONTACT.web}</span><span class="pageNumber"></span></div>`,
    margin: { top: '18mm', bottom: '18mm', left: '18mm', right: '18mm' },
  });
  await browser.close();
  const pub = path.join(__dirname, '../frontend/public/PROPOSAL_PENAWARAN_VOC_BILLIARD.pdf');
  fs.copyFileSync(out, pub);
  console.log('PROPOSAL BERHASIL DIUPDATE DENGAN KUOTA BARU:', out);
})().catch((e) => { console.error(e); process.exit(1); });
