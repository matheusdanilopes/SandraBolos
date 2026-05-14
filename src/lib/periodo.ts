import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  startOfYear,
  endOfYear,
  format,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export type PeriodoPreset =
  | "mes_atual"
  | "mes_passado"
  | "3_meses"
  | "6_meses"
  | "ano_atual"
  | "personalizado";

export interface PeriodoRange {
  inicio: string;
  fim: string;
  label: string;
  preset: PeriodoPreset;
}

export interface MesResumo {
  chave: string;
  label: string;
}

export const PERIODO_PRESETS: { value: PeriodoPreset; label: string }[] = [
  { value: "mes_atual", label: "Este mês" },
  { value: "mes_passado", label: "Mês passado" },
  { value: "3_meses", label: "3 meses" },
  { value: "6_meses", label: "6 meses" },
  { value: "ano_atual", label: "Este ano" },
  { value: "personalizado", label: "Personalizado" },
];

const VALID_PRESETS = new Set<string>([
  "mes_atual",
  "mes_passado",
  "3_meses",
  "6_meses",
  "ano_atual",
  "personalizado",
]);

export function isValidPreset(v: string): v is PeriodoPreset {
  return VALID_PRESETS.has(v);
}

export function getPeriodoRange(
  preset: PeriodoPreset,
  de?: string,
  ate?: string
): PeriodoRange {
  const hoje = new Date();

  switch (preset) {
    case "mes_atual":
      return {
        inicio: format(startOfMonth(hoje), "yyyy-MM-dd"),
        fim: format(endOfMonth(hoje), "yyyy-MM-dd"),
        label: format(hoje, "MMMM 'de' yyyy", { locale: ptBR }),
        preset,
      };

    case "mes_passado": {
      const mes = subMonths(hoje, 1);
      return {
        inicio: format(startOfMonth(mes), "yyyy-MM-dd"),
        fim: format(endOfMonth(mes), "yyyy-MM-dd"),
        label: format(mes, "MMMM 'de' yyyy", { locale: ptBR }),
        preset,
      };
    }

    case "3_meses":
      return {
        inicio: format(startOfMonth(subMonths(hoje, 2)), "yyyy-MM-dd"),
        fim: format(endOfMonth(hoje), "yyyy-MM-dd"),
        label: "Últimos 3 meses",
        preset,
      };

    case "6_meses":
      return {
        inicio: format(startOfMonth(subMonths(hoje, 5)), "yyyy-MM-dd"),
        fim: format(endOfMonth(hoje), "yyyy-MM-dd"),
        label: "Últimos 6 meses",
        preset,
      };

    case "ano_atual":
      return {
        inicio: format(startOfYear(hoje), "yyyy-MM-dd"),
        fim: format(endOfYear(hoje), "yyyy-MM-dd"),
        label: `Ano ${format(hoje, "yyyy")}`,
        preset,
      };

    case "personalizado": {
      const inicio = de ?? format(startOfMonth(hoje), "yyyy-MM-dd");
      const fim = ate ?? format(endOfMonth(hoje), "yyyy-MM-dd");
      return {
        inicio,
        fim,
        label: `${format(parseISO(inicio), "dd/MM/yyyy")} – ${format(parseISO(fim), "dd/MM/yyyy")}`,
        preset,
      };
    }
  }
}

/** Retorna lista de meses (mais recente primeiro) dentro de um range. */
export function getMesesNoPeriodo(inicio: string, fim: string): MesResumo[] {
  const meses: MesResumo[] = [];
  let current = startOfMonth(parseISO(inicio));
  const fimDate = parseISO(fim);

  while (current <= fimDate) {
    meses.push({
      chave: format(current, "yyyy-MM"),
      label: format(current, "MMMM yyyy", { locale: ptBR }),
    });
    current = addMonths(current, 1);
  }

  return meses.reverse();
}
