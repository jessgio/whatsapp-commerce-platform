"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { countSegmentMembers } from "@/lib/data/segment-members";
import {
  createSegmentDefinition,
  deleteSegmentDefinition,
  updateSegmentDefinition,
} from "@/lib/data/segments";
import { requirePermission } from "@/lib/guard";
import { emptyRules, isSegmentRules, type SegmentRules } from "@/lib/segments";

export type SegmentActionState = {
  ok: boolean;
  error?: string;
};

function parseRules(raw: unknown): SegmentRules | null {
  if (!isSegmentRules(raw)) return null;
  if (!raw.conditions.length) return null;
  return raw;
}

export async function saveSegmentAction(input: {
  id?: string;
  name: string;
  description?: string;
  rules: unknown;
}): Promise<SegmentActionState> {
  await requirePermission("customers.edit");

  const name = input.name.trim();
  if (!name || name.length > 80) {
    return { ok: false, error: "Name is required (max 80 characters)." };
  }

  const rules = parseRules(input.rules) ?? emptyRules();
  if (!rules.conditions.length) {
    return { ok: false, error: "Add at least one condition." };
  }

  try {
    if (input.id) {
      await updateSegmentDefinition(input.id, {
        name,
        description: input.description,
        rules,
      });
      revalidatePath("/customers/segments");
      revalidatePath(`/customers/segments/${input.id}`);
      revalidatePath("/customers");
      return { ok: true };
    }

    const created = await createSegmentDefinition({
      name,
      description: input.description,
      rules,
    });
    revalidatePath("/customers/segments");
    revalidatePath("/customers");
    redirect(`/customers/segments/${created.id}`);
  } catch (e) {
    // Next.js redirect throws — rethrow so navigation works.
    if (e && typeof e === "object" && "digest" in e) throw e;
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save segment.",
    };
  }
}

/**
 * Live member count for the rule builder. Counting in Postgres means the
 * preview reflects the whole customer base rather than the page the browser
 * happened to be sent, and the builder no longer needs every customer row
 * shipped into the client bundle to do arithmetic on it.
 */
export async function previewSegmentCountAction(
  rules: unknown,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  await requirePermission("customers.view");
  const parsed = parseRules(rules);
  if (!parsed) return { ok: true, count: 0 };
  try {
    return { ok: true, count: await countSegmentMembers(parsed) };
  } catch (e) {
    console.error("[segments] preview failed", e);
    return { ok: false, error: "Could not count members right now." };
  }
}

export async function deleteSegmentAction(id: string): Promise<SegmentActionState> {
  await requirePermission("customers.edit");
  try {
    await deleteSegmentDefinition(id);
    revalidatePath("/customers/segments");
    revalidatePath("/customers");
    redirect("/customers/segments");
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete segment.",
    };
  }
}
