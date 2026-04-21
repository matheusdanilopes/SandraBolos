'use client';

import { getBrowserSupabaseClient } from '@/lib/supabase';
import { useState } from 'react';

export function AuthForm({ onAuthenticated }: { onAuthenticated: () => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const supabase = getBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    await onAuthenticated();
    setLoading(false);
  }

  return (
    <form onSubmit={login} className="mx-auto mt-16 max-w-md space-y-3 rounded bg-white p-6 shadow">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <p className="text-sm text-slate-600">Acesso interno para gestão de pedidos de bolos.</p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded border px-3 py-2"
      />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="w-full rounded border px-3 py-2"
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button disabled={loading} className="rounded bg-indigo-600 px-3 py-2 text-white">
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
