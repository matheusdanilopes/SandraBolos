import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestão de Pedidos de Bolos',
  description: 'Sistema interno para gestão de pedidos.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
