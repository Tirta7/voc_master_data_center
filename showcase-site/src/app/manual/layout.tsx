import Link from "next/link";

export default function ManualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="docs-layout">
      <aside className="docs-sidebar">
        <h3 className="sidebar-title">Getting Started</h3>
        <ul className="sidebar-menu">
          <li className="sidebar-item active">
            <Link href="/manual">Pengantar</Link>
          </li>
          {/* Nanti kita akan tambahkan menu di sini berdasarkan screenshot yang dikirim */}
        </ul>
        
        <h3 className="sidebar-title" style={{ marginTop: '2rem' }}>Fitur Kasir</h3>
        <ul className="sidebar-menu">
          <li className="sidebar-item">
            <Link href="/manual/login">1. Halaman Login</Link>
          </li>
          <li className="sidebar-item">
            <Link href="/manual/dashboard">2. Dashboard Utama</Link>
          </li>
          <li className="sidebar-item">
            <Link href="/manual/sidebar">3. Navigasi Sidebar</Link>
          </li>
          <li className="sidebar-item">
            <Link href="/manual/open-table">4. Membuka Meja</Link>
          </li>
          <li className="sidebar-item">
            <Link href="/manual/order-menu">5. Pesanan F&B (Menu)</Link>
          </li>
          <li className="sidebar-item">
            <Link href="/manual/cafe-table">6. Meja Cafe (Dine-in)</Link>
          </li>
          <li className="sidebar-item">
            <Link href="/manual/nota-sementara">7. Cetak Nota Sementara</Link>
          </li>
        </ul>
      </aside>
      
      <main className="docs-content">
        {children}
      </main>
    </div>
  );
}
