import { defineConfig } from "tsup";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const USE_CLIENT = '"use client";\n';

function prependUseClient() {
  for (const file of ["dist/index.js", "dist/index.cjs"]) {
    const p = resolve(file);
    try {
      const src = readFileSync(p, "utf8");
      if (!src.startsWith(USE_CLIENT)) {
        writeFileSync(p, USE_CLIENT + src);
      }
    } catch {
      // file may not exist for a given format; ignore
    }
  }
}

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2020",
  treeshake: true,
  external: ["react", "react-dom", "framer-motion"],
  async onSuccess() {
    prependUseClient();
  },
});
