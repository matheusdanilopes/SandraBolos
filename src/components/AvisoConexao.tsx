import { WifiOff } from "lucide-react";
import { MSG_CONEXAO } from "@/lib/erros";

interface Props {
  /** O que a falha significa nesta tela. */
  detalhe?: string;
}

/**
 * Faixa de aviso para quando parte da leitura falhou por rede. Sem ela a tela
 * mostra listas vazias e R$ 0,00 — que parece dado real, e não falha de conexão.
 */
export function AvisoConexao({ detalhe = "Os dados abaixo podem estar incompletos." }: Props) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
      <WifiOff size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-red-700">
        {MSG_CONEXAO} {detalhe}
      </p>
    </div>
  );
}
