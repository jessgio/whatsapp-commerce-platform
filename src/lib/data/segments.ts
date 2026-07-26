import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import {
  emptyRules,
  isSegmentRules,
  type SegmentDefinition,
  type SegmentRules,
} from "@/lib/segments";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

let demoSegments: SegmentDefinition[] = [
  {
    id: "seg-demo-vip",
    name: "High value",
    description: "Lifetime value at least Rp1.000.000",
    rules: {
      match: "all",
      conditions: [
        {
          id: "c1",
          field: "lifetime_value",
          op: "gte",
          value: 1_000_000,
        },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seg-demo-recent",
    name: "Ordered in last 90 days",
    description: null,
    rules: {
      match: "all",
      conditions: [
        {
          id: "c2",
          field: "last_order_at",
          op: "within_days",
          value: 90,
        },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seg-demo-jakarta-young",
    name: "Jakarta · age 25–40",
    description: "City contains Jakarta and age between 25–40",
    rules: {
      match: "all",
      conditions: [
        { id: "c3", field: "city", op: "contains", value: "Jakarta" },
        { id: "c4", field: "age", op: "between", value: [25, 40] },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSegment(r: any): SegmentDefinition {
  const rules = isSegmentRules(r.rules) ? r.rules : emptyRules();
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    rules,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listSegmentDefinitions(): Promise<SegmentDefinition[]> {
  if (!isSupabaseConfigured()) {
    return demoSegments
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customer_segment_definitions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[segments] list failed", error);
    return [];
  }
  return (data ?? []).map(mapSegment);
}

export async function getSegmentDefinition(
  id: string,
): Promise<SegmentDefinition | null> {
  if (!isSupabaseConfigured()) {
    return demoSegments.find((s) => s.id === id) ?? null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customer_segment_definitions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[segments] get failed", error);
    return null;
  }
  return data ? mapSegment(data) : null;
}

export async function createSegmentDefinition(input: {
  name: string;
  description?: string | null;
  rules: SegmentRules;
}): Promise<SegmentDefinition> {
  const name = input.name.trim();
  const description = input.description?.trim() || null;
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const seg: SegmentDefinition = {
      id: `seg-${Date.now()}`,
      name,
      description,
      rules: input.rules,
      createdAt: now,
      updatedAt: now,
    };
    demoSegments = [seg, ...demoSegments];
    return seg;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customer_segment_definitions")
    .insert({
      name,
      description,
      rules: input.rules,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create segment");
  }
  return mapSegment(data);
}

export async function updateSegmentDefinition(
  id: string,
  input: {
    name: string;
    description?: string | null;
    rules: SegmentRules;
  },
): Promise<SegmentDefinition> {
  const name = input.name.trim();
  const description = input.description?.trim() || null;
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const idx = demoSegments.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error("Segment not found");
    demoSegments[idx] = {
      ...demoSegments[idx],
      name,
      description,
      rules: input.rules,
      updatedAt: now,
    };
    return demoSegments[idx];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customer_segment_definitions")
    .update({
      name,
      description,
      rules: input.rules,
      updated_at: now,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update segment");
  }
  return mapSegment(data);
}

export async function deleteSegmentDefinition(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    demoSegments = demoSegments.filter((s) => s.id !== id);
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("customer_segment_definitions")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
