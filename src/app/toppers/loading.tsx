// O esqueleto da raiz (quatro cards de KPI do dashboard) não tem nada a ver com
// esta tela — o cabeçalho com ícone e os filtros chegavam depois, deslocando tudo.
export default function Loading() {
  return (
    <div className="py-4 space-y-4 animate-pulse">
      {/* Cabeçalho com ícone */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-gray-200 rounded-xl flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="h-6 w-28 bg-gray-200 rounded-lg" />
          <div className="h-3 w-44 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Quatro cards de resumo */}
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-200 flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-5 w-12 bg-gray-200 rounded" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-7 w-20 flex-shrink-0 bg-gray-200 rounded-full" />
        ))}
      </div>

      {/* Cards de topper */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card h-32 bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
