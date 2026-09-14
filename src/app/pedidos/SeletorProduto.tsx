"use client";

import { useMemo, useRef, useState } from "react";
import { Package, Search, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { UNIDADE_LABELS, type CategoriaProduto, type ProdutoComCategoria } from "@/types/database";

interface Props {
  produtos: ProdutoComCategoria[];
  categorias: CategoriaProduto[];
  produtoSelecionado: ProdutoComCategoria | null;
  onSelecionar: (produto: ProdutoComCategoria | null) => void;
}

const SEM_CATEGORIA = "__sem_categoria__";

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Chip de categoria só ajuda quando há categoria suficiente para separar. */
function categoriasComProduto(
  produtos: ProdutoComCategoria[],
  categorias: CategoriaProduto[]
): { id: string; nome: string }[] {
  const usadas = new Set(produtos.map((p) => p.categoria_id ?? SEM_CATEGORIA));
  const lista = categorias
    .filter((c) => usadas.has(c.id))
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
    .map((c) => ({ id: c.id, nome: c.nome }));

  // "Sem categoria" só entra se houver categoria de verdade para contrastar.
  if (usadas.has(SEM_CATEGORIA) && lista.length > 0) {
    lista.push({ id: SEM_CATEGORIA, nome: "Sem categoria" });
  }
  return lista;
}

export function SeletorProduto({ produtos, categorias, produtoSelecionado, onSelecionar }: Props) {
  const [busca, setBusca] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chips = useMemo(() => categoriasComProduto(produtos, categorias), [produtos, categorias]);

  const filtrados = useMemo(() => {
    const alvo = normalizar(busca);
    return produtos.filter((p) => {
      if (categoriaId) {
        const doProduto = p.categoria_id ?? SEM_CATEGORIA;
        if (doProduto !== categoriaId) return false;
      }
      if (!alvo) return true;
      // A descrição entra na busca: é onde costuma estar o sabor ("ninho",
      // "morango"), que é como o produto é pedido pelo cliente.
      return (
        normalizar(p.nome).includes(alvo) ||
        normalizar(p.descricao ?? "").includes(alvo)
      );
    });
  }, [produtos, busca, categoriaId]);

  // ── Produto escolhido: resumo compacto, para dar lugar a quantidade e preço ─
  if (produtoSelecionado) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
        <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center flex-shrink-0">
          <Package size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{produtoSelecionado.nome}</p>
          <p className="text-xs text-brand-700 mt-0.5">
            {UNIDADE_LABELS[produtoSelecionado.unidade_medida]} · {formatCurrency(produtoSelecionado.preco_padrao)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { onSelecionar(null); setBusca(""); }}
          className="flex-shrink-0 text-xs font-medium text-brand-700 underline underline-offset-2 px-2 py-2"
        >
          Trocar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto"
          autoComplete="off"
          className="input pl-9 pr-9"
        />
        {busca && (
          <button
            type="button"
            onClick={() => { setBusca(""); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5"
            aria-label="Limpar busca"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 py-0.5">
          <button
            type="button"
            onClick={() => setCategoriaId(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              categoriaId === null
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-gray-600 border-gray-300"
            }`}
          >
            Todos
          </button>
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoriaId((atual) => (atual === c.id ? null : c.id))}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                categoriaId === c.id
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-600 border-gray-300"
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      {filtrados.length > 0 ? (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtrados.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onSelecionar(p); setBusca(""); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-50 active:bg-brand-100 transition-colors min-h-[52px]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.nome}</p>
                <p className="text-[11px] text-gray-500 truncate">
                  {UNIDADE_LABELS[p.unidade_medida]}
                  {p.categorias_produto?.nome ? ` · ${p.categorias_produto.nome}` : ""}
                </p>
              </div>
              <span className="text-sm font-semibold text-emerald-700 whitespace-nowrap flex-shrink-0">
                {formatCurrency(p.preco_padrao)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center space-y-2">
          <p className="text-sm text-gray-500">
            Nenhum produto {busca.trim() ? `com "${busca.trim()}"` : "nesta categoria"}
          </p>
          {(busca.trim() || categoriaId) && (
            <button
              type="button"
              onClick={() => { setBusca(""); setCategoriaId(null); }}
              className="text-xs font-medium text-brand-600 underline underline-offset-2 py-1"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        {busca.trim() || categoriaId
          ? `${filtrados.length} de ${produtos.length} produto${produtos.length === 1 ? "" : "s"}`
          : `${produtos.length} produto${produtos.length === 1 ? "" : "s"} disponíve${produtos.length === 1 ? "l" : "is"}`}
      </p>
    </div>
  );
}
