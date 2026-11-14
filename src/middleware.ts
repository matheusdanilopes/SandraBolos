import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_SESSAO,
  OPCOES_COOKIE_SESSAO,
  REVALIDAR_SESSAO_SEGUNDOS,
  agoraEmSegundos,
  criarTokenSessao,
  lerTokenSessao,
  type Sessao,
} from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { criarFetchComPrazo } from "@/lib/supabaseFetch";

// Tudo exige login, exceto o cardápio (e o link curto /c que leva a ele),
// a própria tela de login e os arquivos do PWA.
const ROTAS_PUBLICAS = ["/cardapio", "/c", "/login"];
const ARQUIVOS_PUBLICOS = ["/sw.js", "/manifest.webmanifest"];

function ehPublica(pathname: string) {
  return (
    ARQUIVOS_PUBLICOS.includes(pathname) ||
    ROTAS_PUBLICAS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );
}

function negar(request: NextRequest, apagarCookie: boolean) {
  const { pathname, search } = request.nextUrl;
  let resposta: NextResponse;
  if (pathname.startsWith("/api/")) {
    resposta = NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  } else {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("de", pathname + search);
    resposta = NextResponse.redirect(login);
  }
  if (apagarCookie) resposta.cookies.delete(COOKIE_SESSAO);
  return resposta;
}

/**
 * Confere no banco se a pessoa continua ativa e com a mesma versão (a versão
 * muda ao trocar a senha ou desativar). "indisponivel" quando o banco não
 * respondeu ou a migration 018 ainda não foi aplicada: nesse caso a sessão
 * segue valendo, para uma instabilidade do banco não derrubar todo mundo.
 */
async function conferirNoBanco(sessao: Sessao): Promise<"valida" | "invalida" | "indisponivel"> {
  try {
    const { data, error } = await createServerSupabaseClient(criarFetchComPrazo(3000)).rpc(
      "sessao_valida",
      { p_login: sessao.usuario, p_versao: sessao.versao }
    );
    if (error) return "indisponivel";
    return data === true ? "valida" : "invalida";
  } catch {
    return "indisponivel";
  }
}

export async function middleware(request: NextRequest) {
  if (ehPublica(request.nextUrl.pathname)) return NextResponse.next();

  const sessao = await lerTokenSessao(request.cookies.get(COOKIE_SESSAO)?.value);
  if (!sessao) return negar(request, request.cookies.has(COOKIE_SESSAO));

  if (agoraEmSegundos() - sessao.emitidoEm < REVALIDAR_SESSAO_SEGUNDOS) {
    return NextResponse.next();
  }

  const situacao = await conferirNoBanco(sessao);
  if (situacao === "invalida") return negar(request, true);

  const resposta = NextResponse.next();
  if (situacao === "valida") {
    // Renova o token: conta mais 30 dias e só volta a consultar o banco em 1 hora
    const token = await criarTokenSessao(sessao.usuario, sessao.versao);
    if (token) resposta.cookies.set(COOKIE_SESSAO, token, OPCOES_COOKIE_SESSAO);
  }
  return resposta;
}

export const config = {
  // Estáticos do Next e arquivos públicos (ícones, fotos, fontes, sw.js) ficam de fora.
  // Só extensões conhecidas: qualquer outro caminho com ponto passa pelo login.
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpe?g|webp|avif|gif|svg|ico|otf|ttf|woff2?|js|css|webmanifest|txt|xml)$).*)",
  ],
};
