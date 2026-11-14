import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { criarFetchComPrazo } from "@/lib/supabaseFetch";

// Link curto do cardápio (bio do Instagram): registra o acesso e manda para /cardapio.

export const dynamic = "force-dynamic";

// Prévias do WhatsApp e do Instagram (o Instagram usa o facebookexternalhit) contam como acesso
const PREVIA_CONTADA = /whatsapp|facebookexternalhit/i;
// Demais robôs (buscadores, outras prévias, monitoramento) não contam
const ROBO = /bot|crawl|spider|preview|facebookcatalog|telegram|slack|discord|embedly|vercel-|headless/i;

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  // Prefetch de navegador/app também não é acesso de verdade
  const ehPrefetch =
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch");

  const contar = PREVIA_CONTADA.test(userAgent) || (!!userAgent && !ROBO.test(userAgent) && !ehPrefetch);

  if (contar) {
    try {
      // Prazo curto: se o banco demorar, o cliente segue para o cardápio sem esperar
      await createServerSupabaseClient(criarFetchComPrazo(3000))
        .from("cardapio_acessos")
        .insert({});
    } catch {
      // Falha ao registrar não pode impedir a abertura do cardápio
    }
  }

  const destino = new URL("/cardapio", request.url);
  const response = NextResponse.redirect(destino, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
