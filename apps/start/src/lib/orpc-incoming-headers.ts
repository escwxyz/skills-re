import { getRequestHeaders } from "@tanstack/react-start/server";

const isOutsideRequestContextError = (error: unknown) =>
  error instanceof Error && error.message.includes("No StartEvent found in AsyncLocalStorage");

export const getIncomingHeaders = (
  readRequestHeaders: typeof getRequestHeaders = getRequestHeaders,
) => {
  try {
    return readRequestHeaders();
  } catch (error) {
    if (!isOutsideRequestContextError(error)) {
      throw error;
    }

    return new Headers();
  }
};
