"use client";

import { useTransition } from "react";
import { avancarStatusAction } from "./actions";
import { STATUS_LABELS, type StatusPedido } from "@/types/database";
import { ArrowRight } from "lucide-react";

interface Props {
  pedidoId: string;
  currentStatus: StatusPedido;
  proximoStatus: StatusPedido;
}

export function StatusActions({ pedidoId, currentStatus, proximoStatus }: Props) {
  const [isPending, startTransition] = useTransition();

  function avancarStatus() {
    startTransition(async () => {
      await avancarStatusAction(pedidoId, proximoStatus);
    });
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold text-sm text-gray-700 mb-3">Avançar Status</h2>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm text-gray-500">{STATUS_LABELS[currentStatus]}</span>
        <ArrowRight size={14} className="text-gray-400" />
        <span className="text-sm font-medium text-brand-600">{STATUS_LABELS[proximoStatus]}</span>
      </div>
      <button onClick={avancarStatus} disabled={isPending} className="btn-primary w-full">
        {isPending ? "Atualizando..." : `Marcar como ${STATUS_LABELS[proximoStatus]}`}
      </button>
    </div>
  );
}
