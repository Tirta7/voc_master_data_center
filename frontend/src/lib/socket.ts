import { io } from 'socket.io-client';

/**
 * Socket.IO HARUS konek langsung ke backend (bukan lewat /api-proxy).
 * Next.js rewrites hanya handle HTTP, tidak support WebSocket upgrade.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SOCKET_URL  → URL eksplisit khusus socket (produksi/Docker)
 * 2. NEXT_PUBLIC_API_URL     → URL publik backend (jika sudah diset)
 * 3. Fallback: hostname browser + port 4000 (localhost/IP lokal)
 */
const getSocketBaseUrl = (): string => {
    if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL.trim();
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.trim();
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname}:4000`;
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
