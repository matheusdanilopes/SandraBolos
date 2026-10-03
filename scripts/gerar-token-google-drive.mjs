// Gera o GOOGLE_OAUTH_REFRESH_TOKEN usado pelo app para enviar fotos ao Drive
// em nome da dona da conta (contas de serviço não têm cota de armazenamento).
//
// Antes, no Google Cloud Console (mesmo projeto da API do Drive):
//   1. "Tela de permissão OAuth": tipo Externo, adicione o seu e-mail como
//      usuário de teste e depois clique em "Publicar app" — no modo "Teste" o
//      refresh token expira em 7 dias.
//   2. "Credenciais" → "Criar credenciais" → "ID do cliente OAuth" →
//      tipo "App para computador". Copie o ID e a chave secreta.
//
// Uso:
//   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... \
//     node scripts/gerar-token-google-drive.mjs
//
// Abra o link exibido, entre com a conta dona da pasta do Drive e autorize.
// O refresh token aparece no terminal: copie para GOOGLE_OAUTH_REFRESH_TOKEN.

import http from "node:http";
import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const PORTA = Number(process.env.PORTA ?? 53682);

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET.");
  process.exit(1);
}

const redirectUri = `http://127.0.0.1:${PORTA}`;
const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri);

const url = oauth2.generateAuthUrl({
  access_type: "offline",
  // Força a tela de consentimento para o Google devolver o refresh token mesmo
  // se a conta já tiver autorizado o app antes.
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive"],
});

const server = http.createServer(async (req, res) => {
  const params = new URL(req.url ?? "/", redirectUri).searchParams;
  const code = params.get("code");
  if (!code) {
    res.writeHead(400).end(params.get("error") ?? "Sem código de autorização.");
    return;
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Pronto! Pode fechar esta aba e voltar ao terminal.");
    if (!tokens.refresh_token) {
      console.error("\nO Google não devolveu refresh token. Remova o acesso do app em");
      console.error("https://myaccount.google.com/permissions e rode o script de novo.");
    } else {
      console.log("\nGOOGLE_OAUTH_REFRESH_TOKEN=" + tokens.refresh_token);
    }
  } catch (err) {
    res.writeHead(500).end("Falha ao trocar o código pelo token.");
    console.error(err);
  } finally {
    server.close();
  }
});

server.listen(PORTA, "127.0.0.1", () => {
  console.log("Abra este link no navegador e autorize com a conta dona do Drive:\n");
  console.log(url);
});
