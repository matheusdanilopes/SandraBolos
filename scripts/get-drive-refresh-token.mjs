// Gera o refresh token do Google Drive (rodar uma vez, localmente).
// Uso: GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... node scripts/get-drive-refresh-token.mjs
// No Google Cloud, o cliente OAuth (tipo "App da Web") deve ter como URI de
// redirecionamento autorizado: http://localhost:3333/callback
import http from "http";
import { google } from "googleapis";

const { GOOGLE_OAUTH_CLIENT_ID: id, GOOGLE_OAUTH_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error("Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET.");
  process.exit(1);
}

const redirect = "http://localhost:3333/callback";
const client = new google.auth.OAuth2(id, secret, redirect);
const url = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive"],
});

console.log("Abra esta URL no navegador e autorize:\n\n" + url + "\n");

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get("code");
  if (!code) return res.end("Sem código.");
  try {
    const { tokens } = await client.getToken(code);
    res.end("Pronto! Volte ao terminal.");
    console.log("GOOGLE_OAUTH_REFRESH_TOKEN=" + tokens.refresh_token);
  } catch (e) {
    res.end("Erro.");
    console.error(e.message);
  }
  server.close();
});
server.listen(3333);
