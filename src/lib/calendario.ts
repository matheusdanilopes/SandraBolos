import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/** As duas visões de calendário do app: o mês inteiro ou uma semana. */
export type CalView = "mes" | "semana";

/** A semana da confeitaria começa na segunda e termina no domingo. */
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

/**
 * Intervalo da semana que contém `date`, na convenção da confeitaria.
 *
 * Fica aqui para que calendário, filtros de lista e indicadores do dashboard
 * falem da mesma "semana" — do contrário cada tela conta uma janela diferente.
 */
export function semanaDe(date: Date): { inicio: Date; fim: Date } {
  return {
    inicio: startOfWeek(date, WEEK_OPTIONS),
    fim: endOfWeek(date, WEEK_OPTIONS),
  };
}

export const WEEK_HEADER = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Dias da grade mensal — inclui as bordas das semanas que invadem outros meses. */
export function diasDoMes(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), WEEK_OPTIONS),
    end: endOfWeek(endOfMonth(date), WEEK_OPTIONS),
  });
}

export function diasDaSemana(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(date, WEEK_OPTIONS),
    end: endOfWeek(date, WEEK_OPTIONS),
  });
}

export function diasDaView(date: Date, view: CalView): Date[] {
  return view === "mes" ? diasDoMes(date) : diasDaSemana(date);
}

export function navegarPeriodo(date: Date, view: CalView, passo: 1 | -1): Date {
  if (view === "mes") return passo === 1 ? addMonths(date, 1) : subMonths(date, 1);
  return passo === 1 ? addWeeks(date, 1) : subWeeks(date, 1);
}

export function rotuloPeriodo(date: Date, view: CalView): string {
  if (view === "mes") return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  const inicio = startOfWeek(date, WEEK_OPTIONS);
  const fim = endOfWeek(date, WEEK_OPTIONS);
  return `${format(inicio, "dd")}–${format(fim, "dd/MM")}`;
}

/** Chave de dia no mesmo formato de `pedidos.data_entrega` (yyyy-MM-dd). */
export function chaveDia(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Indexa pedidos pelo dia de entrega, para a grade ler cada célula de uma vez. */
export function agruparPorDataEntrega<T extends { data_entrega: string }>(
  itens: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of itens) {
    const doDia = map.get(item.data_entrega);
    if (doDia) doDia.push(item);
    else map.set(item.data_entrega, [item]);
  }
  return map;
}
