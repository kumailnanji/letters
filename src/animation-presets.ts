export type EasePreset = "easeInOut" | "easeIn" | "easeOut" | "linear";

export type SpringConfig = {
  damping: number;
  stiffness: number;
  mass: number;
};

export type AnimationConfig =
  | { type: "tween"; duration: number; ease: EasePreset }
  | { type: "spring"; spring: SpringConfig };

export const SPRING_PRESETS: Record<string, SpringConfig> = {
  gentle: { damping: 20, stiffness: 100, mass: 1 },
  snappy: { damping: 30, stiffness: 300, mass: 0.8 },
  bouncy: { damping: 12, stiffness: 200, mass: 1 },
  smooth: { damping: 40, stiffness: 150, mass: 1.2 },
};

export const EASE_OPTIONS: { value: EasePreset; label: string }[] = [
  { value: "easeInOut", label: "Ease In Out" },
  { value: "easeOut", label: "Ease Out" },
  { value: "easeIn", label: "Ease In" },
  { value: "linear", label: "Linear" },
];
