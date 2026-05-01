// @ts-check

import tailwindcss from "@tailwindcss/vite";
import alchemy from "alchemy/cloudflare/astro";
import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: alchemy(),
  site: "https://skills.re",
  env: {
    schema: {
      SERVER_URL: envField.string({
        access: "public",
        context: "server",
        default: "http://localhost:3000",
      }),
      PUBLIC_SERVER_URL: envField.string({
        access: "public",
        context: "client",
        default: "http://localhost:3000",
      }),
      PUBLIC_SITE_URL: envField.string({
        access: "public",
        context: "server",
        default: "http://localhost:4321",
      }),
    },
  },

  vite: {
    plugins: [
      tailwindcss({ optimize: true }),
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
    ],
  },
  integrations: [react()],
});
