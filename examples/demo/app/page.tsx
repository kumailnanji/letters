import { DemoCard } from "@/components/demo-card";
import { InstallSnippet } from "@/components/install-snippet";
import { Builder } from "@/components/builder/builder";
import { readRecipeSource } from "@/lib/read-source";
import { HoverReplayWord } from "@/recipes/hover-replay";
import { CardWithToolbar } from "@/recipes/toolbar";
import { ScrubbableSignature } from "@/recipes/scrubber";
import { LoopingHeroLine } from "@/recipes/looping-hero";

export default function Page() {
  const recipes = [
    {
      title: "Hover to replay",
      description:
        "Ref-driven playback. Call replay() on pointer enter — useful for hover states.",
      file: "hover-replay.tsx",
      component: <HoverReplayWord />,
    },
    {
      title: "Card with transport toolbar",
      description:
        "useLettersController exposes reactive isPlaying for enabling play/pause buttons.",
      file: "toolbar.tsx",
      component: <CardWithToolbar />,
    },
    {
      title: "Scrubbable signature",
      description:
        "Pass a controlled progress prop (0–1) to drive the draw with any input, like a range slider.",
      file: "scrubber.tsx",
      component: <ScrubbableSignature />,
    },
    {
      title: "Looping hero line",
      description:
        "Loop forward → reverse → forward forever, with a configurable pause and rewind behavior.",
      file: "looping-hero.tsx",
      component: <LoopingHeroLine />,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-12">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            @kumailnanji/letters
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Handwritten text, animated stroke by stroke.
          </h1>
          <p className="max-w-2xl text-balance text-base text-muted-foreground">
            A tiny, fully-typed React component that draws words the way a
            human would — one stroke at a time. Powered by Framer Motion,
            ships as tree-shakable SVGs, works with any styling system.
          </p>
        </div>
        <div className="max-w-lg">
          <InstallSnippet />
        </div>
      </header>

      <section className="flex flex-col gap-12">
        {recipes.map((r) => (
          <DemoCard
            key={r.file}
            title={r.title}
            description={r.description}
            code={readRecipeSource(r.file)}
          >
            {r.component}
          </DemoCard>
        ))}
      </section>

      <hr className="border-border" />

      <Builder />

      <footer className="mt-8 flex flex-col items-start gap-1 border-t pt-8 text-sm text-muted-foreground">
        <span>
          Built with Next.js, Tailwind v4, and shadcn/ui. Source on GitHub.
        </span>
      </footer>
    </main>
  );
}
