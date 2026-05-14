import { isRateLimitedError } from "./is-rate-limited-error";

export const isRateLimitedSearchError = (error: unknown) => isRateLimitedError(error);
