import { io } from 'socket.io-client';

/**
 * Socket.IO HARUS konek langsung ke backend (bukan lewat /api-proxy).
 * Next.js rewrites hanya handle HTTP, tidak support WebSocket upgrade.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SOCKET_URL  → URL eksplisit khusus socket (wajib di-set untuk production)
 * 2. NEXT_PUBLIC_API_URL     → URL publik backend (fallback jika SOCKET_URL tidak diset)
 * 3. Fallback: hostname browser + port 4000 (hanya untuk localhost/IP lokal)
 *
 * ⚠️ PENTING untuk production/online via Cloudflare Tunnel:
 *    Set NEXT_PUBLIC_SOCKET_URL=https://api.vocbilliard.online di .env.production
 *    Tanpa ini, browser akan mencoba konek ke domain:4000 yang TIDAK BISA diakses dari internet!
 */
const getSocketBaseUrl = (): string => {
    // 1. Env var eksplisit (WAJIB di-set di .env.production untuk online)
    if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL.trim();

    // 2. Fallback ke API URL jika sudah di-set
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.trim();

    // 3. Fallback otomatis: hanya aman untuk localhost / IP lokal
    //    Jika akses dari domain publik, port 4000 tidak akan bisa diakses!
    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;
        // Deteksi jika ini akses lokal (localhost / IP private)
        const isLocal =
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            /^192\.168\./.test(hostname) ||
            /^10\./.test(hostname) ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

        if (isLocal) {
            return `${protocol}//${hostname}:4000`;
        }

        // Akses dari domain publik → backend harusnya di subdomain api.*
        // Coba tebak otomatis dari hostname (admin.vocbilliard.online → api.vocbilliard.online)
        const apiHostname = hostname.replace(/^[^.]+\./, 'api.');
        console.warn(
            `[Socket] Tidak ada NEXT_PUBLIC_SOCKET_URL. Mencoba otomatis: ${protocol}//${apiHostname}\n` +
            `Sebaiknya set NEXT_PUBLIC_SOCKET_URL di .env.production!`
        );
        return `${protocol}//${apiHostname}`;
    }
    return 'http://localhost:4000';
};

const SOCKET_BASE = getSocketBaseUrl();

const SOCKET_OPTIONS = {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'] as string[], // websocket dulu, fallback ke polling
};

export const socket = io(SOCKET_BASE, SOCKET_OPTIONS);

export const inventorySocket = io(`${SOCKET_BASE}/inventory`, SOCKET_OPTIONS);

export const kdsSocket = io(`${SOCKET_BASE}/kds`, SOCKET_OPTIONS);
