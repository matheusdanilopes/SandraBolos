import { format, isToday, isTomorrow, isPast, parseISO, isWithinInterval, set } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { semanaDe } from "./calendario";

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

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return currencyFormatter.format(value);
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
  const { inicio, fim } = semanaDe(new Date());
  return isWithinInterval(parseISO(dataEntrega), { start: inicio, end: fim });
}

export function pedidoNumero(createdAt: string, id: string) {
  return `PED-${id.slice(0, 4).toUpperCase()}`;
}

type FichaTopperValor = { valor?: number | null };

/**
 * Valor do topper encomendado que entra no preço do pedido.
 *
 * Só conta com topper "sim": a ficha pode sobreviver a uma troca para "não" ou
 * "brinde" (quando já tinha valores lançados), e aí não é mais cobrada da
 * cliente. O frete fica de fora — é custo da compra, não preço do topper.
 */
export function valorTopperDoPedido(pedido: {
  topper?: string | null;
  // PostgREST devolve objeto no vínculo um-para-um; o array cobre o caso de ele
  // resolver a relação como lista, para o valor não sumir em silêncio.
  toppers_pedido?: FichaTopperValor | FichaTopperValor[] | null;
}): number | null {
  if (pedido.topper !== "sim") return null;
  const ficha = Array.isArray(pedido.toppers_pedido) ? pedido.toppers_pedido[0] : pedido.toppers_pedido;
  const valor = Number(ficha?.valor ?? 0);
  return valor > 0 ? valor : null;
}

/**
 * Valor do pedido: o preço do que foi produzido (a soma dos itens) mais o
 * topper — o encomendado, quando houver, ou o dado de brinde.
 *
 * Os dois entram aqui para aparecer no valor estimado, no que está a receber e
 * na sugestão do valor cobrado na entrega. O custo do topper encomendado
 * continua sendo custo no financeiro quando é pago ao fornecedor.
 */
export function calcularValorFinal(pedido: {
  valor_calculado?: number | null;
  preco_corrigido?: number | null;
  valor_brinde?: number | null;
  topper?: string | null;
  toppers_pedido?: FichaTopperValor | FichaTopperValor[] | null;
}) {
  const producao = pedido.preco_corrigido ?? pedido.valor_calculado ?? null;
  const brinde = pedido.valor_brinde ?? null;
  const topper = valorTopperDoPedido(pedido);
  if (producao == null && brinde == null && topper == null) return null;
  return (producao ?? 0) + (brinde ?? 0) + (topper ?? 0);
}
