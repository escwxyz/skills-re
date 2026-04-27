// @ts-check

import tailwindcss from "@tailwindcss/vite";
import alchemy from "alchemy/cloudflare/astro";
import { defineConfig, envField } from "astro/config";
import react from "@astrojs/react";
import { intlayer } from "astro-intlayer";

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
    plugins: [tailwindcss({ optimize: true })],
  },
  integrations: [react(), intlayer()],
});
