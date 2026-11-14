import { createServerSupabaseClient } from "@/lib/supabaseServer";

// Aberturas do cardápio, registradas em src/lib/registrarAcessoCardapio.ts

export interface AcessosCardapioDados {
  total: number;
  // Um item por dia (AAAA-MM-DD, horário de Brasília), do mais antigo para hoje
  porDia: { dia: string; total: number }[];
}

const DIAS_GRAFICO = 30;

// Data de hoje no horário de Brasília, no formato AAAA-MM-DD (o mesmo da view)
function hojeEmBrasilia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function diasAteHoje(hoje: string, quantidade: number) {
  const base = new Date(`${hoje}T12:00:00Z`);
  return Array.from({ length: quantidade }, (_, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - (quantidade - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

/** null quando a consulta falha (sem conexão ou sem a migration 016). */
export async function buscarAcessosCardapio(): Promise<AcessosCardapioDados | null> {
  const dias = diasAteHoje(hojeEmBrasilia(), DIAS_GRAFICO);
  const supabase = createServerSupabaseClient();

  const [porDiaResult, totalResult] = await Promise.all([
    supabase.from("cardapio_acessos_por_dia").select("dia, total").gte("dia", dias[0]),
    supabase.from("cardapio_acessos").select("id", { count: "exact", head: true }),
  ]);

  if (porDiaResult.error || totalResult.error) return null;

  const porDia = new Map((porDiaResult.data ?? []).map((r) => [r.dia, r.total]));
  return {
    total: totalResult.count ?? 0,
    porDia: dias.map((dia) => ({ dia, total: porDia.get(dia) ?? 0 })),
  };
}
