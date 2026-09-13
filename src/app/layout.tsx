import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { PeriodoBar } from "@/components/PeriodoBar";
import { ComercialTabs } from "@/components/ComercialTabs";
import { InstalarApp } from "@/components/InstalarApp";
import { cookies } from "next/headers";
import { isValidPreset } from "@/lib/periodo";

const inter = Inter({ subsets: ["latin"], display: "swap", preload: true });

export const viewport: Viewport = {
  themeColor: "#db2777",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Sandra Bolos",
  description: "Gestão de pedidos de confeitaria",
  applicationName: "Sandra Bolos",
  manifest: "/manifest.webmanifest",
  // PNGs estáticos e opacos: o iOS descarta apple-touch-icon com transparência
  // (cantos arredondados) e mostra um monograma no lugar do ícone.
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Sandra Bolos",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    // Equivalente padronizado do apple-mobile-web-app-capable, lido pelo Chrome.
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const presetRaw = cookieStore.get("sb_periodo")?.value ?? "mes_atual";
  const preset = isValidPreset(presetRaw) ? presetRaw : "mes_atual";
  const de = cookieStore.get("sb_periodo_de")?.value;
  const ate = cookieStore.get("sb_periodo_ate")?.value;

  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <PeriodoBar preset={preset} de={de} ate={ate} />
          <ComercialTabs />
          <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-28">
            {children}
          </main>
        </div>
        <InstalarApp />
      </body>
    </html>
  );
}
