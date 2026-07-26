/** Instant feedback while a portal page's RSC payload loads. */
export default function PortalLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-beige-200/80" />
        <div className="h-4 w-72 max-w-full rounded-md bg-beige-200/50" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-[14px] border border-border bg-surface">
            <div className="space-y-3 p-5">
              <div className="h-3 w-20 rounded bg-beige-200/70" />
              <div className="h-7 w-28 rounded bg-beige-200/90" />
              <div className="h-3 w-16 rounded bg-beige-200/50" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-64 rounded-[14px] border border-border bg-surface">
        <div className="space-y-3 p-5">
          <div className="h-4 w-32 rounded bg-beige-200/70" />
          <div className="h-40 rounded-lg bg-beige-200/40" />
        </div>
      </div>
    </div>
  );
}
