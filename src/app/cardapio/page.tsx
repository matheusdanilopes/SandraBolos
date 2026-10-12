import type { Metadata, Viewport } from "next";
import { Poppins, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { CardapioFoto, Produto } from "@/types/database";
import "./cardapio.css";

// Página para clientes. Não aparece no menu do app: só chega aqui quem tem o
// link (Configurações > Cardápio Online). Layout copiado do modelo aprovado;
// só os produtos, os preços e as fotos do carrossel vêm do banco.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cardápio Sandra Zampoli",
  description: "Tortas e doces artesanais — Sandra Zampoli Torteria Artesanal",
  robots: { index: false, follow: false },
  manifest: null,
  appleWebApp: null,
};

export const viewport: Viewport = {
  themeColor: "#FBF2EA",
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-playfair",
});

const babang = localFont({
  src: "./babang.otf",
  display: "swap",
  variable: "--font-babang",
});

const WHATSAPP_URL =
  "https://wa.me/5544988366121?text=Ol%C3%A1!%20Vi%20o%20card%C3%A1pio%20e%20queria%20fazer%20um%20pedido%20%F0%9F%8D%B0";

// Na esteira o conjunto aparece duas vezes (a segunda cópia fecha o loop). Com
// poucas fotos o conjunto é repetido para não sobrar espaço vazio na tela.
const MIN_CARDS_POR_VOLTA = 6;
// O modelo rodava 12 fotos em 30s; mantém a mesma velocidade com qualquer quantidade
const SEGUNDOS_POR_CARD = 2.5;

const numero = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatarPreco(valor: number, sufixo: string) {
  return `R$${numero.format(valor)}/${sufixo}`;
}

function ChevronIcon() {
  return (
    <svg className="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ItemCardapio({ produto, sufixo }: { produto: Produto; sufixo: string }) {
  return (
    <div className="item">
      <div className="item-top">
        <span className="name">{produto.nome}</span>
        <span className="price">{formatarPreco(Number(produto.preco_padrao), sufixo)}</span>
      </div>
      {produto.descricao && <p className="desc">{produto.descricao}</p>}
    </div>
  );
}

function Galeria({ fotos }: { fotos: CardapioFoto[] }) {
  if (fotos.length === 0) return null;

  const repeticoes = Math.ceil(MIN_CARDS_POR_VOLTA / fotos.length);
  const volta = Array.from({ length: repeticoes }, () => fotos).flat();
  const duracao = `${volta.length * SEGUNDOS_POR_CARD}s`;

  return (
    <section className="gallery">
      <div className="gallery-scroll" style={{ animationDuration: duracao }}>
        {volta.map((foto, i) => (
          <div className="gallery-card" key={`a${i}`} aria-hidden={i >= fotos.length || undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.url} alt={i < fotos.length ? foto.legenda ?? "" : ""} loading="lazy" />
          </div>
        ))}
        {volta.map((foto, i) => (
          <div className="gallery-card" key={`b${i}`} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.url} alt="" loading="lazy" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function CardapioPage() {
  const supabase = createServerSupabaseClient();
  const [produtosResult, fotosResult] = await Promise.all([
    supabase
      .from("produtos")
      .select("*")
      .eq("ativo", true)
      .in("unidade_medida", ["peso_kg", "cento"])
      .order("nome"),
    supabase
      .from("cardapio_fotos")
      .select("*")
      .eq("ativo", true)
      .order("ordem")
      .order("created_at"),
  ]);

  if (produtosResult.error) throw produtosResult.error;

  const produtos = (produtosResult.data ?? []) as Produto[];
  // Fotos são enfeite: se a tabela ainda não existir, o cardápio sai sem carrossel
  const fotos = (fotosResult.data ?? []) as CardapioFoto[];

  const tortas = produtos.filter((p) => p.unidade_medida === "peso_kg");
  const doces = produtos.filter((p) => p.unidade_medida === "cento");

  return (
    <div className={`cardapio-sz ${poppins.variable} ${playfair.variable} ${babang.variable}`}>
      <div className="wrap">
        <header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wordmark" src="/cardapio/name.png" alt="Sandra Zampoli" width="1390" height="1000" />
          <p className="sub">Torteria Artesanal</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="cake-icon" src="/cardapio/cake.png" alt="Fatia de bolo Sandra Zampoli" width="220" height="180" />
          <p className="tagline quote">
            &quot;Tortas e doces artesanais feitos com carinho para celebrar os momentos mais felizes da sua vida&quot;
          </p>
        </header>

        <Galeria fotos={fotos} />

        <div className="menu-stack">
          {tortas.length > 0 && (
            <section id="tortas">
              <details className="menu-toggle">
                <summary className="menu-btn">
                  <span className="title">Tortas</span>
                  <span className="sub">ver sabores e valores</span>
                  <ChevronIcon />
                </summary>
                <div className="menu-content">
                  <p className="h2-note">Valores por kg</p>
                  {tortas.map((p) => (
                    <ItemCardapio key={p.id} produto={p} sufixo="kg" />
                  ))}
                </div>
              </details>
            </section>
          )}

          {doces.length > 0 && (
            <section id="doces">
              <details className="menu-toggle">
                <summary className="menu-btn">
                  <span className="title">Doces</span>
                  <span className="sub">brigadeiros gourmet · ver valores</span>
                  <ChevronIcon />
                </summary>
                <div className="menu-content">
                  <p className="h2-note">Valores por cento</p>
                  {doces.map((p) => (
                    <ItemCardapio key={p.id} produto={p} sufixo="cento" />
                  ))}

                  <div className="note-box">
                    <ul>
                      <li>O cento pode ser composto por até 3 sabores.</li>
                      <li>Os doces são entregues em forminhas de papel tradicional ou quadradas, na cor de sua escolha.</li>
                      <li>Encomendas com 2 dias de antecedência.</li>
                    </ul>
                  </div>
                </div>
              </details>
            </section>
          )}

          <section id="pedir">
            <details className="menu-toggle">
              <summary className="menu-btn">
                <span className="title">Como pedir</span>
                <span className="sub">regras, prazos e pedido</span>
                <ChevronIcon />
              </summary>
              <div className="menu-content">
                <div className="rules">
                  <div className="rule-group">
                    <div className="rule-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5.5 10v9a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h3>Decoração</h3>
                      <ul>
                        <li>Cobertura exclusivamente em chantininho não terá custo adicional.</li>
                        <li>Cobertura em ganache terá um adicional de R$25,00/kg.</li>
                        <li>Topo de bolo, pintura, flores, bis, kit kat ou brigadeiros enrolados sobre o bolo terão preço adicional sob consulta.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="rule-group">
                    <div className="rule-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
                        <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div>
                      <h3>Pedido</h3>
                      <ul>
                        <li>Os pedidos devem ser realizados com 4 dias de antecedência (tortas) ou 2 dias (doces). Caso não seja possível, consultar disponibilidade.</li>
                        <li>A retirada deve ser feita em nosso endereço: Rua dos Estudantes, Nº66 — Iguatemi, Maringá.</li>
                        <li>O pagamento deve ser realizado na retirada do pedido, podendo ser por PIX, dinheiro, transferência ou cartão.</li>
                        <li>O peso final pode ter uma variação de até 300g a mais em relação ao peso solicitado.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </section>
        </div>

        <a className="wa-btn" id="pedido-final" href={WHATSAPP_URL} target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.42a9.9 9.9 0 0 0 4.62 1.18h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.13a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.53 3.69-8.22 8.23-8.22 4.53 0 8.22 3.69 8.22 8.22 0 4.54-3.69 8.22-8.23 8.22Zm4.51-6.16c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.96-.14.16-.29.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.24-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.85.83-.85 2.03s.87 2.36.99 2.52c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.46-.6 1.66-1.17.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
          </svg>
          Fazer meu pedido no WhatsApp
        </a>

        <footer>
          <a className="ig" href="https://www.instagram.com/sandra_zampoli" target="_blank" rel="noopener">
            @sandra_zampoli
          </a>
          <p className="credit">Rua dos Estudantes, Nº66 — Iguatemi, Maringá</p>
        </footer>
      </div>
    </div>
  );
}
