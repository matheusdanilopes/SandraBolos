"use client";

import { memo, useState, useMemo, useTransition } from "react";
import { ChevronDown, Plus, Pencil, Check, X, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ProdutoComCategoria, UnidadeMedida, CategoriaProduto } from "@/types/database";
import { UNIDADE_LABELS } from "@/types/database";
import { criarProdutoAction, editarProdutoAction, toggleAtivoAction } from "./actions";
import { CardapioVisual } from "./CardapioVisual";
import type { CardapioConfig } from "@/types/database";

const UNIDADES: UnidadeMedida[] = ["peso_kg", "cento", "unidade"];

interface Props {
  produtos: ProdutoComCategoria[];
  categorias: CategoriaProduto[];
  configCardapio: CardapioConfig | null;
}

interface EditState {
  nome: string;
  descricao: string;
  unidade_medida: UnidadeMedida;
  preco_padrao: string;
  categoria_id: string;
}

// ─── Filtro ───────────────────────────────────────────────────────────────────

const SEM_CATEGORIA = "__sem_categoria__";

/** Sem isso "acucar" não encontra "Açúcar" — e é assim que se digita no celular. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function filtrarProdutos(
  produtos: ProdutoComCategoria[],
  busca: string,
  categoriaId: string | null
): ProdutoComCategoria[] {
  const alvo = normalizar(busca);
  return produtos.filter((p) => {
    if (categoriaId && (p.categoria_id ?? SEM_CATEGORIA) !== categoriaId) return false;
    if (!alvo) return true;
    // A descrição entra na busca porque é onde fica o sabor do produto.
    return normalizar(p.nome).includes(alvo) || normalizar(p.descricao ?? "").includes(alvo);
  });
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
  grupoMap.set(null, { id: null, nome: "Sem categoria", ordem: 9999, produtos: [] });

  for (const p of ativos) {
    const key = p.categoria_id && catMap.has(p.categoria_id) ? p.categoria_id : null;
    grupoMap.get(key)!.produtos.push(p);
  }

  return Array.from(grupoMap.values())
    .filter((g) => g.produtos.length > 0)
    .sort((a, b) => a.ordem - b.ordem);
}

// ─── Produto Row ──────────────────────────────────────────────────────────────

const ProdutoRow = memo(function ProdutoRow({
  produto,
  categorias,
}: {
  produto: ProdutoComCategoria;
  categorias: CategoriaProduto[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditState>({
    nome: produto.nome,
    descricao: produto.descricao ?? "",
    unidade_medida: produto.unidade_medida,
    preco_padrao: produto.preco_padrao.toString(),
    categoria_id: produto.categoria_id ?? "",
  });
  const [error, setError] = useState("");

  function handleSave() {
    const preco = parseFloat(form.preco_padrao);
    if (!form.nome.trim() || isNaN(preco)) {
      setError("Preencha nome e preço corretamente");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await editarProdutoAction(produto.id, {
        nome: form.nome,
        descricao: form.descricao || null,
        unidade_medida: form.unidade_medida,
        preco_padrao: preco,
        categoria_id: form.categoria_id || null,
        ativo: produto.ativo,
      });
      if (result.error) setError(result.error);
      else setEditing(false);
    });
  }

  function handleToggleAtivo() {
    startTransition(async () => { await toggleAtivoAction(produto.id, !produto.ativo); });
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 space-y-2">
        <div className="space-y-2">
          <input
            className="input"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Nome do produto"
          />
          <textarea
            className="input resize-none text-sm"
            rows={2}
            value={form.descricao}
            onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            placeholder="Descrição curta (opcional)"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <select
                className="input appearance-none pr-8"
                value={form.unidade_medida}
                onChange={(e) => setForm((f) => ({ ...f, unidade_medida: e.target.value as UnidadeMedida }))}
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{UNIDADE_LABELS[u]}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              value={form.preco_padrao}
              onChange={(e) => setForm((f) => ({ ...f, preco_padrao: e.target.value }))}
              placeholder="Preço"
            />
          </div>
          <div className="relative">
            <select
              className="input appearance-none pr-8"
              value={form.categoria_id}
              onChange={(e) => setForm((f) => ({ ...f, categoria_id: e.target.value }))}
            >
              <option value="">Sem categoria</option>
              {categorias.filter((c) => c.ativo).map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setEditing(false); setError(""); }}
            className="btn-secondary flex-1 flex items-center justify-center gap-1 text-xs py-1.5"
          >
            <X size={13} /> Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-1 text-xs py-1.5"
          >
            <Check size={13} /> Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${produto.ativo ? "border-gray-100 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{produto.nome}</p>
        {produto.descricao && (
          <p className="text-[11px] text-gray-400 italic truncate">{produto.descricao}</p>
        )}
        <p className="text-[11px] text-gray-500">
          {UNIDADE_LABELS[produto.unidade_medida]} · {formatCurrency(produto.preco_padrao)}
          {produto.unidade_medida === "peso_kg" && "/kg"}
          {produto.unidade_medida === "cento" && "/cento"}
          {produto.unidade_medida === "unidade" && "/un."}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        title="Editar"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={handleToggleAtivo}
        disabled={isPending}
        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${produto.ativo ? "text-emerald-500 hover:text-gray-400" : "text-gray-400 hover:text-emerald-500"}`}
        title={produto.ativo ? "Desativar" : "Ativar"}
      >
        {produto.ativo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
      </button>
    </div>
  );
});

// ─── Novo Produto Form ────────────────────────────────────────────────────────

const NovoProdutoForm = memo(function NovoProdutoForm({ categorias }: { categorias: CategoriaProduto[] }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidade, setUnidade] = useState<UnidadeMedida>("unidade");
  const [preco, setPreco] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const precoNum = parseFloat(preco);
    if (!nome.trim() || isNaN(precoNum) || precoNum < 0) {
      setError("Preencha nome e preço corretamente");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await criarProdutoAction({
        nome,
        descricao: descricao || null,
        unidade_medida: unidade,
        preco_padrao: precoNum,
        categoria_id: categoriaId || null,
      });
      if (result.error) { setError(result.error); return; }
      setNome(""); setDescricao(""); setPreco(""); setUnidade("unidade"); setCategoriaId(""); setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Novo Produto
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
      <p className="text-sm font-medium text-gray-700">Novo produto</p>
      <input
        className="input"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do produto"
        autoFocus
      />
      <textarea
        className="input resize-none text-sm"
        rows={2}
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="Descrição curta (opcional)"
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <select
            className="input appearance-none pr-8"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value as UnidadeMedida)}
          >
            {UNIDADES.map((u) => (
              <option key={u} value={u}>{UNIDADE_LABELS[u]}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          placeholder={unidade === "peso_kg" ? "Preço/kg" : unidade === "cento" ? "Preço/cento" : "Preço/un."}
        />
      </div>
      <div className="relative">
        <select
          className="input appearance-none pr-8"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
        >
          <option value="">Sem categoria</option>
          {categorias.filter((c) => c.ativo).map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); }}
          className="btn-secondary flex-1 text-sm py-1.5"
        >
          Cancelar
        </button>
        <button type="submit" disabled={isPending} className="btn-primary flex-1 text-sm py-1.5">
          {isPending ? "Salvando..." : "Criar"}
        </button>
      </div>
    </form>
  );
});

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProdutosClient({ produtos, categorias, configCardapio }: Props) {
  const [busca, setBusca] = useState("");
  const [categoriaId, setCategoriaId] = useState<string | null>(null);

  const visiveis = useMemo(
    () => filtrarProdutos(produtos, busca, categoriaId),
    [produtos, busca, categoriaId]
  );
  const ativos = useMemo(() => visiveis.filter((p) => p.ativo), [visiveis]);
  const inativos = useMemo(() => visiveis.filter((p) => !p.ativo), [visiveis]);
  const grupos = useMemo(() => buildGrupos(ativos, categorias), [ativos, categorias]);

  // Chip só para categoria que tem produto — filtro que não acha nada só atrapalha.
  const chips = useMemo(() => {
    const usadas = new Set(produtos.map((p) => p.categoria_id ?? SEM_CATEGORIA));
    const lista = categorias
      .filter((c) => usadas.has(c.id))
      .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
      .map((c) => ({ id: c.id, nome: c.nome }));
    if (usadas.has(SEM_CATEGORIA) && lista.length > 0) {
      lista.push({ id: SEM_CATEGORIA, nome: "Sem categoria" });
    }
    return lista;
  }, [produtos, categorias]);

  const filtrando = busca.trim() !== "" || categoriaId !== null;
  const limparFiltros = () => { setBusca(""); setCategoriaId(null); };

  return (
    <div className="space-y-4">
      <NovoProdutoForm categorias={categorias} />

      {/* Busca + categorias */}
      {produtos.length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto"
              autoComplete="off"
              className="input pl-9 pr-9"
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
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

          {filtrando && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-gray-400">
                {visiveis.length} de {produtos.length} produto{produtos.length === 1 ? "" : "s"}
              </p>
              <button
                onClick={limparFiltros}
                className="text-[11px] font-medium text-brand-600 py-1"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Nada encontrado com o filtro em uso */}
      {produtos.length > 0 && visiveis.length === 0 && (
        <div className="card p-8 text-center space-y-2">
          <p className="text-sm text-gray-500">
            Nenhum produto {busca.trim() ? `com "${busca.trim()}"` : "nesta categoria"}
          </p>
          <button onClick={limparFiltros} className="text-xs font-medium text-brand-600 underline underline-offset-2 py-1">
            Limpar filtros
          </button>
        </div>
      )}

      {/* Active products grouped by category */}
      {ativos.length > 0 && (
        <div className="card p-4 space-y-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Ativos ({ativos.length})
          </p>
          {grupos.map((g) => (
            <div key={g.id ?? "sem-cat"} className="space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                {g.nome}
              </p>
              {g.produtos.map((p) => (
                <ProdutoRow key={p.id} produto={p} categorias={categorias} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Inactive */}
      {inativos.length > 0 && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Inativos ({inativos.length})</p>
          {inativos.map((p) => <ProdutoRow key={p.id} produto={p} categorias={categorias} />)}
        </div>
      )}

      {produtos.length === 0 && (
        <div className="card p-8 text-center text-gray-400">
          <p className="text-sm">Nenhum produto cadastrado.</p>
          <p className="text-xs mt-1">Crie produtos para usar no cálculo de itens.</p>
        </div>
      )}

      {/* Cardápio Visual — preview + export only; personalization is in Configurações */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Cardápio Visual</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Prévia do cardápio. Para personalizar, acesse{" "}
            <span className="text-brand-600 font-medium">Configurações</span>.
          </p>
        </div>
        <CardapioVisual
          produtos={produtos}
          categorias={categorias}
          configInicial={configCardapio}
          modoVisualizacao
        />
      </div>
    </div>
  );
}
