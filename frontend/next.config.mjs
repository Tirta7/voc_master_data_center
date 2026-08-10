/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Optimasi Memory Build
    experimental: {
        cpus: 2
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    productionBrowserSourceMaps: false,
    // ─── Required for Docker deployment ───────────────────────
    // Menghasilkan server.js standalone tanpa perlu node_modules penuh
    // output: 'standalone',
    outputFileTracing: false,
    async rewrites() {
        // Gunakan URL internal backend di Docker
        const backendUrl = process.env.NEXT_INTERNAL_API_URL || 'http://localhost:4000';
        return [
            { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
            { source: '/logos/:path*', destination: `${backendUrl}/logos/:path*` },
            { source: '/promos/:path*', destination: `${backendUrl}/promos/:path*` },
            { source: '/rewards/:path*', destination: `${backendUrl}/rewards/:path*` },
            { source: '/member-cards/:path*', destination: `${backendUrl}/member-cards/:path*` }
        ];
    }
};

export default nextConfig;
