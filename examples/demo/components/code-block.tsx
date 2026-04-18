import { highlight } from "@/lib/highlight";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

export async function CodeBlock({
  code,
  lang = "tsx",
  className,
}: {
  code: string;
  lang?: "tsx" | "ts" | "bash";
  className?: string;
}) {
  const html = await highlight(code, lang);
  return (
    <div
      className={cn(
        "group relative rounded-md border bg-muted/40 text-sm",
        className,
      )}
    >
      <div className="absolute right-2 top-2 z-10">
        <CopyButton value={code} />
      </div>
      <div
        className="overflow-x-auto rounded-md [&>pre]:!bg-transparent [&>pre]:p-4 [&>pre]:text-[13px] [&>pre]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
