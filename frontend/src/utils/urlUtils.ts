export const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        // ⚡ SOLUSI SATU DOMAIN:
        // Saat berjalan di browser (client-side), gunakan path relatif /api-proxy
        // Next.js server akan proxy request ini ke backend:4000 secara internal
        // → Tidak perlu subdomain api-xxx, cukup satu domain saja!
        // Berlaku untuk: localhost, IP lokal, maupun domain HTTPS publik
        return '/api-proxy';
    }
    // Server-side (SSR): gunakan URL internal Docker langsung
    return (process.env.NEXT_INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').trim();
};

export const API_URL = getApiUrl();

/**
 * Paths served as static files by the NestJS backend (via useStaticAssets).
 * These need to be prefixed with the backend base URL.
 */
const BACKEND_STATIC_PREFIXES = ['/uploads/', '/member-cards/', '/logos/', '/promos/', '/rewards/'];

export const getFullImageUrl = (path: string) => {
    if (!path) return '';

    // Convert absolute backend URL (with port 4000) to relative path
    // so Next.js rewrites can proxy it over the same domain (fixing HTTPS Mixed Content)
    let cleanPath = path;
    if (path.startsWith('http')) {
        try {
            const parsed = new URL(path);
            if (parsed.port === '4000' || parsed.hostname === 'backend' || parsed.hostname === 'localhost') {
                cleanPath = parsed.pathname + parsed.search;
            }
        } catch {
            return path;
        }
    }

    if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;

    // Check if this is a backend-served static file
    const isBackendStatic = BACKEND_STATIC_PREFIXES.some(prefix => cleanPath.startsWith(prefix));
    if (isBackendStatic) {
        const cacheBuster = `?v=${Date.now()}`;
        return `${cleanPath}${cacheBuster}`;
    }

    return cleanPath; // Frontend public assets (e.g. /logo.png in /public)
};
