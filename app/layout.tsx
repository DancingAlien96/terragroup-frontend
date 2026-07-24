import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/pwa/PwaRegister";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TerraGroup — Sistema de Cobranza para Lotificaciones",
  description: "Plataforma SaaS para gestionar cobros, pagos y propietarios de lotificaciones.",
  applicationName: "TerraGroup",
  appleWebApp: {
    capable: true,
    title:   "TerraGroup",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon-192.png",
    apple:    "/apple-icon.png",
  },
};

// Viewport separado — Next.js 15 pide que theme-color y viewport meta
// se exporten por su propia función, no dentro de `metadata`.
export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width:      "device-width",
  initialScale: 1,
  // viewportFit cover asegura que el contenido use el safe area en iPhone
  // con notch cuando se instala como PWA
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
