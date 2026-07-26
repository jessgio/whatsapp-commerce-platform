"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
