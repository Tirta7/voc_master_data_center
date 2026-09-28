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
    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;
        const isLocal =
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            /^192\.168\./.test(hostname) ||
            /^10\./.test(hostname) ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

        if (isLocal) {
            return `${protocol}//${hostname}:4000`;
        }

        if (protocol === 'https:') {
            if (hostname !== 'admin.vocbilliard.online' && hostname.endsWith('.vocbilliard.online')) {
                const branchName = hostname.split('.')[0];
                return `https://api-${branchName}.vocbilliard.online`;
            }
            const baseDomain = hostname.replace(/^admin\./, '');
            return `https://api.${baseDomain}`;
        }
    }

    if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL.trim();
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.trim();
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
