import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import LayoutContent from "@/components/LayoutContent";
import { SidebarProvider } from "@/components/SidebarContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { LicenseBanner } from "@/components/LicenseBanner";
import { BroadcastToast } from "@/components/BroadcastToast";
import { LicenseGuard } from "@/components/LicenseGuard";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  let businessName = "VOC Billiard & Cafe Management";
  let shortName = "VOC Billiard";
  let iconUrl = "/icon-192.png";
  
  try {
    // PC Server (PM2): NEXT_INTERNAL_API_URL tidak di-set → localhost:4000
    // Docker Client  : NEXT_INTERNAL_API_URL=http://backend:4000
    const apiUrl = process.env.NEXT_INTERNAL_API_URL || 'http://localhost:4000';
    const res = await fetch(`${apiUrl}/settings`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.businessName) {
         businessName = data.businessName;
         shortName = data.businessName;
      }
      if (data.logoPath) {
        iconUrl = data.logoPath.startsWith('http') ? data.logoPath : `${apiUrl}${data.logoPath.startsWith('/') ? '' : '/'}${data.logoPath}`;
      }
    }
  } catch (e) {
    // Silently fall back to default metadata during build/if API is unavailable
  }


  return {
    title: businessName,
    description: "Sistem manajemen billiard dan cafe - VOC System",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: shortName,
    },
    icons: {
      apple: iconUrl,
      icon: iconUrl,
    },
    formatDetection: {
      telephone: false,
    },
  };
}
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import { LanguageProvider } from "@/context/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="max-w-full overflow-x-hidden">
      <head>
        <meta name="theme-color" content="#0F172A" />
      </head>
      <body className={`${plusJakartaSans.variable} font-sans antialiased max-w-full overflow-x-hidden`}>
        <LanguageProvider>
          <AuthProvider>
            <SidebarProvider>
              <ToastProvider>
                <LicenseBanner />
                <LicenseGuard />
                <LayoutContent>
                  {children}
                </LayoutContent>
                <BroadcastToast />
              </ToastProvider>
            </SidebarProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
