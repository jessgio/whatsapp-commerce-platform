import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import type { EmailCustomFont, EmailFontFile } from "@/lib/email-fonts";
import type { BuiltinEmailFont } from "@/lib/email-style";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

let demoFonts: EmailCustomFont[] = [];

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapFont(r: any): EmailCustomFont {
  const files = Array.isArray(r.files) ? (r.files as EmailFontFile[]) : [];
  return {
    id: r.id,
    name: r.name,
    cssFamily: r.css_family,
    fallback: (r.fallback as BuiltinEmailFont) ?? "sans",
    files,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function logSupabaseError(scope: string, error: unknown) {
  if (!error || typeof error !== "object") {
    console.error(scope, error);
    return;
  }
  const e = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };
  console.error(scope, {
    message: e.message ?? String(error),
    code: e.code,
    details: e.details,
    hint: e.hint,
  });
}

/** Portal reads — pages already gate with RBAC; use service role for reliability. */
export async function listEmailFonts(): Promise<EmailCustomFont[]> {
  return listEmailFontsAdmin();
}

/** Admin read for send pipelines / cron (no staff cookie). */
export async function listEmailFontsAdmin(): Promise<EmailCustomFont[]> {
  if (!isSupabaseConfigured()) {
    return demoFonts
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("email_fonts")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      logSupabaseError("[email_fonts] list failed", error);
      return [];
    }
    return (data ?? []).map(mapFont);
  } catch (e) {
    logSupabaseError("[email_fonts] list exception", e);
    return [];
  }
}

export async function saveEmailFont(
  input: EmailCustomFont,
): Promise<EmailCustomFont> {
  const now = new Date().toISOString();
  const next: EmailCustomFont = { ...input, updatedAt: now };

  if (!isSupabaseConfigured()) {
    const idx = demoFonts.findIndex((f) => f.id === next.id);
    if (idx >= 0) demoFonts[idx] = next;
    else demoFonts = [next, ...demoFonts];
    return { ...next, files: [...next.files] };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_fonts")
    .upsert(
      {
        id: next.id,
        name: next.name,
        css_family: next.cssFamily,
        fallback: next.fallback,
        files: next.files,
        created_at: next.createdAt,
        updated_at: now,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    logSupabaseError("[email_fonts] save failed", error);
    throw new Error(
      (error as { message?: string } | null)?.message ?? "Failed to save font",
    );
  }
  return mapFont(data);
}

export async function deleteEmailFont(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    demoFonts = demoFonts.filter((f) => f.id !== id);
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("email_fonts").delete().eq("id", id);
  if (error) {
    logSupabaseError("[email_fonts] delete failed", error);
    throw new Error(error.message);
  }
}
