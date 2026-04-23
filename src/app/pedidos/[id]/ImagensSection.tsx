"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { ImagemPedido } from "@/types/database";
import { ImageIcon, Plus, Trash2, ExternalLink } from "lucide-react";

const MAX_IMAGENS = 5;

interface Props {
  pedidoId: string;
  imagens: ImagemPedido[];
}

export function ImagensSection({ pedidoId, imagens: initialImagens }: Props) {
  const router = useRouter();
  const [imagens, setImagens] = useState(initialImagens);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [url, setUrl] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");

  const canAdd = imagens.length < MAX_IMAGENS;

  async function addImagem() {
    if (!url || !nomeArquivo) { setError("Preencha URL e nome do arquivo"); return; }
    setLoading(true);
    setError("");

    const { data, error: dbError } = await supabase
      .from("imagens_pedido")
      .insert({ pedido_id: pedidoId, file_id: url, url, nome_arquivo: nomeArquivo })
      .select()
      .single();

    if (dbError) {
      setError(dbError.message);
    } else {
      setImagens((prev) => [...prev, data]);
      setUrl("");
      setNomeArquivo("");
      setShowUrlForm(false);
      router.refresh();
    }
    setLoading(false);
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
        {canAdd && (
          <button
            onClick={() => setShowUrlForm((v) => !v)}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            <Plus size={14} /> Adicionar
          </button>
        )}
      </div>

      {showUrlForm && (
        <div className="space-y-2 bg-gray-50 rounded-lg p-3">
          <div>
            <label className="label text-xs">Nome do arquivo</label>
            <input className="input text-sm" value={nomeArquivo} onChange={(e) => setNomeArquivo(e.target.value)} placeholder="Ex: referencia-bolo.jpg" />
          </div>
          <div>
            <label className="label text-xs">URL (Google Drive ou outro)</label>
            <input className="input text-sm" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/..." />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowUrlForm(false)} className="btn-secondary flex-1 text-sm py-1.5">Cancelar</button>
            <button onClick={addImagem} disabled={loading} className="btn-primary flex-1 text-sm py-1.5">
              {loading ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </div>
      )}

      {imagens.length === 0 && !showUrlForm ? (
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
              <a href={img.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 flex-shrink-0">
                <ExternalLink size={14} />
              </a>
              <button onClick={() => removeImagem(img.id)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
