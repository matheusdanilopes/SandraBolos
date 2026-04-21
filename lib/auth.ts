import { createServerSupabaseClient } from '@/lib/supabase';

export async function getAuthenticatedClient(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();

  if (!token) {
    throw new Error('Não autenticado. Faça login para continuar.');
  }

  const client = createServerSupabaseClient(token);
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  return client;
}
