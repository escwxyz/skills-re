import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  extends: [ultracite],
  ignorePatterns: ["packages/db/src/migrations/**", "apps/start/src/routeTree.gen.ts"],
});
