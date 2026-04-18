export {
  Letters,
  type LettersHandle,
  type LettersProps,
  type LettersState,
  type LettersListener,
} from "./Letters";

export {
  useLettersController,
  type LettersController,
} from "./useLettersController";

export {
  type AnimationConfig,
  type EasePreset,
  type SpringConfig,
  SPRING_PRESETS,
  EASE_OPTIONS,
} from "./animation-presets";

export {
  CUSTOM_STROKE_WIDTH,
  type CustomLetterPath,
  type CustomLetterEntry,
  type ResolvedPath,
  getCustomLetter,
  customLetters,
} from "./custom-letters";

export {
  type FontVariant,
  type SmoothingOptions,
  type CurveMode,
  type PathSegment,
  type SegmentedLayout,
  type LetterSlot,
  layoutTextSegmented,
  getLetterSlots,
} from "./hershey-smooth";
