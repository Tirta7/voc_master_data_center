import Link from "next/link";

export default function Home() {
  return (
    <main className="page-container">
      {/* Hero Section */}
      <section className="hero" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)', color: 'white', border: 'none' }}>
        <h1 style={{ color: 'white' }}>Enterprise OS untuk Biliar & Cafe Anda</h1>
        <p style={{ color: '#bfdbfe' }}>Tingkatkan efisiensi operasional, cegah kecurangan kasir, dan pantau omzet seluruh cabang Anda secara real-time dari mana saja.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <Link href="/manual" className="btn-primary" style={{ padding: '0.8rem 1.5rem', fontSize: '1rem', backgroundColor: '#3b82f6' }}>
            Pelajari Fitur
          </Link>
          <Link href="/manual/login" className="btn-primary" style={{ padding: '0.8rem 1.5rem', fontSize: '1rem', backgroundColor: 'transparent', border: '1px solid #60a5fa' }}>
            Lihat Manual Book
          </Link>
        </div>
      </section>

      {/* Feature Highlight 1: Push Notifications */}
      <section style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4rem', 
        marginTop: '6rem',
        marginBottom: '6rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ display: 'inline-block', padding: '0.5rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            ✨ KEUNGGULAN UTAMA
          </div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', lineHeight: '1.2' }}>Pantau Omzet dari Jauh, <br/><span style={{ color: 'var(--primary)' }}>Real-Time di HP Anda.</span></h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.7' }}>
            Tinggalkan cara lama mengecek laporan di akhir hari! Dengan fitur <strong>Smart Push Notification</strong>, setiap transaksi yang lunas di meja kasir akan langsung dikirimkan ke layar <em>Lock Screen</em> HP Anda detik itu juga.
          </p>
          <ul style={{ listStyle: 'none', padding: '0', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <span style={{ backgroundColor: '#10b981', color: 'white', borderRadius: '50%', padding: '0.3rem', marginTop: '0.2rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </span>
              <div>
                <strong style={{ fontSize: '1.1rem' }}>Laporan Otomatis Tanpa Delay</strong><br/>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', display: 'inline-block', marginTop: '0.2rem' }}>Notifikasi transparan memuat nama pelanggan, metode bayar (QRIS/BCA/Tunai), dan nominal transaksi seketika setelah struk dicetak.</span>
              </div>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <span style={{ backgroundColor: '#10b981', color: 'white', borderRadius: '50%', padding: '0.3rem', marginTop: '0.2rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </span>
              <div>
                <strong style={{ fontSize: '1.1rem' }}>Cegah Kecurangan (Anti-Fraud)</strong><br/>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', display: 'inline-block', marginTop: '0.2rem' }}>Kasir tidak akan berani memanipulasi bon atau *void* sembarangan, karena setiap uang masuk langsung ternotifikasi ke HP Owner. Tidur tenang, bisnis jalan terus!</span>
              </div>
            </li>
          </ul>
        </div>
        
        {/* iPhone Mockup for Notification Demo */}
        <div style={{ flex: '1', minWidth: '300px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '340px', 
            aspectRatio: '9/19', 
            background: 'linear-gradient(180deg, #d8b4e2 0%, #7c3aed 30%, #000000 70%, #93c5fd 100%)',
            borderRadius: '45px', 
            border: '12px solid #1f2937', /* Dark gray bezel */
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem 1rem'
          }}>
            {/* Dynamic Island */}
            <div style={{ position: 'absolute', top: '12px', width: '100px', height: '30px', backgroundColor: 'black', borderRadius: '20px', zIndex: 10 }}></div>
            
            {/* iOS Clock */}
            <div style={{ marginTop: '3.5rem', textAlign: 'center', color: 'white', width: '100%', textShadow: '0px 2px 10px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '500' }}>Sabtu, 6 Juni</div>
              <div style={{ fontSize: '5.5rem', fontWeight: '700', lineHeight: '1', letterSpacing: '-2px', marginTop: '0.2rem' }}>22.14</div>
            </div>

            {/* Notification Bubbles based on Screenshot */}
            <div style={{ width: '100%', marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 5 }}>
              
              <div style={{ color: 'white', fontSize: '1rem', fontWeight: '500', marginBottom: '0.2rem', paddingLeft: '0.5rem', textShadow: '0px 1px 5px rgba(0,0,0,0.5)' }}>PANTEKA 888</div>

              {/* Notif 1 */}
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(20px)', padding: '1rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: '600', lineHeight: '1.2' }}>PANTEKA 888</span>
                    <span style={{ color: '#d1d5db', fontSize: '0.7rem', lineHeight: '1.2' }}>from PANTEKA 888</span>
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: 'auto' }}>sekarang</span>
                </div>
                <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.1rem' }}>Uang Masuk Dari: Wahyu</div>
                <div style={{ color: '#d1d5db', fontSize: '0.8rem', lineHeight: '1.4' }}>[CASH] CAFE-20260606-0002-992 | Rp 173.300</div>
              </div>

              {/* Notif 2 */}
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(20px)', padding: '1rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: '600', lineHeight: '1.2' }}>PANTEKA 888</span>
                    <span style={{ color: '#d1d5db', fontSize: '0.7rem', lineHeight: '1.2' }}>from PANTEKA 888</span>
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: 'auto' }}>3m yang lalu</span>
                </div>
                <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.1rem' }}>Uang Masuk Dari: Hadi</div>
                <div style={{ color: '#d1d5db', fontSize: '0.8rem', lineHeight: '1.4' }}>[QRIS] CAFE-20260606-0001-471 | Rp 57.800</div>
              </div>

              {/* Notif 3 */}
              <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.85)', backdropFilter: 'blur(20px)', padding: '1rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /></svg>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: '600', lineHeight: '1.2' }}>Virtual Billiard</span>
                    <span style={{ color: '#d1d5db', fontSize: '0.7rem', lineHeight: '1.2' }}>from Billiard Pro</span>
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: 'auto' }}>54m yang lalu</span>
                </div>
                <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.1rem' }}>💰 Lunas Dari: Rendra</div>
                <div style={{ color: '#d1d5db', fontSize: '0.8rem', lineHeight: '1.4' }}>[CASH] CAFE-20260606-0001-727 | Rp 155.000</div>
              </div>

            </div>
            
            {/* iOS Bottom Bar */}
            <div style={{ position: 'absolute', bottom: '10px', width: '130px', height: '5px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '10px' }}></div>
          </div>
        </div>
      </section>

      {/* Grid Fitur Lainnya */}
      <section className="feature-grid">
        <div className="feature-card">
          <h3>🚀 Cepat & Responsif</h3>
          <p>Sistem didesain sangat ringan untuk performa operasional maksimal, meminimalisir delay saat kasir sibuk.</p>
        </div>
        <div className="feature-card">
          <h3>📱 Multi-Platform</h3>
          <p>Mendukung berbagai perangkat mulai dari PC, Tablet Kasir, Layar Dapur (KDS), hingga HP Owner.</p>
        </div>
        <div className="feature-card">
          <h3>📖 Ekosistem Terpadu</h3>
          <p>Mulai dari manajemen meja, inventaris F&B, absensi karyawan, hingga pelaporan pajak, semua dalam satu pintu.</p>
        </div>
      </section>
    </main>
  );
}
