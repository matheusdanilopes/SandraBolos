export default function Loading() {
  return (
    <div className="py-4 space-y-5 animate-pulse">
      <div>
        <div className="h-6 w-32 bg-gray-200 rounded-lg mb-1" />
        <div className="h-4 w-48 bg-gray-100 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4">
            <div className="h-4 w-8 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-12 bg-gray-200 rounded mb-1" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 h-20 bg-gray-50" />
        <div className="card p-4 h-20 bg-gray-50" />
      </div>
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-3.5 h-16 bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
