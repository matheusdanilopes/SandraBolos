import {
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  startOfYear,
  endOfYear,
  differenceInCalendarMonths,
  isSameDay,
  isSameYear,
  getMonth,
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

/** Presets que caem em meses inteiros, usados para "reconhecer" um range navegado. */
const PRESETS_DE_MESES: PeriodoPreset[] = [
  "mes_atual",
  "mes_passado",
  "3_meses",
  "6_meses",
  "ano_atual",
];

export function isValidPreset(v: string): v is PeriodoPreset {
  return VALID_PRESETS.has(v);
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mesLongo(date: Date): string {
  return capitalizar(format(date, "MMMM 'de' yyyy", { locale: ptBR }));
}

function mesCurto(date: Date): string {
  return capitalizar(format(date, "MMM", { locale: ptBR }).replace(".", ""));
}

/** Verdadeiro quando o range começa no dia 1 e termina no último dia de um mês. */
export function isRangeDeMesesInteiros(inicio: string, fim: string): boolean {
  const i = parseISO(inicio);
  const f = parseISO(fim);
  return i <= f && isSameDay(i, startOfMonth(i)) && isSameDay(f, endOfMonth(f));
}

/**
 * Label legível do intervalo. Sempre descreve os meses reais (e não "últimos N
 * meses"), porque com as setas de navegação o período deixa de ser relativo.
 */
function labelDoRange(inicio: string, fim: string): string {
  const i = parseISO(inicio);
  const f = parseISO(fim);

  if (!isRangeDeMesesInteiros(inicio, fim)) {
    return `${format(i, "dd/MM/yyyy")} – ${format(f, "dd/MM/yyyy")}`;
  }

  const meses = differenceInCalendarMonths(f, i) + 1;
  if (meses === 1) return mesLongo(i);
  if (meses === 12 && getMonth(i) === 0) return `Ano de ${format(i, "yyyy")}`;
  if (isSameYear(i, f)) {
    return `${mesCurto(i)} – ${mesCurto(f)} de ${format(f, "yyyy")}`;
  }
  return `${mesCurto(i)}/${format(i, "yy")} – ${mesCurto(f)}/${format(f, "yy")}`;
}

function buildRange(inicio: Date, fim: Date, preset: PeriodoPreset): PeriodoRange {
  const inicioStr = format(inicio, "yyyy-MM-dd");
  const fimStr = format(fim, "yyyy-MM-dd");
  return {
    inicio: inicioStr,
    fim: fimStr,
    label: labelDoRange(inicioStr, fimStr),
    preset,
  };
}

export function getPeriodoRange(
  preset: PeriodoPreset,
  de?: string,
  ate?: string
): PeriodoRange {
  const hoje = new Date();

  switch (preset) {
    case "mes_atual":
      return buildRange(startOfMonth(hoje), endOfMonth(hoje), preset);

    case "mes_passado": {
      const mes = subMonths(hoje, 1);
      return buildRange(startOfMonth(mes), endOfMonth(mes), preset);
    }

    case "3_meses":
      return buildRange(startOfMonth(subMonths(hoje, 2)), endOfMonth(hoje), preset);

    case "6_meses":
      return buildRange(startOfMonth(subMonths(hoje, 5)), endOfMonth(hoje), preset);

    case "ano_atual":
      return buildRange(startOfYear(hoje), endOfYear(hoje), preset);

    case "personalizado": {
      const inicio = de ?? format(startOfMonth(hoje), "yyyy-MM-dd");
      const fim = ate ?? format(endOfMonth(hoje), "yyyy-MM-dd");
      return {
        inicio,
        fim,
        label: labelDoRange(inicio, fim),
        preset,
      };
    }
  }
}

/**
 * Move o período `delta` blocos para trás/frente, mantendo o tamanho em meses
 * (1 mês anda de mês em mês, 3 meses andam de trimestre em trimestre...).
 *
 * Volta `null` quando o range não é de meses inteiros (datas personalizadas
 * soltas), caso em que navegar não teria um significado óbvio.
 */
export function deslocarPeriodo(
  inicio: string,
  fim: string,
  delta: number
): { preset: PeriodoPreset; de?: string; ate?: string } | null {
  if (!isRangeDeMesesInteiros(inicio, fim)) return null;

  const meses = differenceInCalendarMonths(parseISO(fim), parseISO(inicio)) + 1;
  const passo = delta * meses;
  const novoInicio = format(
    startOfMonth(addMonths(parseISO(inicio), passo)),
    "yyyy-MM-dd"
  );
  const novoFim = format(endOfMonth(addMonths(parseISO(fim), passo)), "yyyy-MM-dd");

  // Se o destino for exatamente um preset (ex.: voltar para o mês atual), usa o
  // preset — assim o período continua se atualizando sozinho com o passar dos dias.
  for (const preset of PRESETS_DE_MESES) {
    const range = getPeriodoRange(preset);
    if (range.inicio === novoInicio && range.fim === novoFim) return { preset };
  }

  return { preset: "personalizado", de: novoInicio, ate: novoFim };
}

/** Retorna lista de meses (mais recente primeiro) dentro de um range. */
export function getMesesNoPeriodo(inicio: string, fim: string): MesResumo[] {
  const meses: MesResumo[] = [];
  let current = startOfMonth(parseISO(inicio));
  const fimDate = parseISO(fim);

  while (current <= fimDate) {
    meses.push({
      chave: format(current, "yyyy-MM"),
      label: capitalizar(format(current, "MMMM yyyy", { locale: ptBR })),
    });
    current = addMonths(current, 1);
  }

  return meses.reverse();
}
