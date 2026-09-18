import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CustomersModule } from "./customers/customers.module";
import { HealthController } from "./health.controller";
import { RedisModule } from "./redis/redis.module";
import { SupabaseModule } from "./supabase/supabase.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    RedisModule,
    SupabaseModule,
    CustomersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
