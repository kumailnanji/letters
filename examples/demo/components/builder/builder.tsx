"use client";

import * as React from "react";
import { useLettersController } from "@kumailnanji/letters";
import { BuilderControls } from "./controls";
import { BuilderPreview } from "./preview";
import { CopyButton } from "@/components/copy-button";
import { DEFAULT_BUILDER_STATE, type BuilderState } from "./state";
import { generateCode } from "./generate-code";

export function Builder() {
  const [state, setState] = React.useState<BuilderState>(
    DEFAULT_BUILDER_STATE,
  );
  const controller = useLettersController();
  const code = React.useMemo(() => generateCode(state), [state]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          Build your own
        </h2>
        <p className="text-sm text-muted-foreground">
          Play with every prop. When you&rsquo;re happy, copy the snippet
          below and paste it into your app.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <BuilderControls
          state={state}
          setState={setState}
          controller={controller}
        />
        <BuilderPreview state={state} controller={controller} />
      </div>

      <div className="relative rounded-xl border bg-muted/40 font-mono">
        <div className="absolute right-2 top-2 z-10">
          <CopyButton value={code} />
        </div>
        <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </section>
  );
}
