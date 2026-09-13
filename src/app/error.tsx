"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Rede de segurança para erros não tratados do servidor. Em produção o Next
 * esconde a mensagem original (sobra só o `digest`), então aqui mostramos um
 * texto que serve para qualquer causa — e um botão para tentar de novo, que é
 * o que resolve quando a falha foi de conexão.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[erro]", error);
  }, [error]);

  return (
    <div className="py-10">
      <div className="card p-8 text-center space-y-3">
        <AlertTriangle size={28} className="text-orange-400 mx-auto" />
        <div className="space-y-1">
          <p className="font-semibold text-gray-800">Algo deu errado nesta tela</p>
          <p className="text-sm text-gray-500">
            Pode ter sido uma falha de conexão. Tente de novo — seus dados estão salvos.
          </p>
        </div>
        <button onClick={reset} className="btn-primary inline-flex items-center gap-1.5 text-sm">
          <RotateCw size={14} />
          Tentar de novo
        </button>
        {error.digest && <p className="text-[10px] text-gray-300">ref: {error.digest}</p>}
      </div>
    </div>
  );
}
