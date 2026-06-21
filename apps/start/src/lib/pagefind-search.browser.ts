"use client";

import { env } from "@skills-re/env/start";

import { orpcClient } from "./orpc";
import { createPagefindSearchAdapter } from "./pagefind-search";

export const isPagefindSearchEnabled = env.VITE_PAGEFIND_SEARCH_ENABLED === "true";

export const pagefindSearchAdapter = createPagefindSearchAdapter({
  emitDiagnostics: (detail) => {
    globalThis.dispatchEvent?.(new CustomEvent("skills:pagefind-search", { detail }));
  },
  fetchManifest: async () => {
    const response = await fetch(new URL("/pagefind/current.json", env.VITE_SERVER_URL), {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Pagefind manifest failed with HTTP ${response.status}.`);
    }
    return await response.json();
  },
  hydrate: async (skillIds) => await orpcClient.skills.hydratePagefindHits({ skillIds }),
  importRuntime: async (bundleUrl) => {
    const runtimeUrl = new URL("pagefind.js", bundleUrl).toString();
    // oxlint-disable-next-line eslint/no-inline-comments
    return (await import(/* @vite-ignore */ runtimeUrl)) as never;
  },
});
