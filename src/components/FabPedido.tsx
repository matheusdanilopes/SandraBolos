"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ShoppingBag, Zap, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { criarPedidoRapidoAction } from "@/app/pedidos/actions";

type Mode = "closed" | "sheet" | "quickform";

export function FabPedido() {
  const [mode, setMode] = useState<Mode>("closed");
  const [nomeCliente, setNomeCliente] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorEstimado, setValorEstimado] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [erro, setErro] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function close() {
    setMode("closed");
    setNomeCliente("");
    setDescricao("");
    setValorEstimado("");
    setDataEntrega("");
    setErro("");
  }

  function handleNavigate(path: string) {
    close();
    router.push(path);
  }

  function handleSubmitRapido() {
    if (!nomeCliente.trim()) {
      setErro("Nome do cliente é obrigatório");
      return;
    }
    setErro("");

    const valor = valorEstimado
      ? parseFloat(valorEstimado.replace(",", "."))
      : undefined;

    startTransition(async () => {
      const result = await criarPedidoRapidoAction({
        nomeCliente,
        descricao: descricao.trim() || undefined,
        valorEstimado: valor && !isNaN(valor) ? valor : undefined,
        dataEntrega: dataEntrega || undefined,
      });
      if (result.error) {
        setErro(result.error);
        return;
      }
      close();
      router.push(`/pedidos/${result.pedidoId}`);
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      {/* Backdrop */}
      {mode !== "closed" && (
        <div
          className="fixed inset-0 bg-black/40 z-50"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Action Sheet */}
      {mode === "sheet" && (
        <div
          className="fixed left-0 right-0 z-50 px-4"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}
        >
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Criar Pedido</h3>
                <p className="text-xs text-gray-400 mt-0.5">Escolha como quer começar</p>
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-3 space-y-1 pb-4">
              <button
                onClick={() => setMode("quickform")}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-amber-50 active:bg-amber-100 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">Pedido Rápido</p>
                  <p className="text-xs text-gray-400 mt-0.5">Apenas o essencial — salva como rascunho</p>
                </div>
              </button>
              <button
                onClick={() => handleNavigate("/pedidos/novo")}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={18} className="text-brand-600" />
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">Pedido Completo</p>
                  <p className="text-xs text-gray-400 mt-0.5">Todos os detalhes e personalizações</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Form Modal */}
      {mode === "quickform" && (
        <div
          className="fixed left-0 right-0 z-50 px-4"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
        >
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
              <button
                onClick={() => setMode("sheet")}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Voltar"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-2 flex-1">
                <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Zap size={13} className="text-amber-500" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Pedido Rápido</h3>
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Nome do cliente *</label>
                <input
                  type="text"
                  placeholder="Ex: Maria Silva"
                  value={nomeCliente}
                  onChange={(e) => { setNomeCliente(e.target.value); setErro(""); }}
                  className="input"
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Descrição rápida</label>
                <textarea
                  placeholder="Ex: Bolo de aniversário, 2 andares, chantilly..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="input resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor estimado</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                      R$
                    </span>
                    <input
                      type="number"
                      placeholder="0,00"
                      value={valorEstimado}
                      onChange={(e) => setValorEstimado(e.target.value)}
                      className="input pl-9"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Data de entrega</label>
                  <input
                    type="date"
                    value={dataEntrega}
                    onChange={(e) => setDataEntrega(e.target.value)}
                    min={today}
                    className="input"
                  />
                </div>
              </div>

              {erro && (
                <p className="text-xs text-red-600 font-medium">{erro}</p>
              )}

              <button
                onClick={handleSubmitRapido}
                disabled={isPending}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Rascunho"
                )}
              </button>

              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                Salvo como rascunho · Complete os detalhes depois
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[55] pointer-events-none flex items-end justify-center"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
      >
        <div className="max-w-2xl w-full flex justify-center">
          <button
            onClick={() => (mode === "closed" ? setMode("sheet") : close())}
            className={cn(
              "pointer-events-auto",
              "w-14 h-14 rounded-full flex items-center justify-center",
              "bg-brand-600 text-white border-4 border-white",
              "shadow-lg shadow-brand-600/35",
              "transition-all duration-200 active:scale-95",
              mode !== "closed"
                ? "bg-brand-700 shadow-brand-700/35"
                : "hover:bg-brand-700"
            )}
            aria-label={mode !== "closed" ? "Fechar menu" : "Novo Pedido"}
            aria-expanded={mode !== "closed"}
          >
            <Plus
              size={22}
              strokeWidth={2.5}
              className={cn(
                "transition-transform duration-200",
                mode !== "closed" && "rotate-45"
              )}
            />
          </button>
        </div>
      </div>
    </>
  );
}
