"use client";

import { useRef } from "react";
import { Letters, type LettersHandle } from "@kumailnanji/letters";

export function HoverReplayWord() {
  const ref = useRef<LettersHandle>(null);

  return (
    <div
      onPointerEnter={() => ref.current?.replay()}
      className="cursor-pointer select-none rounded-lg px-6 py-4 text-slate-900"
    >
      <Letters
        ref={ref}
        text="hello"
        autoPlay={false}
        strokeWidth={2.5}
        animation={{ type: "tween", duration: 1.6, ease: "easeInOut" }}
      />
    </div>
  );
}
