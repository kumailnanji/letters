"use client";

import { useMemo, useState } from "react";
import { Letters, type AnimationConfig } from "@kumailnanji/letters";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function LoopingHeroLine() {
  const [duration, setDuration] = useState(2);
  const [rewind, setRewind] = useState(true);
  const [pauseMs, setPauseMs] = useState(500);

  const animation = useMemo<AnimationConfig>(
    () => ({ type: "tween", duration, ease: "easeInOut" }),
    [duration],
  );

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <Letters
        text="welcome"
        autoPlay
        loop
        rewindBeforePlay={rewind}
        loopPauseMs={pauseMs}
        animation={animation}
        strokeWidth={3}
      />
      <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 text-sm">
        <Label htmlFor="hero-duration">Duration</Label>
        <Slider
          id="hero-duration"
          min={0.5}
          max={5}
          step={0.1}
          value={[duration]}
          onValueChange={([v]) => setDuration(v)}
        />
        <span className="font-mono text-muted-foreground tabular-nums">
          {duration.toFixed(1)}s
        </span>

        <Label htmlFor="hero-pause">Pause</Label>
        <Slider
          id="hero-pause"
          min={0}
          max={2000}
          step={50}
          value={[pauseMs]}
          onValueChange={([v]) => setPauseMs(v)}
        />
        <span className="font-mono text-muted-foreground tabular-nums">
          {pauseMs}ms
        </span>

        <Label htmlFor="hero-rewind">Rewind</Label>
        <Switch
          id="hero-rewind"
          checked={rewind}
          onCheckedChange={setRewind}
        />
        <span />
      </div>
    </div>
  );
}
