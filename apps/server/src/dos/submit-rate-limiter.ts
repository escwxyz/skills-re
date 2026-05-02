import type { RateLimitResult } from "@/lib/cloudflare/do";
import { DurableObject } from "cloudflare:workers";

const WINDOW_SECONDS = 60;
const MAX_PER_WINDOW = 1;
const MAX_TOTAL = 5;

export class SubmitRateLimiter extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const result = await this.checkAndRecord();
    return Response.json(result);
  }

  private async checkAndRecord(): Promise<RateLimitResult> {
    const now = Date.now();
    const [windowStart, windowCount, totalCount] = await Promise.all([
      this.ctx.storage.get<number>("ws"),
      this.ctx.storage.get<number>("wc"),
      this.ctx.storage.get<number>("tc"),
    ]);

    const ws = windowStart ?? now;
    const wc = windowCount ?? 0;
    const tc = totalCount ?? 0;

    if (tc >= MAX_TOTAL) {
      return { allowed: false, reason: "total_limit" };
    }

    const windowExpired = now >= ws + WINDOW_SECONDS * 1000;
    const effectiveWs = windowExpired ? now : ws;
    const effectiveWc = windowExpired ? 0 : wc;

    if (effectiveWc >= MAX_PER_WINDOW) {
      const retryAfterSeconds = Math.ceil((effectiveWs + WINDOW_SECONDS * 1000 - now) / 1000);
      return { allowed: false, reason: "window_limit", retryAfterSeconds };
    }

    await Promise.all([
      this.ctx.storage.put("ws", effectiveWs),
      this.ctx.storage.put("wc", effectiveWc + 1),
      this.ctx.storage.put("tc", tc + 1),
    ]);

    return { allowed: true };
  }
}
