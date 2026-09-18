import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";

function headerValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.API_SECRET?.trim() ?? "";
    if (!expected) {
      throw new UnauthorizedException("API_SECRET is not configured");
    }
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, unknown>;
    }>();
    const provided = headerValue(req.headers["x-api-key"]);
    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException("Invalid API key");
    }
    return true;
  }
}
