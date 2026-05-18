"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  type PedidoComCliente,
  type StatusPedido,
  STATUS_LABELS,
} from "@/types/database";
import { calcularValorFinal, formatCurrency, pedidoAlerta } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

const STATUS_DOT: Record<StatusPedido, string> = {
  rascunho: "bg-amber-400",
  novo: "bg-blue-500",
  produzindo: "bg-yellow-400",
  feito: "bg-green-500",
  entregue: "bg-gray-400",
  cancelado: "bg-red-400",
};

const STATUS_CARD: Record<StatusPedido, string> = {
  rascunho: "border-l-amber-400 bg-amber-50",
  novo: "border-l-blue-400 bg-blue-50",
  produzindo: "border-l-yellow-400 bg-yellow-50",
  feito: "border-l-green-400 bg-green-50",
  entregue: "border-l-gray-300 bg-gray-50",
  cancelado: "border-l-red-300 bg-red-50",
};

type CalView = "mes" | "semana";
const WEEK_HEADER = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface Props {
  pedidos: PedidoComCliente[];
}

export function PedidosCalendar({ pedidos }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calView, setCalView] = useState<CalView>("mes");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const pedidosPorDia = useMemo(() => {
    const map = new Map<string, PedidoComCliente[]>();
    for (const p of pedidos) {
      if (!map.has(p.data_entrega)) map.set(p.data_entrega, []);
      map.get(p.data_entrega)!.push(p);
    }
    return map;
  }, [pedidos]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  function navPrev() {
    setSelectedDay(null);
    setCurrentDate((d) => (calView === "mes" ? subMonths(d, 1) : subWeeks(d, 1)));
  }
  function navNext() {
    setSelectedDay(null);
    setCurrentDate((d) => (calView === "mes" ? addMonths(d, 1) : addWeeks(d, 1)));
  }

  function switchView(v: CalView) {
    setCalView(v);
    setSelectedDay(null);
  }

  function toggleDay(day: Date) {
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day));
  }

  const navLabel =
    calView === "mes"
      ? format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
      : (() => {
          const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
          const we = endOfWeek(currentDate, { weekStartsOn: 1 });
          return `${format(ws, "dd")}–${format(we, "dd/MM")}`;
        })();

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedPedidos = selectedKey ? (pedidosPorDia.get(selectedKey) ?? []) : [];

  return (
    <div className="space-y-3">
      {/* Header de navegação */}
      <div className="flex items-center gap-1">
        <button
          onClick={navPrev}
          className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft size={15} className="text-gray-500" />
        </button>
        <span className="flex-1 text-center text-sm font-semibold text-gray-800 capitalize">
          {navLabel}
        </span>
        <button
          onClick={navNext}
          className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Próximo"
        >
          <ChevronRight size={15} className="text-gray-500" />
        </button>
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg ml-1 flex-shrink-0">
          <button
            onClick={() => switchView("mes")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              calView === "mes"
                ? "bg-white shadow-sm text-gray-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => switchView("semana")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              calView === "semana"
                ? "bg-white shadow-sm text-gray-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Grid do calendário */}
      <div className="card overflow-hidden">
        {calView === "mes" ? (
          <>
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {WEEK_HEADER.map((d) => (
                <div
                  key={d}
                  className="py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide"
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Células mensais */}
            <div className="grid grid-cols-7">
              {monthDays.map((day, i) => {
                const key = format(day, "yyyy-MM-dd");
                const dayPedidos = pedidosPorDia.get(key) ?? [];
                const inMonth = isSameMonth(day, currentDate);
                const today = isToday(day);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                const col = i % 7;
                const row = Math.floor(i / 7);
                const totalRows = Math.ceil(monthDays.length / 7);
                const hasAtrasado = dayPedidos.some(
                  (p) =>
                    pedidoAlerta(p.data_entrega, p.hora_entrega, p.hora_retirada) ===
                      "atrasado" &&
                    p.status !== "entregue" &&
                    p.status !== "cancelado"
                );

                return (
                  <button
                    key={key}
                    onClick={() => toggleDay(day)}
                    className={[
                      "relative p-1.5 text-left min-h-[62px] md:min-h-[84px] transition-colors",
                      col < 6 ? "border-r border-gray-100" : "",
                      row < totalRows - 1 ? "border-b border-gray-100" : "",
                      isSelected
                        ? "bg-brand-50"
                        : inMonth
                        ? "hover:bg-gray-50 active:bg-gray-100"
                        : "bg-gray-50/40",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {/* Número do dia */}
                    <span
                      className={[
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                        today
                          ? "bg-brand-500 text-white font-bold"
                          : inMonth
                          ? "text-gray-700"
                          : "text-gray-300",
                      ].join(" ")}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Indicador de atraso */}
                    {hasAtrasado && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}

                    {/* Mobile: dots de status */}
                    {dayPedidos.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5 md:hidden">
                        {dayPedidos.slice(0, 4).map((p) => (
                          <span
                            key={p.id}
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[p.status]}`}
                          />
                        ))}
                        {dayPedidos.length > 4 && (
                          <span className="text-[9px] font-medium text-gray-400 leading-none self-center">
                            +{dayPedidos.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Desktop: mini cards com nome */}
                    <div className="hidden md:flex flex-col gap-0.5 mt-0.5">
                      {dayPedidos.slice(0, 2).map((p) => (
                        <span
                          key={p.id}
                          className={`text-[10px] leading-snug px-1 py-0.5 rounded-sm border-l-2 truncate ${STATUS_CARD[p.status]}`}
                        >
                          {p.clientes?.nome ?? p.nome_cliente ?? "—"}
                        </span>
                      ))}
                      {dayPedidos.length > 2 && (
                        <span className="text-[9px] text-gray-400 font-medium px-1">
                          +{dayPedidos.length - 2} mais
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* View semanal */
          <div className="divide-y divide-gray-100">
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayPedidos = pedidosPorDia.get(key) ?? [];
              const today = isToday(day);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;

              return (
                <div key={key}>
                  <button
                    onClick={() => toggleDay(day)}
                    className={[
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      isSelected
                        ? "bg-brand-50"
                        : today
                        ? "bg-brand-50/40"
                        : "hover:bg-gray-50 active:bg-gray-100",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0",
                        today ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600",
                      ].join(" ")}
                    >
                      <span className="text-[10px] font-medium leading-none capitalize">
                        {format(day, "EEE", { locale: ptBR })}
                      </span>
                      <span className="text-sm font-bold leading-none mt-0.5">
                        {format(day, "d")}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {dayPedidos.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {dayPedidos.slice(0, 6).map((p) => (
                            <span
                              key={p.id}
                              className={`w-2 h-2 rounded-full ${STATUS_DOT[p.status]}`}
                            />
                          ))}
                          <span className="text-xs text-gray-500 ml-0.5">
                            {dayPedidos.length} pedido{dayPedidos.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">Sem pedidos</span>
                      )}
                    </div>

                    {dayPedidos.length > 0 && (
                      <ChevronRight
                        size={14}
                        className={`flex-shrink-0 transition-transform duration-200 ${
                          isSelected ? "rotate-90 text-brand-400" : "text-gray-300"
                        }`}
                      />
                    )}
                  </button>

                  {/* Cards expandidos na view semanal */}
                  {isSelected && dayPedidos.length > 0 && (
                    <div className="px-4 pb-3 pt-1 space-y-1.5 bg-brand-50/20">
                      {dayPedidos.map((p) => (
                        <PedidoCalCard key={p.id} pedido={p} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Painel de detalhe do dia (view mensal) */}
      {calView === "mes" && selectedDay && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800 capitalize">
              {format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>
          {selectedPedidos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Nenhum pedido neste dia
            </p>
          ) : (
            <div className="space-y-2">
              {selectedPedidos.map((p) => (
                <PedidoCalCard key={p.id} pedido={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legenda de status */}
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap px-1">
        {(
          [
            "novo",
            "produzindo",
            "feito",
            "entregue",
            "rascunho",
            "cancelado",
          ] as StatusPedido[]
        ).map((s) => (
          <div key={s} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
            <span className="text-[10px] text-gray-400">{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PedidoCalCard({ pedido }: { pedido: PedidoComCliente }) {
  const valor = calcularValorFinal(pedido);
  const alerta = pedidoAlerta(
    pedido.data_entrega,
    pedido.hora_entrega,
    pedido.hora_retirada
  );
  const isAtrasado =
    alerta === "atrasado" &&
    pedido.status !== "entregue" &&
    pedido.status !== "cancelado";

  return (
    <Link
      href={`/pedidos/${pedido.id}`}
      className={[
        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-l-[3px] transition-all hover:shadow-sm active:scale-[0.99]",
        isAtrasado ? "border-l-red-400 bg-red-50" : STATUS_CARD[pedido.status],
      ].join(" ")}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[pedido.status]}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">
          {pedido.clientes?.nome ?? pedido.nome_cliente ?? "Sem cliente"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <StatusBadge status={pedido.status} />
          {pedido.hora_entrega && (
            <span className="text-[10px] text-gray-400">{pedido.hora_entrega}</span>
          )}
          {isAtrasado && (
            <span className="text-[10px] font-medium text-red-600">Atrasado</span>
          )}
        </div>
      </div>
      {valor != null && (
        <span className="text-[11px] font-semibold text-emerald-600 flex-shrink-0">
          {formatCurrency(valor)}
        </span>
      )}
    </Link>
  );
}
