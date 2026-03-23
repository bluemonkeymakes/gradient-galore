import { Nav } from "~/components/nav";

export function meta() {
  return [
    { title: "About — Gradient Galore" },
    { name: "description", content: "Why we built Gradient Galore and other tools we love." },
  ];
}

const COLOR_TOOLS = [
  {
    name: "Josh W Comeau's Gradient Generator",
    url: "https://www.joshwcomeau.com/gradient-generator/",
    description:
      "Easing-based gradients that avoid the muddy middle. Really well thought out.",
  },
  {
    name: "Dopely Colors",
    url: "https://colors.dopely.top/",
    description:
      "Full suite of colour tools — palette generator, gradients, contrast checker. Handy for exploring colour relationships.",
  },
  {
    name: "Grabient",
    url: "https://grabient.com/",
    description:
      "Clean gradient picker. Good for quickly grabbing a linear gradient without overthinking it.",
  },
  {
    name: "Color Chef",
    url: "https://colorchef.vercel.app/",
    description:
      "Palette generator that finds harmonious schemes from a single seed colour. Simple and effective.",
  },
  {
    name: "Huemint",
    url: "https://huemint.com/brand-intersection/",
    description:
      "AI palette generator that shows your colours on real brand mockups. Useful for getting a feel before committing.",
  },
  {
    name: "Nippon Colors",
    url: "https://nipponcolors.com/",
    description:
      "Traditional Japanese colour collection. Great for finding muted, earthy tones you wouldn't stumble on otherwise.",
  },
];

const OTHER_TOOLS = [
  {
    name: "Boring Avatars",
    url: "https://boringavatars.com/",
    description:
      "Generates nice SVG avatars from any username. Small library, we use it a lot.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-16">
          {/* Story */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">
              About <span className="text-accent">Gradient Galore</span>
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-text-dim">
              <p>
                We were working on a project and needed a way to experiment with
                aura, mesh, and marble gradients alongside our colour palettes.
                Couldn't find a tool that handled layered gradients the way we
                wanted, so we made one.
              </p>
              <p>
                It started as an internal thing at our studio. Mostly to save
                time fiddling in DevTools and stop us having to jump into Penpot
                every time we wanted to try a gradient idea. We ended up using
                it enough that it seemed worth putting out there. Pick colours,
                layer gradients, tweak things with OKLCH sliders, copy the CSS
                when you're happy. That's about it.
              </p>
            </div>
          </section>

          {/* Agency */}
          <section className="bg-surface-2 border border-border rounded-2xl p-8 space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-text-dim">Made by</p>
              <h3 className="text-lg font-semibold">Blue Monkey Makes</h3>
            </div>
            <p className="text-base leading-relaxed text-text-dim">
              We're a small design and engineering studio. We build tools,
              products, and the occasional thing like this that we think
              someone else might find useful.
            </p>
            <a
              href="https://bluemonkeymakes.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-text-dim hover:text-accent transition-all"
            >
              bluemonkeymakes.com
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </a>
          </section>

          {/* Colour tools */}
          <section className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Colour Tools We Like</h3>
              <p className="text-sm text-text-dim">
                Other tools we use. Worth having in your bookmarks.
              </p>
            </div>
            <div className="grid gap-4">
              {COLOR_TOOLS.map((tool) => (
                <a
                  key={tool.url}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-surface-2 border border-border rounded-xl p-5 space-y-2 hover:border-accent/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold group-hover:text-accent transition-all">
                      {tool.name}
                    </h4>
                    <svg className="w-4 h-4 text-text-dim group-hover:text-accent transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                    </svg>
                  </div>
                  <p className="text-sm text-text-dim leading-relaxed">
                    {tool.description}
                  </p>
                </a>
              ))}
            </div>
          </section>

          {/* Other tools */}
          <section className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Other Tools We Use</h3>
              <p className="text-sm text-text-dim">
                Not colour-related, just good.
              </p>
            </div>
            <div className="grid gap-4">
              {OTHER_TOOLS.map((tool) => (
                <a
                  key={tool.url}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-surface-2 border border-border rounded-xl p-5 space-y-2 hover:border-accent/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold group-hover:text-accent transition-all">
                      {tool.name}
                    </h4>
                    <svg className="w-4 h-4 text-text-dim group-hover:text-accent transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                    </svg>
                  </div>
                  <p className="text-sm text-text-dim leading-relaxed">
                    {tool.description}
                  </p>
                </a>
              ))}
            </div>
          </section>

          {/* Footer */}
          <section className="border-t border-border pt-8 pb-4 text-center">
            <p className="text-xs text-text-dim">
              React Router, Tailwind, OKLCH colour math, and a bit of stubbornness.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
