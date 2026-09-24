import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", ".playwright-mcp"] },
  js.configs.recommended,
  tseslint.configs.strict,
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      // Only the DOM autoFocus attribute; NepaliCalendar's autoFocus prop is deliberate.
      "jsx-a11y/no-autofocus": ["error", { ignoreNonDOM: true }],
      // Destructuring a prop out before spreading the rest onto a DOM element.
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
    },
  },
  {
    // The library must be safe to import on a server: no Node built-ins, and
    // browser globals only through `typeof` checks or inside effects/handlers.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        "process",
        "Buffer",
        "require",
        "localStorage",
        "sessionStorage",
        "navigator",
      ],
      "no-restricted-imports": ["error", { patterns: ["node:*", "fs", "path"] }],
    },
  },
);
