"use client";

import { useState } from "react";
import { Letters } from "@kumailnanji/letters";

export function ScrubbableSignature() {
  const [progress, setProgress] = useState(0.4);

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <Letters
        text="hello"
        progress={progress}
        strokeWidth={2.5}
      />
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={progress}
        onChange={(e) => setProgress(Number(e.target.value))}
        className="w-full accent-slate-900"
        aria-label="Stroke progress"
      />
      <span className="text-xs font-mono text-muted-foreground">
        progress = {progress.toFixed(2)}
      </span>
    </div>
  );
}
