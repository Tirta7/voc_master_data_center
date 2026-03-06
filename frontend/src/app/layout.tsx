import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import LayoutContent from "@/components/LayoutContent";
import { SidebarProvider } from "@/components/SidebarContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/ui/ToastProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Billiard & Cafe Management",
  description: "Internal system for Billiard and Cafe Management",
  formatDetection: {
    telephone: false,
  },
};

import { LanguageProvider } from "@/context/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#4f46e5" />
      </head>
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        <LanguageProvider>
          <AuthProvider>
            <SidebarProvider>
              <ToastProvider>
                <LayoutContent>
                  {children}
                </LayoutContent>
              </ToastProvider>
            </SidebarProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
