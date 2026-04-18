"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { LettersHandle } from "./Letters";

export interface LettersController {
  /** Attach to `<Letters ref={...} />`. */
  ref: RefObject<LettersHandle | null>;
  play: () => void;
  pause: () => void;
  replay: () => void;
  reset: () => void;
  /** Reactive playback state — safe to use as `disabled={!isPlaying}`. */
  isPlaying: boolean;
  /** Reactive 0–1 progress. Updates on every animation frame during playback. */
  progress: number;
}

/**
 * Ergonomic wrapper around `LettersHandle`. Returns stable callbacks and
 * reactive `isPlaying` / `progress` state so you can drive toolbars, progress
 * bars, and aria attributes without reaching into `ref.current`.
 *
 * ```tsx
 * const { ref, play, pause, isPlaying } = useLettersController();
 * <Letters ref={ref} text="hello" />
 * <button onClick={play} disabled={isPlaying}>Play</button>
 * ```
 */
export function useLettersController(): LettersController {
  const ref = useRef<LettersHandle | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(1);

  // Subscribe once the handle is attached. We check on every commit because
  // `ref.current` is not reactive — consumers might mount the component
  // conditionally or swap instances via `key`. Only update state when the
  // handle reference actually changed — otherwise a component that hands out
  // a new handle each render would drive an infinite re-render loop here.
  const [handle, setHandle] = useState<LettersHandle | null>(null);
  useEffect(() => {
    if (ref.current !== handle) setHandle(ref.current);
  });

  useEffect(() => {
    if (!handle) return;
    return handle.subscribe(({ isPlaying: p, progress: pr }) => {
      setIsPlaying(p);
      setProgress(pr);
    });
  }, [handle]);

  const play = useCallback(() => ref.current?.play(), []);
  const pause = useCallback(() => ref.current?.pause(), []);
  const replay = useCallback(() => ref.current?.replay(), []);
  const reset = useCallback(() => ref.current?.reset(), []);

  return { ref, play, pause, replay, reset, isPlaying, progress };
}
