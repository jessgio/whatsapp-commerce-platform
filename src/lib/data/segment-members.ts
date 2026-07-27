import "server-only";
import { shouldUseSupabaseData } from "@/lib/data/mode";
import { listCustomers, mapCustomer } from "@/lib/data/repo";
import {
  countCustomersByRules,
  filterCustomersByRules,
  type SegmentRules,
} from "@/lib/segments";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import type { ConsentStatus, Customer } from "@/lib/types";

/**
 * Segment membership resolved by Postgres (migration 0021) rather than by
 * pulling every customer into Node. The in-memory engine in `@/lib/segments`
 * still backs the interactive builder preview and demo mode; these are the
 * authoritative counts, and unlike the old path they are not silently capped
 * at whatever `listCustomers` happened to fetch.
 */

type Options = {
  /** Restrict to one consent state — campaigns can only reach opted-in people. */
  consentStatus?: ConsentStatus;
  /**
   * Read with the service-role client instead of the caller's session.
   *
   * Campaign dispatch runs from cron with no cookies, so the `is_staff()` RLS
   * policy on `customers` matches nothing and the audience comes back empty.
   * Callers using this must gate access themselves — the portal requires
   * `marketing.send`, the cron route requires CRON_SECRET.
   */
  asSystem?: boolean;
};

async function client(options: Options) {
  return options.asSystem
    ? createSupabaseAdminClient()
    : await createSupabaseServerClient();
}

export async function countSegmentMembers(
  rules: SegmentRules,
  options: Options = {},
): Promise<number> {
  if (!shouldUseSupabaseData()) {
    const customers = await listCustomers();
    return countCustomersByRules(withConsent(customers, options), rules);
  }

  const supabase = await client(options);
  const { data, error } = await supabase.rpc("count_segment_members", {
    p_rules: rules,
    p_consent: options.consentStatus ?? null,
  });

  if (error) {
    console.error("[segments] count_segment_members failed", error);
    return 0;
  }
  return Number(data ?? 0);
}

export async function listSegmentMembers(
  rules: SegmentRules,
  options: Options & { limit?: number; offset?: number } = {},
): Promise<Customer[]> {
  const { limit = 100, offset = 0 } = options;

  if (!shouldUseSupabaseData()) {
    const customers = await listCustomers();
    return filterCustomersByRules(withConsent(customers, options), rules).slice(
      offset,
      offset + limit,
    );
  }

  const supabase = await client(options);
  const { data, error } = await supabase.rpc("list_segment_members", {
    p_rules: rules,
    p_limit: limit,
    p_offset: offset,
    p_consent: options.consentStatus ?? null,
  });

  if (error) {
    console.error("[segments] list_segment_members failed", error);
    return [];
  }
  return (data ?? []).map(mapCustomer);
}

/** Every member, paged so one campaign audience is never truncated. */
export async function listAllSegmentMembers(
  rules: SegmentRules,
  options: Options & { pageSize?: number; max?: number } = {},
): Promise<Customer[]> {
  const { pageSize = 1000, max = 50_000 } = options;
  const out: Customer[] = [];

  for (let offset = 0; offset < max; offset += pageSize) {
    const page = await listSegmentMembers(rules, {
      ...options,
      limit: pageSize,
      offset,
    });
    out.push(...page);
    if (page.length < pageSize) break;
  }
  return out;
}

function withConsent(customers: Customer[], options: Options): Customer[] {
  if (!options.consentStatus) return customers;
  return customers.filter((c) => c.consentStatus === options.consentStatus);
}
