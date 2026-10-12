"use client";

import { useState } from "react";
import { Download } from "lucide-react";

// Gera o PDF a partir da própria página do cardápio online (/cardapio?pdf=1),
// carregada num iframe fora da tela: assim o PDF sai igual ao que o cliente vê,
// com as fotos do carrossel em grade.

const LARGURA_PX = 640; // largura do cardápio (600px + margens laterais)
const A4_LARGURA_MM = 210;
const A4_ALTURA_MM = 297;
const MARGEM_PX = 24; // margem de cima e de baixo de cada página
const COR_FUNDO = "#FBF2EA";
// Teto de pixels do canvas: navegadores de celular recusam canvas muito grandes
const MAX_PIXELS_CANVAS = 14_000_000;
const TEMPO_LIMITE_MS = 30_000;

// Blocos que não podem ser cortados na virada de página
const BLOCOS_INTEIROS = "header, .gallery-card, .item, .note-box, .rule-group, .wa-btn, footer";

function carregarIframe(): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    Object.assign(iframe.style, {
      position: "fixed",
      left: "-10000px",
      top: "0",
      width: `${LARGURA_PX}px`,
      height: "1200px",
      border: "0",
    });
    const timer = setTimeout(() => {
      iframe.remove();
      reject(new Error("O cardápio demorou demais para carregar."));
    }, TEMPO_LIMITE_MS);
    iframe.onload = () => {
      clearTimeout(timer);
      resolve(iframe);
    };
    iframe.src = "/cardapio?pdf=1";
    document.body.appendChild(iframe);
  });
}

async function esperarImagens(raiz: HTMLElement) {
  const imagens = Array.from(raiz.querySelectorAll("img"));
  await Promise.all(
    imagens.map(async (img) => {
      if (!img.complete) {
        await new Promise((r) => {
          img.addEventListener("load", r, { once: true });
          img.addEventListener("error", r, { once: true });
        });
      }
      await img.decode().catch(() => {});
    })
  );
}

/** Divide a altura do cardápio em fatias de página sem cortar nenhum bloco ao meio. */
function calcularPaginas(raiz: HTMLElement, alturaTotal: number, alturaUtil: number) {
  const topoRaiz = raiz.getBoundingClientRect().top;
  const blocos = Array.from(raiz.querySelectorAll<HTMLElement>(BLOCOS_INTEIROS)).map((el) => {
    const r = el.getBoundingClientRect();
    return { topo: r.top - topoRaiz, base: r.bottom - topoRaiz };
  });
  // O título de cada seção (Tortas, Doces…) vai junto com o primeiro item dela
  raiz.querySelectorAll("details").forEach((d) => {
    const titulo = d.querySelector("summary");
    const primeiro = d.querySelector(".item, .rule-group");
    if (!titulo || !primeiro) return;
    blocos.push({
      topo: titulo.getBoundingClientRect().top - topoRaiz,
      base: primeiro.getBoundingClientRect().bottom - topoRaiz,
    });
  });

  const paginas: { inicio: number; fim: number }[] = [];
  let inicio = 0;
  while (inicio < alturaTotal) {
    const limite = inicio + alturaUtil;
    let fim = Math.min(limite, alturaTotal);
    if (limite < alturaTotal) {
      const cortados = blocos.filter((b) => b.topo > inicio && b.topo < limite && b.base > limite);
      if (cortados.length > 0) fim = Math.min(...cortados.map((b) => b.topo));
      if (fim - inicio < alturaUtil / 4) fim = limite; // bloco maior que a página: corta mesmo
    }
    paginas.push({ inicio, fim });
    inicio = fim;
  }
  return paginas;
}

async function gerarPdf() {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const iframe = await carregarIframe();
  try {
    const doc = iframe.contentDocument;
    const raiz = doc?.querySelector<HTMLElement>(".cardapio-sz");
    if (!doc || !raiz) throw new Error("Não foi possível abrir o cardápio.");

    await doc.fonts.ready;
    await esperarImagens(raiz);

    // O html2canvas desenha os ícones SVG soltos da página, sem herdar a cor do
    // texto: fixa a cor em cada um para o "currentColor" continuar valendo
    raiz.querySelectorAll<SVGElement>("svg").forEach((svg) => {
      svg.style.color = doc.defaultView!.getComputedStyle(svg).color;
    });

    const alturaTotal = Math.ceil(raiz.scrollHeight);
    iframe.style.height = `${alturaTotal}px`;

    const mmPorPx = A4_LARGURA_MM / LARGURA_PX;
    const alturaPaginaPx = A4_ALTURA_MM / mmPorPx;
    const paginas = calcularPaginas(raiz, alturaTotal, alturaPaginaPx - 2 * MARGEM_PX);

    const escala = Math.min(2.5, Math.sqrt(MAX_PIXELS_CANVAS / (LARGURA_PX * alturaTotal)));
    // O canvas tem de ser do documento do iframe: é lá que as fontes do
    // cardápio estão carregadas. Num canvas do app o texto sai em outra fonte.
    const larguraRaiz = raiz.offsetWidth;
    const canvas = doc.createElement("canvas");
    canvas.width = Math.floor(larguraRaiz * escala);
    canvas.height = Math.floor(alturaTotal * escala);
    await html2canvas(raiz, {
      canvas,
      width: larguraRaiz,
      height: alturaTotal,
      scale: escala,
      useCORS: true,
      backgroundColor: COR_FUNDO,
      logging: false,
      windowWidth: LARGURA_PX,
      windowHeight: alturaTotal,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const caixaRaiz = raiz.getBoundingClientRect();
    const links = Array.from(raiz.querySelectorAll<HTMLAnchorElement>("a[href^='http']")).map((a) => {
      const r = a.getBoundingClientRect();
      return { url: a.href, x: r.left - caixaRaiz.left, topo: r.top - caixaRaiz.top, largura: r.width, altura: r.height };
    });

    paginas.forEach(({ inicio, fim }, i) => {
      if (i > 0) pdf.addPage();
      pdf.setFillColor(COR_FUNDO);
      pdf.rect(0, 0, A4_LARGURA_MM, A4_ALTURA_MM, "F");

      const fatia = document.createElement("canvas");
      fatia.width = canvas.width;
      fatia.height = Math.round((fim - inicio) * escala);
      fatia
        .getContext("2d")!
        .drawImage(canvas, 0, Math.round(inicio * escala), fatia.width, fatia.height, 0, 0, fatia.width, fatia.height);
      pdf.addImage(
        fatia.toDataURL("image/jpeg", 0.92),
        "JPEG",
        0,
        MARGEM_PX * mmPorPx,
        A4_LARGURA_MM,
        (fim - inicio) * mmPorPx
      );

      // O PDF é imagem: recria por cima os links do WhatsApp e do Instagram
      links
        .filter((l) => l.topo >= inicio && l.topo + l.altura <= fim)
        .forEach((l) =>
          pdf.link(
            l.x * mmPorPx,
            (l.topo - inicio + MARGEM_PX) * mmPorPx,
            l.largura * mmPorPx,
            l.altura * mmPorPx,
            { url: l.url }
          )
        );
    });

    pdf.save("cardapio-sandra-zampoli.pdf");
  } finally {
    iframe.remove();
  }
}

export function ExportarCardapioPdf() {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleExportar() {
    setGerando(true);
    setErro(null);
    try {
      await gerarPdf();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar o PDF.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleExportar}
        disabled={gerando}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Download size={15} />
        {gerando ? "Gerando PDF…" : "Exportar Cardápio (PDF)"}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
