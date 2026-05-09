export const isRateLimitedSearchError = (error: unknown) => {
  const message = error instanceof Error ? `${error.name} ${error.message}` : JSON.stringify(error);

  return message.includes("RATE_LIMITED") || message.includes("429");
};
