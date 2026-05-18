export default function Loading() {
  return (
    <div className="py-4 space-y-4 animate-pulse">
      <div className="h-6 w-24 bg-gray-200 rounded-lg" />
      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
        <div className="w-20 h-10 bg-gray-200 rounded-xl" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 w-20 flex-shrink-0 bg-gray-200 rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-4 h-20 bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
