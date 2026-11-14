// Conferência da sessão dentro das server actions e das rotas de API.
//
// O middleware já barra quem não entrou, mas ele não basta sozinho: uma server
// action importada por um componente do layout também é aceita nas páginas
// públicas (/cardapio, /login), que o middleware deixa passar. Por isso cada
// action e cada rota confere o cookie de novo.

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerTokenSessao, type Sessao } from "@/lib/auth";

/** Para server actions: devolve a sessão ou interrompe a action. */
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await lerTokenSessao((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) throw new Error("Sessão expirada. Entre de novo no app.");
  return sessao;
}

/** Para rotas de API: resposta 401 se não há sessão válida, senão null. */
export async function recusarSemSessao(req: NextRequest): Promise<NextResponse | null> {
  const sessao = await lerTokenSessao(req.cookies.get(COOKIE_SESSAO)?.value);
  return sessao ? null : NextResponse.json({ error: "Não autenticado" }, { status: 401 });
}
