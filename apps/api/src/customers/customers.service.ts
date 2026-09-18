import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { customersCacheTtl } from "../env";
import { RedisService } from "../redis/redis.service";
import { SupabaseService } from "../supabase/supabase.service";
import {
  buildCustomersExportXlsx,
  type CustomerExportSource,
} from "./export-xlsx";
import { mapCustomer, type CustomerRow } from "./map-customer";

const PAGE_SIZE = 1000;
const CACHE_KEY = "merlot:customers:v1";

@Injectable()
export class CustomersService {
  private readonly log = new Logger(CustomersService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly redis: RedisService,
  ) {}

  async list(): Promise<{ cached: boolean; count: number; customers: CustomerRow[] }> {
    const cached = await this.redis.getJson<CustomerRow[]>(CACHE_KEY);
    if (cached && Array.isArray(cached)) {
      return { cached: true, count: cached.length, customers: cached };
    }

    const rows = await this.loadFromSupabase();
    await this.redis.setJson(CACHE_KEY, rows, customersCacheTtl());
    return { cached: false, count: rows.length, customers: rows };
  }

  async exportXlsx(source: CustomerExportSource): Promise<Buffer> {
    const { customers } = await this.list();
    return buildCustomersExportXlsx(customers, source);
  }

  private async loadFromSupabase(): Promise<CustomerRow[]> {
    if (!this.supabase.configured) {
      throw new ServiceUnavailableException("Supabase is not configured");
    }
    const db = this.supabase.admin;
    const { count, error: countError } = await db
      .from("customers")
      .select("id", { count: "exact", head: true });
    if (countError) {
      this.log.error(`count failed: ${countError.message}`);
      throw new ServiceUnavailableException("Failed to read customers");
    }

    const total = count ?? 0;
    if (total === 0) return [];

    const pages = Math.ceil(total / PAGE_SIZE);
    const batches = await Promise.all(
      Array.from({ length: pages }, (_, i) =>
        db
          .from("customers")
          .select("*")
          .order("created_at", { ascending: false })
          .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1),
      ),
    );

    const collected: CustomerRow[] = [];
    for (const batch of batches) {
      if (batch.error) {
        this.log.error(`page failed: ${batch.error.message}`);
        throw new ServiceUnavailableException("Failed to read customers");
      }
      for (const row of batch.data ?? []) {
        collected.push(mapCustomer(row));
      }
    }
    return collected;
  }
}
