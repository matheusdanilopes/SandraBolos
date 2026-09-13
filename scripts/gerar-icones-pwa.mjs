// Gera os ícones do PWA a partir de public/logo.jpg.
//
// Todos saem em PNG *opaco* sobre o creme do logo: o iOS descarta um
// apple-touch-icon com canal alfa e mostra um monograma no lugar do ícone.
// Os "maskable" deixam o logo dentro da zona segura (círculo central de 80%),
// senão o Android corta as bordas ao aplicar a máscara do sistema.
//
// Uso: node scripts/gerar-icones-pwa.mjs

import sharp from "sharp";

const ORIGEM = "public/logo.jpg";
const CREME = { r: 250, g: 241, b: 232 }; // cor de fundo do próprio logo

const ALVOS = [
  { arquivo: "public/icon-512.png", lado: 512, ocupacao: 0.92 },
  { arquivo: "public/icon-192.png", lado: 192, ocupacao: 0.92 },
  { arquivo: "public/icon-512-maskable.png", lado: 512, ocupacao: 0.64 },
  { arquivo: "public/icon-192-maskable.png", lado: 192, ocupacao: 0.64 },
  { arquivo: "public/apple-touch-icon.png", lado: 180, ocupacao: 0.92 },
  { arquivo: "public/icon-96.png", lado: 96, ocupacao: 0.94 },
  { arquivo: "public/icon-32.png", lado: 32, ocupacao: 1.0 },
];

// Remove a moldura de fundo do JPG para o logo ficar centralizado de verdade.
const recortado = await sharp(ORIGEM).trim({ threshold: 12 }).toBuffer();

for (const { arquivo, lado, ocupacao } of ALVOS) {
  const conteudo = Math.round(lado * ocupacao);
  const camada = await sharp(recortado)
    .resize(conteudo, conteudo, { fit: "contain", background: CREME })
    .toBuffer();

  await sharp({
    create: { width: lado, height: lado, channels: 3, background: CREME },
  })
    .composite([{ input: camada, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toFile(arquivo);

  console.log(`${arquivo} (${lado}x${lado})`);
}
