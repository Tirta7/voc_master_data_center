/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    // ─── Required for Docker deployment ───────────────────────
    // Menghasilkan server.js standalone tanpa perlu node_modules penuh
    // output: 'standalone',
};

export default nextConfig;
