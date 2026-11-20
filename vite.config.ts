import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readdirSync } from "node:fs";
import { sitePlugin } from "./build/site-plugin";

const pages = readdirSync(__dirname).filter((f) => f.endsWith(".html"));

export default defineConfig({
  base: "./",
  plugins: [sitePlugin(__dirname)],
  build: {
    target: "es2022",
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p.replace(/\.html$/, ""), resolve(__dirname, p)])),
    },
  },
  server: { port: 5183, strictPort: true },
});
