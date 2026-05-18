export default function Loading() {
  return (
    <div className="py-4 space-y-5 animate-pulse">
      <div className="h-6 w-28 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 h-24 bg-gray-50" />
        ))}
      </div>
      <div className="card p-4 h-48 bg-gray-50" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 h-16 bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
