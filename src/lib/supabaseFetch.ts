// fetch com prazo máximo, usado pelos dois clientes Supabase.
//
// Sem prazo, uma conexão pendurada só termina quando a plataforma derruba a
// função (ou nunca, no celular): a tela fica girando e depois dá erro genérico.
// Com o prazo, a falha volta rápido como aborto, que `mensagemErro` traduz.

export const TIMEOUT_PADRAO_MS = 15_000;

export function criarFetchComPrazo(timeoutMs: number = TIMEOUT_PADRAO_MS): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(
      // Nome "AbortError" de propósito: o postgrest-js não repete requisições
      // abortadas, e esperar 3× o prazo antes de avisar seria pior que falhar.
      () => controller.abort(new DOMException("Tempo limite da requisição esgotado", "AbortError")),
      timeoutMs
    );

    const sinalExterno = init?.signal ?? null;
    const repassarAborto = () => controller.abort(sinalExterno?.reason);
    if (sinalExterno) {
      if (sinalExterno.aborted) repassarAborto();
      else sinalExterno.addEventListener("abort", repassarAborto);
    }

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      sinalExterno?.removeEventListener("abort", repassarAborto);
    }
  };
}
