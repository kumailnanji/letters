"use client";

import { Letters, useLettersController } from "@kumailnanji/letters";
import { Button } from "@/components/ui/button";

export function CardWithToolbar() {
  const { ref, play, pause, replay, reset, isPlaying } = useLettersController();

  return (
    <div className="flex flex-col items-center gap-6">
      <Letters
        ref={ref}
        text="kumail"
        autoPlay
        strokeWidth={3}
        animation={{ type: "tween", duration: 2, ease: "easeInOut" }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={play} disabled={isPlaying}>
          Play
        </Button>
        <Button size="sm" variant="outline" onClick={pause} disabled={!isPlaying}>
          Pause
        </Button>
        <Button size="sm" variant="outline" onClick={replay}>
          Replay
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
