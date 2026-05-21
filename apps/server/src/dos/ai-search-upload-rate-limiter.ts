import { getUtcDayKey, MS_PER_DAY, parsePositiveInteger } from "@/utils";
import { DurableObject } from "cloudflare:workers";
import type {
  AiWorkflowRateLimitReservation,
  AiWorkflowRateLimitReservationRequest,
} from "./ai-workflow-rate-limiter";

type AiSearchUploadRateLimitReservationRequest = AiWorkflowRateLimitReservationRequest;

export type AiSearchUploadRateLimitReservation = AiWorkflowRateLimitReservation;

const getNextUtcDayStartMs = (timeMs: number) => {
  const date = new Date(timeMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
};

export class AiSearchUploadRateLimiter extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const input = (await request
      .json()
      .catch(() => ({}))) as AiSearchUploadRateLimitReservationRequest;
    const result = await this.reserve(input);
    return Response.json(result);
  }

  private async reserve(
    input: AiSearchUploadRateLimitReservationRequest,
  ): Promise<AiSearchUploadRateLimitReservation> {
    const dailyLimit = parsePositiveInteger(input.dailyLimit, 100);
    const spacingMs = parsePositiveInteger(input.spacingMs, 60_000);
    const units = Math.min(parsePositiveInteger(input.units, 1), dailyLimit);
    const now = Date.now();

    const [storedDay, storedCount, storedNextAt] = await Promise.all([
      this.ctx.storage.get<string>("day"),
      this.ctx.storage.get<number>("count"),
      this.ctx.storage.get<number>("nextAt"),
    ]);

    let notBeforeMs = Math.max(now, storedNextAt ?? now);
    let day = getUtcDayKey(notBeforeMs);
    let count = storedDay === day ? (storedCount ?? 0) : 0;

    if (count + units > dailyLimit) {
      notBeforeMs = getNextUtcDayStartMs(notBeforeMs);
      day = getUtcDayKey(notBeforeMs);
      count = 0;
    }

    const nextAt = notBeforeMs + spacingMs * units;
    await Promise.all([
      this.ctx.storage.put("day", day),
      this.ctx.storage.put("count", count + units),
      this.ctx.storage.put("nextAt", nextAt),
      this.ctx.storage.setAlarm(nextAt + MS_PER_DAY),
    ]);

    return {
      delaySeconds: Math.max(0, Math.ceil((notBeforeMs - now) / 1000)),
      notBeforeMs,
    };
  }

  async alarm(): Promise<void> {
    const nextAt = await this.ctx.storage.get<number>("nextAt");
    if (typeof nextAt === "number" && Date.now() < nextAt + MS_PER_DAY) {
      await this.ctx.storage.setAlarm(nextAt + MS_PER_DAY);
      return;
    }

    await this.ctx.storage.deleteAll();
  }
}
