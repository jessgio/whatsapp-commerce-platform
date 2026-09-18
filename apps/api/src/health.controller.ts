import { Controller, Get } from "@nestjs/common";
import { RedisService } from "./redis/redis.service";
import { SupabaseService } from "./supabase/supabase.service";

@Controller()
export class HealthController {
  constructor(
    private readonly redis: RedisService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get("health")
  async health() {
    const [redis, supabase] = await Promise.all([
      this.redis.ping(),
      this.supabase.ping(),
    ]);
    return {
      ok: true,
      runtime: "nest+fastify",
      redis,
      supabase,
    };
  }
}
