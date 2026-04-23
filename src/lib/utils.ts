import { format, isToday, isTomorrow, isPast, parseISO, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string) {
  return format(parseISO(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

export function pedidoAlerta(dataEntrega: string): "atrasado" | "vence_amanha" | null {
  const date = parseISO(dataEntrega);
  if (isPast(date) && !isToday(date)) return "atrasado";
  if (isTomorrow(date)) return "vence_amanha";
  return null;
}

export function isEntregaHoje(dataEntrega: string) {
  return isToday(parseISO(dataEntrega));
}

export function isEntregaSemana(dataEntrega: string) {
  const date = parseISO(dataEntrega);
  const now = new Date();
  return isWithinInterval(date, { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) });
}

export function pedidoNumero(createdAt: string, id: string) {
  return `PED-${id.slice(0, 4).toUpperCase()}`;
}

export function calcularValorFinal(pedido: { valor_calculado?: number | null; preco_corrigido?: number | null }) {
  return pedido.preco_corrigido ?? pedido.valor_calculado ?? null;
}
