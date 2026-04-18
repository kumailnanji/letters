import type { EasePreset } from "@kumailnanji/letters";

export type AnimationKind = "tween" | "spring";

export interface BuilderState {
  text: string;
  autoPlay: boolean;
  loop: boolean;
  rewindBeforePlay: boolean;
  loopPauseMs: number;
  animationType: AnimationKind;
  tweenDuration: number;
  tweenEase: EasePreset;
  springPreset: string;
  strokeWidth: number;
  overlap: number;
  color: string;
}

export const DEFAULT_BUILDER_STATE: BuilderState = {
  text: "hello",
  autoPlay: true,
  loop: false,
  rewindBeforePlay: false,
  loopPauseMs: 500,
  animationType: "tween",
  tweenDuration: 2,
  tweenEase: "easeInOut",
  springPreset: "gentle",
  strokeWidth: 2.5,
  overlap: 0.12,
  color: "#0f172a",
};

/** Lowercases input and drops anything the library can't render. */
export function sanitizeText(raw: string): string {
  return raw
    .toLowerCase()
    .split("")
    .filter((ch) => /[a-z ]/.test(ch))
    .join("");
}
