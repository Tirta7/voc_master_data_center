/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    // ⚡ Build optimization
    experimental: {
        cpus: 2,
        // Optimalkan ukuran bundle
        optimizePackageImports: ['lucide-react'],
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    productionBrowserSourceMaps: false,

    // ⚡ OPTIMASI KOMPRESI: Next.js internal compression
    compress: true,

    // ─── Required for Docker deployment ───────────────────────
    output: 'standalone',

    // ⚡ OPTIMASI HTTP HEADERS: Aggressive caching untuk assets statis
    // Ini yang paling berdampak untuk mempercepat loading via Cloudflare Tunnel
    async headers() {
        return [
            {
                // ✅ JS, CSS, fonts yang di-hash Next.js → bisa di-cache permanen
                // File ini selalu berganti nama jika konten berubah (content-addressed)
                source: '/_next/static/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable', // 1 tahun
                    },
                    {
                        key: 'Vary',
                        value: 'Accept-Encoding',
                    },
                ],
            },
            {
                // ✅ Assets di folder /public (gambar, logo, ikon, dll)
                source: '/uploads/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=86400, stale-while-revalidate=3600', // 1 hari
                    },
                ],
            },
            {
                // ✅ Semua route HTML: gunakan stale-while-revalidate
                // Browser bisa sajikan halaman lama sambil fetch versi baru di background
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                ],
            },
        ];
    },

    async rewrites() {
        // Gunakan URL internal backend di Docker (server-to-server, tidak keluar ke internet)
        const backendUrl = process.env.NEXT_INTERNAL_API_URL || 'http://localhost:4000';
        return [
            // ⚡ PROXY UTAMA: Semua request API dari browser diteruskan ke backend
            // Browser panggil /api-proxy/xxx → Next.js server teruskan ke backend:4000/xxx
            // Ini memungkinkan satu domain saja tanpa perlu subdomain api-xxx
            { source: '/api-proxy/:path*', destination: `${backendUrl}/:path*` },
            // Static assets dari backend
            { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
            { source: '/logos/:path*', destination: `${backendUrl}/logos/:path*` },
            { source: '/promos/:path*', destination: `${backendUrl}/promos/:path*` },
            { source: '/rewards/:path*', destination: `${backendUrl}/rewards/:path*` },
            { source: '/member-cards/:path*', destination: `${backendUrl}/member-cards/:path*` }
        ];
    }
};

export default nextConfig;

