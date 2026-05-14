"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ShoppingBag, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function FabPedido() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const navigate = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Action Sheet */}
      {open && (
        <div
          className="fixed left-0 right-0 z-50 px-4"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
          }}
        >
          <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Criar Pedido</h3>
                <p className="text-xs text-gray-400 mt-0.5">Escolha como quer começar</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-3 space-y-1 pb-4">
              <button
                onClick={() => navigate("/pedidos/novo")}
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
              <button
                onClick={() => navigate("/pedidos/novo?rapido=1")}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">Pedido Rápido</p>
                  <p className="text-xs text-gray-400 mt-0.5">Apenas o essencial para começar</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB Button — fixed, centered, floats above the nav */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[55] pointer-events-none flex items-end justify-center"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
      >
        <div className="max-w-2xl w-full flex justify-center">
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "pointer-events-auto",
              "w-14 h-14 rounded-full flex items-center justify-center",
              "bg-brand-600 text-white border-4 border-white",
              "shadow-lg shadow-brand-600/35",
              "transition-all duration-200 active:scale-95",
              open ? "bg-brand-700 shadow-brand-700/35" : "hover:bg-brand-700"
            )}
            aria-label={open ? "Fechar menu" : "Novo Pedido"}
            aria-expanded={open}
          >
            <Plus
              size={22}
              strokeWidth={2.5}
              className={cn(
                "transition-transform duration-200",
                open && "rotate-45"
              )}
            />
          </button>
        </div>
      </div>
    </>
  );
}
