/**
 * fetch with a mandatory deadline.
 *
 * Node's fetch has no default timeout, so an upstream that accepts a
 * connection and then stalls holds the request open until the platform kills
 * the function. Every outbound call goes through here so a slow third party
 * degrades one feature instead of the whole request.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

type TimedInit = Omit<RequestInit, "signal"> & { timeoutMs?: number };

export async function fetchWithTimeout(
  input: string | URL,
  init: TimedInit = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  return fetch(input, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
}

/** True when an error came from fetchWithTimeout hitting its deadline. */
export function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}
