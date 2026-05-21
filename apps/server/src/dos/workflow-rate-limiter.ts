import { DurableObject } from "cloudflare:workers";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface WorkflowRateLimitReservationRequest {
  dailyLimit?: number;
  spacingMs?: number;
  units?: number;
}

export interface WorkflowRateLimitReservation {
  delaySeconds: number;
  notBeforeMs: number;
}

const parsePositiveInteger = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.trunc(value));
};

const getUtcDayKey = (timeMs: number) => new Date(timeMs).toISOString().slice(0, 10);

const getNextUtcDayStartMs = (timeMs: number) => {
  const date = new Date(timeMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
};

export class WorkflowRateLimiter extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const input = (await request.json().catch(() => ({}))) as WorkflowRateLimitReservationRequest;
    const result = await this.reserve(input);
    return Response.json(result);
  }

  private async reserve(
    input: WorkflowRateLimitReservationRequest,
  ): Promise<WorkflowRateLimitReservation> {
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
