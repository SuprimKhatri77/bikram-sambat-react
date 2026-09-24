import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Development playground: renders the components straight from ../src.
export default defineConfig({
  plugins: [react()],
});
