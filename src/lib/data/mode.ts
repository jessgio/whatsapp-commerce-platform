import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { preferDemoData } from "@/lib/supabase/request-auth";

/**
 * Whether readers/writers should hit Supabase for this request.
 * Staff Demo API requests can force the in-memory dataset via AsyncLocalStorage.
 */
export function shouldUseSupabaseData(): boolean {
  if (preferDemoData()) return false;
  return isSupabaseConfigured();
}
