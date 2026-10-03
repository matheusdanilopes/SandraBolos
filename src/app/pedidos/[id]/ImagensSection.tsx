"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImagemPedido } from "@/types/database";
import { ImageIcon, Plus, Trash2, ExternalLink, Upload } from "lucide-react";

const MAX_IMAGENS = 5;

interface Props {
  pedidoId: string;
  imagens: ImagemPedido[];
  driveFolderId?: string | null;
}

export function ImagensSection({ pedidoId, imagens: initialImagens }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagens, setImagens] = useState(initialImagens);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // A página pode chegar do cache do navegador com uma lista antiga: segue as
  // props a cada atualização e confirma a lista no servidor ao abrir.
  useEffect(() => {
    setImagens(initialImagens);
  }, [initialImagens]);

  useEffect(() => {
    let ativo = true;
    fetch(`/api/pedidos/${pedidoId}/imagens`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (ativo && Array.isArray(data)) setImagens(data);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [pedidoId]);

  const canAdd = imagens.length < MAX_IMAGENS;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("pedido_id", pedidoId);

      const res = await fetch("/api/upload-imagem", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao enviar imagem");
      } else {
        setImagens((prev) => [...prev, data]);
        router.refresh();
      }
    } catch {
      setError("Erro de conexão ao enviar imagem");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      router.refresh();
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
            {loading ? "Enviando..." : "Adicionar"}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

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
              <a
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visualizar imagem"
                className="flex items-center justify-center w-11 h-11 text-brand-600 hover:text-brand-700 flex-shrink-0"
              >
                <ExternalLink size={20} />
              </a>
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
    </div>
  );
}
