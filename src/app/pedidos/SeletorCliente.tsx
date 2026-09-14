"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Phone, RefreshCw, Search, UserPlus, X } from "lucide-react";
import { formatPhone } from "@/lib/utils";
import type { ClienteOpcao } from "@/app/clientes/actions";

interface Props {
  clientes: ClienteOpcao[];
  clienteId: string;
  onSelecionar: (clienteId: string) => void;
  carregando: boolean;
  erro?: string;
  onRecarregar: () => void;
  /** Sai do seletor para o cadastro, levando o que já foi digitado na busca. */
  onCadastrarNovo: (termo: string) => void;
}

/** Sem isso "joao" não encontra "João" — e é assim que o nome costuma ser digitado. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

/** Quantos clientes aparecem antes de precisar rolar a lista. */
const LIMITE_SEM_BUSCA = 30;

export function SeletorCliente({
  clientes,
  clienteId,
  onSelecionar,
  carregando,
  erro,
  onRecarregar,
  onCadastrarNovo,
}: Props) {
  const [busca, setBusca] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selecionado = useMemo(
    () => clientes.find((c) => c.id === clienteId) ?? null,
    [clientes, clienteId]
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim();
    if (!termo) return clientes;

    // Busca por nome e por telefone ao mesmo tempo: quem digita "9999" está
    // procurando pelo número, quem digita "ana" pelo nome — e o mesmo campo
    // atende os dois sem obrigar a escolher antes.
    const nomeAlvo = normalizar(termo);
    const digitos = somenteDigitos(termo);

    return clientes.filter((c) => {
      if (normalizar(c.nome).includes(nomeAlvo)) return true;
      return digitos.length > 0 && somenteDigitos(c.telefone).includes(digitos);
    });
  }, [clientes, busca]);

  const visiveis = busca.trim() ? filtrados : filtrados.slice(0, LIMITE_SEM_BUSCA);
  const ocultos = filtrados.length - visiveis.length;

  // ── Cliente já escolhido: resumo compacto, sem a lista no caminho ──────────
  if (selecionado) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
          <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {selecionado.nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{selecionado.nome}</p>
            <p className="text-xs text-brand-700 flex items-center gap-1 mt-0.5">
              <Phone size={10} /> {formatPhone(selecionado.telefone)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelecionar("");
              setBusca("");
              // O campo de busca só existe depois de limpar a seleção.
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="flex-shrink-0 text-xs font-medium text-brand-700 underline underline-offset-2 px-2 py-2"
          >
            Trocar
          </button>
        </div>
      </div>
    );
  }

  // ── Busca ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone"
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

      {visiveis.length > 0 ? (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
          {visiveis.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelecionar(c.id); setBusca(""); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-50 active:bg-brand-100 transition-colors min-h-[52px]"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                {c.nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.nome}</p>
                <p className="text-xs text-gray-500 truncate">{formatPhone(c.telefone)}</p>
              </div>
              <Check size={14} className="text-transparent flex-shrink-0" />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center space-y-3">
          <p className="text-sm text-gray-500">
            {clientes.length === 0
              ? "Nenhum cliente cadastrado ainda"
              : `Nenhum cliente com "${busca.trim()}"`}
          </p>
          <button
            type="button"
            onClick={() => onCadastrarNovo(busca.trim())}
            className="btn-secondary inline-flex items-center gap-1.5 text-sm"
          >
            <UserPlus size={14} />
            Cadastrar novo cliente
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-400">
          {carregando
            ? "Atualizando lista..."
            : busca.trim()
            ? `${filtrados.length} de ${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`
            : ocultos > 0
            ? `${clientes.length} clientes — busque pelo nome para ver os outros ${ocultos}`
            : `${clientes.length} cliente${clientes.length === 1 ? "" : "s"} cadastrado${clientes.length === 1 ? "" : "s"}`}
        </p>
        <button
          type="button"
          onClick={onRecarregar}
          disabled={carregando}
          className="flex items-center gap-1 text-[11px] font-medium text-brand-600 disabled:text-gray-300 py-1"
        >
          <RefreshCw size={11} className={carregando ? "animate-spin" : undefined} />
          Recarregar
        </button>
      </div>

      {erro && <p className="text-[11px] text-yellow-700">{erro}</p>}
    </div>
  );
}
