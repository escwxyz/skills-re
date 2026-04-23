import { defineConfig } from "oxlint";

import core from "ultracite/oxlint/core";
import astro from "ultracite/oxlint/astro";

export default defineConfig({
  extends: [core, astro],
  ignorePatterns: ["packages/db/src/schema/auth-schema.ts", "packages/env/env.d.ts"],
  rules: {
    "sort-keys": "off",
    "eslint/no-use-before-define": "off",
    "eslint/func-style": "off",
    "import/no-relative-parent-imports": "off",
    "eslint/no-warning-comments": "warn",
    "unicorn/prefer-module": "off",
  },
});
