import { MetadataRoute } from 'next';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let businessName = "VOC Billiard & Cafe";
  let iconUrl = "/icon-512.png";
  let icon192 = "/icon-192.png";

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/settings`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      if (data.businessName) businessName = data.businessName;
      if (data.logoPath) {
          const rawUrl = data.logoPath.startsWith('http') ? data.logoPath : `${apiUrl}${data.logoPath.startsWith('/') ? '' : '/'}${data.logoPath}`;
          iconUrl = rawUrl;
          icon192 = rawUrl;
      }
    }
  } catch (e) {
      console.error('Failed to fetch settings for manifest', e);
  }

  return {
    name: businessName,
    short_name: businessName,
    description: "Sistem manajemen billiard dan cafe - VOC System",
    start_url: '/',
    display: 'standalone',
    background_color: '#0F172A',
    theme_color: '#0F172A',
    icons: [
      {
        src: icon192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
