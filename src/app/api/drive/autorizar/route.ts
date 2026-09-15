import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * Autorização do Drive pelo navegador — a mesma coisa que
 * `scripts/autorizar-drive.mjs` faz, sem exigir terminal, Node instalado nem
 * clone do repositório. A pessoa abre a URL, faz login na conta dona do Drive, e
 * o refresh token aparece na tela.
 *
 * A rota atende os dois lados do fluxo OAuth para que só exista **uma** URI de
 * redirecionamento para cadastrar no Google Cloud:
 *
 *   GET ?secret=<TEST_DRIVE_SECRET>  -> manda para o consentimento do Google
 *   GET ?code=...&state=<secret>     -> troca o código e mostra o token
 *
 * O `secret` viaja no `state` porque o Google não repassa parâmetros próprios na
 * volta — e é ele que impede que qualquer um dispare o fluxo e veja o token.
 */

const ESCOPO = "https://www.googleapis.com/auth/drive";

function pagina(titulo: string, corpo: string, status = 200): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${titulo}</title><style>` +
      `body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;` +
      `background:#faf7f8;color:#1f2937;line-height:1.6}` +
      `main{max-width:640px;margin:0 auto}h1{font-size:20px;margin:0 0 16px}` +
      `code,pre{font-family:ui-monospace,Menlo,monospace;font-size:13px}` +
      `pre{background:#111827;color:#f9fafb;padding:16px;border-radius:10px;` +
      `overflow-x:auto;white-space:pre-wrap;word-break:break-all}` +
      `.aviso{background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;` +
      `border-radius:6px;margin:16px 0}` +
      `.erro{background:#fee2e2;border-left:4px solid #ef4444;padding:12px 16px;` +
      `border-radius:6px;margin:16px 0}` +
      `</style></head><body><main><h1>${titulo}</h1>${corpo}</main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // O corpo carrega um refresh token: nunca em cache, nunca em CDN.
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

/**
 * A URI que o Google precisa ter cadastrada — esta mesma rota.
 *
 * Deduz do cabeçalho encaminhado, e não de `nextUrl.origin`: atrás do proxy da
 * Vercel o origin pode sair com o host interno, e qualquer diferença de uma
 * letra vira `redirect_uri_mismatch` no Google.
 */
function uriDeRetorno(req: NextRequest): string {
  const configurada = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (configurada) return configurada;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}/api/drive/autorizar`;
  }
  return `${req.nextUrl.origin}/api/drive/autorizar`;
}

export async function GET(req: NextRequest) {
  const segredo = process.env.TEST_DRIVE_SECRET;
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

  // Variável ausente quase nunca é "esqueci de criar" — é uma das duas
  // pegadinhas de ambiente abaixo, que custam uma rodada inteira para descobrir.
  const PEGADINHAS =
    `<p>Se você já criou a variável, o problema é um destes:</p><ul>` +
    `<li><b>Falta reimplantar.</b> Variável nova não entra numa implantação que ` +
    `já está no ar. Na Vercel: Deployments → ⋯ → Redeploy.</li>` +
    `<li><b>Ambiente errado.</b> Variável marcada só como <i>Production</i> não ` +
    `vale em URL de <i>Preview</i> (as que têm o nome da branch no endereço). ` +
    `Marque também Preview, ou abra pelo domínio de produção.</li></ul>`;

  if (!segredo) {
    return pagina(
      "Falta configurar TEST_DRIVE_SECRET",
      `<div class="erro">Defina <code>TEST_DRIVE_SECRET</code> no ambiente do app. ` +
        `É ele que protege esta página — sem isso qualquer pessoa poderia gerar ` +
        `um token de acesso ao seu Drive.</div>` + PEGADINHAS,
      500
    );
  }
  if (!clientId || !clientSecret) {
    return pagina(
      "Falta configurar o client OAuth",
      `<div class="erro">Defina <code>GOOGLE_OAUTH_CLIENT_ID</code> e ` +
        `<code>GOOGLE_OAUTH_CLIENT_SECRET</code> no ambiente do app antes de ` +
        `autorizar.</div>` + PEGADINHAS,
      500
    );
  }

  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const erroDoGoogle = params.get("error");
  const redirectUri = uriDeRetorno(req);
  const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  if (erroDoGoogle) {
    return pagina(
      "Autorização recusada",
      `<div class="erro">O Google devolveu: <code>${erroDoGoogle}</code></div>` +
        `<p>Abra a página de novo e aceite as permissões para continuar.</p>`,
      400
    );
  }

  // Volta do Google: troca o código pelo refresh token.
  if (code) {
    if (params.get("state") !== segredo) {
      return pagina(
        "Link inválido",
        `<div class="erro">O <code>state</code> não confere. Recomece pelo link ` +
          `com <code>?secret=…</code>.</div>`,
        403
      );
    }

    try {
      const { tokens } = await oauth.getToken(code);
      if (!tokens.refresh_token) {
        return pagina(
          "O Google não devolveu refresh token",
          `<div class="aviso">Isso acontece quando esta conta já autorizou o app antes.</div>` +
            `<p>Remova o acesso em ` +
            `<a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">` +
            `myaccount.google.com/permissions</a> e abra esta página de novo.</p>`,
          400
        );
      }

      return pagina(
        "Pronto — copie o valor abaixo",
        `<p>Guarde como <code>GOOGLE_OAUTH_REFRESH_TOKEN</code> nas variáveis de ` +
          `ambiente do app e faça um novo deploy.</p>` +
          `<pre>${tokens.refresh_token}</pre>` +
          `<div class="aviso">Trate como senha: quem tiver esse valor acessa o ` +
          `Drive desta conta. Não coloque no código nem mande por mensagem.</div>` +
          `<p>Depois do deploy, confira em <code>/api/test-drive?secret=…</code>: ` +
          `o campo <code>modo</code> deve dizer <code>oauth</code> e ` +
          `<code>identidade</code> deve mostrar o e-mail certo.</p>`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return pagina(
        "Falhou a troca do código",
        `<div class="erro">${msg}</div>` +
          `<p>Se disser <code>redirect_uri_mismatch</code>, cadastre exatamente ` +
          `esta URI no client OAuth:</p><pre>${redirectUri}</pre>`,
        500
      );
    }
  }

  // Início do fluxo: exige o segredo e manda para o consentimento.
  if (params.get("secret") !== segredo) {
    return pagina(
      "Link incompleto",
      `<div class="erro">Abra esta página com <code>?secret=SEU_TEST_DRIVE_SECRET</code> ` +
        `no final do endereço.</div>`,
      401
    );
  }

  const url = oauth.generateAuthUrl({
    access_type: "offline",
    scope: [ESCOPO],
    // Sem isto o Google só manda refresh token na primeiríssima autorização da
    // conta, e uma segunda tentativa terminaria sem token e sem explicação.
    prompt: "consent",
    state: segredo,
  });

  // Mostra a URI antes de sair daqui, em vez de redirecionar direto. Quando ela
  // não está cadastrada, o Google barra com `redirect_uri_mismatch` na tela dele
  // e nunca volta para cá — então esta é a única chance de dizer, na tela, qual
  // valor exato precisa ser cadastrado.
  return pagina(
    "Autorizar o Google Drive",
    `<p>Esta é a URI de redirecionamento que o app vai usar. Ela precisa estar ` +
      `cadastrada <b>exatamente assim</b> no seu client OAuth, em "URIs de ` +
      `redirecionamento autorizados":</p>` +
      `<pre>${redirectUri}</pre>` +
      `<div class="aviso">Confira caractere por caractere: barra no final, ` +
      `<code>http</code> vs <code>https</code> e o endereço do site precisam ` +
      `bater. Qualquer diferença vira <code>redirect_uri_mismatch</code>.<br><br>` +
      `O client também precisa ser do tipo <b>Aplicativo Web</b> — o tipo ` +
      `"Aplicativo para computador" não aceita endereço de site.</div>` +
      `<p><b>Faça login na conta dona do Drive</b>, e não em outra: o token sai ` +
      `no nome de quem autorizar, e é o espaço dessa conta que será usado.</p>` +
      `<p style="margin-top:24px"><a href="${url}" style="display:inline-block;` +
      `background:#111827;color:#fff;padding:12px 20px;border-radius:8px;` +
      `text-decoration:none;font-weight:600">Continuar para o Google</a></p>`
  );
}
