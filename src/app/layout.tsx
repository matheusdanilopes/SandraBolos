import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#db2777",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Sandra Bolos",
  description: "Gestão de pedidos de confeitaria",
  appleWebApp: {
    capable: true,
    title: "Sandra Bolos",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
