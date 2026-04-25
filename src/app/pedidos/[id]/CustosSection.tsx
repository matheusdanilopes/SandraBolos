"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { type CustoComPedido, TIPO_CUSTO_LABELS, TIPO_CUSTO_COLORS } from "@/types/database";
import { criarCustoAction, deletarCustoAction } from "@/app/financeiro/actions";
import { Plus, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  pedidoId: string;
  custos: CustoComPedido[];
}

export function CustosSection({ pedidoId, custos }: Props) {
  const [aberto, setAberto] = useState(custos.length > 0);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState("");

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<keyof typeof TIPO_CUSTO_LABELS>("ingrediente");
  const [dataCusto, setDataCusto] = useState(() => new Date().toISOString().slice(0, 10));

  const totalCustos = custos.reduce((s, c) => s + c.valor, 0);

  function handleAdd() {
    setFormError("");
    if (!descricao.trim() || !valor) {
      setFormError("Preencha descrição e valor.");
      return;
    }
    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      setFormError("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const result = await criarCustoAction({
        descricao: descricao.trim(),
        valor: valorNum,
        tipo,
        data: dataCusto,
        pedido_id: pedidoId,
      });
      if (result.error) {
        setFormError(result.error);
      } else {
        setDescricao("");
        setValor("");
        setShowForm(false);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletarCustoAction(id, pedidoId);
    });
  }

  return (
    <div className="card overflow-hidden">
      {/* Header colapsável */}
      <button
        onClick={() => setAberto((v) => !v)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <p className="font-semibold text-sm text-gray-700">Custos do Pedido</p>
          {totalCustos > 0 && (
            <p className="text-xs text-red-600 mt-0.5">{formatCurrency(totalCustos)} total</p>
          )}
        </div>
        {aberto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {aberto && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Lista de custos */}
          {custos.length > 0 && (
            <div className="space-y-2">
              {custos.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TIPO_CUSTO_COLORS[c.tipo]}`}>
                        {TIPO_CUSTO_LABELS[c.tipo]}
                      </span>
                      <span className="text-[10px] text-gray-400">{formatDate(c.data)}</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5">{c.descricao}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-semibold text-red-600">{formatCurrency(c.valor)}</span>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={isPending}
                      className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulário inline */}
          {showForm ? (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600">Novo custo</p>
                <button onClick={() => { setShowForm(false); setFormError(""); }} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>

              <select
                className="input text-sm"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as keyof typeof TIPO_CUSTO_LABELS)}
              >
                {(Object.entries(TIPO_CUSTO_LABELS) as [keyof typeof TIPO_CUSTO_LABELS, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              <input
                className="input text-sm"
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição (ex: Ovos, Manteiga...)"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input text-sm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="Valor R$"
                />
                <input
                  className="input text-sm"
                  type="date"
                  value={dataCusto}
                  onChange={(e) => setDataCusto(e.target.value)}
                />
              </div>

              {formError && <p className="text-xs text-red-600">{formError}</p>}

              <button onClick={handleAdd} disabled={isPending} className="btn-primary w-full text-sm py-1.5">
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium py-2 border border-dashed border-brand-300 rounded-lg hover:bg-brand-50 transition-colors"
            >
              <Plus size={13} /> Adicionar custo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
