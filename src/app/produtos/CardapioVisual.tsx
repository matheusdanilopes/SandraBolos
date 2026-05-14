"use client";

import { useState, useRef, useTransition, type CSSProperties } from "react";
import {
  Download,
  Settings,
  Upload,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Produto, CardapioConfig } from "@/types/database";
import { salvarConfigCardapio } from "./cardapio-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type BgType = "rosa_pastel" | "kraft" | "marble" | "upload";

interface ConfigState {
  bgType: BgType;
  bgUrl: string | null;
  opacity: number; // 0–1
  titulo: string;
  subtitulo: string;
  corTexto: string;
}

interface GradStop {
  offset: number;
  color: string;
}

// ─── Library backgrounds ──────────────────────────────────────────────────────

const LIBRARY: Record<string, { label: string; css: string; stops: GradStop[] }> = {
  rosa_pastel: {
    label: "Rosa Pastel",
    css: "linear-gradient(135deg, #f9c6d0, #f5a8b8)",
    stops: [
      { offset: 0, color: "#f9c6d0" },
      { offset: 1, color: "#f5a8b8" },
    ],
  },
  kraft: {
    label: "Papel Kraft",
    css: "linear-gradient(135deg, #d4a574, #b8843e, #a07030)",
    stops: [
      { offset: 0, color: "#d4a574" },
      { offset: 0.5, color: "#b8843e" },
      { offset: 1, color: "#a07030" },
    ],
  },
  marble: {
    label: "Mármore Branco",
    css: "linear-gradient(135deg, #f8f7f4, #ede9e0, #e8e4d8)",
    stops: [
      { offset: 0, color: "#f8f7f4" },
      { offset: 0.5, color: "#ede9e0" },
      { offset: 1, color: "#e8e4d8" },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBgStyle(cfg: ConfigState): CSSProperties {
  if (cfg.bgType === "upload" && cfg.bgUrl) {
    return {
      backgroundImage: `url(${cfg.bgUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { background: LIBRARY[cfg.bgType]?.css ?? LIBRARY.rosa_pastel.css };
}

function priceLabel(p: Produto): string {
  const suffix =
    p.unidade_medida === "peso_kg"
      ? "/kg"
      : p.unidade_medida === "cento"
      ? "/cento"
      : "/un.";
  return `${formatCurrency(p.preco_padrao)}${suffix}`;
}

function drawGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stops: GradStop[]
) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  stops.forEach((s) => grad.addColorStop(s.offset, s.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (ctx.measureText(t + "…").width > maxWidth && t.length > 0) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

// ─── Preview component (CSS-based, synced with canvas output) ─────────────────

function MenuPreview({
  cfg,
  produtos,
}: {
  cfg: ConfigState;
  produtos: Produto[];
}) {
  const bg = getBgStyle(cfg);
  const overlay = `rgba(255,255,255,${cfg.opacity})`;

  return (
    <div
      className="relative rounded-2xl overflow-hidden w-full"
      style={{ aspectRatio: "4/5", ...bg }}
    >
      {/* Legibility overlay */}
      <div className="absolute inset-0" style={{ backgroundColor: overlay }} />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col h-full p-5"
        style={{ color: cfg.corTexto }}
      >
        {/* Header */}
        <div className="text-center mb-3 shrink-0">
          <h2
            className="text-2xl font-bold leading-tight"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {cfg.titulo || "Cardápio"}
          </h2>
          {cfg.subtitulo && (
            <p className="text-sm mt-0.5 italic" style={{ opacity: 0.75 }}>
              {cfg.subtitulo}
            </p>
          )}
        </div>

        {/* Divider */}
        <div
          className="w-16 h-px mx-auto mb-3 shrink-0"
          style={{ background: cfg.corTexto, opacity: 0.35 }}
        />

        {/* Products list */}
        <div className="flex-1 space-y-2 overflow-hidden">
          {produtos.length === 0 ? (
            <p className="text-center text-xs" style={{ opacity: 0.4 }}>
              Nenhum produto ativo
            </p>
          ) : (
            produtos.map((p) => (
              <div key={p.id} className="flex items-baseline gap-2">
                <span className="text-sm font-medium min-w-0 truncate shrink leading-tight">
                  {p.nome}
                </span>
                <span
                  className="flex-1 border-b shrink-0"
                  style={{ borderColor: cfg.corTexto, opacity: 0.2 }}
                />
                <span className="text-sm font-bold shrink-0 whitespace-nowrap">
                  {priceLabel(p)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <p
          className="text-center text-[10px] mt-3 shrink-0"
          style={{ opacity: 0.4 }}
        >
          Sandra Bolos
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  produtos: Produto[];
  configInicial: CardapioConfig | null;
}

export function CardapioVisual({ produtos, configInicial }: Props) {
  const [tab, setTab] = useState<"preview" | "config">("preview");
  const [cfg, setCfg] = useState<ConfigState>({
    bgType: (configInicial?.background_type as BgType) ?? "rosa_pastel",
    bgUrl: configInicial?.background_url ?? null,
    opacity: configInicial?.opacity ?? 0.3,
    titulo: configInicial?.titulo ?? "Cardápio",
    subtitulo: configInicial?.subtitulo ?? "",
    corTexto: configInicial?.cor_texto ?? "#1f2937",
  });
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const ativos = produtos.filter((p) => p.ativo);

  function upd<K extends keyof ConfigState>(key: K, val: ConfigState[K]) {
    setCfg((prev) => ({ ...prev, [key]: val }));
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload-background", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        setCfg((prev) => ({ ...prev, bgUrl: json.url!, bgType: "upload" }));
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Save config ─────────────────────────────────────────────────────────────

  function handleSave() {
    startTransition(async () => {
      await salvarConfigCardapio({
        background_url: cfg.bgUrl,
        background_type: cfg.bgType,
        opacity: cfg.opacity,
        titulo: cfg.titulo,
        subtitulo: cfg.subtitulo || null,
        cor_texto: cfg.corTexto,
      });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    });
  }

  // ── Canvas export ───────────────────────────────────────────────────────────

  async function handleExport() {
    setExporting(true);
    try {
      const W = 1080;
      const H = 1350; // 4:5 — ideal for social media
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // 1. Background
      if (cfg.bgType === "upload" && cfg.bgUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // fallback on CORS failure
          img.src = cfg.bgUrl!;
        });
        if (img.width > 0) {
          const scale = Math.max(W / img.width, H / img.height);
          const dw = img.width * scale;
          const dh = img.height * scale;
          ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
        } else {
          drawGradient(ctx, W, H, LIBRARY.rosa_pastel.stops);
        }
      } else {
        drawGradient(
          ctx,
          W,
          H,
          (LIBRARY[cfg.bgType] ?? LIBRARY.rosa_pastel).stops
        );
      }

      // 2. Overlay
      ctx.fillStyle = `rgba(255,255,255,${cfg.opacity})`;
      ctx.fillRect(0, 0, W, H);

      // 3. Content
      const PAD = 72;
      let y = PAD + 80;

      ctx.fillStyle = cfg.corTexto;
      ctx.textAlign = "center";

      // Title
      ctx.font = "bold 80px Georgia, serif";
      ctx.fillText(cfg.titulo || "Cardápio", W / 2, y);
      y += 90;

      // Subtitle
      if (cfg.subtitulo) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.font = "italic 42px Georgia, serif";
        ctx.fillText(cfg.subtitulo, W / 2, y);
        ctx.restore();
        y += 55;
      }

      // Divider
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = cfg.corTexto;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 80, y);
      ctx.lineTo(W / 2 + 80, y);
      ctx.stroke();
      ctx.restore();
      y += 60;

      // Products
      const ITEM_H = 72;
      const MAX_NAME_W = W / 2 - PAD - 30;

      for (const p of ativos) {
        if (y + ITEM_H > H - PAD - 80) break;

        const pl = priceLabel(p);

        // Measure price first (bold)
        ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
        const priceW = ctx.measureText(pl).width;

        // Measure & truncate name
        ctx.font = "44px system-ui, -apple-system, sans-serif";
        const maxNW = W - PAD * 2 - priceW - 60;
        const nameTxt = truncateText(ctx, p.nome, maxNW > MAX_NAME_W ? MAX_NAME_W : maxNW);
        const nameW = ctx.measureText(nameTxt).width;

        // Draw name
        ctx.fillStyle = cfg.corTexto;
        ctx.textAlign = "left";
        ctx.fillText(nameTxt, PAD, y);

        // Draw price
        ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "right";
        ctx.fillStyle = cfg.corTexto;
        ctx.fillText(pl, W - PAD, y);

        // Dotted connector line
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = cfg.corTexto;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(PAD + nameW + 20, y - 14);
        ctx.lineTo(W - PAD - priceW - 20, y - 14);
        ctx.stroke();
        ctx.restore();

        y += ITEM_H;
      }

      // Footer
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.font = "32px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillStyle = cfg.corTexto;
      ctx.fillText("Sandra Bolos", W / 2, H - PAD);
      ctx.restore();

      // Download
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png", 1.0);
      a.download = "cardapio-sandra-bolos.png";
      a.click();
    } finally {
      setExporting(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Tab selector */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(["preview", "config"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg py-1.5 transition-colors ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "preview" ? (
              <>
                <ImageIcon size={12} /> Visualizar
              </>
            ) : (
              <>
                <Settings size={12} /> Personalizar
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── Preview tab ────────────────────────────────────────────────────── */}
      {tab === "preview" && (
        <div className="space-y-3">
          <MenuPreview cfg={cfg} produtos={ativos} />
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
      )}

      {/* ── Config tab ─────────────────────────────────────────────────────── */}
      {tab === "config" && (
        <div className="space-y-3">
          {/* Text settings */}
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Texto
            </p>
            <div>
              <label className="label">Título</label>
              <input
                className="input"
                value={cfg.titulo}
                onChange={(e) => upd("titulo", e.target.value)}
                placeholder="Cardápio"
              />
            </div>
            <div>
              <label className="label">Subtítulo (opcional)</label>
              <input
                className="input"
                value={cfg.subtitulo}
                onChange={(e) => upd("subtitulo", e.target.value)}
                placeholder="Ex: Especialidades artesanais"
              />
            </div>
            <div>
              <label className="label">Cor do texto</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cfg.corTexto}
                  onChange={(e) => upd("corTexto", e.target.value)}
                  className="h-9 w-12 rounded border border-gray-300 cursor-pointer p-0.5"
                />
                <span className="text-xs font-mono text-gray-500">
                  {cfg.corTexto}
                </span>
              </div>
            </div>
          </div>

          {/* Background */}
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Fundo
            </p>

            {/* Library grid */}
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
                  style={{ aspectRatio: "1/1" }}
                >
                  <div
                    className="w-full h-full"
                    style={{ background: bg.css }}
                  />
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

            {/* Custom upload */}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={`btn-secondary w-full flex items-center justify-center gap-2 text-sm ${
                cfg.bgType === "upload" && cfg.bgUrl
                  ? "ring-2 ring-brand-500"
                  : ""
              }`}
            >
              <Upload size={14} />
              {uploading
                ? "Enviando…"
                : cfg.bgType === "upload" && cfg.bgUrl
                ? "Trocar imagem"
                : "Upload personalizado (JPG/PNG)"}
            </button>
            {cfg.bgType === "upload" && cfg.bgUrl && (
              <p className="text-xs text-brand-600 text-center flex items-center justify-center gap-1">
                <Check size={10} /> Imagem personalizada ativa
              </p>
            )}
          </div>

          {/* Overlay opacity */}
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Overlay de legibilidade
            </p>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-600">
                  Opacidade do overlay (branco)
                </span>
                <span className="font-semibold text-gray-800">
                  {Math.round(cfg.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={cfg.opacity}
                onChange={(e) => upd("opacity", parseFloat(e.target.value))}
                className="w-full"
                style={{ accentColor: "#db2777" }}
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>0% — sem overlay</span>
                <span>100% — branco total</span>
              </div>
            </div>

            {/* Opacity mini-preview */}
            <div
              className="relative rounded-lg overflow-hidden h-16"
              style={getBgStyle(cfg)}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `rgba(255,255,255,${cfg.opacity})`,
                }}
              />
              <div className="relative z-10 h-full flex items-center justify-center">
                <span
                  className="text-xs font-semibold"
                  style={{ color: cfg.corTexto }}
                >
                  Texto de exemplo
                </span>
              </div>
            </div>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {saveOk ? (
              <>
                <Check size={15} /> Salvo!
              </>
            ) : isPending ? (
              "Salvando…"
            ) : (
              "Salvar configurações"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
