import { defineConfig } from "oxlint";

import core from "ultracite/oxlint/core";
import astro from "ultracite/oxlint/astro";

export default defineConfig({
  extends: [core, astro],
  rules: {
    "sort-keys": "off",
    "eslint/no-use-before-define": "off",
    "eslint/func-style": "off",
    "import/no-relative-parent-imports": "off",
    "eslint/no-warning-comments": "warn",
  },
});
