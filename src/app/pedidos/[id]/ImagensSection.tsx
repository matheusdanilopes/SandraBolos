"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { ImagemPedido } from "@/types/database";
import { ImageIcon, Plus, Trash2, ExternalLink, Upload } from "lucide-react";

const MAX_IMAGENS = 5;

interface Props {
  pedidoId: string;
  imagens: ImagemPedido[];
  driveFolderId?: string | null;
}

export function ImagensSection({ pedidoId, imagens: initialImagens, driveFolderId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagens, setImagens] = useState(initialImagens);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canAdd = imagens.length < MAX_IMAGENS;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");

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

    setLoading(false);
    // Reset input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function removeImagem(id: string) {
    if (!confirm("Remover imagem?")) return;
    await supabase.from("imagens_pedido").delete().eq("id", id);
    setImagens((prev) => prev.filter((i) => i.id !== id));
    router.refresh();
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-700">
          Imagens de Referência ({imagens.length}/{MAX_IMAGENS})
        </h2>
        {canAdd && driveFolderId && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
          >
            {loading ? <Upload size={14} className="animate-bounce" /> : <Plus size={14} />}
            {loading ? "Enviando..." : "Adicionar"}
          </button>
        )}
        {canAdd && !driveFolderId && (
          <span className="text-xs text-gray-400 italic">Drive não configurado</span>
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
            <div key={img.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
              <ImageIcon size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-700 flex-1 truncate">{img.nome_arquivo}</span>
              <a
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 flex-shrink-0"
              >
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => removeImagem(img.id)}
                className="text-red-400 hover:text-red-600 flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
