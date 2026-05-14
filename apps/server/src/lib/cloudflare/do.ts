export interface RateLimitResult {
  allowed: boolean;
  reason?: "window_limit";
  retryAfterSeconds?: number;
}
