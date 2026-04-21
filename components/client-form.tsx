'use client';

import { useState } from 'react';

export function ClientForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, telefone })
    });

    setNome('');
    setTelefone('');
    await onCreated();
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded bg-white p-4 shadow">
      <h2 className="text-lg font-semibold">Novo cliente</h2>
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome"
        required
        className="w-full rounded border px-3 py-2"
      />
      <input
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
        placeholder="Telefone"
        required
        className="w-full rounded border px-3 py-2"
      />
      <button disabled={loading} className="rounded bg-blue-600 px-3 py-2 text-white">
        {loading ? 'Salvando...' : 'Criar cliente'}
      </button>
    </form>
  );
}
