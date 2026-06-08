export default function NotaSementaraPage() {
  return (
    <div className="manual-content">
      <h1 style={{ marginBottom: '0.5rem' }}>Mencetak Nota Sementara (Pre-Bill)</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Seringkali pelanggan meminta rincian tagihan (<em>billing</em>) untuk patungan bersama teman-temannya sebelum mereka benar-benar maju ke meja kasir untuk membayar. Gunakan fitur ini!
      </p>

      {/* Area Gambar Screenshot 6 */}
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
          maxWidth: '350px', 
          width: '100%', 
          aspectRatio: '1/2', 
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
          <em>(Simpan gambar Nota Sementara Anda sebagai <strong>nota-sementara.png</strong> di folder <strong>showcase-site/public/images/</strong>)</em>
        </div>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Fungsi & Cara Cetak</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>1</span>
            Akses Ikon Nota
          </h3>
          <p>
            Pada kartu meja yang sedang berstatus <strong>DIGUNAKAN / IN USE</strong>, carilah ikon <strong>Kertas Struk (Receipt)</strong> berwarna biru muda. Ikon ini terletak persis di sebelah kanan tombol ungu <em>CHECKOUT</em>.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>2</span>
            Keamanan Anti-Fraud
          </h3>
          <p>
            Begitu pop-up muncul, Anda akan melihat pratinjau (<em>preview</em>) struk kasir yang sangat nyata. 
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>PENTING:</strong> Sistem dengan sengaja mencetak teks peringatan tebal berbunyi <span style={{ fontFamily: 'monospace', backgroundColor: '#e5e7eb', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>*** BUKAN BUKTI BAYAR SAH ***</span> di bagian paling atas. Ini adalah fitur keamanan tingkat tinggi untuk mencegah oknum kasir memberikan nota ini kepada pelanggan seolah-olah sudah lunas, lalu menggelapkan uangnya.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>3</span>
            Rincian Transparan & Akurat
          </h3>
          <p>
            Struk sementara ini merincikan segalanya dengan sempurna: 
          </p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            <li>Menampilkan status hidangan (contoh: [PENDING] jika belum dibayar).</li>
            <li>Rincian hitungan Pajak (PPN/VAT) dan <em>Service Charge</em>.</li>
            <li>Nilai "Pembulatan Nominal" agar kembalian selalu pas (misal dibulatkan Rp460).</li>
            <li>Kode QR dinamis di bagian bawah untuk memudahkan pemindaian atau tip.</li>
          </ul>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#10b981' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
            Universal Printer Support
          </h3>
          <p>
            Di panel paling bawah layar, aplikasi menyuguhkan teknologi pencetakan lintas platform:
          </p>
          <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            <li><strong>Toggle Ukuran Kertas:</strong> Anda bisa memilih mau mencetak di kertas thermal kecil (<strong>58mm</strong>) atau standar (<strong>80mm</strong>). Struk akan otomatis merespons (<em>responsive</em>).</li>
            <li><strong>PDF / USB:</strong> Tekan tombol hitam ini untuk menyimpannya sebagai file digital (.pdf) atau mencetaknya ke printer kasir kabel (USB/LAN).</li>
            <li><strong>CETAK BT:</strong> Tekan tombol ungu ini untuk langsung mentransmisikan data struk secara nirkabel (<em>wireless</em>) ke Printer Bluetooth portabel. Sangat cocok jika pelayan menagih langsung ke sofa/meja pelanggan!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
