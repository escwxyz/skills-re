import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core],
  overrides: [],
  rules: {
    "sort-keys": "off",
    "eslint/no-use-before-define": "off",
    "eslint/func-style": "off",
    "import/no-relative-parent-imports": "off",
    "eslint/no-warning-comments": "warn",
  },
});
