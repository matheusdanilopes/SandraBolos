'use client';

import { getBrowserSupabaseClient } from '@/lib/supabase';
import { useState } from 'react';

export function ClientForm({
  onCreated,
  authToken
}: {
  onCreated: () => Promise<void>;
  authToken: string | null;
}) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function resolveAuthToken(): Promise<string | null> {
    if (authToken) return authToken;

    const supabase = getBrowserSupabaseClient();
    if (!supabase) return null;

    const {
      data: { session }
    } = await supabase.auth.getSession();

    return session?.access_token ? `Bearer ${session.access_token}` : null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const token = await resolveAuthToken();
    if (!token) {
      setError('Sessão não encontrada. Faça login novamente.');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ nome, telefone })
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      setError(body.message ?? 'Falha ao cadastrar cliente.');
      setLoading(false);
      return;
    }

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
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button disabled={loading} className="rounded bg-blue-600 px-3 py-2 text-white">
        {loading ? 'Salvando...' : 'Criar cliente'}
      </button>
    </form>
  );
}
