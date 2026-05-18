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
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const res = await fetch(`${API_BASE}/api/license/status`, {
      signal: AbortSignal.timeout(5000), // timeout 5 detik
    });

    if (!res.ok) return NextResponse.next(); // Jika backend down, biarkan lewat

    const data = await res.json();
    const lockedStatuses = ['EXPIRED', 'BLOCKED', 'NOT_REGISTERED'];

    if (lockedStatuses.includes(data.status)) {
      // Redirect ke halaman lock screen
      const url = request.nextUrl.clone();
      url.pathname = '/activate';
      return NextResponse.redirect(url);
    }
  } catch {
    // Jika tidak bisa reach backend (offline), biarkan lewat
    // Toleransi offline dikelola di LicenseService backend
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Matcher: semua route kecuali static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json).*)'],
};
