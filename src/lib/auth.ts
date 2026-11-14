// Sessão do login num cookie assinado (HMAC-SHA256). Usa só Web Crypto, para
// rodar tanto no middleware (Edge) quanto no servidor. Os usuários e senhas
// ficam no banco (tabela usuarios, migrations 017 e 018): ver src/app/login/actions.ts.
//
// O token leva a "versão" do usuário, que o banco aumenta ao trocar a senha ou
// desativar a pessoa. O middleware confere essa versão no banco a cada
// REVALIDAR_SESSAO_SEGUNDOS: assim uma sessão roubada ou de alguém desligado
// para de valer em até 1 hora, sem consultar o banco a cada página.

export const COOKIE_SESSAO = "sb_sessao";
export const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 24 * 30; // 30 dias sem uso
export const REVALIDAR_SESSAO_SEGUNDOS = 60 * 60; // 1 hora

export interface Sessao {
  usuario: string;
  versao: number;
  /** Quando o token foi emitido ou conferido no banco pela última vez (segundos). */
  emitidoEm: number;
}

export const OPCOES_COOKIE_SESSAO = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: DURACAO_SESSAO_SEGUNDOS,
};

function segredo(): string | null {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  // A chave de serviço só serve de segredo se for mesmo secreta: a chave pública
  // (anon/publishable) vai para o navegador e permitiria forjar o cookie de login.
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !chaveServico ||
    chaveServico === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    chaveServico.startsWith("sb_publishable_")
  ) {
    return null;
  }
  return chaveServico;
}

function paraBase64Url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(texto: string): Uint8Array {
  const b64 = texto.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function assinar(dados: string, chave: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(chave),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(dados));
  return paraBase64Url(new Uint8Array(sig));
}

export function agoraEmSegundos(): number {
  return Math.floor(Date.now() / 1000);
}

/** Token da sessão; null se não há segredo configurado no servidor. */
export async function criarTokenSessao(usuario: string, versao: number): Promise<string | null> {
  const chave = segredo();
  if (!chave) return null;
  const iat = agoraEmSegundos();
  const exp = iat + DURACAO_SESSAO_SEGUNDOS;
  const payload = paraBase64Url(
    new TextEncoder().encode(JSON.stringify({ u: usuario, v: versao, iat, exp }))
  );
  return `${payload}.${await assinar(payload, chave)}`;
}

/** Sessão do token, ou null se ele é inválido, de formato antigo ou expirou. */
export async function lerTokenSessao(token: string | undefined): Promise<Sessao | null> {
  const chave = segredo();
  if (!token || !chave) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const esperado = await assinar(payload, chave);
  if (esperado.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= esperado.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;

  try {
    const { u, v, iat, exp } = JSON.parse(new TextDecoder().decode(deBase64Url(payload)));
    if (typeof u !== "string" || typeof v !== "number") return null;
    if (typeof iat !== "number" || typeof exp !== "number") return null;
    if (exp < agoraEmSegundos()) return null;
    return { usuario: u, versao: v, emitidoEm: iat };
  } catch {
    return null;
  }
}

/** Evita redirecionar para fora do app depois do login. */
export function destinoSeguro(destino: string | null | undefined): string {
  if (!destino || !destino.startsWith("/")) return "/";
  // O navegador ignora tabs e quebras de linha e trata "\" como "/" ao montar a
  // URL: "/\t/site.com" vira "//site.com". Por isso a conferência é feita na
  // URL já interpretada, e o que segue adiante é a versão normalizada.
  const base = "http://app.invalido";
  let url: URL;
  try {
    url = new URL(destino, base);
  } catch {
    return "/";
  }
  if (url.origin !== base) return "/";
  if (url.pathname === "/login") return "/";
  return url.pathname + url.search + url.hash;
}
