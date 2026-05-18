export default function Loading() {
  return (
    <div className="py-4 space-y-4 animate-pulse">
      <div className="h-6 w-24 bg-gray-200 rounded-lg" />
      <div className="h-10 bg-gray-200 rounded-xl" />
      <div className="card p-4 space-y-3">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
