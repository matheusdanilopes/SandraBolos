"use client";

import { useState, useTransition } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  type CustoComPedido,
  type PedidoComCliente,
  TIPO_CUSTO_LABELS,
  TIPO_CUSTO_COLORS,
  TIPO_LABELS,
} from "@/types/database";
import { criarCustoAction, deletarCustoAction } from "./actions";
import { TrendingUp, TrendingDown, DollarSign, Percent, Plus, Trash2, ChevronLeft, ChevronRight, X } from "lucide-react";

type Aba = "receita" | "custos";

interface Props {
  pedidosEntregues: PedidoComCliente[];
  custos: CustoComPedido[];
  mes: number;
  ano: number;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function mesAnoStr(mes: number, ano: number) {
  return `${MESES[mes - 1]} ${ano}`;
}

export function FinanceiroClient({ pedidosEntregues, custos, mes, ano }: Props) {
  const [aba, setAba] = useState<Aba>("receita");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState("");

  // Form state
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<keyof typeof TIPO_CUSTO_LABELS>("ingrediente");
  const [dataCusto, setDataCusto] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const receita = pedidosEntregues.reduce((s, p) => s + (p.valor_cobrado ?? 0), 0);
  const totalCustos = custos.reduce((s, c) => s + c.valor, 0);
  const lucro = receita - totalCustos;
  const margem = receita > 0 ? (lucro / receita) * 100 : null;

  function navMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 1) { novoMes = 12; novoAno -= 1; }
    if (novoMes > 12) { novoMes = 1; novoAno += 1; }
    window.location.href = `/financeiro?mes=${novoMes}&ano=${novoAno}`;
  }

  function handleAddCusto() {
    setFormError("");
    if (!descricao.trim() || !valor || !dataCusto) {
      setFormError("Preencha descrição, valor e data.");
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

  function handleDeleteCusto(id: string) {
    startTransition(async () => {
      await deletarCustoAction(id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navMes(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 active:scale-95 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-sm font-semibold text-gray-700">{mesAnoStr(mes, ano)}</h2>
        <button
          onClick={() => navMes(1)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 active:scale-95 transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <TrendingUp size={13} className="text-green-500" /> Receita
          </div>
          <div className="text-xl font-bold text-green-700">{formatCurrency(receita)}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{pedidosEntregues.length} pedido(s) entregue(s)</div>
        </div>

        <div className="card p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <TrendingDown size={13} className="text-red-400" /> Custos
          </div>
          <div className="text-xl font-bold text-red-600">{formatCurrency(totalCustos)}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{custos.length} lançamento(s)</div>
        </div>

        <div className="card p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <DollarSign size={13} className={lucro >= 0 ? "text-brand-500" : "text-red-500"} /> Lucro
          </div>
          <div className={`text-xl font-bold ${lucro >= 0 ? "text-brand-700" : "text-red-600"}`}>
            {formatCurrency(lucro)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Receita − Custos</div>
        </div>

        <div className="card p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <Percent size={13} className="text-blue-400" /> Margem
          </div>
          <div className={`text-xl font-bold ${margem !== null && margem >= 0 ? "text-blue-700" : "text-red-600"}`}>
            {margem !== null ? `${margem.toFixed(1)}%` : "—"}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Lucro / Receita</div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex border-b border-gray-200">
        {(["receita", "custos"] as Aba[]).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              aba === a
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {a === "receita" ? `Receita (${pedidosEntregues.length})` : `Custos (${custos.length})`}
          </button>
        ))}
      </div>

      {/* Aba Receita */}
      {aba === "receita" && (
        <div className="space-y-2">
          {pedidosEntregues.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">
              Nenhum pedido entregue neste mês
            </div>
          ) : (
            pedidosEntregues.map((p) => (
              <div key={p.id} className="card p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {p.clientes?.nome ?? p.nome_cliente ?? "Sem cliente"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {TIPO_LABELS[p.tipo]} · {formatDate(p.data_entrega)}
                  </p>
                </div>
                <div className="text-sm font-bold text-green-700 shrink-0">
                  {p.valor_cobrado ? formatCurrency(p.valor_cobrado) : <span className="text-gray-300 font-normal text-xs">sem valor</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Aba Custos */}
      {aba === "custos" && (
        <div className="space-y-3">
          {/* Botão adicionar custo */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Adicionar Custo
            </button>
          ) : (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Novo Custo</h3>
                <button onClick={() => { setShowForm(false); setFormError(""); }} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="label">Tipo</label>
                <select
                  className="input"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as keyof typeof TIPO_CUSTO_LABELS)}
                >
                  {(Object.entries(TIPO_CUSTO_LABELS) as [keyof typeof TIPO_CUSTO_LABELS, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Descrição</label>
                <input
                  className="input"
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Farinha de trigo, Caixa kraft..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor (R$)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="label">Data</label>
                  <input
                    className="input"
                    type="date"
                    value={dataCusto}
                    onChange={(e) => setDataCusto(e.target.value)}
                  />
                </div>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <button
                onClick={handleAddCusto}
                disabled={isPending}
                className="btn-primary w-full"
              >
                {isPending ? "Salvando..." : "Salvar Custo"}
              </button>
            </div>
          )}

          {/* Lista de custos */}
          {custos.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">
              Nenhum custo lançado neste mês
            </div>
          ) : (
            custos.map((c) => (
              <div key={c.id} className="card p-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TIPO_CUSTO_COLORS[c.tipo]}`}>
                      {TIPO_CUSTO_LABELS[c.tipo]}
                    </span>
                    {c.pedidos && (
                      <span className="text-[10px] text-gray-400 truncate">
                        Pedido: {c.pedidos.nome_cliente ?? c.pedidos.descricao ?? "—"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 mt-1 truncate">{c.descricao}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(c.data)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-red-600">{formatCurrency(c.valor)}</span>
                  <button
                    onClick={() => handleDeleteCusto(c.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Excluir custo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
