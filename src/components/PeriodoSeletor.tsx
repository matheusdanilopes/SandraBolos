"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { PERIODO_PRESETS, getPeriodoRange, type PeriodoPreset } from "@/lib/periodo";
import { setPeriodoCookie } from "@/app/actions/periodo";
import { cn } from "@/lib/utils";

interface Props {
  currentPreset: PeriodoPreset;
  currentDe?: string;
  currentAte?: string;
}

export function PeriodoSeletor({ currentPreset, currentDe, currentAte }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localPreset, setLocalPreset] = useState<PeriodoPreset>(currentPreset);
  const [localDe, setLocalDe] = useState(currentDe ?? "");
  const [localAte, setLocalAte] = useState(currentAte ?? "");
  const [showCustom, setShowCustom] = useState(currentPreset === "personalizado");

  // Sync when server re-renders with updated cookie values
  useEffect(() => {
    setLocalPreset(currentPreset);
    setLocalDe(currentDe ?? "");
    setLocalAte(currentAte ?? "");
    setShowCustom(currentPreset === "personalizado");
  }, [currentPreset, currentDe, currentAte]);

  function handlePreset(preset: PeriodoPreset) {
    if (preset === "personalizado") {
      setLocalPreset("personalizado");
      setShowCustom(true);
      return;
    }
    setLocalPreset(preset);
    setShowCustom(false);
    startTransition(async () => {
      await setPeriodoCookie(preset);
      router.refresh();
    });
  }

  function handleAplicarCustom() {
    if (!localDe || !localAte || localDe > localAte) return;
    startTransition(async () => {
      await setPeriodoCookie("personalizado", localDe, localAte);
      router.refresh();
    });
    setShowCustom(false);
  }

  const periodo = getPeriodoRange(localPreset, localDe || undefined, localAte || undefined);

  return (
    <div className="space-y-2">
      {/* Preset pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
        {PERIODO_PRESETS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handlePreset(value)}
            disabled={isPending}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-60",
              localPreset === value
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date range inputs */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={localDe}
            max={localAte || undefined}
            onChange={(e) => setLocalDe(e.target.value)}
            className="input text-xs flex-1 py-1.5"
          />
          <span className="text-gray-400 text-xs flex-shrink-0">até</span>
          <input
            type="date"
            value={localAte}
            min={localDe || undefined}
            onChange={(e) => setLocalAte(e.target.value)}
            className="input text-xs flex-1 py-1.5"
          />
          <button
            onClick={handleAplicarCustom}
            disabled={!localDe || !localAte || localDe > localAte || isPending}
            className="btn-primary text-xs px-3 py-1.5 flex-shrink-0 disabled:opacity-50"
          >
            OK
          </button>
        </div>
      )}

      {/* Current period label */}
      {!showCustom && (
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          {isPending ? (
            <Loader2 size={11} className="animate-spin text-brand-400" />
          ) : (
            <Calendar size={11} className="text-gray-400" />
          )}
          <span className="capitalize">{periodo.label}</span>
        </p>
      )}
    </div>
  );
}
