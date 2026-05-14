"use client";

import { usePathname } from "next/navigation";
import { PeriodoSeletor } from "./PeriodoSeletor";
import type { PeriodoPreset } from "@/lib/periodo";

// Páginas onde o seletor de período aparece
const PAGINAS_COM_PERIODO = new Set(["/", "/financeiro"]);

interface Props {
  preset: PeriodoPreset;
  de?: string;
  ate?: string;
}

export function PeriodoBar({ preset, de, ate }: Props) {
  const pathname = usePathname();

  if (!PAGINAS_COM_PERIODO.has(pathname)) return null;

  return (
    <div className="sticky top-[52px] z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-2.5">
        <PeriodoSeletor
          key={`${preset}-${de ?? ""}-${ate ?? ""}`}
          currentPreset={preset}
          currentDe={de}
          currentAte={ate}
        />
      </div>
    </div>
  );
}
