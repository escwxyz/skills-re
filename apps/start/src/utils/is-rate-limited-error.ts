export const isRateLimitedError = (error: unknown) => {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : (JSON.stringify(error) ?? String(error));
  const normalized = message.toLowerCase();

  return (
    normalized.includes("rate_limited") ||
    normalized.includes("429") ||
    normalized.includes("too many requests")
  );
};
