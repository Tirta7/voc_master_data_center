export const getApiUrl = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        return `http://${hostname}:4000`;
    }
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').trim();
};

export const API_URL = getApiUrl();

export const getFullImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    if (cleanPath.startsWith('/uploads/')) {
        // Add cache buster for uploaded images to ensure we always get the latest
        const cacheBuster = `?v=${Date.now()}`;
        return `${API_URL}${cleanPath}${cacheBuster}`;
    }
    return cleanPath; // Frontend public assets
};
