"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { STATUS_LABELS, type StatusPedido } from "@/types/database";
import { ArrowRight } from "lucide-react";

interface Props {
  pedidoId: string;
  currentStatus: StatusPedido;
  proximoStatus: StatusPedido;
}

export function StatusActions({ pedidoId, currentStatus, proximoStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function avancarStatus() {
    setLoading(true);
    await supabase.from("pedidos").update({ status: proximoStatus }).eq("id", pedidoId);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="card p-4">
      <h2 className="font-semibold text-sm text-gray-700 mb-3">Avançar Status</h2>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm text-gray-500">{STATUS_LABELS[currentStatus]}</span>
        <ArrowRight size={14} className="text-gray-400" />
        <span className="text-sm font-medium text-brand-600">{STATUS_LABELS[proximoStatus]}</span>
      </div>
      <button onClick={avancarStatus} disabled={loading} className="btn-primary w-full">
        {loading ? "Atualizando..." : `Marcar como ${STATUS_LABELS[proximoStatus]}`}
      </button>
    </div>
  );
}
