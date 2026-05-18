import pc from "picocolors";

export { pc };

export const writeJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export const formatError = (message: string) => `${pc.red("error")} ${message}\n`;
