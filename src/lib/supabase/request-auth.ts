import { AsyncLocalStorage } from "node:async_hooks";

/** Bearer access token for the current staff API request (if any). */
export const staffAccessTokenStore = new AsyncLocalStorage<string>();

/**
 * When true, data helpers prefer the in-memory demo dataset even if Supabase
 * env is set. Used for `Authorization: Demo …` with STAFF_API_ALLOW_DEMO=true.
 */
export const forceDemoDataStore = new AsyncLocalStorage<boolean>();

export function preferDemoData(): boolean {
  return forceDemoDataStore.getStore() === true;
}
