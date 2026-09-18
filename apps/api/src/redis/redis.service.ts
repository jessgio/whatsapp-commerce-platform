import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Redis } from "@upstash/redis";

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly log = new Logger(RedisService.name);
  private client: Redis | null = null;

  onModuleInit() {
    const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
    const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!url || !token) {
      this.log.warn("Upstash Redis not configured — running without cache");
      return;
    }
    this.client = new Redis({ url, token });
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      return (await this.client.ping()) === "PONG";
    } catch (err) {
      this.log.warn(`Redis ping failed: ${String(err)}`);
      return false;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const value = await this.client.get<T>(key);
      return value ?? null;
    } catch (err) {
      this.log.warn(`Redis get ${key} failed: ${String(err)}`);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      this.log.warn(`Redis set ${key} failed: ${String(err)}`);
    }
  }
}
