"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImagemPedido } from "@/types/database";
import { ImageIcon, Plus, Trash2, Eye, Upload, Download, X } from "lucide-react";

const MAX_IMAGENS = 5;

interface Props {
  pedidoId: string;
  imagens: ImagemPedido[];
  driveFolderId?: string | null;
}

export function ImagensSection({ pedidoId, imagens: initialImagens }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagens, setImagens] = useState(initialImagens);
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState("");
  const [error, setError] = useState("");
  const [visualizando, setVisualizando] = useState<ImagemPedido | null>(null);

  // A lista vem do servidor ao abrir e após cada mudança: as props da página
  // podem chegar atrasadas (cache) e não devem sobrescrever o estado.
  const carregarImagens = useCallback(async () => {
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/imagens`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setImagens(data);
    } catch {
      // Mantém a lista atual se a rede falhar.
    }
  }, [pedidoId]);

  useEffect(() => {
    carregarImagens();
  }, [carregarImagens]);

  useEffect(() => {
    if (!visualizando) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisualizando(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visualizando]);

  const canAdd = imagens.length < MAX_IMAGENS;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selecionados = Array.from(e.target.files ?? []);
    if (selecionados.length === 0) return;

    const vagas = MAX_IMAGENS - imagens.length;
    const arquivos = selecionados.slice(0, vagas);
    const erros: string[] = [];
    if (selecionados.length > vagas) {
      erros.push(
        `Limite de ${MAX_IMAGENS} imagens: ${selecionados.length - vagas} não ${
          selecionados.length - vagas === 1 ? "foi enviada" : "foram enviadas"
        }`
      );
    }

    setLoading(true);
    setError("");

    // Uma por vez: o servidor confere o limite contando as já gravadas.
    for (let i = 0; i < arquivos.length; i++) {
      const file = arquivos[i];
      if (arquivos.length > 1) setProgresso(`${i + 1}/${arquivos.length}`);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("pedido_id", pedidoId);

        const res = await fetch("/api/upload-imagem", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          erros.push(`${file.name}: ${data.error ?? "erro ao enviar imagem"}`);
        } else {
          setImagens((prev) => [...prev, data]);
        }
      } catch {
        erros.push(`${file.name}: erro de conexão ao enviar imagem`);
      }
    }

    setError(erros.join("\n"));
    setLoading(false);
    setProgresso("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    carregarImagens();
  }

  async function removeImagem(id: string) {
    if (!confirm("Remover imagem?")) return;
    setError("");
    try {
      const res = await fetch(`/api/imagens/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erro ao remover imagem");
        return;
      }
      setImagens((prev) => prev.filter((i) => i.id !== id));
      carregarImagens();
    } catch {
      setError("Erro de conexão ao remover imagem");
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-700">
          Imagens de Referência ({imagens.length}/{MAX_IMAGENS})
        </h2>
        {canAdd && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-1.5 min-h-[44px] px-3 -mr-3 text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
          >
            {loading ? <Upload size={18} className="animate-bounce" /> : <Plus size={18} />}
            {loading ? `Enviando${progresso ? ` ${progresso}` : "..."}` : "Adicionar"}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>}

      {imagens.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          <ImageIcon size={28} className="mx-auto mb-1 opacity-40" />
          <p className="text-xs">Nenhuma imagem adicionada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {imagens.map((img) => (
            <div key={img.id} className="flex items-center gap-1 bg-gray-50 rounded-lg pl-3 pr-1 py-1">
              <ImageIcon size={16} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{img.nome_arquivo}</span>
              <button
                onClick={() => setVisualizando(img)}
                aria-label="Visualizar imagem"
                className="flex items-center justify-center w-11 h-11 text-brand-600 hover:text-brand-700 flex-shrink-0"
              >
                <Eye size={20} />
              </button>
              <button
                onClick={() => removeImagem(img.id)}
                aria-label="Remover imagem"
                className="flex items-center justify-center w-11 h-11 text-red-400 hover:text-red-600 flex-shrink-0"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {visualizando && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={visualizando.nome_arquivo}
          className="fixed inset-0 z-50 flex flex-col bg-black/90"
          onClick={() => setVisualizando(null)}
        >
          <div className="flex items-center justify-end gap-2 p-2" onClick={(e) => e.stopPropagation()}>
            <a
              href={`/api/imagens/${visualizando.id}/arquivo?download=1`}
              download={visualizando.nome_arquivo}
              className="flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20"
            >
              <Download size={18} />
              Baixar
            </a>
            <button
              onClick={() => setVisualizando(null)}
              aria-label="Fechar"
              className="flex items-center justify-center w-11 h-11 rounded-lg text-white bg-white/10 hover:bg-white/20"
            >
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/imagens/${visualizando.id}/arquivo`}
              alt={visualizando.nome_arquivo}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
