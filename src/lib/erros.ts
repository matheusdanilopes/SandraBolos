// Tradução de erros técnicos para mensagens que fazem sentido para quem usa o app.
//
// O caso que motivou este módulo: quando a requisição ao Supabase não chega a
// ser respondida (celular sem sinal, DNS, conexão derrubada, servidor fora do
// ar), o supabase-js não lança exceção — ele devolve um erro cujo `message` é
// o texto cru do fetch: "TypeError: fetch failed" no Node, "TypeError: Failed
// to fetch" no navegador. Como as actions repassam `error.message` para a tela,
// esse texto aparecia para a Sandra no lugar de uma instrução útil.

export const MSG_CONEXAO =
  "Sem conexão com o servidor. Verifique a internet e tente de novo.";
export const MSG_TIMEOUT =
  "O servidor demorou demais para responder. Tente de novo em instantes.";
export const MSG_GENERICA = "Não foi possível concluir a operação. Tente de novo.";

// Timeouts e abortos — inclui o prazo aplicado em `supabaseFetch`.
const PADRAO_TIMEOUT = /timeout|timed out|abort|ETIMEDOUT|ABORT_ERR/i;

// Falhas de rede do undici (Node) e dos navegadores, mais os erros de socket/DNS
// que costumam vir em `cause`/`details`.
const PADRAO_CONEXAO =
  /fetch failed|failed to fetch|load failed|network\s?error|network request failed|socket hang up|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|EPIPE|EHOSTUNREACH|ENETUNREACH|UND_ERR/i;

type ErroComCampos = {
  message?: unknown;
  name?: unknown;
  code?: unknown;
  details?: unknown;
  status?: unknown;
};

// Junta tudo que pode carregar a pista da falha: o postgrest-js guarda o nome do
// erro original no `message` e a `cause` (ECONNRESET & cia.) no `details`.
function textoDoErro(erro: unknown): string {
  if (erro == null) return "";
  if (typeof erro === "string") return erro;
  if (typeof erro !== "object") return String(erro);

  const e = erro as ErroComCampos;
  return [e.name, e.message, e.code, e.details]
    .filter((v): v is string | number => typeof v === "string" || typeof v === "number")
    .join(" ");
}

function statusDoErro(erro: unknown): unknown {
  return erro && typeof erro === "object" ? (erro as ErroComCampos).status : undefined;
}

/** A operação falhou antes de o servidor responder (rede, DNS, timeout)? */
export function isErroDeConexao(erro: unknown): boolean {
  const texto = textoDoErro(erro);
  if (!texto) return false;
  // status 0 é o que o postgrest-js devolve quando o fetch nem completou.
  return PADRAO_TIMEOUT.test(texto) || PADRAO_CONEXAO.test(texto) || statusDoErro(erro) === 0;
}

/**
 * Mensagem pronta para a tela. Erros de rede viram instrução ("verifique a
 * internet"); os demais (regra do banco, validação) mantêm o texto original,
 * que costuma dizer algo de útil sobre o que travou.
 */
export function mensagemErro(erro: unknown, fallback: string = MSG_GENERICA): string {
  const texto = textoDoErro(erro);

  if (texto) {
    if (PADRAO_TIMEOUT.test(texto)) return MSG_TIMEOUT;
    if (PADRAO_CONEXAO.test(texto) || statusDoErro(erro) === 0) return MSG_CONEXAO;
  }

  const message = typeof erro === "string" ? erro : (erro as ErroComCampos | null)?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

/** Algum dos resultados do Supabase falhou por rede? Usado nas páginas de leitura. */
export function houveErroDeConexao(
  ...resultados: Array<{ error?: unknown } | null | undefined>
): boolean {
  return resultados.some((r) => r != null && isErroDeConexao(r.error));
}
