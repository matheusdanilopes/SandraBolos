export default function Loading() {
  return (
    <div className="py-4 space-y-4 animate-pulse">
      <div className="h-6 w-24 bg-gray-200 rounded-lg" />
      <div className="h-10 bg-gray-200 rounded-xl" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-4 h-16 bg-gray-50" />
        ))}
      </div>
    </div>
  );
}
