/**
 * Run an async mapper over items with a fixed number of workers in flight.
 *
 * Results keep the input order. `fn` is expected to resolve rather than reject;
 * a rejection aborts the whole run, so callers that need per-item error
 * handling should return a result object instead of throwing.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      for (;;) {
        const index = cursor++;
        if (index >= items.length) return;
        results[index] = await fn(items[index], index);
      }
    },
  );

  await Promise.all(workers);
  return results;
}
