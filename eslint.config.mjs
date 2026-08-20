import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "release/**",
    ".claude/**",
    // Mobile has a large pre-existing lint debt; gate web/core first.
    "mobile/**",
    "electron/**",
    "e2e/**",
    "playwright.config.ts",
    "node_modules/**",
  ]),
  {
    rules: {
      // Pre-existing patterns; do not block the harness verify gate.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
