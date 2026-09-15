"use client";

import { format } from "date-fns";
import { CalendarRange, ChefHat, CheckCircle2, Clock, Sun, Truck } from "lucide-react";
import { formatCurrency, formatTime } from "@/lib/utils";
import { semanaDe } from "@/lib/calendario";
import type { ResumoEntregas } from "@/lib/resumoDashboard";

const pesoFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

/** "6,5 kg · 200 un" — só as unidades que realmente aparecem nos pedidos. */
function descreverCarga(peso: number, unidades: number): string | null {
  const partes: string[] = [];
  if (peso > 0) partes.push(`${pesoFormatter.format(peso)} kg`);
  if (unidades > 0) partes.push(`${pesoFormatter.format(unidades)} un`);
  return partes.length > 0 ? partes.join(" · ") : null;
}

function plural(qtd: number, singular: string, plural: string): string {
  return qtd === 1 ? singular : plural;
}

function Pill({
  icone,
  texto,
  classes,
}: {
  icone: React.ReactNode;
  texto: string;
  classes: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${classes}`}
    >
      {icone}
      {texto}
    </span>
  );
}

/** Pills de situação usadas nos dois cards: o que falta assar, o que já está pronto. */
function SituacaoPills({ resumo }: { resumo: ResumoEntregas }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {resumo.aProduzir > 0 && (
        <Pill
          icone={<ChefHat size={11} />}
          texto={`${resumo.aProduzir} a produzir`}
          classes="bg-yellow-100 text-yellow-800"
        />
      )}
      {resumo.prontos > 0 && (
        <Pill
          icone={<CheckCircle2 size={11} />}
          texto={`${resumo.prontos} ${plural(resumo.prontos, "pronto", "prontos")}`}
          classes="bg-green-100 text-green-800"
        />
      )}
      {resumo.entregues > 0 && (
        <Pill
          icone={<Truck size={11} />}
          texto={`${resumo.entregues} ${plural(resumo.entregues, "entregue", "entregues")}`}
          classes="bg-gray-100 text-gray-600"
        />
      )}
    </div>
  );
}

interface Props {
  hoje: ResumoEntregas;
  semana: ResumoEntregas;
  filtroHojeAtivo: boolean;
  onFiltrarHoje: () => void;
  onFiltrarSemana: () => void;
  filtroSemanaAtivo: boolean;
}

export function DashboardResumo({
  hoje,
  semana,
  filtroHojeAtivo,
  onFiltrarHoje,
  filtroSemanaAtivo,
  onFiltrarSemana,
}: Props) {
  const { inicio, fim } = semanaDe(new Date());
  const rotuloSemana = `${format(inicio, "dd/MM")} a ${format(fim, "dd/MM")}`;

  const cargaHoje = descreverCarga(hoje.pesoAProduzir, hoje.unidadesAProduzir);
  const cargaSemana = descreverCarga(semana.pesoAProduzir, semana.unidadesAProduzir);

  return (
    <div className="space-y-3">
      {/* Hoje: o que ainda tem que sair da cozinha e a que horas */}
      <button
        onClick={onFiltrarHoje}
        className={`card w-full p-4 text-left transition-all active:scale-[0.99] ${
          filtroHojeAtivo ? "ring-2 ring-brand-400 shadow-md" : "hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <Sun size={13} className="text-brand-500" />
            Hoje
          </span>
          {hoje.valorPendente > 0 && (
            <span className="text-right leading-tight">
              <span className="block text-sm font-semibold text-emerald-600">
                {formatCurrency(hoje.valorPendente)}
              </span>
              <span className="block text-[10px] text-gray-400">a receber hoje</span>
            </span>
          )}
        </div>

        {hoje.total === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma entrega marcada para hoje</p>
        ) : hoje.pendentes === 0 ? (
          <p className="text-sm font-medium text-green-700">
            Tudo entregue — {hoje.entregues} {plural(hoje.entregues, "entrega", "entregas")} hoje 🎉
          </p>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-brand-600 leading-none">
                {hoje.pendentes}
              </span>
              <span className="text-sm text-gray-600">
                {plural(hoje.pendentes, "entrega pendente", "entregas pendentes")}
                {hoje.entregues > 0 && (
                  <span className="text-gray-400"> de {hoje.total}</span>
                )}
              </span>
            </div>

            <SituacaoPills resumo={hoje} />

            {cargaHoje && (
              <p className="text-xs text-gray-500">
                Falta produzir <span className="font-medium text-gray-700">{cargaHoje}</span>
              </p>
            )}

            {hoje.proxima && (
              <p className="flex items-center gap-1.5 text-xs text-gray-600 pt-0.5">
                <Clock size={12} className="text-brand-500 flex-shrink-0" />
                <span className="text-gray-400">Próxima</span>
                <span className="font-medium">
                  {hoje.proxima.hora ? formatTime(hoje.proxima.hora) : "Sem hora"}
                </span>
                <span className="text-gray-300">·</span>
                <span className="truncate">{hoje.proxima.nome}</span>
              </p>
            )}
          </div>
        )}
      </button>

      {/* Semana: o que vem pela frente antes de virar urgência */}
      <button
        onClick={onFiltrarSemana}
        className={`card w-full p-4 text-left transition-all active:scale-[0.99] ${
          filtroSemanaAtivo ? "ring-2 ring-indigo-400 shadow-md" : "hover:shadow-md"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-0">
            <CalendarRange size={13} className="text-indigo-500 flex-shrink-0" />
            Esta semana
            <span className="font-normal normal-case tracking-normal text-[11px] text-gray-400 truncate">
              {rotuloSemana}
            </span>
          </span>
          {semana.valorPendente > 0 && (
            <span className="text-right leading-tight flex-shrink-0">
              <span className="block text-sm font-semibold text-emerald-600">
                {formatCurrency(semana.valorPendente)}
              </span>
              <span className="block text-[10px] text-gray-400">a receber</span>
            </span>
          )}
        </div>

        {semana.total === 0 ? (
          <p className="text-sm text-gray-400">Semana sem entregas marcadas</p>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-indigo-600 leading-none">
                {semana.pendentes}
              </span>
              <span className="text-sm text-gray-600">
                {plural(semana.pendentes, "entrega pendente", "entregas pendentes")}
                {semana.entregues > 0 && (
                  <span className="text-gray-400"> de {semana.total}</span>
                )}
              </span>
            </div>

            <SituacaoPills resumo={semana} />

            {cargaSemana && (
              <p className="text-xs text-gray-500">
                Falta produzir <span className="font-medium text-gray-700">{cargaSemana}</span>
              </p>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
