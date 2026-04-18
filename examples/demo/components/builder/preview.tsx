"use client";

import {
  Letters,
  SPRING_PRESETS,
  type AnimationConfig,
  type LettersController,
} from "@kumailnanji/letters";
import type { BuilderState } from "./state";

export function BuilderPreview({
  state,
  controller,
}: {
  state: BuilderState;
  controller: LettersController;
}) {
  const animation: AnimationConfig =
    state.animationType === "tween"
      ? {
          type: "tween",
          duration: state.tweenDuration,
          ease: state.tweenEase,
        }
      : {
          type: "spring",
          spring:
            SPRING_PRESETS[state.springPreset] ?? SPRING_PRESETS.gentle,
        };

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border bg-muted/30 p-8">
      <Letters
        ref={controller.ref}
        text={state.text || " "}
        autoPlay={state.autoPlay}
        loop={state.loop}
        rewindBeforePlay={state.rewindBeforePlay}
        loopPauseMs={state.loopPauseMs}
        animation={animation}
        strokeWidth={state.strokeWidth}
        overlap={state.overlap}
        color={state.color}
      />
      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground tabular-nums">
        <span>
          {controller.isPlaying ? "playing" : "idle"}
        </span>
        <span aria-hidden>·</span>
        <span>progress {controller.progress.toFixed(2)}</span>
      </div>
    </div>
  );
}
