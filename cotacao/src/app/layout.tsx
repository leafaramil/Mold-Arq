import type { Metadata, Viewport } from "next";
import { Fraunces, Karla } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const karla = Karla({
  subsets: ["latin"],
  variable: "--font-karla",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cotação de Mercado",
  description: "Compara a lista de compras nos mercados antes de sair de casa.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cotação",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F3A2B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${karla.variable}`}>
      <body style={{ fontFamily: "var(--font-karla), system-ui, sans-serif" }}>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
