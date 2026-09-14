"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Lock, Trash2 } from "lucide-react";
import { excluirClienteAction } from "../actions";

interface Props {
  clienteId: string;
  nome: string;
  /** Pedidos já vinculados — com qualquer um deles o cliente não pode sumir. */
  totalPedidos: number;
}

export function ExcluirCliente({ clienteId, nome, totalPedidos }: Props) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");
  const [isPending, startTransition] = useTransition();

  // Com pedidos no histórico não há botão para tocar por engano — só a razão,
  // que já diz o que fazer para poder excluir.
  if (totalPedidos > 0) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
        <Lock size={12} className="flex-shrink-0" />
        Cliente com {totalPedidos} pedido{totalPedidos === 1 ? "" : "s"} não pode ser excluído
      </p>
    );
  }

  const excluir = () => {
    setErro("");
    startTransition(async () => {
      const result = await excluirClienteAction(clienteId);
      if (result.error) {
        setErro(result.error);
        setConfirmando(false);
        // O impedimento costuma ser um pedido criado agora há pouco: recarregar
        // traz a ficha com ele à vista.
        router.refresh();
        return;
      }
      router.push("/clientes");
      router.refresh();
    });
  };

  if (!confirmando) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => { setConfirmando(true); setErro(""); }}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-red-500 py-2 rounded-xl hover:bg-red-50 transition-colors font-medium"
        >
          <Trash2 size={14} />
          Excluir cliente
        </button>
        {erro && <p className="text-xs text-red-600 text-center">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-red-800 font-semibold">Excluir {nome}?</p>
          <p className="text-xs text-red-600 mt-0.5">
            O cadastro sai da lista e do seletor de pedidos. Não há como desfazer.
          </p>
        </div>
      </div>
      {erro && <p className="text-xs text-red-700 font-medium">{erro}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => { setConfirmando(false); setErro(""); }}
          disabled={isPending}
          className="btn-secondary flex-1 text-sm"
        >
          Voltar
        </button>
        <button
          onClick={excluir}
          disabled={isPending}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm px-4 rounded-xl font-medium transition-colors disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
        >
          {isPending ? (
            <><Loader2 size={13} className="animate-spin" /> Excluindo...</>
          ) : "Sim, excluir"}
        </button>
      </div>
    </div>
  );
}
