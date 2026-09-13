"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { WifiOff, RotateCw } from "lucide-react";
import { MSG_CONEXAO } from "@/lib/erros";

/**
 * Tela de "não deu para carregar" das páginas de detalhe. Existe porque a
 * alternativa era `notFound()`: numa falha de rede o app dizia que o pedido não
 * existia, o que assusta bem mais do que um aviso de conexão.
 */
export function PainelSemConexao({ titulo = "Não foi possível carregar" }: { titulo?: string }) {
  const router = useRouter();
  const [recarregando, startTransition] = useTransition();

  return (
    <div className="card p-8 text-center space-y-3">
      <WifiOff size={28} className="text-red-400 mx-auto" />
      <div className="space-y-1">
        <p className="font-semibold text-gray-800">{titulo}</p>
        <p className="text-sm text-gray-500">{MSG_CONEXAO}</p>
      </div>
      <button
        onClick={() => startTransition(() => router.refresh())}
        disabled={recarregando}
        className="btn-primary inline-flex items-center gap-1.5 text-sm"
      >
        <RotateCw size={14} className={recarregando ? "animate-spin" : undefined} />
        {recarregando ? "Tentando…" : "Tentar de novo"}
      </button>
    </div>
  );
}
