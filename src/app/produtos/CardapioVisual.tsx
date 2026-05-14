"use client";

import {
  useState,
  useRef,
  useTransition,
  useEffect,
  useCallback,
  type CSSProperties,
} from "react";
import {
  Download,
  Settings,
  Upload,
  Check,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Layers,
  Move,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ProdutoComCategoria, CategoriaProduto, CardapioConfig } from "@/types/database";
import { salvarConfigCardapio } from "./cardapio-actions";

// ─── Font library ─────────────────────────────────────────────────────────────

const FONTS: Record<string, { label: string; stack: string; googleUrl: string | null }> = {
  georgia: { label: "Georgia", stack: "Georgia, serif", googleUrl: null },
  playfair: {
    label: "Playfair Display",
    stack: "'Playfair Display', serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap",
  },
  dancing: {
    label: "Dancing Script",
    stack: "'Dancing Script', cursive",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap",
  },
  montserrat: {
    label: "Montserrat",
    stack: "'Montserrat', sans-serif",
    googleUrl:
      "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap",
  },
};

function injectGoogleFont(url: string) {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[data-gf="${url}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.dataset.gf = url;
  document.head.appendChild(link);
}

async function ensureFontsLoaded() {
  Object.values(FONTS).forEach((f) => {
    if (f.googleUrl) injectGoogleFont(f.googleUrl);
  });
  await document.fonts.ready;
}

// ─── Domain types ─────────────────────────────────────────────────────────────

type BgType = "rosa_pastel" | "kraft" | "marble" | "upload";
type Alinhamento = "esquerda" | "centro" | "direita";
type LayoutType = "default" | "overlay";
type OverlayAnchor = "top-left" | "top-right" | "bottom-left" | "bottom-right";

// ─── Background library ───────────────────────────────────────────────────────

const LIBRARY: Record<string, { label: string; css: string }> = {
  rosa_pastel: { label: "Rosa Pastel", css: "linear-gradient(135deg, #f9c6d0, #f5a8b8)" },
  kraft:       { label: "Papel Kraft", css: "linear-gradient(135deg, #d4a574, #b8843e, #a07030)" },
  marble:      { label: "Mármore Branco", css: "linear-gradient(135deg, #f8f7f4, #ede9e0, #e8e4d8)" },
};

// ─── Anchor presets ───────────────────────────────────────────────────────────

interface AnchorOption {
  value: OverlayAnchor;
  label: string;
  /** positionX preset (0–54, panel is 46% wide) */
  x: number;
  /** positionY preset (0–80) */
  y: number;
}

const ANCHOR_OPTIONS: AnchorOption[] = [
  { value: "top-left",     label: "↖ Sup. Esq.", x: 4,  y: 4  },
  { value: "top-right",    label: "↗ Sup. Dir.", x: 52, y: 4  },
  { value: "bottom-left",  label: "↙ Inf. Esq.", x: 4,  y: 50 },
  { value: "bottom-right", label: "↘ Inf. Dir.", x: 52, y: 50 },
];

// ─── Config state ─────────────────────────────────────────────────────────────

interface ConfigState {
  // background
  bgType: BgType;
  bgUrl: string | null;
  bgUrlInput: string;
  opacity: number;
  // text colors
  corTitulo: string;
  corDescricao: string;
  corPreco: string;
  // text content
  alinhamento: Alinhamento;
  titulo: string;
  subtitulo: string;
  observacoes: string;
  fontFamily: string;
  // layout
  layoutType: LayoutType;
  overlayAnchor: OverlayAnchor;
  /** 0–54 (panel occupies 46% width, so max safe left = 54%) */
  positionX: number;
  /** 0–80 */
  positionY: number;
  /** 0–1: opacity of the content panel background (overlay mode only) */
  panelOpacity: number;
  /** hex color of the content panel background (overlay mode only) */
  panelColor: string;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

interface Grupo {
  id: string | null;
  nome: string;
  ordem: number;
  produtos: ProdutoComCategoria[];
}

function buildGrupos(ativos: ProdutoComCategoria[], categorias: CategoriaProduto[]): Grupo[] {
  const catMap = new Map(categorias.map((c) => [c.id, c]));
  const grupoMap = new Map<string | null, Grupo>();
  for (const cat of categorias) {
    grupoMap.set(cat.id, { id: cat.id, nome: cat.nome, ordem: cat.ordem, produtos: [] });
  }
  grupoMap.set(null, { id: null, nome: "Outros", ordem: 9999, produtos: [] });
  for (const p of ativos) {
    const key = p.categoria_id && catMap.has(p.categoria_id) ? p.categoria_id : null;
    grupoMap.get(key)!.produtos.push(p);
  }
  return Array.from(grupoMap.values())
    .filter((g) => g.produtos.length > 0)
    .sort((a, b) => a.ordem - b.ordem);
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function getBgStyle(cfg: ConfigState): CSSProperties {
  if (cfg.bgType === "upload" && cfg.bgUrl) {
    return { backgroundImage: `url(${cfg.bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  return { background: LIBRARY[cfg.bgType]?.css ?? LIBRARY.rosa_pastel.css };
}

function priceLabel(p: ProdutoComCategoria): string {
  const suffix = p.unidade_medida === "peso_kg" ? "/kg" : p.unidade_medida === "cento" ? "/cento" : "/un.";
  return `${formatCurrency(p.preco_padrao)}${suffix}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${alpha})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}

/** Absolute-positioned content panel style for overlay layout. */
function getOverlayPanelStyle(cfg: ConfigState): CSSProperties {
  return {
    position: "absolute",
    left: `${cfg.positionX}%`,
    top: `${cfg.positionY}%`,
    width: "46%",
    maxHeight: `${Math.max(20, 97 - cfg.positionY)}%`,
    zIndex: 10,
    backgroundColor: hexToRgba(cfg.panelColor, cfg.panelOpacity),
    borderRadius: "10px",
    padding: "10px",
    overflow: "hidden",
  };
}

function resolveTextAlign(alinhamento: Alinhamento): "left" | "center" | "right" {
  if (alinhamento === "centro") return "center";
  if (alinhamento === "direita") return "right";
  return "left";
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-600 truncate">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 rounded border border-gray-300 cursor-pointer p-0.5"
        />
        <span className="text-[10px] font-mono text-gray-400 w-[52px] text-right">{value}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
      {children}
    </div>
  );
}

// ─── Shared content sub-components ───────────────────────────────────────────
// These are used by both layout modes so that visual output stays consistent.

function MenuHeader({ cfg, compact = false }: { cfg: ConfigState; compact?: boolean }) {
  const textAlign = resolveTextAlign(cfg.alinhamento);
  return (
    <div style={{ textAlign }} className={compact ? "mb-1.5 shrink-0" : "mb-3 shrink-0"}>
      <h2
        className={compact ? "text-base font-bold leading-tight" : "text-2xl font-bold leading-tight"}
        style={{ color: cfg.corTitulo }}
      >
        {cfg.titulo || "Cardápio"}
      </h2>
      {cfg.subtitulo && (
        <p
          className={compact ? "text-[11px] italic mt-0.5" : "text-sm italic mt-0.5"}
          style={{ color: cfg.corDescricao, opacity: 0.75 }}
        >
          {cfg.subtitulo}
        </p>
      )}
    </div>
  );
}

function MenuDivider({ cfg, compact = false }: { cfg: ConfigState; compact?: boolean }) {
  const divStyle: CSSProperties =
    cfg.alinhamento === "centro"
      ? { width: compact ? "2rem" : "4rem", margin: "0 auto" }
      : { width: "100%" };
  return (
    <div
      className={compact ? "h-px mb-2 shrink-0" : "h-px mb-3 shrink-0"}
      style={{ background: cfg.corTitulo, opacity: 0.25, ...divStyle }}
    />
  );
}

function ObservacoesBlock({ cfg, compact = false }: { cfg: ConfigState; compact?: boolean }) {
  if (!cfg.observacoes) return null;
  const textAlign = resolveTextAlign(cfg.alinhamento);
  return (
    <div
      className={compact ? "mt-1.5 pt-1.5 shrink-0" : "mt-3 pt-2 shrink-0"}
      style={{ borderTop: `1px solid ${cfg.corTitulo}20`, textAlign }}
    >
      <p
        className="text-[10px] leading-relaxed whitespace-pre-wrap"
        style={{ color: cfg.corDescricao, opacity: 0.7 }}
      >
        {cfg.observacoes}
      </p>
    </div>
  );
}

// ─── Product item ─────────────────────────────────────────────────────────────

function ProductItem({ p, cfg, compact = false }: { p: ProdutoComCategoria; cfg: ConfigState; compact?: boolean }) {
  const price = priceLabel(p);
  const nameCls = compact ? "text-xs font-bold leading-tight" : "text-sm font-bold leading-tight truncate";
  const descCls = compact
    ? "text-[10px] italic leading-snug mt-0.5 line-clamp-1"
    : "text-[11px] italic leading-snug mt-0.5 line-clamp-2";
  const priceCls = compact ? "text-xs font-semibold mt-0.5" : "text-sm font-semibold mt-0.5";

  if (cfg.alinhamento === "centro") {
    return (
      <div className={compact ? "text-center" : "text-center py-0.5"}>
        <p className={nameCls} style={{ color: cfg.corTitulo }}>{p.nome}</p>
        {p.descricao && <p className={descCls} style={{ color: cfg.corDescricao, opacity: 0.85 }}>{p.descricao}</p>}
        <p className={priceCls} style={{ color: cfg.corPreco }}>{price}</p>
      </div>
    );
  }

  if (cfg.alinhamento === "direita") {
    return (
      <div className={compact ? "text-right" : "text-right py-0.5"}>
        <p className={nameCls} style={{ color: cfg.corTitulo }}>{p.nome}</p>
        {p.descricao && <p className={descCls} style={{ color: cfg.corDescricao, opacity: 0.85 }}>{p.descricao}</p>}
        <p className={priceCls} style={{ color: cfg.corPreco }}>{price}</p>
      </div>
    );
  }

  // esquerda — name+desc left, price right
  return (
    <div className={compact ? "flex items-start gap-1.5" : "flex items-start gap-2 py-0.5"}>
      <div className="flex-1 min-w-0">
        <p className={nameCls} style={{ color: cfg.corTitulo }}>{p.nome}</p>
        {p.descricao && <p className={descCls} style={{ color: cfg.corDescricao, opacity: 0.85 }}>{p.descricao}</p>}
      </div>
      <span
        className={`shrink-0 font-bold whitespace-nowrap ${compact ? "text-xs" : "text-sm"}`}
        style={{ color: cfg.corPreco }}
      >
        {price}
      </span>
    </div>
  );
}

// ─── Product group list ───────────────────────────────────────────────────────

function ProductGroupList({ cfg, grupos, compact = false }: { cfg: ConfigState; grupos: Grupo[]; compact?: boolean }) {
  const textAlign = resolveTextAlign(cfg.alinhamento);
  if (grupos.length === 0) {
    return (
      <p className="text-xs text-center" style={{ color: cfg.corDescricao, opacity: 0.4 }}>
        Nenhum produto ativo
      </p>
    );
  }
  return (
    <>
      {grupos.map((g) => (
        <div key={g.id ?? "outros"} className={compact ? "mb-2" : "mb-3"}>
          <p
            className="text-[9px] font-bold uppercase tracking-widest mb-1"
            style={{ color: cfg.corTitulo, opacity: 0.5, textAlign }}
          >
            {g.nome}
          </p>
          <div className="h-px mb-1.5" style={{ background: cfg.corTitulo, opacity: 0.1 }} />
          <div className={compact ? "space-y-0.5" : "space-y-1"}>
            {g.produtos.map((p) => (
              <ProductItem key={p.id} p={p} cfg={cfg} compact={compact} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Layout: Default ─────────────────────────────────────────────────────────
// Full-height flex column over background. Classic menu card look.

function MenuPreviewDefault({
  cfg,
  grupos,
  previewRef,
}: {
  cfg: ConfigState;
  grupos: Grupo[];
  previewRef: React.RefObject<HTMLDivElement>;
}) {
  const font = FONTS[cfg.fontFamily] ?? FONTS.georgia;

  return (
    <div
      ref={previewRef}
      className="relative rounded-2xl overflow-hidden w-full"
      style={{ aspectRatio: "4/5", ...getBgStyle(cfg) }}
    >
      {/* Overlay / filter layer */}
      <div className="absolute inset-0" style={{ backgroundColor: `rgba(255,255,255,${cfg.opacity})` }} />

      {/* Content layer — fills full height */}
      <div
        className="relative z-10 flex flex-col h-full p-5"
        style={{ fontFamily: font.stack }}
      >
        <MenuHeader cfg={cfg} />
        <MenuDivider cfg={cfg} />
        <div className="flex-1 overflow-hidden">
          <ProductGroupList cfg={cfg} grupos={grupos} />
        </div>
        <ObservacoesBlock cfg={cfg} />
        <p
          className="text-center text-[10px] mt-3 shrink-0"
          style={{ color: cfg.corTitulo, opacity: 0.35 }}
        >
          Sandra Bolos
        </p>
      </div>
    </div>
  );
}

// ─── Layout: Overlay ─────────────────────────────────────────────────────────
// Background fills the full canvas. Content panel floats absolutely on top
// with configurable position (position_x / position_y) and anchor presets.
// Structure: background layer → overlay/filter layer → content layer (z-10).

function MenuPreviewOverlay({
  cfg,
  grupos,
  previewRef,
}: {
  cfg: ConfigState;
  grupos: Grupo[];
  previewRef: React.RefObject<HTMLDivElement>;
}) {
  const font = FONTS[cfg.fontFamily] ?? FONTS.georgia;

  return (
    <div
      ref={previewRef}
      className="relative rounded-2xl overflow-hidden w-full"
      style={{ aspectRatio: "4/5", ...getBgStyle(cfg) }}
    >
      {/* Overlay / filter layer — global image tint for legibility */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(255,255,255,${cfg.opacity})` }}
      />

      {/* Content layer — absolutely positioned panel with z-index 10 */}
      <div style={{ ...getOverlayPanelStyle(cfg), fontFamily: font.stack }}>
        <MenuHeader cfg={cfg} compact />
        <MenuDivider cfg={cfg} compact />
        <div className="overflow-hidden">
          <ProductGroupList cfg={cfg} grupos={grupos} compact />
        </div>
        <ObservacoesBlock cfg={cfg} compact />
      </div>
    </div>
  );
}

// ─── MenuPreview dispatcher ───────────────────────────────────────────────────

function MenuPreview({
  cfg,
  grupos,
  previewRef,
}: {
  cfg: ConfigState;
  grupos: Grupo[];
  previewRef: React.RefObject<HTMLDivElement>;
}) {
  if (cfg.layoutType === "overlay") {
    return <MenuPreviewOverlay cfg={cfg} grupos={grupos} previewRef={previewRef} />;
  }
  return <MenuPreviewDefault cfg={cfg} grupos={grupos} previewRef={previewRef} />;
}

// ─── Alignment selector ───────────────────────────────────────────────────────

const ALIGN_OPTIONS: { value: Alinhamento; Icon: LucideIcon; label: string }[] = [
  { value: "esquerda", Icon: AlignLeft,   label: "Esquerda" },
  { value: "centro",   Icon: AlignCenter, label: "Centro"   },
  { value: "direita",  Icon: AlignRight,  label: "Direita"  },
];

// ─── Config Sidebar ───────────────────────────────────────────────────────────

interface ConfigSidebarProps {
  cfg: ConfigState;
  upd: <K extends keyof ConfigState>(key: K, val: ConfigState[K]) => void;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  isPending: boolean;
  saveOk: boolean;
  fileRef: React.RefObject<HTMLInputElement>;
}

function ConfigSidebar({ cfg, upd, uploading, onUpload, onSave, isPending, saveOk, fileRef }: ConfigSidebarProps) {
  const [showUrlInput, setShowUrlInput] = useState(false);

  function applyManualUrl() {
    const url = cfg.bgUrlInput.trim();
    if (url) { upd("bgUrl", url); upd("bgType", "upload"); }
    setShowUrlInput(false);
  }

  function pickAnchor(anchor: AnchorOption) {
    upd("overlayAnchor", anchor.value);
    upd("positionX", anchor.x);
    upd("positionY", anchor.y);
  }

  return (
    <div className="space-y-3">

      {/* ── Layout ── */}
      <SectionCard title="Layout">
        <div className="flex gap-1.5">
          {(["default", "overlay"] as LayoutType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => upd("layoutType", type)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs transition-all ${
                cfg.layoutType === type
                  ? "border-brand-500 bg-brand-50 text-brand-600"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {type === "overlay" ? <Layers size={14} /> : <span className="text-base leading-none">◻</span>}
              <span className="text-[10px] font-medium">{type === "default" ? "Padrão" : "Overlay"}</span>
            </button>
          ))}
        </div>

        {/* Overlay-specific positioning options */}
        {cfg.layoutType === "overlay" && (
          <div className="space-y-3 pt-2 border-t border-gray-100">

            {/* Anchor presets — 2×2 grid representing the 4 corners */}
            <div>
              <p className="text-xs text-gray-600 mb-2">Posição do painel</p>
              <div className="grid grid-cols-2 gap-1.5">
                {ANCHOR_OPTIONS.map((anchor) => (
                  <button
                    key={anchor.value}
                    type="button"
                    onClick={() => pickAnchor(anchor)}
                    className={`py-2 px-2 rounded-lg border text-[10px] font-medium transition-all ${
                      cfg.overlayAnchor === anchor.value
                        ? "border-brand-500 bg-brand-50 text-brand-600"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {anchor.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fine-tune: position X */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 flex items-center gap-1">
                  <Move size={11} /> Horizontal
                </span>
                <span className="font-semibold text-gray-800">{cfg.positionX}%</span>
              </div>
              <input
                type="range" min="0" max="54" step="1"
                value={cfg.positionX}
                onChange={(e) => upd("positionX", Number(e.target.value))}
                className="w-full"
                style={{ accentColor: "#db2777" }}
              />
            </div>

            {/* Fine-tune: position Y */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 flex items-center gap-1">
                  <Move size={11} /> Vertical
                </span>
                <span className="font-semibold text-gray-800">{cfg.positionY}%</span>
              </div>
              <input
                type="range" min="0" max="80" step="1"
                value={cfg.positionY}
                onChange={(e) => upd("positionY", Number(e.target.value))}
                className="w-full"
                style={{ accentColor: "#db2777" }}
              />
            </div>

            {/* Panel background color + opacity */}
            <ColorControl label="Cor do painel" value={cfg.panelColor} onChange={(v) => upd("panelColor", v)} />
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Opacidade do painel</span>
                <span className="font-semibold text-gray-800">{Math.round(cfg.panelOpacity * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                value={cfg.panelOpacity}
                onChange={(e) => upd("panelOpacity", parseFloat(e.target.value))}
                className="w-full"
                style={{ accentColor: "#db2777" }}
              />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Fundo ── */}
      <SectionCard title="Fundo">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(LIBRARY).map(([id, bg]) => (
            <button
              key={id}
              type="button"
              onClick={() => upd("bgType", id as BgType)}
              className={`relative rounded-xl overflow-hidden transition-all ${
                cfg.bgType === id
                  ? "ring-2 ring-brand-500 ring-offset-1"
                  : "ring-1 ring-gray-200 hover:ring-gray-300"
              }`}
              style={{ aspectRatio: "1" }}
            >
              <div className="w-full h-full" style={{ background: bg.css }} />
              <span className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] text-center py-0.5 font-medium leading-tight">
                {bg.label}
              </span>
              {cfg.bgType === id && (
                <div className="absolute top-1 right-1 bg-brand-500 rounded-full p-0.5">
                  <Check size={8} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`btn-secondary w-full flex items-center justify-center gap-2 text-xs ${
            cfg.bgType === "upload" && cfg.bgUrl ? "ring-2 ring-brand-500" : ""
          }`}
        >
          <Upload size={13} />
          {uploading ? "Enviando…" : cfg.bgType === "upload" && cfg.bgUrl ? "Trocar imagem" : "Upload (JPG / PNG / WebP)"}
        </button>

        {showUrlInput ? (
          <div className="space-y-1.5">
            <input
              className="input text-xs"
              placeholder="https://…supabase.co/storage/v1/object/public/…"
              value={cfg.bgUrlInput}
              onChange={(e) => upd("bgUrlInput", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyManualUrl()}
              autoFocus
            />
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setShowUrlInput(false)} className="btn-secondary flex-1 text-xs py-1">
                Cancelar
              </button>
              <button type="button" onClick={applyManualUrl} className="btn-primary flex-1 text-xs py-1">
                Aplicar URL
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowUrlInput(true)}
            className="w-full flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 py-1 transition-colors"
          >
            <Link size={11} /> Colar URL do Supabase Storage
          </button>
        )}

        {cfg.bgType === "upload" && cfg.bgUrl && (
          <p className="text-[10px] text-brand-600 flex items-center gap-1">
            <Check size={10} /> Imagem personalizada ativa
          </p>
        )}
      </SectionCard>

      {/* ── Overlay de legibilidade ── */}
      <SectionCard title="Overlay de legibilidade">
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-600">Opacidade do fundo (branco)</span>
            <span className="font-semibold text-gray-800">{Math.round(cfg.opacity * 100)}%</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.01"
            value={cfg.opacity}
            onChange={(e) => upd("opacity", parseFloat(e.target.value))}
            className="w-full"
            style={{ accentColor: "#db2777" }}
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>0% — transparente</span><span>100% — branco</span>
          </div>
        </div>
      </SectionCard>

      {/* ── Cores ── */}
      <SectionCard title="Cores do texto">
        <ColorControl label="Título / Nome" value={cfg.corTitulo}   onChange={(v) => upd("corTitulo", v)} />
        <ColorControl label="Descrição"     value={cfg.corDescricao} onChange={(v) => upd("corDescricao", v)} />
        <ColorControl label="Preço"         value={cfg.corPreco}    onChange={(v) => upd("corPreco", v)} />
      </SectionCard>

      {/* ── Alinhamento ── */}
      <SectionCard title="Alinhamento">
        <div className="flex gap-1.5">
          {ALIGN_OPTIONS.map(({ value, Icon, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => upd("alinhamento", value)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs transition-all ${
                cfg.alinhamento === value
                  ? "border-brand-500 bg-brand-50 text-brand-600"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <Icon size={15} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ── Textos ── */}
      <SectionCard title="Textos do cardápio">
        <div>
          <label className="label text-xs">Título</label>
          <input className="input text-sm" value={cfg.titulo} onChange={(e) => upd("titulo", e.target.value)} placeholder="Cardápio" />
        </div>
        <div>
          <label className="label text-xs">Subtítulo (opcional)</label>
          <input className="input text-sm" value={cfg.subtitulo} onChange={(e) => upd("subtitulo", e.target.value)} placeholder="Ex: Especialidades artesanais" />
        </div>
        <div>
          <label className="label text-xs">Observações / Retirada / Pedido</label>
          <textarea
            className="input text-xs resize-none"
            rows={3}
            value={cfg.observacoes}
            onChange={(e) => upd("observacoes", e.target.value)}
            placeholder={"Pedidos via WhatsApp\nRetirada: seg–sex, 9h às 18h"}
          />
        </div>
      </SectionCard>

      {/* ── Fonte ── */}
      <SectionCard title="Fonte">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(FONTS).map(([id, font]) => (
            <button
              key={id}
              type="button"
              onClick={() => upd("fontFamily", id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                cfg.fontFamily === id
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-xl leading-tight" style={{ fontFamily: font.stack }}>Abc</p>
              <p className="text-[10px] text-gray-500 mt-1">{font.label}</p>
              {cfg.fontFamily === id && <p className="text-[9px] text-brand-600 font-semibold mt-0.5">✓ ativa</p>}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* ── Save ── */}
      <button type="button" onClick={onSave} disabled={isPending} className="btn-primary w-full flex items-center justify-center gap-2">
        {saveOk ? <><Check size={15} /> Salvo!</> : isPending ? "Salvando…" : "Salvar configurações"}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  produtos: ProdutoComCategoria[];
  categorias: CategoriaProduto[];
  configInicial: CardapioConfig | null;
  modoVisualizacao?: boolean;
}

export function CardapioVisual({ produtos, categorias, configInicial, modoVisualizacao = false }: Props) {
  const [mobileTab, setMobileTab] = useState<"preview" | "config">("preview");
  const [cfg, setCfg] = useState<ConfigState>({
    bgType:        (configInicial?.background_type as BgType) ?? "rosa_pastel",
    bgUrl:          configInicial?.background_url ?? null,
    bgUrlInput:     configInicial?.background_url ?? "",
    opacity:        configInicial?.opacity ?? 0.3,
    corTitulo:      configInicial?.cor_titulo ?? "#1f2937",
    corDescricao:   configInicial?.cor_descricao ?? "#4b5563",
    corPreco:       configInicial?.cor_preco ?? "#1f2937",
    alinhamento:    (configInicial?.alinhamento as Alinhamento) ?? "esquerda",
    titulo:         configInicial?.titulo ?? "Cardápio",
    subtitulo:      configInicial?.subtitulo ?? "",
    observacoes:    configInicial?.observacoes ?? "",
    fontFamily:     configInicial?.font_family ?? "georgia",
    layoutType:     (configInicial?.layout_type as LayoutType) ?? "default",
    overlayAnchor:  (configInicial?.overlay_anchor as OverlayAnchor) ?? "top-left",
    positionX:      configInicial?.position_x ?? 4,
    positionY:      configInicial?.position_y ?? 4,
    panelOpacity:   configInicial?.panel_opacity ?? 0.88,
    panelColor:     configInicial?.panel_color ?? "#ffffff",
  });
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef    = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const ativos = produtos.filter((p) => p.ativo);
  const grupos = buildGrupos(ativos, categorias);

  useEffect(() => {
    Object.values(FONTS).forEach((f) => { if (f.googleUrl) injectGoogleFont(f.googleUrl); });
  }, []);

  const upd = useCallback(
    <K extends keyof ConfigState>(key: K, val: ConfigState[K]) => {
      setCfg((prev) => ({ ...prev, [key]: val }));
    },
    []
  );

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/upload-background", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        setCfg((prev) => ({ ...prev, bgUrl: json.url!, bgType: "upload", bgUrlInput: json.url! }));
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSave() {
    startTransition(async () => {
      await salvarConfigCardapio({
        background_url:  cfg.bgUrl,
        background_type: cfg.bgType,
        opacity:         cfg.opacity,
        cor_titulo:      cfg.corTitulo,
        cor_descricao:   cfg.corDescricao,
        cor_preco:       cfg.corPreco,
        alinhamento:     cfg.alinhamento,
        titulo:          cfg.titulo,
        subtitulo:       cfg.subtitulo || null,
        observacoes:     cfg.observacoes || null,
        font_family:     cfg.fontFamily,
        layout_type:     cfg.layoutType,
        overlay_anchor:  cfg.overlayAnchor,
        position_x:      cfg.positionX,
        position_y:      cfg.positionY,
        panel_opacity:   cfg.panelOpacity,
        panel_color:     cfg.panelColor,
      });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    });
  }

  async function handleExport() {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      await ensureFontsLoaded();
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(previewRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
      });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png", 1.0);
      a.download = "cardapio-sandra-bolos.png";
      a.click();
    } finally {
      setExporting(false);
    }
  }

  const previewPanel = (
    <div className="space-y-3">
      <MenuPreview cfg={cfg} grupos={grupos} previewRef={previewRef} />
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Download size={15} />
        {exporting ? "Gerando PNG…" : "Exportar Cardápio (PNG)"}
      </button>
    </div>
  );

  if (modoVisualizacao) return previewPanel;

  const configPanel = (
    <ConfigSidebar
      cfg={cfg}
      upd={upd}
      uploading={uploading}
      onUpload={handleUpload}
      onSave={handleSave}
      isPending={isPending}
      saveOk={saveOk}
      fileRef={fileRef}
    />
  );

  return (
    <div>
      {/* ── Desktop: side-by-side ── */}
      <div className="hidden sm:grid sm:grid-cols-[260px_1fr] sm:gap-4 sm:items-start">
        <div className="space-y-3 sm:sticky sm:top-4 sm:max-h-[calc(100vh-5rem)] sm:overflow-y-auto sm:pb-4">
          {configPanel}
        </div>
        {previewPanel}
      </div>

      {/* ── Mobile: tabs ── */}
      <div className="sm:hidden space-y-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["preview", "config"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMobileTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg py-1.5 transition-colors ${
                mobileTab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "preview" ? (
                <><ImageIcon size={12} /> Visualizar</>
              ) : (
                <><Settings size={12} /> Personalizar</>
              )}
            </button>
          ))}
        </div>
        {mobileTab === "preview" ? previewPanel : configPanel}
      </div>
    </div>
  );
}
