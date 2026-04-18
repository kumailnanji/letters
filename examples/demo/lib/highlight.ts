import "server-only";

import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light"],
      langs: ["tsx", "ts", "bash"],
    });
  }
  return highlighterPromise;
}

export async function highlight(
  code: string,
  lang: "tsx" | "ts" | "bash" = "tsx",
) {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang,
    theme: "github-light",
  });
}
