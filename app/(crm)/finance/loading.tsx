export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b px-4 py-3">
        <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
