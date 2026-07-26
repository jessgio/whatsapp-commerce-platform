/** Instant feedback when switching conversations. */
export default function ConversationLoading() {
  return (
    <div className="flex h-full flex-col animate-pulse" aria-busy="true" aria-label="Loading conversation">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="h-[38px] w-[38px] rounded-full bg-beige-200/80" />
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-beige-200/80" />
          <div className="h-3 w-28 rounded bg-beige-200/50" />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-4">
        <div className="ml-auto h-12 w-2/3 rounded-2xl bg-beige-200/50" />
        <div className="h-12 w-2/3 rounded-2xl bg-beige-200/70" />
        <div className="ml-auto h-16 w-1/2 rounded-2xl bg-beige-200/50" />
        <div className="h-10 w-3/5 rounded-2xl bg-beige-200/70" />
      </div>
    </div>
  );
}
