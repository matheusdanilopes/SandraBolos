"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { PeriodoBar } from "./PeriodoBar";
import { ComercialTabs } from "./ComercialTabs";
import { InstalarApp } from "./InstalarApp";
import type { PeriodoPreset } from "@/lib/periodo";

// Páginas abertas a clientes: sem a navegação e o convite de instalação do app
const PAGINAS_PUBLICAS = ["/cardapio"];

interface Props {
  preset: PeriodoPreset;
  de?: string;
  ate?: string;
  children: React.ReactNode;
}

export function AppShell({ preset, de, ate, children }: Props) {
  const pathname = usePathname();

  if (PAGINAS_PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <PeriodoBar preset={preset} de={de} ate={ate} />
        <ComercialTabs />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-28">
          {children}
        </main>
      </div>
      <InstalarApp />
    </>
  );
}
