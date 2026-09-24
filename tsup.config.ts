import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    target: "es2020",
    platform: "browser",
    clean: true,
    // tsup's Rollup tree-shaking pass strips the "use client" banner below;
    // esbuild's output is already minimal, and consumers tree-shake anyway.
    treeshake: false,
    tsconfig: "tsconfig.lib.json",
    external: ["react", "react-dom", "react/jsx-runtime", "bikram-sambat-ts"],
    // Every export is an interactive component, so the whole entry is a
    // client module for React Server Components (Next.js App Router).
    banner: { js: '"use client";' },
  },
  {
    entry: { styles: "src/styles.css" },
    format: ["esm"],
    target: "es2020",
  },
]);
