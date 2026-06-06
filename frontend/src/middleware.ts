import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Route yang SELALU boleh diakses (bypass license check)
const PUBLIC_PATHS = ['/activate', '/_next', '/favicon', '/manifest', '/api'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass untuk static files, api routes, dan halaman aktivasi itu sendiri
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json).*)'],
};
