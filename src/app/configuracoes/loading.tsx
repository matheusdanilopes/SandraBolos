// Idem: a tela de Configurações é uma pilha de seções, não a grade de KPIs que
// o esqueleto da raiz desenhava.
export default function Loading() {
  return (
    <div className="py-4 space-y-6 animate-pulse">
      <div className="h-6 w-36 bg-gray-200 rounded-lg" />

      {/* Duas seções de categorias */}
      {[...Array(2)].map((_, s) => (
        <div key={s} className="card p-4 space-y-3">
          <div className="h-4 w-40 bg-gray-200 rounded" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg" />
            ))}
          </div>
          <div className="h-9 bg-gray-100 rounded-xl" />
        </div>
      ))}

      {/* Cardápio visual: título + prévia 4/5 */}
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-3 w-64 bg-gray-100 rounded" />
        <div className="bg-gray-100 rounded-2xl w-full" style={{ aspectRatio: "4/5" }} />
      </div>
    </div>
  );
}
