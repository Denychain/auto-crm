export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="h-6 w-28 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex w-[280px] shrink-0 flex-col gap-2 rounded-xl border bg-muted/30 p-2"
          >
            <div className="h-8 animate-pulse rounded-lg bg-muted" />
            {[1, 2].map((j) => (
              <div key={j} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
