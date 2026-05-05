import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import alchemy from "alchemy/cloudflare/tanstack-start";
import contentCollections from "@content-collections/vite";

const config = defineConfig({
  server: {
    port: 3001,
  },
  plugins: [
    contentCollections(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      cookieName: "locale",
      strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
      urlPatterns: [
        {
          localized: [
            ["de", "/.well-knwon/agent-configuration"],
            ["zh-Hans", "/.well-knwon/agent-configuration"],
            ["en", "/.well-knwon/agent-configuration"],
          ],
          pattern: "/.well-knwon/agent-configuration",
        },
        // Localized home route
        {
          localized: [
            ["de", "/de"],
            ["zh-Hans", "/zh-Hans"],
            ["en", "/"],
          ],
          pattern: "/",
        },
        // Other routes - locale-aware
        {
          localized: [
            ["de", "/de/:path(.*)?"],
            ["zh-Hans", "/zh-Hans/:path(.*)?"],
            ["en", "/:path(.*)?"],
          ],
          pattern: "/:path(.*)?",
        },
      ],
    }),
    devtools(),
    alchemy(),
    // this is the plugin that enables path aliases, remove it for vite 8.0
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
