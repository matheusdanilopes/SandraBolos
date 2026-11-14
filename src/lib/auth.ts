// Login do app: usuários fixos e sessão num cookie assinado (HMAC-SHA256).
// Usa só Web Crypto, para rodar tanto no middleware (Edge) quanto no servidor.

export const COOKIE_SESSAO = "sb_sessao";
export const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 24 * 30; // 30 dias

const USUARIOS: { nome: string; senha: string }[] = [
  { nome: "Agnaldo", senha: "123456" },
  { nome: "Sandra", senha: "123456" },
  { nome: "Admin", senha: "123456" },
];

/** Nome do usuário (com a grafia oficial) se login e senha conferem; senão null. */
export function validarCredenciais(login: string, senha: string): string | null {
  const alvo = login.trim().toLowerCase();
  const usuario = USUARIOS.find((u) => u.nome.toLowerCase() === alvo);
  return usuario && usuario.senha === senha ? usuario.nome : null;
}

function segredo(): string | null {
  return process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
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

/** Token da sessão; null se não há segredo configurado no servidor. */
export async function criarTokenSessao(usuario: string): Promise<string | null> {
  const chave = segredo();
  if (!chave) return null;
  const exp = Math.floor(Date.now() / 1000) + DURACAO_SESSAO_SEGUNDOS;
  const payload = paraBase64Url(new TextEncoder().encode(JSON.stringify({ u: usuario, exp })));
  return `${payload}.${await assinar(payload, chave)}`;
}

/** Nome do usuário da sessão, ou null se o token é inválido ou expirou. */
export async function lerTokenSessao(token: string | undefined): Promise<string | null> {
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
    const { u, exp } = JSON.parse(new TextDecoder().decode(deBase64Url(payload)));
    if (typeof u !== "string" || typeof exp !== "number") return null;
    if (exp < Math.floor(Date.now() / 1000)) return null;
    return u;
  } catch {
    return null;
  }
}

/** Evita redirecionar para fora do app depois do login. */
export function destinoSeguro(destino: string | null | undefined): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//") || destino.startsWith("/\\")) {
    return "/";
  }
  if (destino === "/login" || destino.startsWith("/login?")) return "/";
  return destino;
}
