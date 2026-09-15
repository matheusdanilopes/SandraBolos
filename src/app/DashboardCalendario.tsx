"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  STATUS_LABELS,
  TIPO_LABELS,
  type PedidoCalendario,
  type StatusPedido,
} from "@/types/database";
import {
  agruparPorDataEntrega,
  chaveDia,
  diasDaView,
  navegarPeriodo,
  rotuloPeriodo,
  WEEK_HEADER,
  type CalView,
} from "@/lib/calendario";
import { StatusBadge } from "@/components/StatusBadge";

const STATUS_ORDEM: StatusPedido[] = [
  "rascunho",
  "novo",
  "produzindo",
  "feito",
  "entregue",
];

const STATUS_DOT: Record<StatusPedido, string> = {
  rascunho: "bg-amber-400",
  novo: "bg-blue-500",
  produzindo: "bg-yellow-400",
  feito: "bg-green-500",
  entregue: "bg-gray-400",
  cancelado: "bg-red-400",
};

/**
 * Quanto mais pedidos no dia, mais forte o tom: a carga da semana aparece antes
 * de a pessoa ler os números um a um.
 */
function volumeClasses(qtd: number): string {
  if (qtd <= 2) return "bg-brand-100 text-brand-700";
  if (qtd <= 4) return "bg-brand-300 text-brand-900";
  return "bg-brand-500 text-white";
}

interface Props {
  pedidos: PedidoCalendario[];
}

export function DashboardCalendario({ pedidos }: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calView, setCalView] = useState<CalView>("mes");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const pedidosPorDia = useMemo(() => agruparPorDataEntrega(pedidos), [pedidos]);

  const dias = useMemo(
    () => diasDaView(currentDate, calView),
    [currentDate, calView]
  );

  /** Só os dias do período em si — a grade do mês mostra sobras das semanas vizinhas. */
  const diasDoPeriodo = useMemo(
    () =>
      calView === "mes"
        ? dias.filter((d) => isSameMonth(d, currentDate))
        : dias,
    [dias, calView, currentDate]
  );

  const resumo = useMemo(() => {
    let total = 0;
    let maxQtd = 0;
    let maxDia: Date | null = null;
    for (const dia of diasDoPeriodo) {
      const qtd = pedidosPorDia.get(chaveDia(dia))?.length ?? 0;
      total += qtd;
      if (qtd > maxQtd) {
        maxQtd = qtd;
        maxDia = dia;
      }
    }
    return { total, maxQtd, maxDia };
  }, [diasDoPeriodo, pedidosPorDia]);

  const navPrev = useCallback(() => {
    setSelectedDay(null);
    setCurrentDate((d) => navegarPeriodo(d, calView, -1));
  }, [calView]);

  const navNext = useCallback(() => {
    setSelectedDay(null);
    setCurrentDate((d) => navegarPeriodo(d, calView, 1));
  }, [calView]);

  const irParaHoje = useCallback(() => {
    setSelectedDay(null);
    setCurrentDate(new Date());
  }, []);

  const switchView = useCallback((v: CalView) => {
    setCalView(v);
    setSelectedDay(null);
  }, []);

  const toggleDay = useCallback((day: Date) => {
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day));
  }, []);

  const mostrandoHoje = dias.some((d) => isToday(d));
  const navLabel = rotuloPeriodo(currentDate, calView);

  const selectedPedidos = selectedDay
    ? pedidosPorDia.get(chaveDia(selectedDay)) ?? []
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <CalendarDays size={14} className="text-brand-500" />
          Agenda de Entregas
        </h2>
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg flex-shrink-0">
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

      <div className="card overflow-hidden">
        {/* Navegação do período */}
        <div className="flex items-center gap-1 px-1.5 py-1.5 border-b border-gray-100">
          <button
            onClick={navPrev}
            className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Período anterior"
          >
            <ChevronLeft size={15} className="text-gray-500" />
          </button>
          <span className="flex-1 text-center text-sm font-semibold text-gray-800 first-letter:uppercase">
            {navLabel}
          </span>
          {!mostrandoHoje && (
            <button
              onClick={irParaHoje}
              className="px-2 py-1 rounded-lg text-[11px] font-medium text-brand-600 hover:bg-brand-50 active:bg-brand-100 transition-colors"
            >
              Hoje
            </button>
          )}
          <button
            onClick={navNext}
            className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Próximo período"
          >
            <ChevronRight size={15} className="text-gray-500" />
          </button>
        </div>

        {calView === "mes" ? (
          <MesGrid
            dias={dias}
            currentDate={currentDate}
            pedidosPorDia={pedidosPorDia}
            selectedDay={selectedDay}
            onSelect={toggleDay}
          />
        ) : (
          <SemanaGrid
            dias={dias}
            pedidosPorDia={pedidosPorDia}
            maxQtd={resumo.maxQtd}
            selectedDay={selectedDay}
            onSelect={toggleDay}
          />
        )}

        {/* Resumo do período */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50/60">
          <span className="text-[11px] text-gray-500">
            <strong className="font-semibold text-gray-700">{resumo.total}</strong>{" "}
            pedido{resumo.total !== 1 ? "s" : ""}{" "}
            {calView === "mes" ? "no mês" : "na semana"}
          </span>
          {resumo.maxDia && resumo.maxQtd > 1 && (
            <span className="text-[11px] text-gray-400 truncate">
              Dia mais cheio: {format(resumo.maxDia, "dd/MM")} ({resumo.maxQtd})
            </span>
          )}
        </div>
      </div>

      {/* Detalhe do dia escolhido */}
      {selectedDay && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-800 first-letter:uppercase">
              {format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              <span className="text-gray-400 font-normal ml-1.5">
                ({selectedPedidos.length})
              </span>
            </p>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Fechar detalhe do dia"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>

          {selectedPedidos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Nenhum pedido neste dia
            </p>
          ) : (
            <>
              <ResumoStatus pedidos={selectedPedidos} />
              <div className="space-y-1.5">
                {selectedPedidos.map((p) => (
                  <PedidoDoDia key={p.id} pedido={p} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface GridProps {
  dias: Date[];
  pedidosPorDia: Map<string, PedidoCalendario[]>;
  selectedDay: Date | null;
  onSelect: (day: Date) => void;
}

const MesGrid = memo(function MesGrid({
  dias,
  currentDate,
  pedidosPorDia,
  selectedDay,
  onSelect,
}: GridProps & { currentDate: Date }) {
  const totalLinhas = Math.ceil(dias.length / 7);

  return (
    <>
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEK_HEADER.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((day, i) => {
          const key = chaveDia(day);
          const qtd = pedidosPorDia.get(key)?.length ?? 0;
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const col = i % 7;
          const row = Math.floor(i / 7);

          return (
            <button
              key={key}
              onClick={() => onSelect(day)}
              aria-label={`${format(day, "dd/MM")} — ${qtd} pedido${qtd !== 1 ? "s" : ""}`}
              className={[
                "flex flex-col items-center gap-1 py-2 min-h-[58px] transition-colors",
                col < 6 ? "border-r border-gray-100" : "",
                row < totalLinhas - 1 ? "border-b border-gray-100" : "",
                isSelected
                  ? "bg-brand-50"
                  : inMonth
                  ? "hover:bg-gray-50 active:bg-gray-100"
                  : "bg-gray-50/40",
              ]
                .filter(Boolean)
                .join(" ")}
            >
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

              {qtd > 0 ? (
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold leading-none ${volumeClasses(qtd)}`}
                >
                  {qtd}
                </span>
              ) : (
                <span className="h-5" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
});

const SemanaGrid = memo(function SemanaGrid({
  dias,
  pedidosPorDia,
  maxQtd,
  selectedDay,
  onSelect,
}: GridProps & { maxQtd: number }) {
  return (
    <div className="grid grid-cols-7">
      {dias.map((day, i) => {
        const key = chaveDia(day);
        const doDia = pedidosPorDia.get(key) ?? [];
        const qtd = doDia.length;
        const today = isToday(day);
        const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
        /** Barra proporcional ao dia mais cheio da semana — 28px no topo. */
        const alturaBarra = maxQtd > 0 ? Math.round((qtd / maxQtd) * 28) : 0;

        return (
          <button
            key={key}
            onClick={() => onSelect(day)}
            aria-label={`${format(day, "dd/MM")} — ${qtd} pedido${qtd !== 1 ? "s" : ""}`}
            className={[
              "flex flex-col items-center gap-1 pt-2 pb-2.5 transition-colors",
              i < 6 ? "border-r border-gray-100" : "",
              isSelected
                ? "bg-brand-50"
                : today
                ? "bg-brand-50/40"
                : "hover:bg-gray-50 active:bg-gray-100",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="text-[10px] font-semibold text-gray-400 uppercase">
              {WEEK_HEADER[i]}
            </span>
            <span
              className={[
                "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                today ? "bg-brand-500 text-white font-bold" : "text-gray-700",
              ].join(" ")}
            >
              {format(day, "d")}
            </span>

            {/* Barra de volume do dia */}
            <span className="flex items-end h-[28px]">
              {qtd > 0 && (
                <span
                  className="w-4 rounded-t-sm bg-brand-400"
                  style={{ height: `${Math.max(alturaBarra, 4)}px` }}
                />
              )}
            </span>

            {qtd > 0 ? (
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold leading-none ${volumeClasses(qtd)}`}
              >
                {qtd}
              </span>
            ) : (
              <span className="text-[11px] text-gray-300 leading-none h-5 flex items-center">
                —
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

/** Quantos pedidos do dia estão em cada etapa. */
const ResumoStatus = memo(function ResumoStatus({
  pedidos,
}: {
  pedidos: PedidoCalendario[];
}) {
  const contagem = useMemo(() => {
    const acc = new Map<StatusPedido, number>();
    for (const p of pedidos) acc.set(p.status, (acc.get(p.status) ?? 0) + 1);
    return acc;
  }, [pedidos]);

  return (
    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
      {STATUS_ORDEM.filter((s) => contagem.has(s)).map((s) => (
        <div key={s} className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
          <span className="text-[11px] text-gray-500">
            {STATUS_LABELS[s]} ({contagem.get(s)})
          </span>
        </div>
      ))}
    </div>
  );
});

const PedidoDoDia = memo(function PedidoDoDia({
  pedido,
}: {
  pedido: PedidoCalendario;
}) {
  const hora = pedido.hora_entrega || pedido.hora_retirada;

  return (
    <Link
      href={`/pedidos/${pedido.id}`}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors"
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
          <span className="text-[10px] text-gray-400">
            {TIPO_LABELS[pedido.tipo]}
          </span>
          {hora && <span className="text-[10px] text-gray-400">{hora}</span>}
        </div>
      </div>
      <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
    </Link>
  );
});
