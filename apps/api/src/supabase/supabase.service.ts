import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly log = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;

  onModuleInit() {
    const url =
      process.env.SUPABASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) {
      this.log.warn("Supabase not configured");
      return;
    }
    this.client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  get admin(): SupabaseClient {
    if (!this.client) {
      throw new Error("Supabase service client is not configured");
    }
    return this.client;
  }

  get configured(): boolean {
    return this.client !== null;
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client
        .from("customers")
        .select("id", { count: "exact", head: true });
      return !error;
    } catch (err) {
      this.log.warn(`Supabase ping failed: ${String(err)}`);
      return false;
    }
  }
}
