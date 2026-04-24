"use client";

import { useTransition } from "react";
import { avancarStatusAction, voltarStatusAction } from "./actions";
import { STATUS_LABELS, type StatusPedido } from "@/types/database";
import { Check, ChevronLeft } from "lucide-react";

const STATUS_ORDER: StatusPedido[] = ["novo", "produzindo", "feito", "entregue"];

interface Props {
  pedidoId: string;
  currentStatus: StatusPedido;
  proximoStatus: StatusPedido | null;
}

export function StatusActions({ pedidoId, currentStatus, proximoStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const statusAnterior = currentIndex > 0 ? STATUS_ORDER[currentIndex - 1] : null;

  function avancarStatus() {
    if (!proximoStatus) return;
    startTransition(async () => {
      await avancarStatusAction(pedidoId, proximoStatus);
    });
  }

  function voltarStatus() {
    if (!statusAnterior) return;
    if (!confirm(`Voltar para "${STATUS_LABELS[statusAnterior]}"?`)) return;
    startTransition(async () => {
      await voltarStatusAction(pedidoId, statusAnterior);
    });
  }

  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold text-sm text-gray-700">Status do Pedido</h2>

      {/* Stepper */}
      <div className="flex items-start">
        {STATUS_ORDER.map((status, i) => {
          const idx = STATUS_ORDER.indexOf(status);
          const isDone = idx < currentIndex;
          const isActive = status === currentStatus;
          const isLast = i === STATUS_ORDER.length - 1;

          return (
            <div key={status} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isDone
                      ? "bg-brand-600 text-white"
                      : isActive
                      ? "bg-brand-600 text-white ring-4 ring-brand-100"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isDone ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1.5 text-center leading-tight font-medium px-0.5 ${
                    isActive ? "text-brand-700" : isDone ? "text-gray-500" : "text-gray-300"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`h-0.5 flex-1 mx-1 -mt-5 transition-colors ${
                    isDone ? "bg-brand-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      {(statusAnterior || proximoStatus) && (
        <div className="flex gap-2 pt-1">
          {statusAnterior && (
            <button
              onClick={voltarStatus}
              disabled={isPending}
              className="btn-secondary flex-none flex items-center gap-1 text-sm px-3 py-2"
            >
              <ChevronLeft size={14} />
              Voltar
            </button>
          )}
          {proximoStatus && (
            <button
              onClick={avancarStatus}
              disabled={isPending}
              className="btn-primary flex-1 text-sm"
            >
              {isPending ? "Atualizando..." : `Marcar como ${STATUS_LABELS[proximoStatus]}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
