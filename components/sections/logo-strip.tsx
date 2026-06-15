"use client";

const LOGOS = [
  "Vercel",
  "Linear",
  "Cursor",
  "Replit",
  "Bolt",
  "Lovable",
  "v0",
  "Windsurf",
  "Cline",
  "Roo Code",
];

export function LogoStrip() {
  // Double the array for seamless marquee
  const items = [...LOGOS, ...LOGOS];

  return (
    <section className="relative py-16 border-y border-border bg-background-subtle/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-8">
        <p className="text-center text-xs font-mono uppercase tracking-[0.2em] text-foreground-dim">
          Trusted by builders who ship with
        </p>
      </div>

      <div
        className="relative"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
        }}
      >
        <div className="marquee-track flex gap-12 whitespace-nowrap">
          {items.map((name, i) => (
            <div
              key={`${name}-${i}`}
              className="flex items-center gap-2 text-foreground-dim hover:text-foreground transition-colors"
            >
              <span className="font-display text-2xl tracking-tight opacity-70">
                {name}
              </span>
              <span className="text-foreground-dim/40">·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
