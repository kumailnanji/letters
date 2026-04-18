import { CodeBlock } from "@/components/code-block";

const INSTALL = `npm install @kumailnanji/letters framer-motion`;

export function InstallSnippet() {
  return <CodeBlock code={INSTALL} lang="bash" />;
}
