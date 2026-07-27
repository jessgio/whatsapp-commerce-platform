-- Pin search_path on the segment functions from 0021.
--
-- Supabase's linter flags these as having a role-mutable search_path. They are
-- SECURITY INVOKER, so the blast radius is limited to the caller's own
-- privileges, but segment_condition_sql and segment_rules_sql assemble dynamic
-- SQL: an unqualified name resolving to an object in an attacker-controlled
-- schema is exactly the shape of the problem this setting exists to prevent.

alter function public.customer_age_years(date, timestamptz)
  set search_path = public, pg_temp;
alter function public.segment_condition_sql(jsonb, timestamptz)
  set search_path = public, pg_temp;
alter function public.segment_rules_sql(jsonb, timestamptz)
  set search_path = public, pg_temp;
alter function public.count_segment_members(jsonb, text)
  set search_path = public, pg_temp;
alter function public.list_segment_members(jsonb, int, int, text)
  set search_path = public, pg_temp;
