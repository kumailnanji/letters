import * as React from "react";

import { CodeBlock } from "@/components/code-block";
import { cn } from "@/lib/utils";

export function DemoCard({
  title,
  description,
  code,
  children,
  previewClassName,
}: {
  title: string;
  description?: string;
  code: string;
  children: React.ReactNode;
  previewClassName?: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div
          className={cn(
            "flex min-h-[220px] items-center justify-center border-b bg-[linear-gradient(180deg,theme(colors.muted.DEFAULT/40),theme(colors.background))] p-10",
            previewClassName,
          )}
        >
          {children}
        </div>
        <CodeBlock code={code} className="rounded-none border-0" />
      </div>
    </section>
  );
}
