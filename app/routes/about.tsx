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
      "Beautiful easing-based gradients that avoid the muddy middle. A must-bookmark for anyone who cares about perceptual color transitions.",
  },
  {
    name: "Dopely Colors",
    url: "https://colors.dopely.top/",
    description:
      "A full suite of color tools — palette generator, gradients, contrast checker, and more. Great for exploring color relationships.",
  },
  {
    name: "Grabient",
    url: "https://grabient.com/",
    description:
      "Clean, flexible gradient picker with a gorgeous UI. Perfect for quickly snagging a linear gradient for your next project.",
  },
  {
    name: "Color Chef",
    url: "https://colorchef.vercel.app/",
    description:
      "A smart palette generator that cooks up harmonious color schemes. Great for quickly finding balanced palettes from a single seed color.",
  },
  {
    name: "Huemint",
    url: "https://huemint.com/brand-intersection/",
    description:
      "AI-powered color palette generator that previews your colors on real brand mockups. Perfect for seeing how a palette actually feels in context.",
  },
  {
    name: "Nippon Colors",
    url: "https://nipponcolors.com/",
    description:
      "A gorgeous collection of traditional Japanese colors. Incredible inspiration for muted, earthy, and refined palettes.",
  },
];

const OTHER_TOOLS = [
  {
    name: "Boring Avatars",
    url: "https://boringavatars.com/",
    description:
      "Tiny React library that generates beautiful SVG avatars from any username. We use it everywhere.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-16">
          {/* Hero */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">
              Why we built{" "}
              <span className="text-accent">Gradient Galore</span>
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-text-dim">
              <p>
                We were deep into a client project — finessing an aura gradient for a hero
                section — and realised there wasn't a single tool that let us play with
                aura, mesh, and marble gradients alongside our colour palettes. Every
                generator we tried either stopped at linear/radial or didn't let us tweak
                individual layers the way we needed.
              </p>
              <p>
                So we built one.
              </p>
              <p>
                Gradient Galore started as an internal tool at our agency and quickly became
                something we wanted to share. It's designed for the way we actually work:
                pick a palette, experiment with layered gradients, fine-tune with OKLCH
                sliders, and export production-ready CSS — all without leaving the browser.
              </p>
              <p>
                If it saves you even a few minutes of fiddling with background properties in
                DevTools, we'll call that a win.
              </p>
            </div>
          </section>

          {/* Agency callout */}
          <section className="bg-surface-2 border border-border rounded-2xl p-8 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-dim">
                Made by
              </p>
              <h3 className="text-xl font-bold">
                Blue Monkey Makes
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-text-dim">
              We're a small design and engineering agency that builds tools, products, and
              experiences for teams who care about craft. Gradient Galore is one of the
              side projects we've released into the wild — if you dig it, come say hello.
            </p>
            <a
              href="https://bluemonkeymakes.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-black text-sm font-medium hover:bg-accent-hover transition-all"
            >
              Visit bluemonkeymakes.com
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </a>
          </section>

          {/* Color tools */}
          <section className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Awesome Color Tools</h3>
              <p className="text-xs text-text-dim">
                Other tools we reach for regularly. These are all worth bookmarking.
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
                  <p className="text-xs text-text-dim leading-relaxed">
                    {tool.description}
                  </p>
                </a>
              ))}
            </div>
          </section>

          {/* Other tools we love */}
          <section className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Other Tools We Love</h3>
              <p className="text-xs text-text-dim">
                Not gradient-related, but too good not to mention.
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
                  <p className="text-xs text-text-dim leading-relaxed">
                    {tool.description}
                  </p>
                </a>
              ))}
            </div>
          </section>

          {/* Footer note */}
          <section className="border-t border-border pt-8 pb-4 text-center">
            <p className="text-xs text-text-dim">
              Built with React Router, Tailwind, OKLCH color math, and too many late nights.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
