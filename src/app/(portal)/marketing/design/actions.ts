"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import {
  deleteWaInteractiveDesign,
  deleteWaTemplateDesign,
  saveWaInteractiveDesign,
  saveWaTemplateDesign,
} from "@/lib/data/whatsapp-designs";
import {
  isWaInteractiveDesign,
  isWaTemplateDesign,
  type WaInteractiveDesign,
  type WaTemplateDesign,
} from "@/lib/whatsapp-designs";

export type DesignActionState = { ok: boolean; error?: string };

export async function saveWaTemplateDesignAction(
  design: WaTemplateDesign,
): Promise<DesignActionState> {
  await requirePermission("marketing.edit");
  if (!isWaTemplateDesign(design)) {
    return { ok: false, error: "Invalid template design." };
  }
  if (!design.name.trim() || !design.metaTemplateName.trim() || !design.body.trim()) {
    return { ok: false, error: "Name, Meta template name, and body are required." };
  }
  if (design.buttons.length > 3) {
    return { ok: false, error: "WhatsApp templates allow at most 3 buttons." };
  }
  try {
    await saveWaTemplateDesign(design);
    revalidatePath("/marketing/design");
    revalidatePath("/marketing/design/whatsapp/templates");
    revalidatePath(`/marketing/design/whatsapp/templates/${design.id}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save template.",
    };
  }
}

export async function deleteWaTemplateDesignAction(
  id: string,
): Promise<DesignActionState> {
  await requirePermission("marketing.edit");
  try {
    await deleteWaTemplateDesign(id);
    revalidatePath("/marketing/design");
    revalidatePath("/marketing/design/whatsapp/templates");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete template.",
    };
  }
}

export async function saveWaInteractiveDesignAction(
  design: WaInteractiveDesign,
): Promise<DesignActionState> {
  await requirePermission("marketing.edit");
  if (!isWaInteractiveDesign(design)) {
    return { ok: false, error: "Invalid interactive design." };
  }
  if (!design.name.trim() || !design.body.trim()) {
    return { ok: false, error: "Name and body are required." };
  }
  if (design.kind === "reply_buttons" && design.buttons.length > 3) {
    return { ok: false, error: "Reply buttons are limited to 3." };
  }
  try {
    await saveWaInteractiveDesign(design);
    revalidatePath("/marketing/design");
    revalidatePath("/marketing/design/whatsapp/interactive");
    revalidatePath(`/marketing/design/whatsapp/interactive/${design.id}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save interactive design.",
    };
  }
}

export async function deleteWaInteractiveDesignAction(
  id: string,
): Promise<DesignActionState> {
  await requirePermission("marketing.edit");
  try {
    await deleteWaInteractiveDesign(id);
    revalidatePath("/marketing/design");
    revalidatePath("/marketing/design/whatsapp/interactive");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete interactive design.",
    };
  }
}
