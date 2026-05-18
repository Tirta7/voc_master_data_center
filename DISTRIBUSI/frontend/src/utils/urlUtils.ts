export const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return `http://${hostname}:4000`;
    }
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').trim();
};

export const API_URL = getApiUrl();

/**
 * Paths served as static files by the NestJS backend (via useStaticAssets).
 * These need to be prefixed with the backend base URL.
 */
const BACKEND_STATIC_PREFIXES = ['/uploads/', '/member-cards/', '/logos/', '/promos/', '/rewards/'];

export const getFullImageUrl = (path: string) => {
    if (!path) return '';

    // If it's already an absolute URL, normalize the host to the current browser hostname
    // (fixes hardcoded IP from backend APP_URL config)
    if (path.startsWith('http')) {
        return normalizeBackendUrl(path);
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const apiUrl = getApiUrl(); // always dynamic, uses current hostname

    // Check if this is a backend-served static file
    const isBackendStatic = BACKEND_STATIC_PREFIXES.some(prefix => cleanPath.startsWith(prefix));
    if (isBackendStatic) {
        const cacheBuster = `?v=${Date.now()}`;
        return `${apiUrl}${cleanPath}${cacheBuster}`;
    }

    return cleanPath; // Frontend public assets (e.g. /logo.png in /public)
};

/**
 * Normalizes a full URL that may contain a hardcoded IP from backend config
 * to use the current browser's hostname instead.
 * This ensures images work whether accessed from PC (localhost) or mobile (IP).
 */
export const normalizeBackendUrl = (url: string): string => {
    if (!url || typeof window === 'undefined') return url;
    try {
        const parsed = new URL(url);
        // Only normalize if it targets port 4000 (our backend)
        if (parsed.port === '4000') {
            parsed.hostname = window.location.hostname;
            return parsed.toString();
        }
    } catch {
        // Invalid URL, return as-is
    }
    return url;
};
