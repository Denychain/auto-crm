export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Header skeleton */}
      <div className="border-b px-4 py-3">
        <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
      </div>
      {/* Content skeleton */}
      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
