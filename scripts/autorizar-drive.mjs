#!/usr/bin/env node
/**
 * Autorização única do Google Drive — troca um login da dona do Drive por um
 * refresh token que o app usa daí em diante.
 *
 * Por que existe: a conta de serviço não tem espaço de armazenamento próprio,
 * então ela cria pastas mas nenhum arquivo sobe. Autenticando como um usuário
 * de verdade, cada foto nasce no nome dele e ocupa o espaço que ele já paga.
 *
 * Uso:
 *   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... \
 *     node scripts/autorizar-drive.mjs
 *
 * O client OAuth precisa ser do tipo "Aplicativo para computador" (Desktop app)
 * e ter http://localhost:53682/ como URI de redirecionamento autorizado.
 */
import { createServer } from "node:http";
import { google } from "googleapis";

const PORTA = 53682;
const REDIRECT_URI = `http://localhost:${PORTA}/`;
const ESCOPO = "https://www.googleapis.com/auth/drive";

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error(
    "Faltam as credenciais do client OAuth.\n\n" +
      "  GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... \\\n" +
      "    node scripts/autorizar-drive.mjs\n"
  );
  process.exit(1);
}

const oauth = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const url = oauth.generateAuthUrl({
  access_type: "offline",
  scope: [ESCOPO],
  // Sem isto o Google devolve refresh token só na primeira autorização de todas;
  // numa segunda tentativa o script terminaria sem o token e sem dizer por quê.
  prompt: "consent",
});

console.log("\n1. Abra este endereço no navegador, logado na conta DONA do Drive:\n");
console.log(`   ${url}\n`);
console.log("2. Se aparecer 'O Google não verificou este app', clique em");
console.log("   'Avançado' e depois em 'Acessar <nome do app> (não seguro)'.");
console.log("   O aviso é esperado: verificação só é exigida para tirar o aviso");
console.log("   e para passar de 100 usuários.\n");
console.log(`3. Aguardando o retorno em ${REDIRECT_URI} ...\n`);

const responder = (res, texto) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<html><body style="font-family:system-ui;padding:2rem">${texto}</body></html>`);
};

const servidor = createServer(async (req, res) => {
  const { searchParams } = new URL(req.url, REDIRECT_URI);
  const erro = searchParams.get("error");
  const code = searchParams.get("code");

  if (erro) {
    responder(res, `<h2>Autorização recusada</h2><p>${erro}</p>`);
    console.error(`\nAutorização recusada: ${erro}`);
    servidor.close();
    process.exit(1);
  }
  if (!code) return responder(res, "<p>Aguardando autorização…</p>");

  try {
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token) {
      responder(res, "<h2>Sem refresh token</h2><p>Volte ao terminal.</p>");
      console.error(
        "\nO Google não devolveu refresh token.\n" +
          "Remova o acesso do app em https://myaccount.google.com/permissions\n" +
          "e rode de novo.\n"
      );
      servidor.close();
      process.exit(1);
    }

    responder(res, "<h2>Pronto</h2><p>Pode fechar esta aba e voltar ao terminal.</p>");
    console.log("Autorizado. Guarde esta variável no ambiente do app:\n");
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    console.log("Lembre de publicar o app como 'In production' no Google Cloud:");
    console.log("em 'Testing' o Google expira este token a cada 7 dias.\n");
    servidor.close();
    process.exit(0);
  } catch (e) {
    responder(res, `<h2>Falhou a troca do código</h2><p>${e.message}</p>`);
    console.error(`\nFalhou a troca do código pelo token: ${e.message}`);
    servidor.close();
    process.exit(1);
  }
});

servidor.listen(PORTA);
