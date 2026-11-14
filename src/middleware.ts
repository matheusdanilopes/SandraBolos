import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerTokenSessao } from "@/lib/auth";

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

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (ehPublica(pathname)) return NextResponse.next();

  const usuario = await lerTokenSessao(request.cookies.get(COOKIE_SESSAO)?.value);
  if (usuario) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("de", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Estáticos do Next e arquivos com extensão (ícones, fotos, fontes) ficam de fora
  matcher: ["/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
