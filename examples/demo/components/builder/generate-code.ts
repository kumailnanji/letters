import { DEFAULT_BUILDER_STATE, type BuilderState } from "./state";

const pad = (n: number, d = 2) =>
  Number.isInteger(n) ? String(n) : Number(n.toFixed(d)).toString();

/** Turn builder state into a copy-pasteable JSX snippet. */
export function generateCode(state: BuilderState): string {
  const props: string[] = [`text="${state.text}"`];

  if (state.autoPlay !== DEFAULT_BUILDER_STATE.autoPlay) {
    props.push(state.autoPlay ? "autoPlay" : "autoPlay={false}");
  }
  if (state.loop) props.push("loop");
  if (state.rewindBeforePlay) props.push("rewindBeforePlay");
  if (state.loop && state.loopPauseMs !== DEFAULT_BUILDER_STATE.loopPauseMs) {
    props.push(`loopPauseMs={${state.loopPauseMs}}`);
  }

  if (state.animationType === "tween") {
    const nonDefaultTween =
      state.tweenDuration !== DEFAULT_BUILDER_STATE.tweenDuration ||
      state.tweenEase !== DEFAULT_BUILDER_STATE.tweenEase;
    if (nonDefaultTween) {
      props.push(
        `animation={{ type: "tween", duration: ${pad(state.tweenDuration)}, ease: "${state.tweenEase}" }}`,
      );
    }
  } else {
    props.push(
      `animation={{ type: "spring", spring: SPRING_PRESETS.${state.springPreset} }}`,
    );
  }

  if (state.strokeWidth !== DEFAULT_BUILDER_STATE.strokeWidth) {
    props.push(`strokeWidth={${pad(state.strokeWidth, 1)}}`);
  }
  if (state.overlap !== DEFAULT_BUILDER_STATE.overlap) {
    props.push(`overlap={${pad(state.overlap, 2)}}`);
  }
  if (state.color !== DEFAULT_BUILDER_STATE.color) {
    props.push(`color="${state.color}"`);
  }

  const needsPresetImport = state.animationType === "spring";
  const importLine = needsPresetImport
    ? `import { Letters, SPRING_PRESETS } from "@kumailnanji/letters";`
    : `import { Letters } from "@kumailnanji/letters";`;

  const propsBlock = props
    .map((p) => `      ${p}`)
    .join("\n");

  return `${importLine}

export function Example() {
  return (
    <Letters
${propsBlock}
    />
  );
}
`;
}
