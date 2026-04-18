"use client";

import {
  EASE_OPTIONS,
  SPRING_PRESETS,
  type LettersController,
} from "@kumailnanji/letters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  sanitizeText,
  type AnimationKind,
  type BuilderState,
} from "./state";

function Row({
  label,
  htmlFor,
  children,
  value,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  value?: string;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr_60px] items-center gap-4">
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
      </Label>
      <div>{children}</div>
      <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">
        {value ?? ""}
      </span>
    </div>
  );
}

export function BuilderControls({
  state,
  setState,
  controller,
}: {
  state: BuilderState;
  setState: React.Dispatch<React.SetStateAction<BuilderState>>;
  controller: LettersController;
}) {
  const springKeys = Object.keys(SPRING_PRESETS);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm">
        <header>
          <h3 className="text-sm font-semibold">Configure</h3>
          <p className="text-xs text-muted-foreground">
            Tweak the animation — the preview and the snippet update live.
          </p>
        </header>

        {/* Text ----------------------------------------------------------- */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="builder-text" className="text-sm">
            Text
          </Label>
          <Input
            id="builder-text"
            value={state.text}
            placeholder="hello"
            onChange={(e) =>
              setState((s) => ({ ...s, text: sanitizeText(e.target.value) }))
            }
          />
          <p className="text-xs text-muted-foreground">
            Lowercase letters and spaces only — other characters are skipped.
          </p>
        </div>

        <Separator />

        {/* Playback ------------------------------------------------------- */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="builder-autoplay" className="text-sm">
              Autoplay
            </Label>
            <Switch
              id="builder-autoplay"
              checked={state.autoPlay}
              onCheckedChange={(v) =>
                setState((s) => ({ ...s, autoPlay: v }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="builder-loop" className="text-sm">
              Loop
            </Label>
            <Switch
              id="builder-loop"
              checked={state.loop}
              onCheckedChange={(v) => setState((s) => ({ ...s, loop: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <Label
                  htmlFor="builder-rewind"
                  className="text-sm data-[disabled=true]:opacity-50"
                  data-disabled={state.loop}
                >
                  Rewind before play
                </Label>
              </TooltipTrigger>
              <TooltipContent side="top">
                Only affects manual <code>play()</code> — looping always
                reverses.
              </TooltipContent>
            </Tooltip>
            <Switch
              id="builder-rewind"
              checked={state.rewindBeforePlay}
              disabled={state.loop}
              onCheckedChange={(v) =>
                setState((s) => ({ ...s, rewindBeforePlay: v }))
              }
            />
          </div>

          <Row
            label="Loop pause"
            htmlFor="builder-pause"
            value={`${state.loopPauseMs}ms`}
          >
            <Slider
              id="builder-pause"
              min={0}
              max={2000}
              step={50}
              disabled={!state.loop}
              value={[state.loopPauseMs]}
              onValueChange={([v]) =>
                setState((s) => ({ ...s, loopPauseMs: v }))
              }
            />
          </Row>
        </div>

        <Separator />

        {/* Animation ------------------------------------------------------ */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Animation</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={state.animationType}
              onValueChange={(v) => {
                if (!v) return;
                setState((s) => ({ ...s, animationType: v as AnimationKind }));
              }}
              className="w-full"
            >
              <ToggleGroupItem value="tween">Tween</ToggleGroupItem>
              <ToggleGroupItem value="spring">Spring</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {state.animationType === "tween" ? (
            <>
              <Row
                label="Duration"
                htmlFor="builder-duration"
                value={`${state.tweenDuration.toFixed(1)}s`}
              >
                <Slider
                  id="builder-duration"
                  min={0.2}
                  max={5}
                  step={0.1}
                  value={[state.tweenDuration]}
                  onValueChange={([v]) =>
                    setState((s) => ({ ...s, tweenDuration: v }))
                  }
                />
              </Row>

              <Row label="Ease" htmlFor="builder-ease">
                <Select
                  value={state.tweenEase}
                  onValueChange={(v) =>
                    setState((s) => ({
                      ...s,
                      tweenEase: v as BuilderState["tweenEase"],
                    }))
                  }
                >
                  <SelectTrigger id="builder-ease" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EASE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Row>
            </>
          ) : (
            <Row label="Preset" htmlFor="builder-spring">
              <Select
                value={state.springPreset}
                onValueChange={(v) =>
                  setState((s) => ({ ...s, springPreset: v }))
                }
              >
                <SelectTrigger id="builder-spring" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {springKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Row>
          )}
        </div>

        <Separator />

        {/* Look ----------------------------------------------------------- */}
        <div className="flex flex-col gap-4">
          <Row
            label="Stroke width"
            htmlFor="builder-stroke"
            value={state.strokeWidth.toFixed(1)}
          >
            <Slider
              id="builder-stroke"
              min={1}
              max={8}
              step={0.5}
              value={[state.strokeWidth]}
              onValueChange={([v]) =>
                setState((s) => ({ ...s, strokeWidth: v }))
              }
            />
          </Row>

          <Row
            label="Overlap"
            htmlFor="builder-overlap"
            value={state.overlap.toFixed(2)}
          >
            <Slider
              id="builder-overlap"
              min={0}
              max={0.5}
              step={0.01}
              value={[state.overlap]}
              onValueChange={([v]) =>
                setState((s) => ({ ...s, overlap: v }))
              }
            />
          </Row>

          <div className="grid grid-cols-[110px_1fr_60px] items-center gap-4">
            <Label htmlFor="builder-color" className="text-sm">
              Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                id="builder-color"
                type="color"
                value={state.color}
                onChange={(e) =>
                  setState((s) => ({ ...s, color: e.target.value }))
                }
                className="h-9 w-14 cursor-pointer rounded-md border bg-transparent"
              />
              <span className="font-mono text-xs text-muted-foreground">
                {state.color}
              </span>
            </div>
            <span />
          </div>

        </div>

        <Separator />

        {/* Transport ------------------------------------------------------ */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={controller.play}
            disabled={controller.isPlaying}
          >
            Play
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={controller.pause}
            disabled={!controller.isPlaying}
          >
            Pause
          </Button>
          <Button size="sm" variant="outline" onClick={controller.replay}>
            Replay
          </Button>
          <Button size="sm" variant="ghost" onClick={controller.reset}>
            Reset
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
