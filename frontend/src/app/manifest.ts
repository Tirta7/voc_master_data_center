import { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let businessName = "VOC Billiard & Cafe";
  let iconUrl = "/icon-512.png";
  let icon192 = "/icon-192.png";

  try {
    const apiUrl = process.env.NEXT_INTERNAL_API_URL || 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/settings`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.businessName) businessName = data.businessName;
      if (data.logoPath) {
          let finalLogoUrl = data.logoPath;
          if (finalLogoUrl.includes(':4000')) {
               try {
                   const parsed = new URL(finalLogoUrl);
                   if (parsed.port === '4000' || parsed.hostname === 'backend' || parsed.hostname === 'localhost') {
                       finalLogoUrl = `${parsed.pathname}${parsed.search}`;
                   }
               } catch (err) {}
          }
          if (!finalLogoUrl.startsWith('/')) finalLogoUrl = `/${finalLogoUrl}`;
          iconUrl = finalLogoUrl;
          icon192 = finalLogoUrl;
      }
    }
  } catch (e) {
      console.error('Failed to fetch settings for manifest', e);
  }

  let imageType = 'image/png';
  if (iconUrl.toLowerCase().endsWith('.jpg') || iconUrl.toLowerCase().endsWith('.jpeg')) {
    imageType = 'image/jpeg';
  } else if (iconUrl.toLowerCase().endsWith('.webp')) {
    imageType = 'image/webp';
  } else if (iconUrl.toLowerCase().endsWith('.svg')) {
    imageType = 'image/svg+xml';
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
        type: imageType,
        purpose: 'maskable',
      },
      {
        src: iconUrl,
        sizes: '512x512',
        type: imageType,
        purpose: 'any',
      },
    ],
  };
}
