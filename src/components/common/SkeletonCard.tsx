export default function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-surface-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-200 rounded-lg w-3/4" />
          <div className="h-3 bg-surface-200 rounded-lg w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`h-3 bg-surface-200 rounded-lg ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
}
