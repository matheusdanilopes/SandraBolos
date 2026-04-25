import { format, isToday, isTomorrow, isPast, parseISO, startOfWeek, endOfWeek, isWithinInterval, set } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string) {
  return format(parseISO(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  return `${hours}h${minutes}`;
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

function buildDeliveryDatetime(dataEntrega: string, hora: string): Date {
  const base = parseISO(dataEntrega);
  const [h, m] = hora.split(":").map(Number);
  return set(base, { hours: h, minutes: m, seconds: 0, milliseconds: 0 });
}

export function pedidoAlerta(
  dataEntrega: string,
  horaEntrega?: string | null,
  horaRetirada?: string | null
): "atrasado" | "vence_amanha" | "entrega_hoje" | null {
  const hora = horaEntrega || horaRetirada || null;
  const date = parseISO(dataEntrega);

  if (hora) {
    const datetime = buildDeliveryDatetime(dataEntrega, hora);
    const now = new Date();
    if (datetime < now) return "atrasado";
    if (isToday(date)) return "entrega_hoje";
    if (isTomorrow(date)) return "vence_amanha";
    return null;
  }

  if (isPast(date) && !isToday(date)) return "atrasado";
  if (isToday(date)) return "entrega_hoje";
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
