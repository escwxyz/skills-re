// @ts-check

import tailwindcss from "@tailwindcss/vite";
import alchemy from "alchemy/cloudflare/astro";
import { defineConfig, envField } from "astro/config";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: alchemy(),

  env: {
    schema: {
      PUBLIC_SERVER_URL: envField.string({
        access: "public",
        context: "client",
        default: "http://localhost:3000",
      }),
      PUBLIC_SITE_URL: envField.string({
        access: "public",
        context: "server",
        default: "http://localhost:5173",
      }),
    },
  },

  vite: {
    plugins: [
      tailwindcss({ optimize: true }),
      paraglideVitePlugin({
        disableAsyncLocalStorage: true,
        project: "./project.inlang",
        outdir: "./src/paraglide",
        cookieName: "locale",
        strategy: ["url", "cookie", "preferredLanguage", "baseLocale"],
        urlPatterns: [
          // Localized home route
          {
            localized: [
              ["de", "/de"],
              ["zh-hans", "/zh-hans"],
              ["en", "/"],
            ],
            pattern: "/",
          },
          // Other routes - locale-aware
          {
            localized: [
              ["de", "/de/:path(.*)?"],
              ["zh-hans", "/zh-hans/:path(.*)?"],
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
