"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { avancarStatusAction, voltarStatusAction } from "./actions";
import { STATUS_LABELS, type StatusPedido } from "@/types/database";
import { Check, ChevronLeft, AlertTriangle, CheckCircle2, FileEdit, PencilLine } from "lucide-react";

const STATUS_ORDER: StatusPedido[] = ["novo", "produzindo", "feito", "entregue"];

interface Props {
  pedidoId: string;
  currentStatus: StatusPedido;
  proximoStatus: StatusPedido | null;
}

export function StatusActions({ pedidoId, currentStatus, proximoStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirmandoVoltar, setConfirmandoVoltar] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  if (currentStatus === "rascunho") {
    return (
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileEdit size={15} className="text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-gray-700">Rascunho</h2>
            <p className="text-xs text-gray-400 mt-0.5">Complete as informações para iniciar o pedido</p>
          </div>
        </div>
        <Link
          href={`/pedidos/${pedidoId}/editar`}
          className="btn-primary flex items-center justify-center gap-2 text-sm"
        >
          <PencilLine size={14} />
          Completar Pedido
        </Link>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const statusAnterior = currentIndex > 0 ? STATUS_ORDER[currentIndex - 1] : null;

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  function avancarStatus() {
    if (!proximoStatus) return;
    startTransition(async () => {
      await avancarStatusAction(pedidoId, proximoStatus);
      showSuccess(`Marcado como ${STATUS_LABELS[proximoStatus]}`);
    });
  }

  function executarVoltar() {
    if (!statusAnterior) return;
    setConfirmandoVoltar(false);
    startTransition(async () => {
      await voltarStatusAction(pedidoId, statusAnterior);
      showSuccess(`Voltou para ${STATUS_LABELS[statusAnterior]}`);
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

      {/* Feedback de sucesso */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-sm text-emerald-700 font-medium">
          <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Confirmação de retorno */}
      {confirmandoVoltar && statusAnterior ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800">
              Desfazer <span className="font-semibold">"{STATUS_LABELS[currentStatus]}"</span> e
              voltar para{" "}
              <span className="font-semibold">"{STATUS_LABELS[statusAnterior]}"</span>?
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmandoVoltar(false)}
              disabled={isPending}
              className="btn-secondary flex-1 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={executarVoltar}
              disabled={isPending}
              className="flex-1 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm px-4 rounded-lg font-medium transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {isPending ? "Voltando..." : "Sim, voltar"}
            </button>
          </div>
        </div>
      ) : (
        (statusAnterior || proximoStatus) && (
          <div className="flex gap-2 pt-1">
            {statusAnterior && (
              <button
                onClick={() => setConfirmandoVoltar(true)}
                disabled={isPending}
                className="btn-secondary flex-none flex items-center gap-1.5 text-sm px-3"
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
        )
      )}
    </div>
  );
}
