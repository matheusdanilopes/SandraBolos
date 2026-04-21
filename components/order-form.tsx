'use client';

import type { Cliente } from '@/lib/types';
import { useState } from 'react';

export function OrderForm({
  clientes,
  onCreated,
  authToken
}: {
  clientes: Cliente[];
  onCreated: () => Promise<void>;
  authToken: string | null;
}) {
  const [clienteId, setClienteId] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('Bolo de chocolate');
  const [quantidade, setQuantidade] = useState('1');
  const [preco, setPreco] = useState('0');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!authToken) return;

    setLoading(true);
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken },
      body: JSON.stringify({
        cliente_id: clienteId,
        data_entrega: dataEntrega,
        valor: Number(valor),
        observacoes,
        status: 'pendente',
        itens: [
          {
            descricao,
            quantidade: Number(quantidade),
            preco: Number(preco)
          }
        ]
      })
    });

    setClienteId('');
    setDataEntrega('');
    setValor('');
    setDescricao('Bolo de chocolate');
    setQuantidade('1');
    setPreco('0');
    setObservacoes('');
    await onCreated();
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded bg-white p-4 shadow">
      <h2 className="text-lg font-semibold">Novo pedido</h2>
      <select
        value={clienteId}
        onChange={(e) => setClienteId(e.target.value)}
        required
        className="w-full rounded border px-3 py-2"
      >
        <option value="">Selecione o cliente</option>
        {clientes.map((cliente) => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.nome} - {cliente.telefone}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={dataEntrega}
        onChange={(e) => setDataEntrega(e.target.value)}
        required
        className="w-full rounded border px-3 py-2"
      />
      <input
        type="number"
        step="0.01"
        min="0"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Valor total"
        required
        className="w-full rounded border px-3 py-2"
      />
      <input
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Descrição do item"
        required
        className="w-full rounded border px-3 py-2"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min="1"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          placeholder="Qtd"
          required
          className="w-full rounded border px-3 py-2"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          placeholder="Preço do item"
          required
          className="w-full rounded border px-3 py-2"
        />
      </div>
      <textarea
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
        placeholder="Observações"
        className="w-full rounded border px-3 py-2"
      />
      <button disabled={loading} className="rounded bg-green-600 px-3 py-2 text-white">
        {loading ? 'Salvando...' : 'Criar pedido'}
      </button>
    </form>
  );
}
