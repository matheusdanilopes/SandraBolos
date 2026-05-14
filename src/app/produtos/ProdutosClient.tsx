"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Plus, Pencil, Check, X, ToggleLeft, ToggleRight } from "lucide-react";
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

function ProdutoRow({
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
}

// ─── Novo Produto Form ────────────────────────────────────────────────────────

function NovoProdutoForm({ categorias }: { categorias: CategoriaProduto[] }) {
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
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProdutosClient({ produtos, categorias, configCardapio }: Props) {
  const ativos = produtos.filter((p) => p.ativo);
  const inativos = produtos.filter((p) => !p.ativo);
  const grupos = buildGrupos(ativos, categorias);

  return (
    <div className="space-y-4">
      <NovoProdutoForm categorias={categorias} />

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
