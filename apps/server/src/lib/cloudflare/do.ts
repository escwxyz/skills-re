export interface RateLimitResult {
  allowed: boolean;
  reason?: "window_limit" | "total_limit";
  retryAfterSeconds?: number;
}
