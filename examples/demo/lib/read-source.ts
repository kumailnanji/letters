import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads a recipe source file from `examples/demo/recipes/*.tsx` and
 * returns a cleaned snippet that looks like something a consumer could
 * paste into their own project:
 *   - strips the `"use client"` directive (Next.js framework detail)
 *   - leaves imports from `@kumailnanji/letters` intact so the snippet is
 *     copy-pasteable into a consumer project as-is
 */
export function readRecipeSource(fileName: string): string {
  const abs = join(process.cwd(), "recipes", fileName);
  let source = readFileSync(abs, "utf8");
  source = source.replace(/^"use client";\s*\n+/m, "");
  return source.trimEnd() + "\n";
}
