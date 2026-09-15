// Sem este arquivo a tela de detalhe herdava o esqueleto da lista de pedidos:
// aparecia uma fila de cards iguais e logo depois trocava por um cabeçalho com
// fichas — a troca de forma faz a tela parecer mais lenta do que é.
export default function Loading() {
  return (
    <div className="py-4 space-y-4 animate-pulse">
      {/* Voltar */}
      <div className="h-5 w-20 bg-gray-100 rounded-lg" />

      {/* Cabeçalho: número, nome + selos, linha de tipo/entrega */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-16 bg-gray-100 rounded" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-40 bg-gray-200 rounded-lg" />
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 w-52 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-20 bg-gray-100 rounded-xl flex-shrink-0" />
      </div>

      {/* Cliente */}
      <div className="card p-4 space-y-3">
        <div className="h-3 w-14 bg-gray-100 rounded" />
        <div className="h-4 w-44 bg-gray-200 rounded" />
        <div className="flex gap-4">
          <div className="h-5 w-32 bg-gray-100 rounded" />
          <div className="h-5 w-24 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Detalhes em duas colunas */}
      <div className="card p-4 space-y-3">
        <div className="h-3 w-16 bg-gray-100 rounded" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-12 bg-gray-100 rounded" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Itens e imagens */}
      <div className="card p-4 h-28 bg-gray-50" />
      <div className="card p-4 h-24 bg-gray-50" />

      {/* Ações de status */}
      <div className="h-12 bg-gray-200 rounded-xl" />
    </div>
  );
}
