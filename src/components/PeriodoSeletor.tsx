"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  PERIODO_PRESETS,
  getPeriodoRange,
  deslocarPeriodo,
  isRangeDeMesesInteiros,
  type PeriodoPreset,
} from "@/lib/periodo";
import { setPeriodoCookie } from "@/app/actions/periodo";
import { cn } from "@/lib/utils";

interface Props {
  currentPreset: PeriodoPreset;
  currentDe?: string;
  currentAte?: string;
}

// "Personalizado" tem seção própria no painel, com os campos de data.
const PRESETS_RAPIDOS = PERIODO_PRESETS.filter((p) => p.value !== "personalizado");

export function PeriodoSeletor({ currentPreset, currentDe, currentAte }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preset, setPreset] = useState<PeriodoPreset>(currentPreset);
  const [de, setDe] = useState(currentDe ?? "");
  const [ate, setAte] = useState(currentAte ?? "");
  const [aberto, setAberto] = useState(false);

  // Sync when server re-renders with updated cookie values
  useEffect(() => {
    setPreset(currentPreset);
    setDe(currentDe ?? "");
    setAte(currentAte ?? "");
  }, [currentPreset, currentDe, currentAte]);

  useEffect(() => {
    if (!aberto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aberto]);

  const periodo = getPeriodoRange(preset, de || undefined, ate || undefined);
  const podeNavegar = isRangeDeMesesInteiros(periodo.inicio, periodo.fim);

  function aplicar(novoPreset: PeriodoPreset, novoDe?: string, novoAte?: string) {
    setPreset(novoPreset);
    setDe(novoDe ?? "");
    setAte(novoAte ?? "");
    setAberto(false);
    startTransition(async () => {
      await setPeriodoCookie(novoPreset, novoDe, novoAte);
      router.refresh();
    });
  }

  function alternarPainel() {
    // Ao abrir, já deixa os campos de data preenchidos com o período atual —
    // assim dá para ajustar só uma das pontas.
    if (!aberto) {
      if (!de) setDe(periodo.inicio);
      if (!ate) setAte(periodo.fim);
    }
    setAberto((v) => !v);
  }

  function navegar(delta: number) {
    const destino = deslocarPeriodo(periodo.inicio, periodo.fim, delta);
    if (!destino) return;
    aplicar(destino.preset, destino.de, destino.ate);
  }

  const customInvalido = !de || !ate || de > ate;

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => navegar(-1)}
          disabled={!podeNavegar || isPending}
          aria-label="Período anterior do filtro"
          className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          onClick={alternarPainel}
          aria-expanded={aberto}
          aria-haspopup="dialog"
          className={cn(
            "flex-1 min-w-0 h-10 flex items-center gap-2 px-3 rounded-lg border transition-colors",
            aberto
              ? "border-brand-300 bg-brand-50"
              : "border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
          )}
        >
          {isPending ? (
            <Loader2 size={16} className="flex-shrink-0 animate-spin text-brand-500" />
          ) : (
            <CalendarDays size={16} className="flex-shrink-0 text-brand-500" />
          )}
          <span className="flex-1 min-w-0 truncate text-left text-sm font-semibold text-gray-800">
            {periodo.label}
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "flex-shrink-0 text-gray-400 transition-transform",
              aberto && "rotate-180"
            )}
          />
        </button>

        <button
          type="button"
          onClick={() => navegar(1)}
          disabled={!podeNavegar || isPending}
          aria-label="Próximo período do filtro"
          className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {aberto && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAberto(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Escolher período"
            className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
          >
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS_RAPIDOS.map(({ value, label }, i) => {
                const ativo = preset === value;
                // Item ímpar sozinho na última linha ocupa a largura toda.
                const sozinho =
                  i === PRESETS_RAPIDOS.length - 1 && PRESETS_RAPIDOS.length % 2 === 1;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => aplicar(value)}
                    className={cn(
                      "h-10 flex items-center justify-between gap-1 px-3 rounded-lg border text-sm font-medium transition-colors",
                      sozinho && "col-span-2",
                      ativo
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                    )}
                  >
                    <span className="truncate">{label}</span>
                    {ativo && <Check size={15} className="flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-medium text-gray-500">
                Escolher datas
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-gray-400">De</span>
                  <input
                    type="date"
                    value={de}
                    max={ate || undefined}
                    onChange={(e) => setDe(e.target.value)}
                    className="input text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-gray-400">Até</span>
                  <input
                    type="date"
                    value={ate}
                    min={de || undefined}
                    onChange={(e) => setAte(e.target.value)}
                    className="input text-sm"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (customInvalido) return;
                  aplicar("personalizado", de, ate);
                }}
                disabled={customInvalido || isPending}
                className="btn-primary mt-2 w-full text-sm"
              >
                Aplicar datas
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
