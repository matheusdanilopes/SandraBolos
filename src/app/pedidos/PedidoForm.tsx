"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarPedidoAction, editarPedidoAction } from "./actions";
import { type Cliente, type Pedido, type TipoPedido, type Topper, type Produto, type UnidadeMedida, UNIDADE_LABELS } from "@/types/database";
import { AlertTriangle, ChevronDown, Plus, Trash2, Package } from "lucide-react";
import { parseISO, isPast, isToday } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface Props {
  clientes: Pick<Cliente, "id" | "nome" | "telefone">[];
  pedido?: Pedido;
  produtos?: Produto[];
}

// ─── Cálculo por unidade de medida ──────────────────────────────────────────

function calcularTotal(quantidade: number, preco: number, unidade: UnidadeMedida): number {
  if (unidade === "peso_kg") return Math.round(quantidade * preco * 100) / 100;
  if (unidade === "cento")   return Math.round((quantidade / 100) * preco * 100) / 100;
  return Math.round(Math.round(quantidade) * preco * 100) / 100;
}

function inputCfg(unidade: UnidadeMedida) {
  if (unidade === "peso_kg") return { step: "0.001", min: "0.001", label: "Quantidade (kg)", placeholder: "Ex: 1,500" };
  return { step: "1", min: "1", label: unidade === "cento" ? "Qtd. avulsas" : "Quantidade", placeholder: unidade === "cento" ? "Ex: 50" : "Ex: 10" };
}

function precoLabel(u: UnidadeMedida) {
  if (u === "peso_kg") return "Preço/kg (R$)";
  if (u === "cento")   return "Preço do cento (R$)";
  return "Preço unitário (R$)";
}

// ─── Tipo do item local (antes de salvar) ────────────────────────────────────

interface ItemLocal {
  _id: string;
  produtoId: string;
  nomeProduto: string;
  unidadeMedida: UnidadeMedida;
  precoUnitario: number;
  quantidade: number;
  valorTotal: number;
}

function isDataPassada(data: string): boolean {
  try {
    const d = parseISO(data);
    return isPast(d) && !isToday(d);
  } catch { return false; }
}

// ─── Seção de itens do pedido (inline, sem pedido_id ainda) ─────────────────

function ItensSection({ produtos }: { produtos: Produto[]; itens: ItemLocal[]; onChange: (itens: ItemLocal[]) => void }) {
  // Este componente não usa os itens/onChange diretamente —
  // eles ficam no estado do pai. Lida apenas com a lógica de adicionar.
  return null; // placeholder — inline abaixo no form principal
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PedidoForm({ clientes, pedido, produtos = [] }: Props) {
  const router = useRouter();
  const isEdit = !!pedido;
  const [isPending, startTransition] = useTransition();

  // ── Campos do pedido ───────────────────────────────────────────────────────
  const [clienteId, setClienteId] = useState(pedido?.cliente_id ?? "");
  const [novoCliente, setNovoCliente] = useState(!pedido?.cliente_id);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");

  const [tipo, setTipo] = useState<TipoPedido>(pedido?.tipo ?? "bolo");
  const [dataEntrega, setDataEntrega] = useState(pedido?.data_entrega ?? "");
  const [horaEntrega, setHoraEntrega] = useState(pedido?.hora_entrega ?? "");
  const [horaRetirada, setHoraRetirada] = useState(pedido?.hora_retirada ?? "");
  const [descricao, setDescricao] = useState(pedido?.descricao ?? "");
  const [topper, setTopper] = useState<Topper>(pedido?.topper ?? "nao");
  const [peso, setPeso] = useState(pedido?.peso?.toString() ?? "");
  const [quantidade, setQuantidade] = useState(pedido?.quantidade?.toString() ?? "");
  const [error, setError] = useState("");

  // ── Itens do pedido (somente no modo de criação) ──────────────────────────
  const [itensLocais, setItensLocais] = useState<ItemLocal[]>([]);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [qtdItem, setQtdItem] = useState("");
  const [precoItem, setPrecoItem] = useState("");
  const [errorItem, setErrorItem] = useState("");

  const produtoSelecionado = produtos.find((p) => p.id === produtoSelecionadoId) ?? null;
  const unidadeItem = produtoSelecionado?.unidade_medida ?? null;
  const qtdItemNum = qtdItem !== "" ? parseFloat(qtdItem) : null;
  const precoItemNum = precoItem !== "" ? parseFloat(precoItem) : null;
  const totalItem =
    qtdItemNum && precoItemNum && unidadeItem && qtdItemNum > 0
      ? calcularTotal(qtdItemNum, precoItemNum, unidadeItem)
      : null;
  const totalItens = itensLocais.reduce((s, i) => s + i.valorTotal, 0);

  function handleProdutoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setProdutoSelecionadoId(id);
    const prod = produtos.find((p) => p.id === id);
    setPrecoItem(prod ? prod.preco_padrao.toString() : "");
    setQtdItem("");
    setErrorItem("");
  }

  function handleAdicionarItem() {
    if (!produtoSelecionado || !unidadeItem) { setErrorItem("Selecione um produto"); return; }
    if (!qtdItemNum || qtdItemNum <= 0) { setErrorItem("Quantidade inválida"); return; }
    if (precoItemNum === null || precoItemNum < 0) { setErrorItem("Preço inválido"); return; }
    if (totalItem === null) return;

    setItensLocais((prev) => [
      ...prev,
      {
        _id: crypto.randomUUID(),
        produtoId: produtoSelecionado.id,
        nomeProduto: produtoSelecionado.nome,
        unidadeMedida: unidadeItem,
        precoUnitario: precoItemNum,
        quantidade: unidadeItem === "unidade" ? Math.round(qtdItemNum) : qtdItemNum,
        valorTotal: totalItem,
      },
    ]);
    setProdutoSelecionadoId("");
    setQtdItem("");
    setPrecoItem("");
    setErrorItem("");
  }

  function handleRemoverItem(id: string) {
    setItensLocais((prev) => prev.filter((i) => i._id !== id));
  }

  // ── Validação e envio ──────────────────────────────────────────────────────
  const needsPeso = tipo === "bolo" || tipo === "kit";
  const needsQuantidade = tipo === "doce" || tipo === "kit";
  const hasItens = itensLocais.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!dataEntrega) { setError("Data de entrega é obrigatória"); return; }
    // Peso/quantidade só obrigatórios se não houver itens
    if (needsPeso && !peso && !hasItens) { setError("Informe o peso ou adicione pelo menos um item"); return; }
    if (needsQuantidade && !quantidade && !hasItens) { setError("Informe a quantidade ou adicione pelo menos um item"); return; }
    if (!isEdit && (novoCliente || !clienteId)) {
      if (!nomeCliente) { setError("Nome do cliente é obrigatório"); return; }
      if (!telefoneCliente) { setError("Telefone do cliente é obrigatório"); return; }
    }

    startTransition(async () => {
      let result: { error?: string };

      if (isEdit) {
        result = await editarPedidoAction(pedido.id, {
          tipo,
          dataEntrega,
          horaEntrega: horaEntrega || null,
          horaRetirada: horaRetirada || null,
          descricao,
          topper,
          peso: needsPeso && peso ? parseFloat(peso) : null,
          quantidade: needsQuantidade && quantidade ? parseInt(quantidade) : null,
        });
      } else {
        result = await criarPedidoAction({
          clienteId: clienteId || undefined,
          novoClienteNome: nomeCliente || undefined,
          novoClienteTelefone: telefoneCliente || undefined,
          tipo,
          dataEntrega,
          horaEntrega: horaEntrega || null,
          horaRetirada: horaRetirada || null,
          descricao,
          topper,
          peso: needsPeso && peso ? parseFloat(peso) : null,
          quantidade: needsQuantidade && quantidade ? parseInt(quantidade) : null,
          itens: itensLocais.map(({ _id: _, ...rest }) => rest),
        });
      }

      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── Cliente ─────────────────────────────────────────────────── */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-700">Cliente</h2>

        {!isEdit && clientes.length > 0 && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setNovoCliente(false)}
              className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${!novoCliente ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300"}`}>
              Existente
            </button>
            <button type="button" onClick={() => setNovoCliente(true)}
              className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${novoCliente ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300"}`}>
              Novo
            </button>
          </div>
        )}

        {!novoCliente && !isEdit ? (
          <div className="relative">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="input appearance-none pr-8">
              <option value="">Selecionar cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        ) : isEdit ? (
          <p className="text-sm text-gray-500">Cliente não pode ser alterado após criação</p>
        ) : (
          <>
            <div>
              <label className="label">Nome *</label>
              <input className="input" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <label className="label">Telefone *</label>
              <input className="input" value={telefoneCliente} onChange={(e) => setTelefoneCliente(e.target.value)} placeholder="(11) 99999-9999" type="tel" />
            </div>
          </>
        )}
      </div>

      {/* ── Pedido ──────────────────────────────────────────────────── */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-700">Pedido</h2>

        <div>
          <label className="label">Tipo *</label>
          <div className="flex gap-2">
            {(["bolo", "doce", "kit"] as TipoPedido[]).map((t) => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors capitalize ${tipo === t ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300"}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Data de Entrega *</label>
          <input className="input" type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
          {dataEntrega && isDataPassada(dataEntrega) && (
            <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
              <AlertTriangle size={12} className="shrink-0" />
              Data de entrega está no passado
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Hora de Entrega</label>
            <input className="input" type="time" value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)} />
          </div>
          <div>
            <label className="label">Hora de Retirada</label>
            <input className="input" type="time" value={horaRetirada} onChange={(e) => setHoraRetirada(e.target.value)} />
          </div>
        </div>

        {needsPeso && (
          <div>
            <label className="label">Peso (kg){!hasItens && " *"}</label>
            <input className="input" type="number" step="0.1" min="0" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex: 2.5" />
          </div>
        )}

        {needsQuantidade && (
          <div>
            <label className="label">Quantidade{!hasItens && " *"}</label>
            <input className="input" type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Ex: 50" />
          </div>
        )}

        <div>
          <label className="label">Topper</label>
          <div className="flex gap-2">
            {(["nao", "sim", "brinde"] as Topper[]).map((t) => (
              <button key={t} type="button" onClick={() => setTopper(t)}
                className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors capitalize ${topper === t ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300"}`}>
                {t === "nao" ? "Não" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Descrição</label>
          <textarea className="input min-h-[80px] resize-none" value={descricao} onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes do pedido, sabor, decoração..." />
        </div>
      </div>

      {/* ── Itens (somente na criação) ───────────────────────────────── */}
      {!isEdit && (
        <div className="card p-4 space-y-3">
          <h2 className="font-semibold text-sm text-gray-700">Itens do Pedido</h2>

          {/* Lista de itens adicionados */}
          {itensLocais.length > 0 ? (
            <div className="space-y-2">
              {itensLocais.map((item) => (
                <div key={item._id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.nomeProduto}</p>
                    <p className="text-[11px] text-gray-500">
                      {item.unidadeMedida === "peso_kg" && `${item.quantidade.toFixed(3)} kg × ${formatCurrency(item.precoUnitario)}/kg`}
                      {item.unidadeMedida === "cento" && `${Math.round(item.quantidade)} un. (${(item.quantidade / 100).toFixed(2)} cento) × ${formatCurrency(item.precoUnitario)}`}
                      {item.unidadeMedida === "unidade" && `${Math.round(item.quantidade)} un. × ${formatCurrency(item.precoUnitario)}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700 whitespace-nowrap">{formatCurrency(item.valorTotal)}</span>
                  <button type="button" onClick={() => handleRemoverItem(item._id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                <span className="text-xs text-gray-500 font-medium">Total dos itens</span>
                <span className="text-base font-bold text-emerald-700">{formatCurrency(totalItens)}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-3 text-gray-400">
              <Package size={24} strokeWidth={1.5} />
              <p className="text-xs">Nenhum item adicionado</p>
            </div>
          )}

          {/* Formulário de adição de item */}
          {produtos.length > 0 ? (
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <div className="relative">
                <select className="input appearance-none pr-8" value={produtoSelecionadoId} onChange={handleProdutoChange}>
                  <option value="">Selecionar produto...</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome} — {UNIDADE_LABELS[p.unidade_medida]}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {produtoSelecionado && unidadeItem && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">{inputCfg(unidadeItem).label}</label>
                      <input className="input" type="number" step={inputCfg(unidadeItem).step} min={inputCfg(unidadeItem).min}
                        value={qtdItem} onChange={(e) => { setQtdItem(e.target.value); setErrorItem(""); }}
                        placeholder={inputCfg(unidadeItem).placeholder} />
                      {unidadeItem === "cento" && qtdItemNum && qtdItemNum > 0 && (
                        <p className="text-[10px] text-gray-500 mt-1">{Math.round(qtdItemNum)} un. = {(qtdItemNum / 100).toFixed(2)} cento(s)</p>
                      )}
                    </div>
                    <div>
                      <label className="label">{precoLabel(unidadeItem)}</label>
                      <input className="input" type="number" step="0.01" min="0" value={precoItem}
                        onChange={(e) => { setPrecoItem(e.target.value); setErrorItem(""); }} placeholder="Ex: 80,00" />
                    </div>
                  </div>

                  {totalItem !== null && qtdItemNum && precoItemNum && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 space-y-0.5">
                      <p className="text-xs text-emerald-700 font-medium">Total calculado</p>
                      <p className="text-lg font-bold text-emerald-800">{formatCurrency(totalItem)}</p>
                      <p className="text-[10px] text-emerald-600">
                        {unidadeItem === "peso_kg" && `${qtdItemNum.toFixed(3)} kg × ${formatCurrency(precoItemNum)}/kg`}
                        {unidadeItem === "cento" && `${Math.round(qtdItemNum)} un. ÷ 100 × ${formatCurrency(precoItemNum)} do cento`}
                        {unidadeItem === "unidade" && `${Math.round(qtdItemNum)} un. × ${formatCurrency(precoItemNum)}/un.`}
                      </p>
                    </div>
                  )}
                </>
              )}

              {errorItem && <p className="text-sm text-red-600">{errorItem}</p>}

              <button type="button" onClick={handleAdicionarItem}
                disabled={!produtoSelecionado || !qtdItemNum || qtdItemNum <= 0 || precoItemNum === null}
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                <Plus size={15} /> Adicionar Item
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center pb-1">
              Nenhum produto cadastrado.{" "}
              <a href="/produtos" className="text-brand-600 underline">Cadastre em Produtos</a>.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" disabled={isPending} className="btn-primary flex-1">
          {isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar Pedido"}
        </button>
      </div>
    </form>
  );
}
