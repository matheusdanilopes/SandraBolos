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
  const h = headers();
  const userAgent = h.get("user-agent") ?? "";

  // Quem está logado no app é da equipe (conferindo o cardápio, gerando o PDF)
  if (await lerTokenSessao(cookies().get(COOKIE_SESSAO)?.value)) return false;

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
    // Prazo curto: se o banco demorar, o cardápio abre sem esperar
    await createServerSupabaseClient(criarFetchComPrazo(3000)).from("cardapio_acessos").insert({});
  } catch {
    // ignora
  }
}
