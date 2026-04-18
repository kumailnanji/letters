"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { animate, type AnimationPlaybackControls } from "framer-motion";
import {
  layoutTextSegmented,
  getLetterSlots,
  type FontVariant,
  type SmoothingOptions,
  type PathSegment,
} from "./hershey-smooth";
import { getCustomLetter, type ResolvedPath } from "./custom-letters";
import type { AnimationConfig } from "./animation-presets";

const DEFAULT_VARIANT: FontVariant = "simple";
const DEFAULT_OPTS: SmoothingOptions = { tension: 4, curveMode: "catmull-rom" };
const DEFAULT_ANIMATION: AnimationConfig = {
  type: "tween",
  duration: 2,
  ease: "easeInOut",
};

export function estimatePathLength(d: string): number {
  const nums: number[] = [];
  for (const m of d.matchAll(/-?\d+(?:\.\d+)?/g)) {
    nums.push(parseFloat(m[0]));
  }
  let len = 0;
  let px = nums[0] ?? 0;
  let py = nums[1] ?? 0;
  for (let i = 2; i < nums.length - 1; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    const dx = x - px;
    const dy = y - py;
    len += Math.sqrt(dx * dx + dy * dy);
    px = x;
    py = y;
  }
  return len;
}

export type RenderItem = {
  key: string;
  kind: "path" | "dot";
  d: string;
  strokeWidth: number;
  startFrac: number;
  endFrac: number;
  reverse?: boolean;
  tx?: number;
  dot?: { cx: number; cy: number; r: number };
};

export function translatePathD(d: string, dx: number, dy: number): string {
  if (dx === 0 && dy === 0) return d;
  const tokens = d.match(
    /[a-zA-Z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g
  );
  if (!tokens) return d;
  const result: string[] = [];
  let cmd = "";
  let paramIdx = 0;
  const absXY: Record<string, number> = {
    M: 2, L: 2, T: 2, S: 4, Q: 4, C: 6,
  };
  for (const token of tokens) {
    if (/^[a-zA-Z]$/.test(token)) {
      cmd = token;
      paramIdx = 0;
      result.push(token);
      continue;
    }
    const num = parseFloat(token);
    const upper = cmd.toUpperCase();
    const isRelative = cmd === cmd.toLowerCase();
    if (isRelative) {
      result.push(token);
    } else if (upper === "H") {
      result.push(String(Math.round((num + dx) * 10000) / 10000));
    } else if (upper === "V") {
      result.push(String(Math.round((num + dy) * 10000) / 10000));
    } else if (upper === "A") {
      const ai = paramIdx % 7;
      if (ai === 5)
        result.push(String(Math.round((num + dx) * 10000) / 10000));
      else if (ai === 6)
        result.push(String(Math.round((num + dy) * 10000) / 10000));
      else result.push(token);
    } else if (upper in absXY) {
      const pairSize = absXY[upper];
      const posInPair = paramIdx % pairSize;
      if (posInPair % 2 === 0)
        result.push(String(Math.round((num + dx) * 10000) / 10000));
      else result.push(String(Math.round((num + dy) * 10000) / 10000));
    } else {
      result.push(token);
    }
    paramIdx++;
  }
  return result.join(" ");
}

export function computeRenderItems(
  segments: PathSegment[],
  slots: {
    char: string;
    positionIndex: number;
    offsetX: number;
    left: number;
  }[],
  customPositions: Set<number>,
  sw: number
): RenderItem[] {
  const posOrder: number[] = [];
  const seen = new Set<number>();
  for (const seg of segments) {
    if (!seen.has(seg.positionIndex)) {
      posOrder.push(seg.positionIndex);
      seen.add(seg.positionIndex);
    }
  }

  type PosInfo = {
    posIdx: number;
    isCustom: boolean;
    hersheyLen: number;
    segEntries: { seg: PathSegment; globalIdx: number }[];
    customPaths?: ResolvedPath[];
    customLengths?: number[];
    customTotalLen?: number;
    slot?: (typeof slots)[0];
  };

  const positions: PosInfo[] = [];
  let globalWeightedLen = 0;

  for (const posIdx of posOrder) {
    const entries: { seg: PathSegment; globalIdx: number }[] = [];
    let hersheyLen = 0;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].positionIndex === posIdx) {
        entries.push({ seg: segments[i], globalIdx: i });
        hersheyLen += segments[i].approxLength;
      }
    }

    const isCustom = customPositions.has(posIdx);
    const info: PosInfo = {
      posIdx,
      isCustom,
      hersheyLen,
      segEntries: entries,
    };

    if (isCustom) {
      const slot = slots.find((s) => s.positionIndex === posIdx);
      info.slot = slot;
      if (slot) {
        const resolved = getCustomLetter(slot.char, sw);
        if (resolved) {
          info.customPaths = resolved.paths;
          const lens = resolved.paths.map((p: ResolvedPath) =>
            p.dot ? 0.5 : Math.max(estimatePathLength(p.d), 0.5)
          );
          info.customLengths = lens;
          info.customTotalLen = lens.reduce(
            (a: number, b: number) => a + b,
            0
          );
        }
      }
    }

    globalWeightedLen += hersheyLen;
    positions.push(info);
  }

  if (globalWeightedLen === 0) return [];

  const items: RenderItem[] = [];
  let cumFrac = 0;

  for (const pos of positions) {
    const posFrac = pos.hersheyLen / globalWeightedLen;

    if (
      pos.isCustom &&
      pos.customPaths &&
      pos.customLengths &&
      pos.customTotalLen &&
      pos.slot
    ) {
      let innerCum = 0;
      for (let pi = 0; pi < pos.customPaths.length; pi++) {
        const p = pos.customPaths[pi];
        const pLen = pos.customLengths[pi];
        const pFrac = (pLen / pos.customTotalLen) * posFrac;

        items.push({
          key: `c-${pos.posIdx}-${pi}`,
          kind: p.dot ? "dot" : "path",
          d: p.d,
          strokeWidth: p.strokeWidth,
          startFrac: cumFrac + innerCum,
          endFrac: cumFrac + innerCum + pFrac,
          reverse: p.reverse,
          tx: pos.slot.offsetX + pos.slot.left,
          dot: p.dot,
        });
        innerCum += pFrac;
      }
    } else {
      let innerCum = 0;
      for (const { seg, globalIdx } of pos.segEntries) {
        const segFrac =
          pos.hersheyLen > 0
            ? (seg.approxLength / pos.hersheyLen) * posFrac
            : posFrac;

        items.push({
          key: `h-${globalIdx}`,
          kind: "path",
          d: seg.d,
          strokeWidth: sw,
          startFrac: cumFrac + innerCum,
          endFrac: cumFrac + innerCum + segFrac,
        });
        innerCum += segFrac;
      }
    }

    cumFrac += posFrac;
  }

  return items;
}

export function computeItemOffsets(
  items: RenderItem[],
  progress: number,
  overlap: number
): number[] {
  return items.map((item) => {
    const span = item.endFrac - item.startFrac;
    const expandedSpan = span * (1 + overlap);
    const adjustedStart = item.startFrac * (1 - overlap);

    if (progress <= adjustedStart) return 1;
    if (progress >= adjustedStart + expandedSpan) return 0;

    const t = (progress - adjustedStart) / expandedSpan;
    return 1 - t;
  });
}

export type LettersState = {
  isPlaying: boolean;
  progress: number;
};

export type LettersListener = (state: LettersState) => void;

export interface LettersHandle {
  play: () => void;
  pause: () => void;
  replay: () => void;
  reset: () => void;
  isPlaying: () => boolean;
  /**
   * Subscribe to play/progress state changes. Returns an unsubscribe fn.
   * Used by `useLettersController` so toolbar buttons can reactively
   * disable based on `isPlaying` without the consumer polling the ref.
   */
  subscribe: (listener: LettersListener) => () => void;
}

export interface LettersProps {
  text: string;
  /**
   * External progress (0–1). When provided, the component is "controlled"
   * and the ref API / autoPlay / loop are disabled.
   */
  progress?: number;
  strokeWidth?: number;
  color?: string;
  variant?: FontVariant;
  opts?: SmoothingOptions;
  className?: string;
  style?: React.CSSProperties;
  /** Defaults to 2 s ease-in-out tween. */
  animation?: AnimationConfig;
  /** Overlap factor between adjacent path segments (0–0.5). */
  overlap?: number;
  /** When true, starts animating on mount. */
  autoPlay?: boolean;
  /**
   * When true, the animation cycles forward → reverse → forward forever:
   *
   *   forward (full duration) → reverse (½ duration) → forward → …
   *
   * The reverse phase plays from 1 back to 0 at exactly half the forward
   * duration (for tween) or using the same spring config (for spring).
   * `onComplete` fires once per forward iteration — the reverse phase is
   * silent. `pause()` halts the loop until the next `play()` / `replay()`.
   * Ignored when `progress` is controlled.
   */
  loop?: boolean;
  /**
   * When true, any manual `play()` / `replay()` that starts from a non-zero
   * progress first animates back to 0 (at ½ forward duration) before drawing
   * forward. Does not affect `loop` — looping is always reverse-between.
   * No-op when `progress` is controlled or the starting progress is 0.
   */
  rewindBeforePlay?: boolean;
  /**
   * Milliseconds to wait between loop iterations — after a forward draw
   * completes and before the reverse phase starts. Defaults to 0.
   */
  loopPauseMs?: number;
  /**
   * Fires once at the end of each full forward draw. If `loop` is true, it
   * fires after every iteration. The rewind phase does not fire `onComplete`.
   */
  onComplete?: () => void;
  /** Fires with `true` when playback starts and `false` when it ends/pauses. */
  onPlayingChange?: (isPlaying: boolean) => void;
  /** Fires with the internal 0–1 progress value during uncontrolled playback. */
  onProgressChange?: (progress: number) => void;
  /** Inject SVG <defs>. Pass a function to receive layout info for userSpaceOnUse gradients. */
  svgDefs?:
    | React.ReactNode
    | ((info: { totalWidth: number; minY: number; maxY: number }) => React.ReactNode);
}

export const Letters = forwardRef<LettersHandle, LettersProps>(function Letters(
  {
    text,
    progress: controlledProgress,
    strokeWidth = 2,
    color = "currentColor",
    variant = DEFAULT_VARIANT,
    opts = DEFAULT_OPTS,
    className,
    style,
    animation = DEFAULT_ANIMATION,
    overlap = 0.02,
    autoPlay = false,
    loop = false,
    rewindBeforePlay = false,
    loopPauseMs = 0,
    onComplete,
    onPlayingChange,
    onProgressChange,
    svgDefs,
  },
  ref
) {
  const isControlled = controlledProgress !== undefined;
  const [internalProgress, setInternalProgress] = useState(
    autoPlay && !isControlled ? 0 : 1
  );
  const playingRef = useRef(false);
  const controlsRef = useRef<AnimationPlaybackControls | null>(null);
  const loopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef(internalProgress);
  const listenersRef = useRef(new Set<LettersListener>());

  const progress = isControlled ? controlledProgress : internalProgress;

  const loopRef = useRef(loop);
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const rewindRef = useRef(rewindBeforePlay);
  useEffect(() => {
    rewindRef.current = rewindBeforePlay;
  }, [rewindBeforePlay]);

  const loopPauseRef = useRef(loopPauseMs);
  useEffect(() => {
    loopPauseRef.current = loopPauseMs;
  }, [loopPauseMs]);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const onPlayingChangeRef = useRef(onPlayingChange);
  useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange;
  });

  const onProgressChangeRef = useRef(onProgressChange);
  useEffect(() => {
    onProgressChangeRef.current = onProgressChange;
  });

  // Stable refs for inputs that consumers often recreate inline each render.
  // Without these, `runPlayback` would re-memo on every parent render and cause
  // `useImperativeHandle` to hand out a new handle → infinite update loop in
  // any consumer that subscribes to the handle (e.g. the controller hook).
  const animationRef = useRef(animation);
  useEffect(() => {
    animationRef.current = animation;
  }, [animation]);

  const isControlledRef = useRef(isControlled);
  useEffect(() => {
    isControlledRef.current = isControlled;
  }, [isControlled]);

  const emitState = useCallback(() => {
    const state: LettersState = {
      isPlaying: playingRef.current,
      progress: progressRef.current,
    };
    listenersRef.current.forEach((fn) => fn(state));
  }, []);

  const setPlaying = useCallback(
    (v: boolean) => {
      if (playingRef.current === v) return;
      playingRef.current = v;
      onPlayingChangeRef.current?.(v);
      emitState();
    },
    [emitState]
  );

  const setProgress = useCallback(
    (v: number) => {
      const clamped = Math.min(Math.max(v, 0), 1);
      progressRef.current = clamped;
      setInternalProgress(clamped);
      onProgressChangeRef.current?.(clamped);
      emitState();
    },
    [emitState]
  );

  const stopAnim = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
    setPlaying(false);
  }, [setPlaying]);

  // Ref indirection so the loop continuation callback can invoke the latest
  // runPlayback without re-binding a useCallback dependency cycle.
  type PlaybackMode = "manual-resume" | "manual-full" | "loop";
  const runPlaybackRef = useRef<(from: number, mode: PlaybackMode) => void>(
    () => {}
  );

  const runPlayback = useCallback(
    (from: number, mode: PlaybackMode) => {
      if (isControlledRef.current) return;
      const anim = animationRef.current;
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
      setPlaying(true);

      const scheduleNextLoop = () => {
        if (!loopRef.current) {
          setPlaying(false);
          return;
        }
        const pause = Math.max(0, loopPauseRef.current);
        const runNext = () => {
          loopTimeoutRef.current = null;
          // Loop iterations always rewind first, regardless of
          // `rewindBeforePlay` (which only governs manual play/replay).
          if (loopRef.current) runPlaybackRef.current(1, "loop");
        };
        if (pause > 0) {
          loopTimeoutRef.current = setTimeout(runNext, pause);
        } else {
          // microtask so React can flush onComplete-triggered updates first
          queueMicrotask(runNext);
        }
      };

      const finishForward = () => {
        controlsRef.current = null;
        onCompleteRef.current?.();
        scheduleNextLoop();
      };

      const runForward = (startAt: number) => {
        setProgress(startAt);
        if (anim.type === "spring") {
          controlsRef.current = animate(startAt, 1, {
            type: "spring",
            ...anim.spring,
            onUpdate: (v) => setProgress(v),
            onComplete: finishForward,
          });
        } else {
          controlsRef.current = animate(startAt, 1, {
            duration: anim.duration,
            ease: anim.ease,
            onUpdate: (v) => setProgress(v),
            onComplete: finishForward,
          });
        }
      };

      const shouldRewind =
        from > 0 &&
        (mode === "loop" || (mode === "manual-full" && rewindRef.current));

      if (shouldRewind) {
        setProgress(from);
        const reverseDuration =
          anim.type === "tween"
            ? Math.max(0.05, from * (anim.duration / 2))
            : undefined;
        const onRewindDone = () => {
          controlsRef.current = null;
          runForward(0);
        };
        if (anim.type === "spring") {
          controlsRef.current = animate(from, 0, {
            type: "spring",
            ...anim.spring,
            onUpdate: (v) => setProgress(v),
            onComplete: onRewindDone,
          });
        } else {
          controlsRef.current = animate(from, 0, {
            duration: reverseDuration!,
            ease: anim.ease,
            onUpdate: (v) => setProgress(v),
            onComplete: onRewindDone,
          });
        }
      } else if (from >= 1) {
        runForward(0);
      } else {
        runForward(from);
      }
    },
    [setPlaying, setProgress]
  );

  useEffect(() => {
    runPlaybackRef.current = runPlayback;
  }, [runPlayback]);

  useImperativeHandle(
    ref,
    () => ({
      play: () => {
        if (isControlledRef.current) return;
        const cur = progressRef.current;
        // Mid-draw resume never rewinds — the user paused and wants to continue.
        // Only a fully-drawn start counts as a full cycle (eligible for rewind).
        runPlayback(cur, cur >= 1 ? "manual-full" : "manual-resume");
      },
      pause: () => stopAnim(),
      replay: () => {
        // Always a full cycle from a drawn state, so `rewindBeforePlay` engages.
        runPlayback(1, "manual-full");
      },
      reset: () => {
        stopAnim();
        setProgress(1);
      },
      isPlaying: () => playingRef.current,
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        listener({
          isPlaying: playingRef.current,
          progress: progressRef.current,
        });
        return () => {
          listenersRef.current.delete(listener);
        };
      },
    }),
    [runPlayback, stopAnim, setProgress]
  );

  useEffect(() => {
    if (autoPlay && !isControlled) runPlayback(0, "manual-resume");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopAnim(), [stopAnim]);

  const layout = useMemo(
    () => layoutTextSegmented(text, variant, opts),
    [text, variant, opts]
  );

  const slots = useMemo(() => getLetterSlots(text, variant), [text, variant]);

  const customPositions = useMemo(() => {
    const set = new Set<number>();
    for (const slot of slots.slots) {
      if (getCustomLetter(slot.char)) set.add(slot.positionIndex);
    }
    return set;
  }, [slots]);

  const renderItems = useMemo(
    () =>
      computeRenderItems(
        layout.segments,
        slots.slots,
        customPositions,
        strokeWidth
      ),
    [layout, slots, customPositions, strokeWidth]
  );

  const itemOffsets = useMemo(
    () => computeItemOffsets(renderItems, progress, overlap),
    [renderItems, progress, overlap]
  );

  const pad = strokeWidth + 8;
  const viewBox = `${-pad} ${layout.minY - pad} ${layout.totalWidth + pad * 2} ${layout.maxY - layout.minY + pad * 2}`;

  if (layout.segments.length === 0) return null;

  return (
    <svg viewBox={viewBox} className={className} style={style} fill="none">
      {svgDefs && (
        <defs>
          {typeof svgDefs === "function"
            ? svgDefs({
                totalWidth: layout.totalWidth,
                minY: layout.minY,
                maxY: layout.maxY,
              })
            : svgDefs}
        </defs>
      )}
      {renderItems.map((item, idx) => {
        const off = itemOffsets[idx];
        if (off >= 1 || (item.kind === "path" && off > 0.97)) return null;

        if (item.kind === "dot" && item.dot) {
          const t = Math.max(0, Math.min(1, 1 - off));
          const scale = t < 1 ? t * (2 - t) : 1;
          const cx = item.dot.cx + (item.tx ?? 0);
          const cy = item.dot.cy;
          return (
            <circle
              key={item.key}
              cx={cx}
              cy={cy}
              r={item.dot.r * scale}
              fill={color}
              opacity={scale}
            />
          );
        }

        const dashOff = item.reverse ? -off : off;
        const d = item.tx ? translatePathD(item.d, item.tx, 0) : item.d;
        return (
          <path
            key={item.key}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={item.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={dashOff}
          />
        );
      })}
    </svg>
  );
});
