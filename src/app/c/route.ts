import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { criarFetchComPrazo } from "@/lib/supabaseFetch";

// Link curto do cardápio (bio do Instagram): registra o acesso e manda para /cardapio.

export const dynamic = "force-dynamic";

// Robôs que abrem o link só para gerar a prévia (WhatsApp, Instagram etc.) não contam
const ROBO = /bot|crawl|spider|preview|facebookexternalhit|facebookcatalog|whatsapp|telegram|slack|discord|embedly|vercel-|headless/i;

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  // Prefetch de navegador/app também não é acesso de verdade
  const ehPrefetch =
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch");

  if (userAgent && !ROBO.test(userAgent) && !ehPrefetch) {
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
