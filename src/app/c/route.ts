import { NextResponse, type NextRequest } from "next/server";

// Link curto do cardápio (bio do Instagram): só redireciona para /cardapio.
// O acesso é registrado pela própria página (src/lib/registrarAcessoCardapio.ts),
// para contar uma vez só tanto quem vem pelo /c quanto quem abre /cardapio direto.

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const destino = new URL("/cardapio", request.url);
  const response = NextResponse.redirect(destino, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
