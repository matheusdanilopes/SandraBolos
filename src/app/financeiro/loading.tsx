export default function Loading() {
  return (
    <div className="py-4 space-y-4 animate-pulse">
      <div className="space-y-1.5">
        <div className="h-6 w-28 bg-gray-200 rounded-lg" />
        <div className="h-4 w-36 bg-gray-200 rounded-lg" />
      </div>
      <div className="card p-4 h-64 bg-gray-50" />
      <div className="card overflow-hidden">
        <div className="h-14 bg-gray-50 border-b border-gray-100" />
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 bg-gray-50 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
