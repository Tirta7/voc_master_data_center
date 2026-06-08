import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="manual-content">
      <h1 style={{ marginBottom: '0.5rem' }}>Panduan Login Sistem</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Gerbang akses utama menuju <strong>Virtual Billiard Enterprise OS</strong>.
      </p>

      {/* Area Gambar Screenshot */}
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
          aspectRatio: '1/2', 
          backgroundColor: '#1a1f36',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          textAlign: 'center',
          padding: '2rem',
          border: '2px dashed #4b5563'
        }}>
          <em>(Area Screenshot: Simpan gambar Anda sebagai <strong>login-screen.png</strong> di folder <strong>showcase-site/public/images/</strong> lalu kita akan menampilkannya di sini)</em>
        </div>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Penjelasan Fitur</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>1</span>
            Username
          </h3>
          <p>
            Kolom ini digunakan untuk memasukkan Identitas Pengguna Anda (contoh: <code>Tirta_id</code>). Username ini bersifat unik untuk setiap kasir atau administrator dan diberikan saat pendaftaran awal oleh pemilik (*Owner*).
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>2</span>
            Password & Fitur Intip
          </h3>
          <p>
            Masukkan kata sandi rahasia Anda di kolom ini. Terdapat ikon bergambar <strong>mata</strong> di ujung kanan kolom; Anda dapat mengkliknya untuk melihat/mengintip sandi yang sedang Anda ketik agar tidak terjadi kesalahan (*typo*).
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ backgroundColor: 'var(--primary)', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.8rem' }}>3</span>
            Tombol Masuk
          </h3>
          <p>
            Tombol utama berwarna biru (dengan logo petir). Setelah memastikan Username dan Password sudah terisi dengan benar, tekan tombol ini untuk langsung masuk ke layar utama (*Dashboard*) kasir Anda.
          </p>
        </div>

        <div style={{ padding: '1.5rem', backgroundColor: 'var(--background)', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#10b981' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Sistem Keamanan
          </h3>
          <p>
            Di bagian bawah halaman, Anda akan melihat indikator <strong>AES-256 SECURED</strong> dan <strong>V-SYSTEM 4.0 ACTIVE</strong>. Ini berarti seluruh proses *login* Anda telah dilindungi dengan algoritma enkripsi perbankan paling mutakhir, memastikan tidak ada kebocoran data akses dari luar.
          </p>
        </div>
      </div>
    </div>
  );
}
