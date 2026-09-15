"use client";

import Link from "next/link";
import { memo, useState, useMemo, useCallback } from "react";
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { isEntregaHoje, isEntregaSemana, pedidoAlerta, formatCurrency, calcularValorFinal, pedidoNumero } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertaBadge } from "@/components/AlertaBadge";
import {
  TIPO_LABELS,
  STATUS_LABELS,
  type PedidoCalendario,
  type PedidoComCliente,
  type StatusPedido,
} from "@/types/database";
import { DashboardCalendario } from "./DashboardCalendario";
import { DashboardResumo } from "./DashboardResumo";
import { resumoDaSemana, resumoDeHoje } from "@/lib/resumoDashboard";
import {
  AlertTriangle,
  X,
  TrendingUp,
  Banknote,
  FileEdit,
  ChevronRight,
} from "lucide-react";

type Filtro = "todos" | "hoje" | "semana" | "produzindo" | "feito" | "atrasados";

const FILTRO_LABELS: Record<Filtro, string> = {
  todos: "Todos os Pedidos Ativos",
  hoje: "Entregas de Hoje",
  semana: "Entregas da Semana",
  produzindo: "Em Produção",
  feito: "Prontos para Entregar",
  atrasados: "Atrasados",
};

/** Recortes que têm uma contagem própria — "todos" é o estado sem filtro. */
type FiltroContavel = Exclude<Filtro, "todos">;

/** Ordem dos atalhos de filtro acima da lista — do mais urgente ao mais amplo. */
const FILTRO_CHIPS: { valor: FiltroContavel; label: string }[] = [
  { valor: "atrasados", label: "Atrasados" },
  { valor: "hoje", label: "Hoje" },
  { valor: "semana", label: "Semana" },
  { valor: "produzindo", label: "Produzindo" },
  { valor: "feito", label: "Prontos" },
];

const STATUS_ORDER: StatusPedido[] = ["novo", "produzindo", "feito", "entregue"];

const STATUS_DOT: Record<StatusPedido, string> = {
  rascunho: "bg-amber-400",
  novo: "bg-blue-400",
  produzindo: "bg-yellow-400",
  feito: "bg-green-400",
  entregue: "bg-gray-300",
  cancelado: "bg-red-300",
};

interface Props {
  pedidos: PedidoComCliente[];
  receitaPeriodo: number;
  periodoLabel: string;
  aReceber: number;
  pedidosCalendario: PedidoCalendario[];
}

function getDayLabel(dateStr: string): { label: string; variant: "atrasado" | "hoje" | "amanha" | "normal" } {
  const date = parseISO(dateStr);
  if (isPast(date) && !isToday(date)) return { label: `Atrasado — ${format(date, "dd/MM", { locale: ptBR })}`, variant: "atrasado" };
  if (isToday(date)) return { label: `Hoje — ${format(date, "dd/MM", { locale: ptBR })}`, variant: "hoje" };
  if (isTomorrow(date)) return { label: `Amanhã — ${format(date, "dd/MM", { locale: ptBR })}`, variant: "amanha" };
  return { label: format(date, "EEEE, dd/MM", { locale: ptBR }), variant: "normal" };
}

const DAY_VARIANT_CLASSES = {
  atrasado: "text-red-700 bg-red-50 border border-red-200",
  hoje: "text-brand-700 bg-brand-50 border border-brand-200",
  amanha: "text-orange-700 bg-orange-50 border border-orange-200",
  normal: "text-gray-600 bg-gray-100 border border-gray-200",
};

export function DashboardClient({
  pedidos,
  receitaPeriodo,
  periodoLabel,
  aReceber,
  pedidosCalendario,
}: Props) {
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const rascunhos = useMemo(() => pedidos.filter((p) => p.status === "rascunho"), [pedidos]);
  const pedidosAtivos = useMemo(() => pedidos.filter((p) => p.status !== "rascunho"), [pedidos]);

  const grupos = useMemo(() => ({
    hoje: pedidosAtivos.filter((p) => isEntregaHoje(p.data_entrega)),
    semana: pedidosAtivos.filter((p) => isEntregaSemana(p.data_entrega)),
    produzindo: pedidosAtivos.filter((p) => p.status === "produzindo"),
    feito: pedidosAtivos.filter((p) => p.status === "feito"),
    atrasados: pedidosAtivos.filter(
      (p) =>
        pedidoAlerta(p.data_entrega, p.hora_entrega, p.hora_retirada) === "atrasado" &&
        p.status !== "entregue"
    ),
  }), [pedidosAtivos]);

  const resumoHoje = useMemo(
    () => resumoDeHoje(pedidosAtivos, pedidosCalendario),
    [pedidosAtivos, pedidosCalendario]
  );

  const resumoSemana = useMemo(
    () => resumoDaSemana(pedidosAtivos, pedidosCalendario),
    [pedidosAtivos, pedidosCalendario]
  );

  const filtrados = useMemo(() => (
    filtro === "hoje" ? grupos.hoje
    : filtro === "semana" ? grupos.semana
    : filtro === "produzindo" ? grupos.produzindo
    : filtro === "feito" ? grupos.feito
    : filtro === "atrasados" ? grupos.atrasados
    : pedidosAtivos
  ), [filtro, grupos, pedidosAtivos]);

  const porDia = useMemo(() => filtrados.reduce((acc, p) => {
    const dia = p.data_entrega;
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(p);
    return acc;
  }, {} as Record<string, PedidoComCliente[]>), [filtrados]);

  const diasOrdenados = useMemo(() => Object.keys(porDia).sort(), [porDia]);

  const isFiltroStatus = filtro === "produzindo" || filtro === "feito";

  const toggleFiltro = useCallback((f: Filtro) => {
    setFiltro((prev) => (prev === f ? "todos" : f));
  }, []);

  return (
    <div className="space-y-5">
      {/* Atrasados vêm antes de tudo: é o único indicador que pede ação agora */}
      {grupos.atrasados.length > 0 && (
        <button
          onClick={() => toggleFiltro("atrasados")}
          className={`w-full flex items-center gap-3 p-3.5 bg-red-50 border rounded-xl text-left transition-colors hover:bg-red-100 active:bg-red-200 ${
            filtro === "atrasados" ? "border-red-400 ring-2 ring-red-200" : "border-red-200"
          }`}
        >
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800">
              {grupos.atrasados.length} pedido{grupos.atrasados.length !== 1 ? "s" : ""} atrasado
              {grupos.atrasados.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {filtro === "atrasados" ? "Mostrando só os atrasados" : "Toque para ver só esses"}
            </p>
          </div>
          <ChevronRight size={16} className="text-red-400 flex-shrink-0" />
        </button>
      )}

      {/* Resumo de hoje e da semana */}
      <DashboardResumo
        hoje={resumoHoje}
        semana={resumoSemana}
        filtroHojeAtivo={filtro === "hoje"}
        onFiltrarHoje={() => toggleFiltro("hoje")}
        filtroSemanaAtivo={filtro === "semana"}
        onFiltrarSemana={() => toggleFiltro("semana")}
      />

      {/* Indicador de rascunhos */}
      {rascunhos.length > 0 && (
        <Link
          href="/pedidos"
          className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 active:bg-amber-200 transition-colors"
        >
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileEdit size={16} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {rascunhos.length} rascunho{rascunhos.length !== 1 ? "s" : ""} incompleto{rascunhos.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Toque para ver e completar</p>
          </div>
          <ChevronRight size={16} className="text-amber-400 flex-shrink-0" />
        </Link>
      )}

      {/* Resumo financeiro */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <div className="p-1 bg-emerald-50 rounded-md">
              <TrendingUp size={12} className="text-emerald-600" />
            </div>
            <span className="truncate">{periodoLabel}</span>
          </div>
          <div className="text-lg font-bold text-emerald-600 leading-tight">
            {formatCurrency(receitaPeriodo)}
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
            <div className="p-1 bg-blue-50 rounded-md">
              <Banknote size={12} className="text-blue-600" />
            </div>
            A Receber
          </div>
          <div className="text-lg font-bold text-blue-600 leading-tight">
            {aReceber > 0 ? formatCurrency(aReceber) : <span className="text-gray-400 font-normal text-sm">Nenhum pendente</span>}
          </div>
        </div>
      </div>

      {/* Calendário de entregas */}
      <DashboardCalendario pedidos={pedidosCalendario} />

      {/* Lista filtrada */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">
            {FILTRO_LABELS[filtro]}
            <span className="text-gray-400 font-normal ml-1.5">({filtrados.length})</span>
          </h2>
          {filtro !== "todos" && (
            <button
              onClick={() => setFiltro("todos")}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={12} /> Limpar
            </button>
          )}
        </div>

        {/* Atalhos de recorte da lista — os contadores viraram filtro, não enfeite */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 mb-3">
          {FILTRO_CHIPS.map(({ valor, label }) => {
            const qtd = grupos[valor].length;
            if (qtd === 0 && filtro !== valor) return null;
            const ativo = filtro === valor;
            return (
              <button
                key={valor}
                onClick={() => toggleFiltro(valor)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  ativo
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
                <span className={ativo ? "ml-1 text-gray-300" : "ml-1 text-gray-400"}>{qtd}</span>
              </button>
            );
          })}
        </div>

        {filtrados.length === 0 ? (
          <div className="card p-8 text-center space-y-3">
            <span className="text-4xl block">🎂</span>
            <p className="text-sm text-gray-400">
              {filtro === "todos"
                ? "Nenhum pedido ativo no momento"
                : `Nenhum pedido em "${FILTRO_LABELS[filtro].toLowerCase()}"`}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {diasOrdenados.map((dia) => {
              const { label, variant } = getDayLabel(dia);
              const pedidosDoDia = porDia[dia];

              const mostrarSubgrupos = !isFiltroStatus;

              if (mostrarSubgrupos) {
                const porStatus = STATUS_ORDER.reduce((acc, s) => {
                  const grupo = pedidosDoDia.filter((p) => p.status === s);
                  if (grupo.length > 0) acc[s] = grupo;
                  return acc;
                }, {} as Partial<Record<StatusPedido, PedidoComCliente[]>>);

                return (
                  <div key={dia}>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 capitalize ${DAY_VARIANT_CLASSES[variant]}`}>
                      {variant === "atrasado" && <AlertTriangle size={10} />}
                      {label}
                    </div>
                    <div className="space-y-4">
                      {(Object.entries(porStatus) as [StatusPedido, PedidoComCliente[]][]).map(([status, lista]) => (
                        <div key={status}>
                          <div className="flex items-center gap-1.5 mb-2 px-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
                            <span className="text-xs font-medium text-gray-500">
                              {STATUS_LABELS[status]} ({lista.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {lista.map((pedido) => (
                              <PedidoCard key={pedido.id} pedido={pedido} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={dia}>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 capitalize ${DAY_VARIANT_CLASSES[variant]}`}>
                    {variant === "atrasado" && <AlertTriangle size={10} />}
                    {label}
                  </div>
                  <div className="space-y-2">
                    {pedidosDoDia.map((pedido) => (
                      <PedidoCard key={pedido.id} pedido={pedido} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const PedidoCard = memo(function PedidoCard({ pedido }: { pedido: PedidoComCliente }) {
  const valor = calcularValorFinal(pedido);
  const numero = pedidoNumero(pedido.created_at, pedido.id);

  return (
    <Link
      href={`/pedidos/${pedido.id}`}
      className="card p-3.5 block hover:shadow-md transition-shadow active:bg-gray-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="font-semibold text-sm text-gray-900 truncate">
              {pedido.clientes?.nome ?? pedido.nome_cliente ?? "Sem cliente"}
            </span>
            <StatusBadge status={pedido.status} />
            <AlertaBadge
              dataEntrega={pedido.data_entrega}
              status={pedido.status}
              horaEntrega={pedido.hora_entrega}
              horaRetirada={pedido.hora_retirada}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">{TIPO_LABELS[pedido.tipo]}</span>
            {pedido.peso && (
              <span className="text-xs text-gray-400">{pedido.peso} kg</span>
            )}
            {pedido.quantidade && (
              <span className="text-xs text-gray-400">{pedido.quantidade} un.</span>
            )}
            <span className="text-gray-300">·</span>
            <span className="text-[10px] text-gray-400 font-mono">{numero}</span>
          </div>
        </div>
        {valor != null && (
          <span className="text-sm font-semibold text-emerald-600 flex-shrink-0">
            {formatCurrency(valor)}
          </span>
        )}
      </div>
    </Link>
  );
});
