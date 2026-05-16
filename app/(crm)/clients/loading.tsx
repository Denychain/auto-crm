export default function Loading() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b px-4 py-3">
        <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
