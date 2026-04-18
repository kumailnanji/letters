# @kumailnanji/letters

[![npm](https://img.shields.io/npm/v/@kumailnanji/letters.svg)](https://www.npmjs.com/package/@kumailnanji/letters)

Animated handwritten text for React. Renders any string as a continuous script animation using Hershey vector font data for layout and kerning, with hand-polished cubic Bézier paths for each letter. Driven by [Framer Motion](https://www.framer.com/motion/).

```bash
npm install @kumailnanji/letters framer-motion react react-dom
```

Peers: `react` / `react-dom` `^18 || ^19`, `framer-motion` `^11 || ^12`.

## Quick start

```tsx
"use client";

import { Letters } from "@kumailnanji/letters";

export default function Hero() {
  return <Letters text="hello" autoPlay className="h-14 w-auto" />;
}
```

Next.js App Router: put `"use client"` at the top of any file that imports `Letters`. Vite / CRA / other React setups work the same way — just install the peers.

## API

### `<Letters />`

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | — | The text to render (lowercase `a`–`z`, spaces). |
| `autoPlay` | `boolean` | `false` | Start animating on mount. |
| `loop` | `boolean` | `false` | Cycle forever: forward (full duration) → reverse (½ duration) → forward → … `onComplete` fires once per forward iteration. |
| `rewindBeforePlay` | `boolean` | `false` | When `play()` / `replay()` starts from a drawn state, first un-write back to 0 (at ½ forward duration) before drawing forward. Only affects manual playback — looping always rewinds between iterations. |
| `loopPauseMs` | `number` | `0` | Pause between loop iterations, after the forward draw completes and before the reverse phase starts. |
| `progress` | `number` | — | External 0–1 control. When set, `autoPlay` / `loop` / ref playback are disabled. |
| `animation` | `AnimationConfig` | `{ type: "tween", duration: 2, ease: "easeInOut" }` | Tween or spring config. |
| `overlap` | `number` | `0.02` | Blend factor between adjacent paths (0–0.5). |
| `strokeWidth` | `number` | `2` | Stroke weight. |
| `color` | `string` | `"currentColor"` | Stroke color. Supports `url(#gradient-id)`. |
| `variant` | `"simple" \| "complex"` | `"simple"` | Hershey font variant. |
| `opts` | `SmoothingOptions` | Catmull-Rom, tension 4 | Smoothing pipeline tuning. |
| `svgDefs` | `ReactNode \| fn` | — | Inject `<defs>`. Function variant receives `{ totalWidth, minY, maxY }`. |
| `className` / `style` | — | — | Applied to the outer `<svg>`. |
| `onComplete` | `() => void` | — | Fires at the end of every full draw (each loop iteration). |
| `onPlayingChange` | `(p: boolean) => void` | — | Fires when playback starts / stops. |
| `onProgressChange` | `(p: number) => void` | — | Fires on every frame with the internal 0–1 progress. |

### Ref — `LettersHandle`

`play()` · `pause()` · `replay()` · `reset()` · `isPlaying()` · `subscribe(listener)`

### `useLettersController()`

Ergonomic wrapper. Returns `{ ref, play, pause, replay, reset, isPlaying, progress }` with reactive `isPlaying` / `progress` and stable callbacks, so toolbars and progress bars can read state without going fully controlled.

## Recipes

All examples assume `"use client"` at the top of the file.

### 1. Play once on load, replay on hover

```tsx
import { useRef } from "react";
import { Letters, type LettersHandle } from "@kumailnanji/letters";

export function HoverReplayWord() {
  const ref = useRef<LettersHandle>(null);
  return (
    <div
      className="inline-block cursor-pointer"
      onPointerEnter={() => ref.current?.replay()}
    >
      <Letters ref={ref} text="hello" className="h-8 w-auto" autoPlay />
    </div>
  );
}
```

Accessibility: hover-only triggers exclude keyboard / touch users. Pair with a focusable button or expose a non-pointer replay control for important content.

### 2. Toolbar with controller hook

```tsx
import { Letters, useLettersController } from "@kumailnanji/letters";

export function CardWithToolbar() {
  const { ref, play, pause, replay, isPlaying } = useLettersController();
  return (
    <div className="flex flex-col items-start gap-3">
      <Letters ref={ref} text="kumail" autoPlay className="h-10 w-auto" />
      <div className="flex gap-2">
        <button onClick={play} disabled={isPlaying}>Play</button>
        <button onClick={pause} disabled={!isPlaying}>Pause</button>
        <button onClick={replay}>Replay</button>
      </div>
    </div>
  );
}
```

### 3. Scrubber (external progress)

```tsx
import { useState } from "react";
import { Letters } from "@kumailnanji/letters";

export function ScrubbableSignature() {
  const [progress, setProgress] = useState(0);
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <Letters text="hello" progress={progress} className="h-12 w-full" />
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={progress}
        onChange={(e) => setProgress(Number(e.target.value))}
      />
    </div>
  );
}
```

When `progress` is set, the ref playback API and `autoPlay` / `loop` are no-ops — the consumer owns timing.

### 4. Hero line that loops (forward → reverse → forward)

```tsx
import { Letters, useLettersController } from "@kumailnanji/letters";

export function LoopingHeroLine() {
  const { ref, pause } = useLettersController();
  return (
    <div className="flex flex-col items-center gap-4">
      <Letters
        ref={ref}
        text="welcome"
        autoPlay
        loop
        loopPauseMs={500}
        animation={{ type: "tween", duration: 2.5, ease: "easeInOut" }}
        className="h-14 w-auto"
        onComplete={() => {
          /* fires once per full forward draw; reverse phase is silent */
        }}
      />
      <button onClick={pause}>Pause animation</button>
    </div>
  );
}
```

`loop` already cycles forward → reverse(½ duration) → forward. Tune the pace via `animation.duration`, and use `loopPauseMs` to hold the drawn state before reversing. `rewindBeforePlay` is for manual `play()` / `replay()` only — looping ignores it.

### 5. Rotating phrases with a stable left edge

```tsx
import { useState } from "react";
import { Letters } from "@kumailnanji/letters";

const PHRASES = ["hello", "my name is kumail"];

export function PlaylistLines() {
  const [i, setI] = useState(0);
  const text = PHRASES[i] ?? PHRASES[0];
  return (
    <div className="flex w-full max-w-md flex-col">
      <div className="flex min-h-[3rem] justify-start">
        <Letters
          key={text}
          text={text}
          autoPlay
          className="h-10 w-auto max-w-full"
          onComplete={() => setI((n) => (n + 1) % PHRASES.length)}
        />
      </div>
    </div>
  );
}
```

`key={text}` forces a clean remount, which resets Motion cleanly between phrases. If you want to avoid remounts, keep a single instance and call `replay()` from a `useEffect` when `text` changes — verify your own interruption semantics in that path.

## Running the demo locally

```bash
git clone https://github.com/kumailnanji/letters.git
cd letters
pnpm install
pnpm build
cd examples/demo
pnpm install
pnpm dev   # → http://localhost:3000
```

The demo is a Next.js App Router app styled with Tailwind v4 and shadcn/ui. It walks through the built-in recipes and includes an interactive animation builder at the bottom that emits a copy-pasteable `<Letters>` snippet for the current settings. It's for local dogfooding only — it is not included in the published npm tarball.

## Character set

`a`–`z` and space are supported out of the box. Uppercase letters, digits, and punctuation are not currently rendered. Unsupported characters are silently skipped.

## How it works

Hershey fonts provide perfect monoline letter shapes with built-in kerning — every character knows where it sits relative to its neighbors. Raw Hershey polylines look jagged, so this package keeps Hershey's layout engine (spacing, connections, stroke ordering) and swaps in hand-tuned cubic Bézier paths from [`custom-letters.ts`](./src/custom-letters.ts) in the same coordinate space.

At render time:

1. Lay out the word using Hershey kerning tables.
2. Swap custom Bézier paths in where available (fall back to smoothed Hershey otherwise).
3. Estimate each path's length to distribute animation timing proportionally.
4. Drive a single 0→1 progress value through `stroke-dashoffset` on every path, producing a natural handwriting reveal.

## Contributing custom glyphs

Custom Bézier paths live in [`src/custom-letters.ts`](./src/custom-letters.ts) as raw SVG `d` strings. The recommended authoring flow:

1. Open the companion glyph viewer (coming in a future release — see [`hello-svg`](https://github.com/kumailnanji/hello-svg)).
2. Copy a glyph's current `d` strings to the clipboard.
3. Paste into Figma, edit the Bézier shape, export back as an SVG path.
4. Paste the new `d` string into `custom-letters.ts` and open a PR.

## License

MIT © Kumail Nanji
