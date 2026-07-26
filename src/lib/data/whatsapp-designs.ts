import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import {
  defaultWaInteractiveDesign,
  defaultWaTemplateDesign,
  type WaInteractiveDesign,
  type WaTemplateDesign,
} from "@/lib/whatsapp-designs";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

let demoTemplates: WaTemplateDesign[] = [
  defaultWaTemplateDesign({
    id: "wa-tpl-demo-offer",
    name: "Seasonal offer",
    metaTemplateName: "marketing_offer",
    body: "Halo {{1}}, penawaran spesial minggu ini: {{2}}. Klaim sebelum habis!",
    variableDefaults: { "1": "Sari", "2": "diskon 20% serum" },
  }),
  defaultWaTemplateDesign({
    id: "wa-tpl-demo-restock",
    name: "Restock alert",
    metaTemplateName: "restock_alert",
    category: "UTILITY",
    header: { type: "text", text: "Stok kembali" },
    body: "Hai {{1}}, {{2}} sudah tersedia lagi. Pesan sekarang sebelum kehabisan.",
    footer: "Aeris Beauté",
    buttons: [
      {
        id: "btn-shop",
        type: "url",
        text: "Pesan sekarang",
        url: "https://aerisbeaute.com",
      },
    ],
    variableDefaults: { "1": "Dewi", "2": "Glow Serum" },
  }),
];

let demoInteractive: WaInteractiveDesign[] = [
  defaultWaInteractiveDesign({
    id: "wa-int-demo-skin",
    name: "Skin-type quiz",
    kind: "reply_buttons",
  }),
  defaultWaInteractiveDesign({
    id: "wa-int-demo-menu",
    name: "Quick catalog menu",
    kind: "list",
    body: "Pilih kategori yang ingin Anda lihat:",
    listButtonLabel: "Lihat kategori",
  }),
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapTemplate(r: any): WaTemplateDesign {
  return {
    id: r.id,
    name: r.name,
    metaTemplateName: r.meta_template_name,
    languageCode: r.language_code ?? "id",
    category: r.category ?? "MARKETING",
    header: r.header ?? { type: "none" },
    body: r.body ?? "",
    footer: r.footer ?? "",
    buttons: Array.isArray(r.buttons) ? r.buttons : [],
    variableDefaults:
      r.variable_defaults && typeof r.variable_defaults === "object"
        ? r.variable_defaults
        : {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapInteractive(r: any): WaInteractiveDesign {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    body: r.body ?? "",
    headerText: r.header_text ?? "",
    footerText: r.footer_text ?? "",
    imageUrl: r.image_url ?? "",
    buttons: Array.isArray(r.buttons) ? r.buttons : [],
    listButtonLabel: r.list_button_label ?? "Options",
    listSections: Array.isArray(r.list_sections) ? r.list_sections : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listWaTemplateDesigns(): Promise<WaTemplateDesign[]> {
  if (!isSupabaseConfigured()) {
    return demoTemplates.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("wa_template_designs")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[wa_template_designs] list failed", error);
    return [];
  }
  return (data ?? []).map(mapTemplate);
}

export async function getWaTemplateDesign(
  id: string,
): Promise<WaTemplateDesign | null> {
  if (!isSupabaseConfigured()) {
    return demoTemplates.find((t) => t.id === id) ?? null;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("wa_template_designs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[wa_template_designs] get failed", error);
    return null;
  }
  return data ? mapTemplate(data) : null;
}

export async function saveWaTemplateDesign(
  input: WaTemplateDesign,
): Promise<WaTemplateDesign> {
  const now = new Date().toISOString();
  const next: WaTemplateDesign = { ...input, updatedAt: now };

  if (!isSupabaseConfigured()) {
    const idx = demoTemplates.findIndex((t) => t.id === next.id);
    if (idx >= 0) demoTemplates[idx] = next;
    else demoTemplates = [next, ...demoTemplates];
    return { ...next };
  }

  const supabase = createSupabaseAdminClient();
  const row = {
    id: next.id,
    name: next.name,
    meta_template_name: next.metaTemplateName,
    language_code: next.languageCode,
    category: next.category,
    header: next.header,
    body: next.body,
    footer: next.footer,
    buttons: next.buttons,
    variable_defaults: next.variableDefaults,
    updated_at: now,
    created_at: next.createdAt,
  };
  const { data, error } = await supabase
    .from("wa_template_designs")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[wa_template_designs] save failed", error);
    throw new Error(error?.message ?? "Failed to save WhatsApp template");
  }
  return mapTemplate(data);
}

export async function deleteWaTemplateDesign(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    demoTemplates = demoTemplates.filter((t) => t.id !== id);
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("wa_template_designs").delete().eq("id", id);
  if (error) {
    console.error("[wa_template_designs] delete failed", error);
    throw new Error(error.message);
  }
}

export async function listWaInteractiveDesigns(): Promise<WaInteractiveDesign[]> {
  if (!isSupabaseConfigured()) {
    return demoInteractive.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("wa_interactive_designs")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[wa_interactive_designs] list failed", error);
    return [];
  }
  return (data ?? []).map(mapInteractive);
}

export async function getWaInteractiveDesign(
  id: string,
): Promise<WaInteractiveDesign | null> {
  if (!isSupabaseConfigured()) {
    return demoInteractive.find((t) => t.id === id) ?? null;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("wa_interactive_designs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[wa_interactive_designs] get failed", error);
    return null;
  }
  return data ? mapInteractive(data) : null;
}

export async function saveWaInteractiveDesign(
  input: WaInteractiveDesign,
): Promise<WaInteractiveDesign> {
  const now = new Date().toISOString();
  const next: WaInteractiveDesign = { ...input, updatedAt: now };

  if (!isSupabaseConfigured()) {
    const idx = demoInteractive.findIndex((t) => t.id === next.id);
    if (idx >= 0) demoInteractive[idx] = next;
    else demoInteractive = [next, ...demoInteractive];
    return { ...next };
  }

  const supabase = createSupabaseAdminClient();
  const row = {
    id: next.id,
    name: next.name,
    kind: next.kind,
    body: next.body,
    header_text: next.headerText,
    footer_text: next.footerText,
    image_url: next.imageUrl,
    buttons: next.buttons,
    list_button_label: next.listButtonLabel,
    list_sections: next.listSections,
    updated_at: now,
    created_at: next.createdAt,
  };
  const { data, error } = await supabase
    .from("wa_interactive_designs")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[wa_interactive_designs] save failed", error);
    throw new Error(error?.message ?? "Failed to save interactive design");
  }
  return mapInteractive(data);
}

export async function deleteWaInteractiveDesign(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    demoInteractive = demoInteractive.filter((t) => t.id !== id);
    return;
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("wa_interactive_designs").delete().eq("id", id);
  if (error) {
    console.error("[wa_interactive_designs] delete failed", error);
    throw new Error(error.message);
  }
}
