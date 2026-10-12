"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus, X, Check, Copy, ExternalLink,
  ToggleLeft, ToggleRight,
  ChevronUp, ChevronDown,
  Images,
} from "lucide-react";
import type { CardapioFoto } from "@/types/database";
import {
  editarLegendaFotoAction,
  toggleFotoAtivaAction,
  reordenarFotosAction,
  excluirFotoAction,
} from "./actions";

interface RowProps {
  foto: CardapioFoto;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function FotoRow({ foto, isFirst, isLast, onMoveUp, onMoveDown }: RowProps) {
  const [isPending, startTransition] = useTransition();
  const [legenda, setLegenda] = useState(foto.legenda ?? "");
  const [erro, setErro] = useState("");
  const [confirmando, setConfirmando] = useState(false);

  const legendaAlterada = legenda.trim() !== (foto.legenda ?? "");

  function handleSalvarLegenda() {
    startTransition(async () => {
      const res = await editarLegendaFotoAction(foto.id, legenda);
      setErro(res.error ?? "");
    });
  }

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleFotoAtivaAction(foto.id, !foto.ativo);
      setErro(res.error ?? "");
    });
  }

  function handleExcluir() {
    setConfirmando(false);
    startTransition(async () => {
      const res = await excluirFotoAction(foto.id);
      if (res.error) setErro(res.error);
    });
  }

  return (
    <div className={`rounded-lg border p-2 transition-colors ${foto.ativo ? "border-gray-100 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst || isPending}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors"
            title="Mover para cima"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast || isPending}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors"
            title="Mover para baixo"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.url}
          alt={foto.legenda ?? ""}
          className="w-14 h-14 object-contain rounded-md bg-[#FBF2EA] border border-gray-100 shrink-0"
          loading="lazy"
        />

        <div className="flex-1 min-w-0 flex gap-1">
          <input
            type="text"
            className="input text-xs py-1.5 min-h-[36px]"
            placeholder="Descrição (opcional)"
            value={legenda}
            onChange={(e) => { setLegenda(e.target.value); setErro(""); }}
            onKeyDown={(e) => e.key === "Enter" && legendaAlterada && handleSalvarLegenda()}
            maxLength={120}
            disabled={isPending}
          />
          {legendaAlterada && (
            <button
              type="button"
              onClick={handleSalvarLegenda}
              disabled={isPending}
              className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 shrink-0"
              title="Salvar descrição"
            >
              <Check size={15} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className={`p-1 rounded transition-colors disabled:opacity-50 shrink-0 ${foto.ativo ? "text-emerald-500 hover:text-gray-400" : "text-gray-400 hover:text-emerald-500"}`}
          title={foto.ativo ? "Ocultar do cardápio" : "Mostrar no cardápio"}
        >
          {foto.ativo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
        </button>

        {confirmando ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleExcluir}
              disabled={isPending}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Não
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={isPending}
            className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors shrink-0"
            title="Excluir"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
    </div>
  );
}

export function FotosCardapioSection({ fotos }: { fotos: CardapioFoto[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [enviando, setEnviando] = useState<{ atual: number; total: number } | null>(null);
  const [erro, setErro] = useState("");
  const [link, setLink] = useState("/c");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    // Link curto (redireciona para /cardapio), cabe bem na bio do Instagram
    setLink(`${window.location.host}/c`);
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setErro("");
    const falhas: string[] = [];

    // Um por vez: mantém a ordem de envio e cada requisição abaixo do limite de corpo
    for (let i = 0; i < files.length; i++) {
      setEnviando({ atual: i + 1, total: files.length });
      const fd = new FormData();
      fd.append("file", files[i]);
      try {
        const res = await fetch("/api/cardapio-fotos", { method: "POST", body: fd });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) falhas.push(`${files[i].name}: ${json.error ?? "falha no envio"}`);
      } catch {
        falhas.push(`${files[i].name}: sem conexão`);
      }
    }

    setEnviando(null);
    if (fileRef.current) fileRef.current.value = "";
    if (falhas.length > 0) setErro(falhas.join(" · "));
    router.refresh();
  }

  function handleMove(index: number, direcao: "up" | "down") {
    const target = direcao === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= fotos.length) return;

    const novaOrdem = [...fotos];
    [novaOrdem[index], novaOrdem[target]] = [novaOrdem[target], novaOrdem[index]];

    startTransition(async () => {
      const res = await reordenarFotosAction(
        novaOrdem
          .map((f, i) => ({ id: f.id, ordem: i + 1 }))
          .filter((u, i) => novaOrdem[i].ordem !== u.ordem)
      );
      if (res.error) setErro(res.error);
    });
  }

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  return (
    <div className="card p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Images size={15} className="text-brand-600" />
          <h2 className="font-semibold text-sm text-gray-800">Cardápio Online</h2>
        </div>
        <p className="text-xs text-gray-500">
          Página para clientes com os produtos e preços do cadastro. Só acessa quem tiver o link — o link abaixo é curto para usar na bio do Instagram.
        </p>
      </div>

      {/* Link */}
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="input text-xs flex-1 bg-gray-50"
        />
        <button
          type="button"
          onClick={handleCopiar}
          className="btn-secondary px-3 flex items-center gap-1 text-xs"
          title="Copiar link"
        >
          {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          {copiado ? "Copiado" : "Copiar"}
        </button>
        <a
          href="/cardapio"
          target="_blank"
          rel="noopener"
          className="btn-secondary px-3 flex items-center"
          title="Abrir cardápio"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Fotos */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <div>
          <p className="text-sm font-medium text-gray-700">Fotos do carrossel</p>
          <p className="text-xs text-gray-500">
            Aparecem rolando no topo do cardápio, na ordem abaixo. Fotos com fundo
            transparente (PNG) ficam como no modelo.
          </p>
        </div>

        <div className="space-y-1.5">
          {fotos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma foto cadastrada.</p>
          ) : (
            fotos.map((foto, i) => (
              <FotoRow
                key={foto.id}
                foto={foto}
                isFirst={i === 0}
                isLast={i === fotos.length - 1}
                onMoveUp={() => handleMove(i, "up")}
                onMoveDown={() => handleMove(i, "down")}
              />
            ))
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!!enviando || isPending}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
        >
          <ImagePlus size={16} />
          {enviando ? `Enviando ${enviando.atual} de ${enviando.total}…` : "Adicionar fotos"}
        </button>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
    </div>
  );
}
