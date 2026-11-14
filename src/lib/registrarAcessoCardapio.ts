import { headers, cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { criarFetchComPrazo } from "@/lib/supabaseFetch";
import { COOKIE_SESSAO, lerTokenSessao } from "@/lib/auth";

// Registra uma abertura do cardápio (/cardapio) na tabela cardapio_acessos.
// Quem entra pelo link curto /c também passa por aqui (o /c só redireciona),
// então cada abertura conta uma vez só.

// Prévias do WhatsApp e do Instagram (o Instagram usa o facebookexternalhit) contam como acesso
const PREVIA_CONTADA = /whatsapp|facebookexternalhit/i;
// Demais robôs (buscadores, outras prévias, monitoramento) não contam
const ROBO = /bot|crawl|spider|preview|facebookcatalog|telegram|slack|discord|embedly|vercel-|headless/i;

async function deveContar(): Promise<boolean> {
  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";

  // Quem está logado no app é da equipe (conferindo o cardápio, gerando o PDF)
  if (await lerTokenSessao((await cookies()).get(COOKIE_SESSAO)?.value)) return false;

  if (PREVIA_CONTADA.test(userAgent)) return true;
  if (!userAgent || ROBO.test(userAgent)) return false;

  // Prefetch de navegador, app ou do próprio Next não é acesso de verdade
  const ehPrefetch =
    h.get("purpose") === "prefetch" ||
    h.get("sec-purpose")?.includes("prefetch") ||
    h.has("next-router-prefetch");
  return !ehPrefetch;
}

/** Nunca lança: falha ao registrar não pode impedir a abertura do cardápio. */
export async function registrarAcessoCardapio(): Promise<void> {
  try {
    if (!(await deveContar())) return;
    const h = await headers();
    const ip = (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0])?.trim() || null;
    // Prazo curto: se o banco demorar, o cardápio abre sem esperar.
    // registrar_acesso_cardapio (migration 018) ignora o excesso de um mesmo IP,
    // para ninguém inflar o contador; sem a 018, grava direto como antes.
    const supabase = createServerSupabaseClient(criarFetchComPrazo(3000));
    const { error } = await supabase.rpc("registrar_acesso_cardapio", { p_ip: ip });
    if (error?.code === "PGRST202") await supabase.from("cardapio_acessos").insert({});
  } catch {
    // ignora
  }
}
