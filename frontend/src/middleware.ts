import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Route yang SELALU boleh diakses (bypass license check)
const PUBLIC_PATHS = ['/activate', '/_next', '/favicon', '/manifest', '/api', '/icons', '/promos', '/sounds'];

// Ekstensi file statis yang TIDAK boleh diintersep (gambar, font, audio)
const STATIC_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.mp3', '.mp4', '.woff', '.woff2', '.ttf'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass untuk static files, api routes, dan halaman aktivasi itu sendiri
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) || 
      STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  try {
    // ✅ ARSITEKTUR DUAL-MODE (Server PC + Docker Client):
    //
    // NEXT_INTERNAL_API_URL = variabel server-side saja (tanpa NEXT_PUBLIC_),
    // dipakai oleh middleware/SSR untuk menghubungi backend dari DALAM server/container.
    //
    // - PC Server (PM2)     : tidak di-set → fallback localhost:4000 ✅
    // - Docker Client       : di-set ke http://backend:4000 (Docker service name) ✅
    //
    // Dengan ini:
    //   • Ganti WiFi/IP → tidak lemot (localhost/backend tidak bergantung IP)
    //   • Tanpa internet  → localhost:3000 tetap jalan (backend ada di Docker lokal)
    //   • Dengan internet → https://pekalongan.vocbilliard.online juga jalan
    const API_BASE = process.env.NEXT_INTERNAL_API_URL || 'http://localhost:4000';
    const res = await fetch(`${API_BASE}/api/license/status`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return NextResponse.next();

    const data = await res.json();
    const lockedStatuses = ['EXPIRED', 'BLOCKED', 'NOT_REGISTERED'];

    if (lockedStatuses.includes(data.status)) {
      const url = request.nextUrl.clone();
      url.pathname = '/activate';
      return NextResponse.redirect(url);
    }
  } catch {
    // Jika backend tidak bisa dihubungi (offline/restart), biarkan lewat
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Kecualikan: file static Next.js, gambar, font, audio, favicon
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\.png|.*\.jpg|.*\.jpeg|.*\.gif|.*\.svg|.*\.ico|.*\.webp|.*\.mp3|.*\.mp4|.*\.woff|.*\.woff2|.*\.ttf).*)'],
};
