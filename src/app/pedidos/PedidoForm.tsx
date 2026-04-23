"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { type Cliente, type Pedido, type TipoPedido, type Topper } from "@/types/database";
import { ChevronDown } from "lucide-react";

interface Props {
  clientes: Pick<Cliente, "id" | "nome" | "telefone">[];
  pedido?: Pedido;
}

export function PedidoForm({ clientes, pedido }: Props) {
  const router = useRouter();
  const isEdit = !!pedido;

  const [clienteId, setClienteId] = useState(pedido?.cliente_id ?? "");
  const [novoCliente, setNovoCliente] = useState(!pedido?.cliente_id);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");

  const [tipo, setTipo] = useState<TipoPedido>(pedido?.tipo ?? "bolo");
  const [dataEntrega, setDataEntrega] = useState(pedido?.data_entrega ?? "");
  const [descricao, setDescricao] = useState(pedido?.descricao ?? "");
  const [topper, setTopper] = useState<Topper>(pedido?.topper ?? "nao");
  const [peso, setPeso] = useState(pedido?.peso?.toString() ?? "");
  const [quantidade, setQuantidade] = useState(pedido?.quantidade?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const needsPeso = tipo === "bolo" || tipo === "kit";
  const needsQuantidade = tipo === "doce" || tipo === "kit";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!dataEntrega) { setError("Data de entrega é obrigatória"); return; }
    if (needsPeso && !peso) { setError("Peso é obrigatório para este tipo"); return; }
    if (needsQuantidade && !quantidade) { setError("Quantidade é obrigatória para este tipo"); return; }

    setLoading(true);
    try {
      let resolvedClienteId: string | null = clienteId || null;

      if (novoCliente || !clienteId) {
        if (!nomeCliente) { setError("Nome do cliente é obrigatório"); setLoading(false); return; }
        if (!telefoneCliente) { setError("Telefone do cliente é obrigatório"); setLoading(false); return; }

        const { data: clienteData, error: clienteError } = await supabase
          .from("clientes")
          .insert({ nome: nomeCliente, telefone: telefoneCliente })
          .select()
          .single();

        if (clienteError) throw clienteError;
        resolvedClienteId = clienteData.id;
      }

      const payload = {
        cliente_id: resolvedClienteId,
        data_entrega: dataEntrega,
        tipo,
        descricao: descricao || null,
        topper,
        peso: needsPeso && peso ? parseFloat(peso) : null,
        quantidade: needsQuantidade && quantidade ? parseInt(quantidade) : null,
      };

      if (isEdit) {
        const { error: updateError } = await supabase
          .from("pedidos")
          .update(payload)
          .eq("id", pedido.id);
        if (updateError) throw updateError;
        router.push(`/pedidos/${pedido.id}`);
      } else {
        const { data: novoPedido, error: insertError } = await supabase
          .from("pedidos")
          .insert({ ...payload, status: "novo" })
          .select()
          .single();
        if (insertError) throw insertError;
        router.push(`/pedidos/${novoPedido.id}`);
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cliente */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-700">Cliente</h2>

        {!isEdit && clientes.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNovoCliente(false)}
              className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${!novoCliente ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300"}`}
            >
              Existente
            </button>
            <button
              type="button"
              onClick={() => setNovoCliente(true)}
              className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${novoCliente ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300"}`}
            >
              Novo
            </button>
          </div>
        )}

        {!novoCliente && !isEdit ? (
          <div className="relative">
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="input appearance-none pr-8"
            >
              <option value="">Selecionar cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
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

      {/* Pedido */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-700">Pedido</h2>

        <div>
          <label className="label">Tipo *</label>
          <div className="flex gap-2">
            {(["bolo", "doce", "kit"] as TipoPedido[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2 text-sm rounded-lg border font-medium transition-colors capitalize ${tipo === t ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300"}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Data de Entrega *</label>
          <input className="input" type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
        </div>

        {needsPeso && (
          <div>
            <label className="label">Peso (kg) *</label>
            <input className="input" type="number" step="0.1" min="0" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex: 2.5" />
          </div>
        )}

        {needsQuantidade && (
          <div>
            <label className="label">Quantidade *</label>
            <input className="input" type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Ex: 50" />
          </div>
        )}

        <div>
          <label className="label">Topper</label>
          <div className="flex gap-2">
            {(["nao", "sim", "brinde"] as Topper[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopper(t)}
                className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors capitalize ${topper === t ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300"}`}
              >
                {t === "nao" ? "Não" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Descrição</label>
          <textarea
            className="input min-h-[80px] resize-none"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes do pedido, sabor, decoração..."
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar Pedido"}
        </button>
      </div>
    </form>
  );
}
